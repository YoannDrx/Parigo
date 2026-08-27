export {};

import { writeFile } from "node:fs/promises";

type JsonRecord = Record<string, unknown>;

interface Coverage {
  total: number;
  localized: number;
  missing: number;
}

function record(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}

function records(value: unknown, key: string): JsonRecord[] {
  const candidate = record(value)?.[key];
  return Array.isArray(candidate)
    ? candidate.filter((item): item is JsonRecord => Boolean(record(item)))
    : [];
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function findString(value: unknown, keys: string[]): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findString(item, keys);
      if (found) return found;
    }
    return "";
  }
  const source = record(value);
  if (!source) return "";
  for (const [key, nested] of Object.entries(source)) {
    if (keys.some((candidate) => candidate.toLocaleLowerCase("en") === key.toLocaleLowerCase("en"))
      && (typeof nested === "string" || typeof nested === "number")
      && String(nested)) {
      return String(nested);
    }
  }
  for (const nested of Object.values(source)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return "";
}

function localizedValue(item: JsonRecord, language: string): string {
  const match = records(item, "LanguageItems").find((languageItem) => {
    const code = findString(languageItem, [
      "LanguageCode_ISO639_1",
      "LanguageCode",
      "Language",
      "CultureCode",
    ]).trim().toLocaleLowerCase("en").split(/[-_]/)[0];
    return code === language;
  });
  return match ? findString(match, ["Value", "Name", "Text"]).trim() : "";
}

function flattenCategories(items: JsonRecord[], rootName?: string): Array<JsonRecord & { rootName: string }> {
  return items.flatMap((item) => {
    const currentRoot = rootName || String(item.Name || "Unknown");
    return [
      { ...item, rootName: currentRoot },
      ...flattenCategories(records(item, "Attributes"), currentRoot),
    ];
  });
}

function coverage(items: JsonRecord[]): Coverage {
  const localized = items.filter((item) => Boolean(localizedValue(item, "fr"))).length;
  return { total: items.length, localized, missing: items.length - localized };
}

const frenchTaxonomyTerms: Record<string, string> = {
  Abstract: "Abstrait",
  "Action Adventure": "Action / aventure",
  Africa: "Afrique",
  African: "Africain",
  Analog: "Analogique",
  "Alternative Rock": "Rock alternatif",
  "Arthouse": "Art et essai",
  "Asian Beats": "Rythmes asiatiques",
  "B-Movie": "Série B",
  "Brass band": "Fanfare",
  "Can Can": "Cancan",
  "Chamber Music": "Musique de chambre",
  Cinema: "Cinéma",
  Cinematic: "Cinématographique",
  "Classic Hip-Hop": "Hip-hop classique",
  Classical: "Classique",
  "Classique 20th": "Classique du XXe siècle",
  "Comedy Film": "Comédie",
  Comedy: "Comédie",
  "Contemporary Classical": "Classique contemporain",
  "Contemporary Music": "Musique contemporaine",
  Cop: "Policier",
  Corporate: "Institutionnel",
  Crook: "Criminel",
  Detective: "Policier",
  Documentaries: "Documentaires",
  Documentary: "Documentaire",
  Drama: "Drame",
  Dramedy: "Comédie dramatique",
  "Easy Listening": "Musique d’ambiance",
  Electro: "Électro",
  "Electro Pop": "Électropop",
  Electronic: "Électronique",
  Ethnic: "Ethnique",
  Ethiopic: "Éthiopien",
  "Extreme Action": "Action extrême",
  FX: "Effets sonores",
  Fantasy: "Fantastique",
  "Film Noir": "Film noir",
  "French Cinema": "Cinéma français",
  "French Pop": "Pop française",
  "Gypsy Jazz": "Jazz manouche",
  "Heavy Metal": "Heavy metal",
  Historical: "Historique",
  History: "Histoire",
  "Human Drama": "Drame humain",
  Instruments: "Instruments",
  Lullabies: "Berceuses",
  March: "Marche",
  Minimalism: "Minimalisme",
  Minimalist: "Minimaliste",
  "Moden Classical": "Classique moderne",
  "Modern Art": "Art moderne",
  Moods: "Ambiances",
  Movie: "Film",
  Movies: "Films",
  Museum: "Musée",
  "Neo-Classical": "Néoclassique",
  Opera: "Opéra",
  Orchestral: "Orchestral",
  Percussion: "Percussions",
  Period: "Époques",
  "Psychedelic Rock": "Rock psychédélique",
  Receptions: "Réceptions",
  Retro: "Rétro",
  "Rock And Roll": "Rock’n’roll",
  Serenade: "Sérénade",
  "Sci-Fi Film": "Film de science-fiction",
  "Seventies": "Années 70",
  Score: "Musique à l’image",
  Scores: "Musiques à l’image",
  "Silent Movie": "Film muet",
  "Solo Piano": "Piano solo",
  Sonata: "Sonate",
  Spy: "Espionnage",
  "Steel Drums": "Steel drums",
  "Surf Music": "Musique surf",
  "Thanksgiving": "Action de grâce",
  "Thriller Film": "Thriller",
  TV: "Télévision",
  Urban: "Urbain",
  "War Film": "Film de guerre",
  Washboard: "Planche à laver",
  Waltz: "Valse",
  "Western Film": "Western",
  Westcoast: "Côte Ouest",
  Woodblocks: "Blocs de bois",
  World: "Musiques du monde",
  "World Fusion": "Fusion du monde",
  "World Music": "Musiques du monde",
  "Youth Culture": "Culture jeune",
};

function proposedFrenchTranslation(canonicalName: string): string {
  const trimmed = canonicalName.trim();
  return frenchTaxonomyTerms[trimmed] || trimmed;
}

function missingRows(items: Array<JsonRecord & { rootName?: string }>, kind: "category" | "style") {
  return items
    .filter((item) => !localizedValue(item, "fr"))
    .map((item) => ({
      id: findString(item, ["ID", "Id"]),
      kind,
      group: item.rootName || findString(item, ["GroupName", "StyleGroupName"]) || kind,
      canonicalName: findString(item, ["Name", "Value"]),
      proposedTranslation: proposedFrenchTranslation(findString(item, ["Name", "Value"])),
    }));
}

function snapshotRows(items: Array<JsonRecord & { rootName?: string }>, kind: "category" | "style") {
  return items.map((item) => ({
    id: findString(item, ["ID", "Id"]),
    kind,
    group: item.rootName || findString(item, ["GroupName", "StyleGroupName"]) || kind,
    canonicalName: findString(item, ["Name", "Value"]),
    proposedTranslation: proposedFrenchTranslation(findString(item, ["Name", "Value"])),
    languageItems: records(item, "LanguageItems"),
  }));
}

async function main() {
  const authUrl = process.env.HARVEST_AUTH_URL || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL || "https://service.harvestmedia.net/HMP-WS.svc";
  const oauthResponse = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept-Encoding": "identity" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: required("HARVEST_CLIENT_ID"),
      client_secret: required("HARVEST_CLIENT_SECRET"),
    }),
  });
  if (!oauthResponse.ok) throw new Error(`Harvest OAuth returned HTTP ${oauthResponse.status}`);
  const accessToken = findString(await oauthResponse.json(), ["access_token"]);
  if (!accessToken) throw new Error("Harvest OAuth token missing");

  async function call(path: string, extraHeaders: Record<string, string> = {}): Promise<JsonRecord> {
    const response = await fetch(`${serviceUrl}${path}`, {
      headers: {
        Accept: "application/json",
        Authorization: accessToken,
        "Accept-Encoding": "identity",
        ...extraHeaders,
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Harvest returned HTTP ${response.status} for ${path.split("?")[0]}`);
    return record(await response.json()) || {};
  }

  const service = await call("/getservicetoken", { AccessKey: required("HARVEST_ACCESS_KEY") });
  const serviceToken = findString(service, ["Value", "Token"]);
  const regions = await call(`/getregions/${serviceToken}`);
  const regionId = findString(regions, ["ID", "RegionID"]);
  const guest = await call(`/getguestmembertoken/${serviceToken}/${regionId}`);
  const guestToken = findString(guest, ["Value", "Token"]);
  if (!serviceToken || !regionId || !guestToken) throw new Error("Harvest guest-token setup failed");

  const categoryPayload = await call(`/getcategories/${guestToken}/hasactivetrackonly?languagecode=fr`);
  const categoryRows = flattenCategories(records(categoryPayload, "Categories"));
  const categoryGroups = records(categoryPayload, "Categories").map((group) => {
    const name = String(group.Name || "Unknown");
    return { name, ...coverage(categoryRows.filter((item) => item.rootName === name)) };
  });
  const [stylesFrPayload, stylesEnPayload] = await Promise.all([
    call(`/getstyles/${guestToken}/fr?groupID=`),
    call(`/getstyles/${guestToken}/en?groupID=`),
  ]);
  const styles = records(stylesFrPayload, "Styles");
  const englishStyles = records(stylesEnPayload, "Styles");
  const sad = categoryRows.find((item) => String(item.ID) === "b71182fbd44d6ef6");
  const sadFrench = sad ? localizedValue(sad, "fr") : "";
  const abstract = styles.find((item) =>
    String(item.Name).trim().toLocaleLowerCase("en") === "abstract" || localizedValue(item, "fr") === "Abstrait");
  const abstractFrench = abstract ? localizedValue(abstract, "fr") : "";
  const abstractEnglish = abstract
    ? englishStyles.find((item) => String(item.ID) === String(abstract.ID))
    : undefined;

  const report = {
    checkedAt: new Date().toISOString(),
    categories: { ...coverage(categoryRows), groups: categoryGroups },
    styles: coverage(styles),
    missingItems: [
      ...missingRows(categoryRows, "category"),
      ...missingRows(styles, "style"),
    ],
    acceptanceFixture: {
      id: sad?.ID,
      canonicalName: sad?.Name,
      localizedName: sadFrench,
    },
    styleAcceptanceFixture: {
      id: abstract?.ID,
      englishName: abstractEnglish?.Name,
      frenchName: abstract?.Name,
      localizedName: abstractFrench || abstract?.Name,
    },
  };

  const snapshotPath = process.env.HARVEST_TAXONOMY_SNAPSHOT_PATH?.trim();
  if (snapshotPath) {
    await writeFile(snapshotPath, `${JSON.stringify({
      exportedAt: report.checkedAt,
      categories: snapshotRows(categoryRows, "category"),
      styles: snapshotRows(styles, "style"),
    }, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify({ ...report, snapshotPath: snapshotPath || undefined }, null, 2));

  if (!sad || sad.Name !== "Sad" || sadFrench !== "Triste") {
    throw new Error(`French Sad contract failed (canonical=${String(sad?.Name)}, localized=${sadFrench})`);
  }
  if (!abstract || abstractEnglish?.Name !== "Abstract" || abstract.Name !== "Abstrait") {
    throw new Error(`French Abstract contract failed (english=${String(abstractEnglish?.Name)}, french=${String(abstract?.Name)})`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
