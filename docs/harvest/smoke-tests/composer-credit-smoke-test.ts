import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ApiAlbum = {
  id: string;
  code?: string;
  labelSlug?: string;
  tracks?: Array<{
    id: string;
    composers?: string[];
    rightHolders?: Array<{ id: string; name: string; capacity?: string }>;
  }>;
};

type EditorialData = {
  composers: Array<{
    slug: string;
    name: string;
    published: boolean;
    harvestAliases: string[];
  }>;
  clips: Array<{ slug: string; composerSlugs: string[] }>;
};

const PARIGO_LABEL_ID = "b9d701733704e2d7";
const baseUrl = (process.env.PARIGO_SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\((?:SACEM|NS|BMI|ASCAP|PRS|SESAC)[^)]*\)\s*$/i, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function mapConcurrent<T, R>(values: T[], limit: number, task: (value: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await task(values[index]);
    }
  }));
  return output;
}

function findString(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findString(item, keys);
      if (found) return found;
    }
    return undefined;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase()) && typeof nested === "string") return nested;
  }
  for (const nested of Object.values(value)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return undefined;
}

function findArray(value: unknown, key: string): unknown[] {
  if (!value || typeof value !== "object") return [];
  if (!Array.isArray(value)) {
    for (const [candidate, nested] of Object.entries(value)) {
      if (candidate.toLowerCase() === key.toLowerCase() && Array.isArray(nested)) return nested;
    }
    for (const nested of Object.values(value)) {
      const found = findArray(nested, key);
      if (found.length) return found;
    }
  }
  return [];
}

async function getRightHoldersDirect(trackId: string): Promise<unknown[]> {
  const authUrl = process.env.HARVEST_AUTH_URL || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL || "https://service.harvestmedia.net/HMP-WS.svc";
  const clientId = process.env.HARVEST_CLIENT_ID;
  const clientSecret = process.env.HARVEST_CLIENT_SECRET;
  const accessKey = process.env.HARVEST_ACCESS_KEY;
  if (!clientId || !clientSecret || !accessKey) throw new Error("Identifiants Harvest live manquants.");

  const auth = await getJson<unknown>(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
  });
  const accessToken = findString(auth, ["access_token", "token", "value"]);
  if (!accessToken) throw new Error("Jeton OAuth Harvest introuvable.");
  const headers = { Accept: "application/json", Authorization: accessToken };
  const service = await getJson<unknown>(`${serviceUrl}/getservicetoken`, {
    headers: { ...headers, AccessKey: accessKey },
  });
  const serviceToken = findString(service, ["token", "value", "servicetoken"]);
  if (!serviceToken) throw new Error("Jeton service Harvest introuvable.");
  const regions = await getJson<unknown>(`${serviceUrl}/getregions/${serviceToken}`, { headers });
  const regionId = process.env.HARVEST_REGION_ID || findString(regions, ["id", "regionid"]);
  if (!regionId) throw new Error("Région Harvest introuvable.");
  const guest = await getJson<unknown>(`${serviceUrl}/getguestmembertoken/${serviceToken}/${regionId}`, { headers });
  const guestToken = findString(guest, ["token", "value", "membertoken"]);
  if (!guestToken) throw new Error("Jeton invité Harvest introuvable.");
  const payload = await getJson<unknown>(`${serviceUrl}/getrightholders/${guestToken}/${trackId}`, { headers });
  return findArray(payload, "RightHolders");
}

async function main() {
  if (process.env.HARVEST_LIVE_TESTS !== "1") {
    console.log("Audit compositeurs Harvest ignoré (HARVEST_LIVE_TESTS=1 pour l’activer).");
    return;
  }

  const editorial = JSON.parse(
    await readFile(path.join(process.cwd(), "src/content/editorial.generated.json"), "utf8"),
  ) as EditorialData;
  const albumIndex = await getJson<{ data: { albums: ApiAlbum[] }; meta: { total: number } }>(
    `${baseUrl}/api/albums?label=${PARIGO_LABEL_ID}&limit=100&sort=recent`,
  );
  if (albumIndex.data.albums.some((album) => album.labelSlug !== PARIGO_LABEL_ID)) {
    throw new Error("Le filtre Parigo a retourné un album d’un autre label.");
  }

  const albums = await mapConcurrent(albumIndex.data.albums, 6, async (album) => (
    getJson<{ data: { album: ApiAlbum } }>(`${baseUrl}/api/albums/${album.id}`).then((payload) => payload.data.album)
  ));
  const credits = [...new Set(albums.flatMap((album) => album.tracks?.flatMap((track) => track.composers ?? []) ?? []))].sort();
  const aliases = new Map<string, string>();
  for (const profile of editorial.composers.filter((item) => item.published)) {
    for (const alias of profile.harvestAliases) {
      const normalized = normalize(alias);
      const owner = aliases.get(normalized);
      if (owner && owner !== profile.slug) throw new Error(`Collision d’alias : ${alias} (${owner}/${profile.slug})`);
      aliases.set(normalized, profile.slug);
    }
  }
  const unmatched = credits.filter((credit) => !aliases.has(normalize(credit)));
  const matchedProfiles = new Set(credits.map((credit) => aliases.get(normalize(credit))).filter(Boolean));

  const searchableProfiles = editorial.composers.filter((profile) => profile.published && profile.harvestAliases.length);
  await mapConcurrent(searchableProfiles, 6, async (profile) => {
    const expectedIds = new Set(albums
      .filter((album) => album.tracks?.some((track) => track.composers?.some((credit) => profile.harvestAliases.some((alias) => normalize(alias) === normalize(credit)))))
      .map((album) => album.id));
    for (const alias of profile.harvestAliases) {
      const result = await getJson<{ data: { albums: ApiAlbum[] } }>(
        `${baseUrl}/api/albums?label=${PARIGO_LABEL_ID}&limit=100&q=${encodeURIComponent(alias)}`,
      );
      const returnedIds = new Set(result.data.albums.map((album) => album.id));
      for (const id of expectedIds) {
        if (!returnedIds.has(id)) throw new Error(`Recherche incomplète pour ${profile.slug} : album ${id} absent.`);
      }
    }
  });

  const trackId = albums.flatMap((album) => album.tracks ?? []).find((track) => track.id)?.id;
  if (!trackId) throw new Error("Aucune piste Parigo disponible pour tester les ayants droit.");
  const firstRightHolders = await getRightHoldersDirect(trackId);
  const secondRightHolders = await getRightHoldersDirect(trackId);
  const holderIdentity = (value: unknown[]) => value.map((holder) => {
    if (!holder || typeof holder !== "object") return "";
    const record = holder as Record<string, unknown>;
    return [record.ID, record.Name, record.Capacity].join("|");
  }).sort();
  if (JSON.stringify(holderIdentity(firstRightHolders)) !== JSON.stringify(holderIdentity(secondRightHolders))) {
    throw new Error("Les identifiants d’ayants droit ne sont pas stables entre deux lectures.");
  }

  console.log([
    `Albums Parigo : ${albumIndex.meta.total}`,
    `Variantes de crédits : ${credits.length}`,
    `Profils rapprochés : ${matchedProfiles.size}`,
    `Crédits non rattachés : ${unmatched.length}`,
    `Ayants droit testés sur ${trackId} : ${firstRightHolders.length}`,
  ].join("\n"));
  if (unmatched.length) console.log(`Non rattachés : ${unmatched.join(" · ")}`);
  if (process.env.WRITE_EDITORIAL_AUDIT === "1") {
    const auditPath = path.join(process.cwd(), "docs/editorial/harvest-credit-snapshot.json");
    await writeFile(auditPath, `${JSON.stringify({
      auditedAt: new Date().toISOString(),
      parigoLabelId: PARIGO_LABEL_ID,
      albumCount: albumIndex.meta.total,
      creditVariantCount: credits.length,
      matchedProfileCount: matchedProfiles.size,
      credits: credits.map((credit) => ({
        credit,
        normalized: normalize(credit),
        composerSlug: aliases.get(normalize(credit)) || null,
      })),
      aliasCollisions: [],
      unmatchedCredits: unmatched,
      publishedProfiles: editorial.composers.filter((profile) => profile.published).map((profile) => profile.slug),
      unpublishedProfiles: editorial.composers.filter((profile) => !profile.published).map((profile) => profile.slug),
      uncreditedClips: editorial.clips.filter((clip) => clip.composerSlugs.length === 0).map((clip) => clip.slug),
      rightHolders: {
        sampledTrackId: trackId,
        count: firstRightHolders.length,
        stableAcrossTwoReads: true,
      },
    }, null, 2)}\n`);
    console.log(`Instantané d’audit écrit : ${path.relative(process.cwd(), auditPath)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
