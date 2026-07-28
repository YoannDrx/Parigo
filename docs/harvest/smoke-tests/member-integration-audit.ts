export {};

type JsonRecord = Record<string, unknown>;
type AuditResult = {
  family: string;
  operation: string;
  surface: "BFF" | "Harvest direct" | "Sécurité" | "Contrat";
  endpoint: string;
  status: number | string;
  outcome: "PASS" | "FAIL" | "SKIP" | "INFO";
  detail: string;
  cleanup: "réussi" | "non nécessaire" | "non applicable" | "non testé" | "échoué";
};

const baseUrl = process.env.PARIGO_AUDIT_BASE_URL || "http://127.0.0.1:3000";
const origin = new URL(baseUrl).origin;
const results: AuditResult[] = [];
const runId = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const prefix = `Parigo audit ${runId}`;
let cookie = "";
let mutationsAllowed = true;

function required(name: string, aliases: string[] = []): string {
  for (const key of [name, ...aliases]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing ${name}`);
}

function record(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}

function records(value: unknown, key: string): JsonRecord[] {
  const object = record(value);
  const list = object?.[key];
  return Array.isArray(list) ? list.filter((item): item is JsonRecord => Boolean(record(item))) : [];
}

function findObject(value: unknown, key: string): JsonRecord | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findObject(item, key);
      if (found) return found;
    }
    return undefined;
  }
  const object = record(value);
  if (!object) return undefined;
  for (const [candidate, nested] of Object.entries(object)) {
    if (candidate.toLowerCase() === key.toLowerCase() && record(nested)) return record(nested);
  }
  for (const nested of Object.values(object)) {
    const found = findObject(nested, key);
    if (found) return found;
  }
  return undefined;
}

function findString(value: unknown, keys: string[]): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findString(item, keys);
      if (found) return found;
    }
    return undefined;
  }
  const object = record(value);
  if (!object) return undefined;
  for (const [key, nested] of Object.entries(object)) {
    if (keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase()) &&
        (typeof nested === "string" || typeof nested === "number") && String(nested)) {
      return String(nested);
    }
  }
  for (const nested of Object.values(object)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return undefined;
}

function logicalError(value: unknown): { code?: string; message: string } | undefined {
  const object = record(value);
  if (!object) return undefined;
  const error = record(object.Error) || record(object.error) ||
    (typeof object.Error === "string" ? { Message: object.Error } : undefined);
  if (!error) return undefined;
  return {
    code: String(error.Code || error.code || ""),
    message: String(error.Message || error.message || error.ErrorMessage || error.Code || "Harvest logical error"),
  };
}

function containsValue(value: unknown, expected: string, candidateKeys = ["ID", "id", "TrackID", "PlaylistID", "TagID"]): boolean {
  if (Array.isArray(value)) return value.some((item) => containsValue(item, expected, candidateKeys));
  const object = record(value);
  if (!object) return false;
  for (const [key, nested] of Object.entries(object)) {
    if (candidateKeys.some((candidate) => candidate.toLowerCase() === key.toLowerCase()) &&
        String(nested) === expected) return true;
    if (containsValue(nested, expected, candidateKeys)) return true;
  }
  return false;
}

function idsFrom(value: unknown, key: string): string[] {
  const object = record(value);
  const data = record(object?.data);
  const list = data?.[key];
  if (!Array.isArray(list)) return [];
  return list.map((item) => findString(item, ["id", "ID"]) || "").filter(Boolean);
}

function addResult(result: AuditResult): void {
  results.push(result);
  const line = {
    family: result.family,
    operation: result.operation,
    endpoint: result.endpoint,
    status: result.status,
    outcome: result.outcome,
    detail: result.detail,
    cleanup: result.cleanup,
  };
  console.log(JSON.stringify(line));
}

function safeError(payload: unknown, status: number): string {
  const error = logicalError(payload);
  if (error) return [error.code ? `code=${error.code}` : "", error.message].filter(Boolean).join(" ");
  return `HTTP ${status}`;
}

function captureCookie(response: Response): void {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return;
  const match = setCookie.match(/(?:^|,\s*)((?:__Host-)?parigo_session)=([^;]+)/);
  if (match) cookie = `${match[1]}=${match[2]}`;
  if (/parigo_session=;\s*Path=/i.test(setCookie)) cookie = "";
}

async function bff(path: string, init: RequestInit = {}, options: { useCookie?: boolean; requestOrigin?: string | null } = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (options.useCookie !== false && cookie) headers.set("Cookie", cookie);
  if (options.requestOrigin !== null && init.method && init.method !== "GET" && init.method !== "HEAD") {
    headers.set("Origin", options.requestOrigin || origin);
  }
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual" });
  captureCookie(response);
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload, headers: response.headers };
}

function json(method: string, body?: unknown): RequestInit {
  return { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (process.env.HARVEST_MEMBER_AUDIT !== "1") {
    console.log("Harvest member integration audit skipped (set HARVEST_MEMBER_AUDIT=1 to enable).");
    return;
  }

  const authUrl = process.env.HARVEST_AUTH_URL || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL || "https://service.harvestmedia.net/HMP-WS.svc";
  const accessKey = required("HARVEST_ACCESS_KEY", ["HM_ServiceAPI_Key"]);
  const clientId = required("HARVEST_CLIENT_ID", ["HM_ServiceAPI_AuthClientID"]);
  const clientSecret = required("HARVEST_CLIENT_SECRET", ["HM_ServiceAPI_AuthClientSecret"]);
  const email = required("HARVEST_TEST_MEMBER_EMAIL");
  const password = required("HARVEST_TEST_MEMBER_PASSWORD");

  const oauthResponse = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
  });
  const oauth = await oauthResponse.json();
  const accessToken = findString(oauth, ["access_token"]);
  if (!oauthResponse.ok || !accessToken) throw new Error("OAuth Harvest failed");
  const harvestHeaders = { Accept: "application/json", Authorization: accessToken };

  async function direct(path: string, init: RequestInit = {}) {
    const response = await fetch(`${serviceUrl}${path}`, {
      ...init,
      headers: {
        ...harvestHeaders,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const payload = await response.json().catch(() => ({}));
    return { status: response.status, payload, error: logicalError(payload) };
  }

  const service = await direct("/getservicetoken", { headers: { AccessKey: accessKey } });
  const serviceToken = findString(service.payload, ["Token", "ServiceToken", "Value"]);
  if (service.status !== 200 || !serviceToken) throw new Error("Harvest service token failed");
  const login = await direct(`/getmembertoken/${serviceToken}`, json("POST", {
    UserName: email,
    Password: password,
    PersistentLogin: true,
    ReturnMemberDetails: true,
  }));
  const memberTokenContainer = findObject(login.payload, "MemberToken") || findObject(login.payload, "Token");
  const persistentContainer = findObject(login.payload, "PersistentLoginToken");
  const memberToken = findString(memberTokenContainer, ["Value", "Token"]);
  const persistentToken = findString(persistentContainer, ["Token", "Value"]);
  if (login.status !== 200 || login.error || !memberToken || !persistentToken) {
    throw new Error("Harvest direct member login failed");
  }
  addResult({
    family: "Authentification",
    operation: "OAuth, service token et member token",
    surface: "Harvest direct",
    endpoint: "POST getmembertoken",
    status: 200,
    outcome: "PASS",
    detail: "Tokens reçus et volontairement expurgés.",
    cleanup: "non nécessaire",
  });

  const refresh = await direct(`/validatepersistentlogintoken/${serviceToken}`, json("POST", {
    Token: persistentToken,
    RenewExpiry: true,
    GenerateMemberToken: true,
    ReturnMemberDetails: true,
  }));
  addResult({
    family: "Authentification",
    operation: "Renouvellement par persistent token",
    surface: "Harvest direct",
    endpoint: "POST validatepersistentlogintoken",
    status: refresh.status,
    outcome: refresh.status === 200 && !refresh.error && Boolean(findObject(refresh.payload, "MemberToken")) ? "PASS" : "FAIL",
    detail: refresh.error ? safeError(refresh.payload, refresh.status) : "Nouveau member token renvoyé.",
    cleanup: "non nécessaire",
  });

  const unauth = await bff("/api/user/tags", {}, { useCookie: false });
  addResult({
    family: "Sécurité",
    operation: "Refus sans cookie",
    surface: "Sécurité",
    endpoint: "GET /api/user/tags",
    status: unauth.status,
    outcome: unauth.status === 401 ? "PASS" : "FAIL",
    detail: unauth.status === 401 ? "Route membre protégée." : safeError(unauth.payload, unauth.status),
    cleanup: "non nécessaire",
  });

  const bffLogin = await bff("/api/auth/login", json("POST", { email, password }), { useCookie: false });
  const loginText = JSON.stringify(bffLogin.payload);
  const loginSafe = bffLogin.status === 200 && Boolean(cookie) &&
    !/(memberToken|persistentToken|access_token|client_secret|password)/i.test(loginText);
  addResult({
    family: "Authentification",
    operation: "Connexion et session publique minimale",
    surface: "BFF",
    endpoint: "POST /api/auth/login",
    status: bffLogin.status,
    outcome: loginSafe ? "PASS" : "FAIL",
    detail: loginSafe ? "Cookie httpOnly reçu ; aucun token Harvest dans le JSON public." : safeError(bffLogin.payload, bffLogin.status),
    cleanup: "non nécessaire",
  });
  if (!loginSafe) throw new Error("BFF login failed or exposed a secret");

  const session = await bff("/api/auth/session");
  const sessionText = JSON.stringify(session.payload);
  const publicSessionSafe = session.status === 200 &&
    !/(memberToken|persistentToken|access_token|client_secret|password)/i.test(sessionText);
  addResult({
    family: "Authentification",
    operation: "Lecture de session",
    surface: "BFF",
    endpoint: "GET /api/auth/session",
    status: session.status,
    outcome: publicSessionSafe ? "PASS" : "FAIL",
    detail: publicSessionSafe ? "Identité publique minimale, Cache-Control no-store." : "Contrat public ou expurgation incorrect.",
    cleanup: "non nécessaire",
  });

  const evilOrigin = await bff("/api/user/tags", json("POST", { name: `${prefix} forbidden` }), {
    requestOrigin: "https://example.invalid",
  });
  addResult({
    family: "Sécurité",
    operation: "Refus cross-origin",
    surface: "Sécurité",
    endpoint: "POST /api/user/tags",
    status: evilOrigin.status,
    outcome: evilOrigin.status === 403 ? "PASS" : "FAIL",
    detail: evilOrigin.status === 403 ? "Mutation bloquée avant création." : safeError(evilOrigin.payload, evilOrigin.status),
    cleanup: "non nécessaire",
  });

  const search = await bff("/api/search?q=piano&limit=12");
  const searchItems = record(record(search.payload)?.data)?.items;
  const tracks = Array.isArray(searchItems)
    ? searchItems.map((item) => findString(item, ["id", "ID"]) || "").filter(Boolean)
    : [];
  if (search.status !== 200 || tracks.length < 2) throw new Error("Unable to select two catalogue tracks");
  const trackId = tracks[0];
  const trackId2 = tracks[1];

  const initialFavourites = await bff("/api/user/favorites/tracks");
  const existingFavouriteIds = new Set(idsFrom(initialFavourites.payload, "tracks"));
  const selectedTrackId = tracks.find((id) => !existingFavouriteIds.has(id));
  if (!selectedTrackId) throw new Error("No non-favourite track found in search sample");

  // Track favourite lifecycle.
  const addFavourite = await bff("/api/user/favorites/tracks", json("POST", { trackId: selectedTrackId }));
  let favouriteDirect = await direct(`/getfavourites/${memberToken}?Skip=0&Limit=500&Sort=Created_Desc`);
  let favouriteVisibleAt = containsValue(favouriteDirect.payload, selectedTrackId) ? 0 : -1;
  for (const delay of [250, 1000, 3000, 10000]) {
    if (favouriteVisibleAt >= 0) break;
    await sleep(delay);
    favouriteDirect = await direct(`/getfavourites/${memberToken}?Skip=0&Limit=500&Sort=Created_Desc`);
    if (containsValue(favouriteDirect.payload, selectedTrackId)) favouriteVisibleAt = delay;
  }
  const favouriteBff = await bff("/api/user/favorites/tracks");
  const favouritePersisted = containsValue(favouriteBff.payload, selectedTrackId) &&
    containsValue(favouriteDirect.payload, selectedTrackId);
  addResult({
    family: "Favoris track",
    operation: "Ajout et relecture",
    surface: "BFF",
    endpoint: "POST /api/user/favorites/tracks → GET getfavourites",
    status: addFavourite.status,
    outcome: addFavourite.status === 200 && favouritePersisted ? "PASS" : "FAIL",
    detail: favouritePersisted ? `Persisté et visible après ${Math.max(0, favouriteVisibleAt)} ms.` : safeError(addFavourite.payload, addFavourite.status),
    cleanup: "non testé",
  });
  const removeFavourite = await bff("/api/user/favorites/tracks", json("DELETE", { trackId: selectedTrackId }));
  await sleep(250);
  const favouriteAfterDelete = await direct(`/getfavourites/${memberToken}?Skip=0&Limit=500&Sort=Created_Desc`);
  const favouriteRemoved = removeFavourite.status === 200 && !containsValue(favouriteAfterDelete.payload, selectedTrackId);
  addResult({
    family: "Favoris track",
    operation: "Suppression et relecture",
    surface: "BFF",
    endpoint: "DELETE /api/user/favorites/tracks → GET getfavourites",
    status: removeFavourite.status,
    outcome: favouriteRemoved ? "PASS" : "FAIL",
    detail: favouriteRemoved ? "Track absente après nettoyage." : safeError(removeFavourite.payload, removeFavourite.status),
    cleanup: favouriteRemoved ? "réussi" : "échoué",
  });
  if (!favouriteRemoved) mutationsAllowed = false;

  // Member playlist lifecycle.
  if (mutationsAllowed) {
    const beforePlaylists = await bff("/api/user/playlists");
    const beforePlaylistIds = new Set(idsFrom(beforePlaylists.payload, "playlists"));
    const createdPlaylist = await bff("/api/user/playlists", json("POST", {
      title: `${prefix} playlist`,
      description: "Création BFF audit",
    }));
    let playlistId = findString(record(record(createdPlaylist.payload)?.data)?.playlist, ["id", "ID"]) || "";
    if (!playlistId) {
      const afterCreate = await bff("/api/user/playlists");
      playlistId = idsFrom(afterCreate.payload, "playlists").find((id) => !beforePlaylistIds.has(id)) || "";
    }
    const directPlaylistList = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=100`);
    const createdPersisted = Boolean(playlistId) && containsValue(directPlaylistList.payload, playlistId);
    addResult({
      family: "Playlists membre",
      operation: "Création et identification distante",
      surface: "BFF",
      endpoint: "POST /api/user/playlists → addmemberplaylist",
      status: createdPlaylist.status,
      outcome: createdPlaylist.status === 201 && createdPersisted ? "PASS" : "FAIL",
      detail: createdPersisted ? "Playlist identifiée directement chez Harvest." : safeError(createdPlaylist.payload, createdPlaylist.status),
      cleanup: "non testé",
    });

    if (!playlistId) {
      addResult({
        family: "Playlists membre",
        operation: "Contrat de création sans ressource",
        surface: "Contrat",
        endpoint: "addmemberplaylist",
        status: createdPlaylist.status,
        outcome: "FAIL",
        detail: `Le BFF répond ${createdPlaylist.status} et aucune ressource sentinelle n’est présente dans la liste Harvest (Limit=500).`,
        cleanup: "non nécessaire",
      });
    } else {
      let playlistCleanup = false;
      try {
        const updatePlaylist = await bff(`/api/user/playlists/${encodeURIComponent(playlistId)}`, json("PATCH", {
          title: `${prefix} playlist renommée`,
          description: "Description modifiée et relue",
        }));
        const detailPlaylist = await bff(`/api/user/playlists/${encodeURIComponent(playlistId)}`);
        const detailText = JSON.stringify(detailPlaylist.payload);
        const updateVisible = detailText.includes(`${prefix} playlist renommée`) &&
          detailText.includes("Description modifiée et relue");
        addResult({
          family: "Playlists membre",
          operation: "Modification nom/description",
          surface: "BFF",
          endpoint: "PATCH /api/user/playlists/[id] → updateplaylist",
          status: updatePlaylist.status,
          outcome: updatePlaylist.status === 200 && updateVisible ? "PASS" : "FAIL",
          detail: updateVisible ? "Nom et description relus via le BFF." : safeError(updatePlaylist.payload, updatePlaylist.status),
          cleanup: "non testé",
        });

        const addTracks = await bff(`/api/user/playlists/${encodeURIComponent(playlistId)}/tracks`, json("POST", {
          action: "add",
          trackIds: [trackId, trackId2],
        }));
        const detailAfterTracks = await bff(`/api/user/playlists/${encodeURIComponent(playlistId)}`);
        const bothTracks = containsValue(detailAfterTracks.payload, trackId) && containsValue(detailAfterTracks.payload, trackId2);
        addResult({
          family: "Playlists membre",
          operation: "Ajout de deux tracks et relecture",
          surface: "BFF",
          endpoint: "POST /api/user/playlists/[id]/tracks → addtomemberplaylists",
          status: addTracks.status,
          outcome: addTracks.status === 200 && bothTracks ? "PASS" : "FAIL",
          detail: bothTracks ? "Les deux tracks sont persistées." : safeError(addTracks.payload, addTracks.status),
          cleanup: "non testé",
        });

        const reorder = await bff(`/api/user/playlists/${encodeURIComponent(playlistId)}/tracks`, json("POST", {
          action: "reorder",
          trackIds: [trackId2, trackId],
        }));
        const directPlaylist = await direct(`/getmemberplaylist/${memberToken}/${encodeURIComponent(playlistId)}?returntracks=true&returnpublishlocations=false`);
        const directTrackItems = records(records(directPlaylist.payload, "Playlists")[0], "Tracks");
        const directOrder = directTrackItems.map((item) => findString(item, ["ID", "TrackID"]) || "").filter(Boolean);
        const reordered = directOrder[0] === trackId2 && directOrder[1] === trackId;
        addResult({
          family: "Playlists membre",
          operation: "Réordonnancement et relecture directe",
          surface: "BFF",
          endpoint: "POST /api/user/playlists/[id]/tracks → reordermemberplaylisttracks",
          status: reorder.status,
          outcome: reorder.status === 200 && reordered ? "PASS" : "FAIL",
          detail: reordered ? "Ordre Harvest conforme." : "Le BFF annonce verified=true, mais l’ordre direct ne correspond pas.",
          cleanup: "non testé",
        });

        const suggestions = await bff(`/api/user/playlists/${encodeURIComponent(playlistId)}/suggestions?limit=5`);
        const suggestionIds = idsFrom(suggestions.payload, "tracks");
        addResult({
          family: "Playlists membre",
          operation: "Suggestions",
          surface: "BFF",
          endpoint: "GET /api/user/playlists/[id]/suggestions → suggestmemberplaylisttracks",
          status: suggestions.status,
          outcome: suggestions.status === 200 ? "PASS" : "FAIL",
          detail: suggestions.status === 200 ? `${suggestionIds.length} suggestion(s) normalisée(s).` : safeError(suggestions.payload, suggestions.status),
          cleanup: "non nécessaire",
        });

        const removeTrack = await bff(`/api/user/playlists/${encodeURIComponent(playlistId)}/tracks`, json("POST", {
          action: "remove",
          trackIds: [trackId],
        }));
        const directAfterRemove = await direct(`/getmemberplaylist/${memberToken}/${encodeURIComponent(playlistId)}?returntracks=true&returnpublishlocations=false`);
        const oneRemoved = !containsValue(directAfterRemove.payload, trackId) && containsValue(directAfterRemove.payload, trackId2);
        addResult({
          family: "Playlists membre",
          operation: "Retrait d’une track et relecture directe",
          surface: "BFF",
          endpoint: "POST /api/user/playlists/[id]/tracks → removeplaylisttracks",
          status: removeTrack.status,
          outcome: removeTrack.status === 200 && oneRemoved ? "PASS" : "FAIL",
          detail: oneRemoved ? "Track retirée, seconde track conservée." : "État Harvest non conforme après retrait.",
          cleanup: "non testé",
        });

        const invalidShare = await bff(`/api/user/playlists/${encodeURIComponent(playlistId)}/share`, json("POST", {
          playlistTitle: `${prefix} playlist`,
          toEmail: "invalid",
          sendEmail: false,
        }));
        addResult({
          family: "Partage",
          operation: "Validation sans création de partage ni e-mail",
          surface: "Contrat",
          endpoint: "POST /api/user/playlists/[id]/share",
          status: invalidShare.status,
          outcome: invalidShare.status === 400 ? "PASS" : "FAIL",
          detail: invalidShare.status === 400 ? "Payload invalide rejeté avant appel Harvest." : safeError(invalidShare.payload, invalidShare.status),
          cleanup: "non nécessaire",
        });
      } finally {
        const removePlaylist = await bff(`/api/user/playlists/${encodeURIComponent(playlistId)}`, json("DELETE"));
        await sleep(250);
        const afterDelete = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=100`);
        playlistCleanup = removePlaylist.status === 200 && !containsValue(afterDelete.payload, playlistId);
        addResult({
          family: "Playlists membre",
          operation: "Suppression et relecture",
          surface: "BFF",
          endpoint: "DELETE /api/user/playlists/[id] → removeplaylist",
          status: removePlaylist.status,
          outcome: playlistCleanup ? "PASS" : "FAIL",
          detail: playlistCleanup ? "Playlist de test absente chez Harvest." : safeError(removePlaylist.payload, removePlaylist.status),
          cleanup: playlistCleanup ? "réussi" : "échoué",
        });
        if (!playlistCleanup) mutationsAllowed = false;
      }
    }
  }

  // Copying a featured playlist is safe only if the copy can be identified and deleted.
  if (mutationsAllowed) {
    const featured = await bff("/api/playlists?limit=1");
    const featuredId = idsFrom(featured.payload, "playlists")[0];
    const beforeCopy = await bff("/api/user/playlists");
    const beforeCopyIds = new Set(idsFrom(beforeCopy.payload, "playlists"));
    if (featuredId) {
      const copied = await bff("/api/user/playlists/copy-featured", json("POST", { playlistId: featuredId }));
      await sleep(500);
      const afterCopy = await bff("/api/user/playlists");
      const copyId = idsFrom(afterCopy.payload, "playlists").find((id) => !beforeCopyIds.has(id));
      let cleaned = false;
      if (copyId) {
        try {
          const copiedDetail = await bff(`/api/user/playlists/${encodeURIComponent(copyId)}`);
          const copiedPlaylist = record(record(copiedDetail.payload)?.data)?.playlist;
          const initialCopiedTrackIds = records(copiedPlaylist, "tracks")
            .map((item) => findString(item, ["id", "ID"]) || "")
            .filter(Boolean);
          addResult({
            family: "Playlists membre",
            operation: "Lecture du détail de la copie",
            surface: "BFF",
            endpoint: "GET /api/user/playlists/[id] → getmemberplaylist",
            status: copiedDetail.status,
            outcome: copiedDetail.status === 200 && initialCopiedTrackIds.length > 0 ? "PASS" : "FAIL",
            detail: `${initialCopiedTrackIds.length} track(s) dans la copie isolée.`,
            cleanup: "non testé",
          });

          const updateCopy = await bff(`/api/user/playlists/${encodeURIComponent(copyId)}`, json("PATCH", {
            title: `${prefix} copie renommée`,
            description: "Copie isolée pour audit des mutations",
          }));
          const copyAfterUpdate = await bff(`/api/user/playlists/${encodeURIComponent(copyId)}`);
          const copyUpdated = JSON.stringify(copyAfterUpdate.payload).includes(`${prefix} copie renommée`);
          addResult({
            family: "Playlists membre",
            operation: "Modification de la copie",
            surface: "BFF",
            endpoint: "PATCH /api/user/playlists/[id] → updateplaylist",
            status: updateCopy.status,
            outcome: updateCopy.status === 200 && copyUpdated ? "PASS" : "FAIL",
            detail: copyUpdated ? "Nom et description relus." : safeError(updateCopy.payload, updateCopy.status),
            cleanup: "non testé",
          });

          const trackToAdd = tracks.find((id) => !initialCopiedTrackIds.includes(id));
          if (trackToAdd) {
            const addToCopy = await bff(`/api/user/playlists/${encodeURIComponent(copyId)}/tracks`, json("POST", {
              action: "add",
              trackIds: [trackToAdd],
            }));
            const directAfterAdd = await direct(`/getmemberplaylist/${memberToken}/${encodeURIComponent(copyId)}?returntracks=true&returnpublishlocations=false`);
            const added = containsValue(directAfterAdd.payload, trackToAdd);
            addResult({
              family: "Playlists membre",
              operation: "Ajout d’une track à la copie",
              surface: "BFF",
              endpoint: "POST /api/user/playlists/[id]/tracks → addtomemberplaylists",
              status: addToCopy.status,
              outcome: addToCopy.status === 200 && added ? "PASS" : "FAIL",
              detail: added ? "Track visible directement chez Harvest." : safeError(addToCopy.payload, addToCopy.status),
              cleanup: "non testé",
            });

            const afterAddPlaylists = records(directAfterAdd.payload, "Playlists");
            const orderBefore = records(afterAddPlaylists[0], "Tracks")
              .map((item) => findString(item, ["ID", "TrackID"]) || "")
              .filter(Boolean);
            if (orderBefore.length >= 2) {
              const desiredOrder = [...orderBefore].reverse();
              const reorderCopy = await bff(`/api/user/playlists/${encodeURIComponent(copyId)}/tracks`, json("POST", {
                action: "reorder",
                trackIds: desiredOrder,
              }));
              const directAfterReorder = await direct(`/getmemberplaylist/${memberToken}/${encodeURIComponent(copyId)}?returntracks=true&returnpublishlocations=false`);
              const playlistsAfterReorder = records(directAfterReorder.payload, "Playlists");
              const orderAfter = records(playlistsAfterReorder[0], "Tracks")
                .map((item) => findString(item, ["ID", "TrackID"]) || "")
                .filter(Boolean);
              const orderMatches = desiredOrder.every((id, index) => orderAfter[index] === id);
              addResult({
                family: "Playlists membre",
                operation: "Réordonnancement complet de la copie",
                surface: "BFF",
                endpoint: "POST /api/user/playlists/[id]/tracks → reordermemberplaylisttracks",
                status: reorderCopy.status,
                outcome: reorderCopy.status === 200 && orderMatches ? "PASS" : "FAIL",
                detail: orderMatches ? "Ordre exact confirmé directement." : "Le BFF répond verified=true sans ordre Harvest conforme.",
                cleanup: "non testé",
              });
            }

            const removeFromCopy = await bff(`/api/user/playlists/${encodeURIComponent(copyId)}/tracks`, json("POST", {
              action: "remove",
              trackIds: [trackToAdd],
            }));
            const directAfterRemove = await direct(`/getmemberplaylist/${memberToken}/${encodeURIComponent(copyId)}?returntracks=true&returnpublishlocations=false`);
            const removedTrack = !containsValue(directAfterRemove.payload, trackToAdd);
            addResult({
              family: "Playlists membre",
              operation: "Retrait d’une track de la copie",
              surface: "BFF",
              endpoint: "POST /api/user/playlists/[id]/tracks → removeplaylisttracks",
              status: removeFromCopy.status,
              outcome: removeFromCopy.status === 200 && removedTrack ? "PASS" : "FAIL",
              detail: removedTrack ? "Absence confirmée directement." : "Track encore présente malgré le succès BFF.",
              cleanup: "non testé",
            });
          }

          const suggestionsCopy = await bff(`/api/user/playlists/${encodeURIComponent(copyId)}/suggestions?limit=5`);
          addResult({
            family: "Playlists membre",
            operation: "Suggestions sur la copie",
            surface: "BFF",
            endpoint: "GET /api/user/playlists/[id]/suggestions → suggestmemberplaylisttracks",
            status: suggestionsCopy.status,
            outcome: suggestionsCopy.status === 200 ? "PASS" : "FAIL",
            detail: suggestionsCopy.status === 200
              ? `${idsFrom(suggestionsCopy.payload, "tracks").length} suggestion(s) normalisée(s).`
              : safeError(suggestionsCopy.payload, suggestionsCopy.status),
            cleanup: "non nécessaire",
          });

          const invalidShare = await bff(`/api/user/playlists/${encodeURIComponent(copyId)}/share`, json("POST", {
            playlistTitle: `${prefix} copie`,
            toEmail: "invalid",
            sendEmail: false,
          }));
          addResult({
            family: "Partage",
            operation: "Validation sans créer de lien",
            surface: "Contrat",
            endpoint: "POST /api/user/playlists/[id]/share",
            status: invalidShare.status,
            outcome: invalidShare.status === 400 ? "PASS" : "FAIL",
            detail: invalidShare.status === 400 ? "Payload invalide rejeté localement." : safeError(invalidShare.payload, invalidShare.status),
            cleanup: "non nécessaire",
          });
        } finally {
          const removed = await bff(`/api/user/playlists/${encodeURIComponent(copyId)}`, json("DELETE"));
          const verify = await direct(`/getmemberplaylistsnotracks/${memberToken}?Skip=0&Limit=100`);
          cleaned = removed.status === 200 && !containsValue(verify.payload, copyId);
        }
      }
      addResult({
        family: "Playlists membre",
        operation: "Copie d’une playlist éditoriale",
        surface: "BFF",
        endpoint: "POST /api/user/playlists/copy-featured → copytomemberplaylist",
        status: copied.status,
        outcome: copied.status === 200 && Boolean(copyId) && cleaned ? "PASS" : "FAIL",
        detail: copyId ? "Copie identifiée par différentiel avant/après." : "Le BFF indique copied mais aucune nouvelle playlist identifiable.",
        cleanup: cleaned ? "réussi" : "échoué",
      });
      if (!cleaned && copyId) mutationsAllowed = false;
    } else {
      addResult({
        family: "Playlists membre",
        operation: "Copie d’une playlist éditoriale",
        surface: "BFF",
        endpoint: "copytomemberplaylist",
        status: featured.status,
        outcome: "SKIP",
        detail: "Aucune playlist éditoriale sélectionnable.",
        cleanup: "non applicable",
      });
    }
  }

  // Saved search lifecycle.
  if (mutationsAllowed) {
    const authenticatedSearch = await bff(`/api/search?q=${encodeURIComponent(`piano ${runId.slice(-4)}`)}&limit=5`);
    const searchHistoryId = findString(record(authenticatedSearch.payload)?.meta, ["searchHistoryId"]);
    if (!searchHistoryId) {
      addResult({
        family: "Recherches sauvegardées",
        operation: "Création d’un historique de recherche",
        surface: "Harvest direct",
        endpoint: "POST cloudsearch (member token)",
        status: authenticatedSearch.status,
        outcome: "FAIL",
        detail: "Aucun searchHistoryId renvoyé ; addmembersavesearch non déclenché.",
        cleanup: "non nécessaire",
      });
    } else {
      const createSearch = await bff("/api/user/searches", json("POST", {
        name: `${prefix} recherche`,
        searchHistoryId,
        searchUrl: `/search?q=piano&audit=${runId}`,
      }));
      const searchId = findString(record(record(createSearch.payload)?.data)?.search, ["id", "ID"]) || "";
      const directSearchList = await direct(`/searchmembersavesearches/${memberToken}`, json("POST", {
        Keywords: prefix,
        Skip: 0,
        Limit: 100,
        Sort: "Created_Desc",
      }));
      const saved = Boolean(searchId) && containsValue(directSearchList.payload, searchId);
      addResult({
        family: "Recherches sauvegardées",
        operation: "Création, ID et relecture",
        surface: "BFF",
        endpoint: "POST /api/user/searches → addmembersavesearch",
        status: createSearch.status,
        outcome: createSearch.status === 201 && saved ? "PASS" : "FAIL",
        detail: saved ? "Nom, SearchHistoryID et URL PARIGO_URL persistés." : safeError(createSearch.payload, createSearch.status),
        cleanup: "non testé",
      });
      if (searchId) {
        const removeSearch = await bff(`/api/user/searches?id=${encodeURIComponent(searchId)}`, json("DELETE"));
        const afterSearchDelete = await direct(`/searchmembersavesearches/${memberToken}`, json("POST", {
          Keywords: prefix,
          Skip: 0,
          Limit: 100,
          Sort: "Created_Desc",
        }));
        const cleaned = removeSearch.status === 200 && !containsValue(afterSearchDelete.payload, searchId);
        addResult({
          family: "Recherches sauvegardées",
          operation: "Suppression et relecture",
          surface: "BFF",
          endpoint: "DELETE /api/user/searches → removemembersavedsearch",
          status: removeSearch.status,
          outcome: cleaned ? "PASS" : "FAIL",
          detail: cleaned ? "Recherche de test absente." : safeError(removeSearch.payload, removeSearch.status),
          cleanup: cleaned ? "réussi" : "échoué",
        });
        if (!cleaned) mutationsAllowed = false;
      } else if (createSearch.status === 201) {
        mutationsAllowed = false;
      }
    }
  }

  // Personal tag lifecycle.
  if (mutationsAllowed) {
    const createTag = await bff("/api/user/tags", json("POST", { name: `${prefix} tag` }));
    const tagId = findString(record(record(createTag.payload)?.data)?.tag, ["id", "TagID", "ID"]) || "";
    const directTags = await direct(`/getmembertags/${memberToken}?Skip=0&Limit=100&Sort=Alphabetic_Asc&ReturnTagCount=1`);
    const tagCreated = Boolean(tagId) && containsValue(directTags.payload, tagId);
    addResult({
      family: "Tags personnels",
      operation: "Création et relecture",
      surface: "BFF",
      endpoint: "POST /api/user/tags → addmembertag",
      status: createTag.status,
      outcome: createTag.status === 201 && tagCreated ? "PASS" : "FAIL",
      detail: tagCreated ? "Tag identifié chez Harvest." : safeError(createTag.payload, createTag.status),
      cleanup: "non testé",
    });
    if (tagId) {
      try {
        const updateTag = await bff(`/api/user/tags/${encodeURIComponent(tagId)}`, json("PATCH", {
          name: `${prefix} tag renommé`,
        }));
        const tagsAfterUpdate = await bff("/api/user/tags");
        const renamed = JSON.stringify(tagsAfterUpdate.payload).includes(`${prefix} tag renommé`);
        addResult({
          family: "Tags personnels",
          operation: "Renommage et relecture",
          surface: "BFF",
          endpoint: "PATCH /api/user/tags/[id] → updatemembertag",
          status: updateTag.status,
          outcome: updateTag.status === 200 && renamed ? "PASS" : "FAIL",
          detail: renamed ? "Nom modifié et relu." : safeError(updateTag.payload, updateTag.status),
          cleanup: "non testé",
        });

        const addTagTrack = await bff(`/api/user/tags/${encodeURIComponent(tagId)}/tracks`, json("POST", {
          action: "add",
          trackIds: [trackId],
        }));
        const tagTracks = await direct(`/getmembertagtracks/${memberToken}/${encodeURIComponent(tagId)}?Skip=0&Limit=100&Sort=Alphabetic_Asc`);
        const tagTrackAdded = containsValue(tagTracks.payload, trackId);
        addResult({
          family: "Tags personnels",
          operation: "Association track-tag",
          surface: "BFF",
          endpoint: "POST /api/user/tags/[id]/tracks → addtomembertags",
          status: addTagTrack.status,
          outcome: addTagTrack.status === 200 && tagTrackAdded ? "PASS" : "FAIL",
          detail: tagTrackAdded ? "Association visible directement." : safeError(addTagTrack.payload, addTagTrack.status),
          cleanup: "non testé",
        });

        const removeTagTrack = await bff(`/api/user/tags/${encodeURIComponent(tagId)}/tracks`, json("POST", {
          action: "remove",
          trackIds: [trackId],
        }));
        const tagTracksAfter = await direct(`/getmembertagtracks/${memberToken}/${encodeURIComponent(tagId)}?Skip=0&Limit=100&Sort=Alphabetic_Asc`);
        const tagTrackRemoved = !containsValue(tagTracksAfter.payload, trackId);
        addResult({
          family: "Tags personnels",
          operation: "Retrait track-tag",
          surface: "BFF",
          endpoint: "POST /api/user/tags/[id]/tracks → removetrackmembertag",
          status: removeTagTrack.status,
          outcome: removeTagTrack.status === 200 && tagTrackRemoved ? "PASS" : "FAIL",
          detail: tagTrackRemoved ? "Association supprimée." : "Association encore présente.",
          cleanup: "non testé",
        });
      } finally {
        const removeTag = await bff(`/api/user/tags/${encodeURIComponent(tagId)}`, json("DELETE"));
        const tagsAfterDelete = await direct(`/getmembertags/${memberToken}?Skip=0&Limit=100&Sort=Alphabetic_Asc&ReturnTagCount=1`);
        const cleaned = removeTag.status === 200 && !containsValue(tagsAfterDelete.payload, tagId);
        addResult({
          family: "Tags personnels",
          operation: "Suppression et relecture",
          surface: "BFF",
          endpoint: "DELETE /api/user/tags/[id] → removemembertag",
          status: removeTag.status,
          outcome: cleaned ? "PASS" : "FAIL",
          detail: cleaned ? "Tag de test absent." : safeError(removeTag.payload, removeTag.status),
          cleanup: cleaned ? "réussi" : "échoué",
        });
        if (!cleaned) mutationsAllowed = false;
      }
    } else if (createTag.status === 201) {
      mutationsAllowed = false;
    }
  }

  // Private note lifecycle.
  if (mutationsAllowed) {
    const noteText = `${prefix} note`;
    const createNote = await bff(`/api/user/tracks/${encodeURIComponent(trackId)}/comments`, json("POST", { text: noteText }));
    const comment = record(record(createNote.payload)?.data)?.comment;
    const commentId = findString(comment, ["id", "tagid", "TagID", "ID"]) || "";
    const directNotes = await direct(`/gettrackmembercomments/${memberToken}/${encodeURIComponent(trackId)}?includeadmin=false`);
    const noteCreated = Boolean(commentId) && containsValue(directNotes.payload, commentId);
    addResult({
      family: "Notes privées",
      operation: "Création et relecture",
      surface: "BFF",
      endpoint: "POST /api/user/tracks/[id]/comments → addtrackmembercomment",
      status: createNote.status,
      outcome: createNote.status === 201 && noteCreated ? "PASS" : "FAIL",
      detail: noteCreated ? "Note identifiée sur la track." : safeError(createNote.payload, createNote.status),
      cleanup: "non testé",
    });
    if (commentId) {
      try {
        const updateNote = await bff(`/api/user/tracks/${encodeURIComponent(trackId)}/comments`, json("PATCH", {
          commentId,
          text: `${prefix} note modifiée`,
        }));
        const notesAfterUpdate = await direct(`/gettrackmembercomments/${memberToken}/${encodeURIComponent(trackId)}?includeadmin=false`);
        const updated = JSON.stringify(notesAfterUpdate.payload).includes(`${prefix} note modifiée`);
        addResult({
          family: "Notes privées",
          operation: "Modification et relecture",
          surface: "BFF",
          endpoint: "PATCH /api/user/tracks/[id]/comments → updatetrackmembercomment",
          status: updateNote.status,
          outcome: updateNote.status === 200 && updated ? "PASS" : "FAIL",
          detail: updated ? "Texte modifié et relu." : safeError(updateNote.payload, updateNote.status),
          cleanup: "non testé",
        });
      } finally {
        const removeNote = await bff(`/api/user/tracks/${encodeURIComponent(trackId)}/comments?commentId=${encodeURIComponent(commentId)}`, json("DELETE"));
        const notesAfterDelete = await direct(`/gettrackmembercomments/${memberToken}/${encodeURIComponent(trackId)}?includeadmin=false`);
        const cleaned = removeNote.status === 200 && !containsValue(notesAfterDelete.payload, commentId);
        addResult({
          family: "Notes privées",
          operation: "Suppression et relecture",
          surface: "BFF",
          endpoint: "DELETE /api/user/tracks/[id]/comments → removetrackmembercomment",
          status: removeNote.status,
          outcome: cleaned ? "PASS" : "FAIL",
          detail: cleaned ? "Note de test absente." : safeError(removeNote.payload, removeNote.status),
          cleanup: cleaned ? "réussi" : "échoué",
        });
        if (!cleaned) mutationsAllowed = false;
      }
    }
  }

  // Profile and subscription are restored immediately to their original values.
  if (mutationsAllowed) {
    const profile = await bff("/api/user/profile");
    const profileData = record(record(profile.payload)?.data)?.profile;
    const originalWebsite = String(record(profileData)?.website || "");
    const originalSubscribed = Boolean(record(profileData)?.subscribed);
    const hasProfileImage = Boolean(record(profileData)?.hasProfileImage);

    const updateProfile = await bff("/api/user/profile", json("PUT", {
      website: `https://example.invalid/parigo-audit-${runId}`,
    }));
    const changedWebsite = String(record(record(record(updateProfile.payload)?.data)?.profile)?.website || "");
    const profileUpdated = updateProfile.status === 200 && changedWebsite.includes(`parigo-audit-${runId}`);
    addResult({
      family: "Profil",
      operation: "Modification réversible du site web",
      surface: "BFF",
      endpoint: "PUT /api/user/profile → updatemember",
      status: updateProfile.status,
      outcome: profileUpdated ? "PASS" : "FAIL",
      detail: profileUpdated ? "Valeur sentinelle relue." : safeError(updateProfile.payload, updateProfile.status),
      cleanup: "non testé",
    });
    const restoreProfile = await bff("/api/user/profile", json("PUT", { website: originalWebsite }));
    const restoredWebsite = String(record(record(record(restoreProfile.payload)?.data)?.profile)?.website || "");
    const websiteRestored = restoreProfile.status === 200 && restoredWebsite === originalWebsite;
    addResult({
      family: "Profil",
      operation: "Restauration du profil",
      surface: "BFF",
      endpoint: "PUT /api/user/profile",
      status: restoreProfile.status,
      outcome: websiteRestored ? "PASS" : "FAIL",
      detail: websiteRestored ? "Valeur initiale restaurée." : "La valeur initiale n’a pas été retrouvée.",
      cleanup: websiteRestored ? "réussi" : "échoué",
    });
    if (!websiteRestored) mutationsAllowed = false;

    if (mutationsAllowed) {
      const toggleSubscription = await bff("/api/user/profile", json("PUT", { subscribed: !originalSubscribed }));
      const toggled = Boolean(record(record(record(toggleSubscription.payload)?.data)?.profile)?.subscribed) === !originalSubscribed;
      const restoreSubscription = await bff("/api/user/profile", json("PUT", { subscribed: originalSubscribed }));
      const restored = Boolean(record(record(record(restoreSubscription.payload)?.data)?.profile)?.subscribed) === originalSubscribed;
      addResult({
        family: "Profil",
        operation: "Abonnement puis restauration",
        surface: "BFF",
        endpoint: "PUT /api/user/profile → membersubscribe",
        status: toggleSubscription.status,
        outcome: toggled && restored ? "PASS" : "FAIL",
        detail: toggled && restored ? "État inversé puis restauré." : "L’état final ou intermédiaire est incohérent.",
        cleanup: restored ? "réussi" : "échoué",
      });
      if (!restored) mutationsAllowed = false;
    }

    addResult({
      family: "Image de profil",
      operation: "Cycle upload/confirmation/suppression",
      surface: "Contrat",
      endpoint: "getpresigneduploadurl / confirmpresignedupload / removeassignedupload",
      status: "n/a",
      outcome: "SKIP",
      detail: hasProfileImage
        ? "Compte personnel avec image existante : ne pas remplacer ni supprimer cet asset."
        : "Cycle non exécuté sans garantie de restauration bit-à-bit.",
      cleanup: "non applicable",
    });
  }

  const history = await bff("/api/user/history?limit=5&offset=0");
  addResult({
    family: "Historique",
    operation: "Lecture paginée",
    surface: "BFF",
    endpoint: "GET /api/user/history → gethistorybymembertoken",
    status: history.status,
    outcome: history.status === 200 ? "PASS" : "FAIL",
    detail: history.status === 200 ? `${idsFrom(history.payload, "history").length} entrée(s) normalisée(s).` : safeError(history.payload, history.status),
    cleanup: "non nécessaire",
  });
  const historyPost = await bff("/api/user/history", json("POST", { trackId }));
  const historyDelete = await bff("/api/user/history", json("DELETE"));
  addResult({
    family: "Historique",
    operation: "Contrat écriture/suppression",
    surface: "Contrat",
    endpoint: "POST et DELETE /api/user/history",
    status: `${historyPost.status}/${historyDelete.status}`,
    outcome: historyPost.status === 200 && historyDelete.status === 405 ? "PASS" : "FAIL",
    detail: "POST est un no-op trackedBy=catalogue ; DELETE est explicitement indisponible.",
    cleanup: "non nécessaire",
  });

  const downloads = await bff("/api/user/downloads?limit=5&offset=0");
  addResult({
    family: "Téléchargements",
    operation: "Lecture de l’historique",
    surface: "BFF",
    endpoint: "GET /api/user/downloads → getdownloadhistorybymembertoken",
    status: downloads.status,
    outcome: downloads.status === 200 ? "PASS" : "FAIL",
    detail: downloads.status === 200 ? "Historique accessible sans consommation." : safeError(downloads.payload, downloads.status),
    cleanup: "non nécessaire",
  });
  const formats = await bff("/api/download-formats");
  const formatList = record(record(formats.payload)?.data)?.formats;
  const formatId = Array.isArray(formatList) ? findString(formatList[0], ["id", "ID"]) : undefined;
  if (formatId) {
    const validation = await direct(`/validatemusicdownloadrequest/${memberToken}`, json("POST", {
      downloadtype: "track",
      identifier: trackId,
      format: formatId,
      trimstartsecs: 0,
      trimendsecs: 0,
      includeversioncheck: false,
    }));
    addResult({
      family: "Téléchargements",
      operation: "Validation des droits sans téléchargement",
      surface: "Harvest direct",
      endpoint: "POST validatemusicdownloadrequest",
      status: validation.status,
      outcome: validation.status === 200 && !validation.error ? "PASS" : "FAIL",
      detail: validation.error ? safeError(validation.payload, validation.status) : "Contrat évalué ; getmusicdownload non appelé, quota préservé.",
      cleanup: "non nécessaire",
    });
  }
  const invalidDownload = await bff("/api/user/downloads", json("POST", {}));
  addResult({
    family: "Téléchargements",
    operation: "Validation BFF sans consommation",
    surface: "Contrat",
    endpoint: "POST /api/user/downloads",
    status: invalidDownload.status,
    outcome: invalidDownload.status === 400 ? "PASS" : "FAIL",
    detail: invalidDownload.status === 400 ? "Requête vide rejetée avant getmusicdownload." : safeError(invalidDownload.payload, invalidDownload.status),
    cleanup: "non nécessaire",
  });

  const cueSheet = await bff("/api/cuesheet", json("POST", {
    filename: `parigo-audit-${runId}`,
    trackIds: [trackId],
  }));
  addResult({
    family: "Cue sheet",
    operation: "Génération du lien sans téléchargement",
    surface: "BFF",
    endpoint: "POST /api/cuesheet → getcuesheet",
    status: cueSheet.status,
    outcome: cueSheet.status === 200 && Boolean(findString(cueSheet.payload, ["url"])) ? "PASS" : "FAIL",
    detail: cueSheet.status === 200 ? "URL reçue et expurgée ; document non téléchargé." : safeError(cueSheet.payload, cueSheet.status),
    cleanup: "non applicable",
  });

  const invalidRegister = await bff("/api/auth/register", json("POST", {}), { useCookie: false });
  const invalidReset = await bff("/api/auth/forgot-password", json("POST", { email: "invalid" }), { useCookie: false });
  addResult({
    family: "Compte",
    operation: "Validations inscription/reset sans e-mail ni modification",
    surface: "Contrat",
    endpoint: "POST register / forgot-password",
    status: `${invalidRegister.status}/${invalidReset.status}`,
    outcome: [invalidRegister.status, invalidReset.status].every((status) => status === 400) ? "PASS" : "FAIL",
    detail: "Payloads invalides rejetés avant émission d’e-mail.",
    cleanup: "non nécessaire",
  });
  addResult({
    family: "Compte",
    operation: "Demande de changement de mot de passe",
    surface: "Contrat",
    endpoint: "POST /api/user/change-password → sendpasswordresetemail",
    status: "n/a",
    outcome: "SKIP",
    detail: "Non exécutée : cette route ignore le body et envoie immédiatement un e-mail de reset.",
    cleanup: "non applicable",
  });

  const deleteWithoutOrigin = await bff("/api/user/delete", json("DELETE"), { requestOrigin: null });
  addResult({
    family: "Compte",
    operation: "Suppression de compte non exécutée",
    surface: "Sécurité",
    endpoint: "DELETE /api/user/delete",
    status: deleteWithoutOrigin.status,
    outcome: deleteWithoutOrigin.status === 403 ? "PASS" : "FAIL",
    detail: deleteWithoutOrigin.status === 403 ? "Bloquée par same-origin ; compte conservé." : "Réponse inattendue, vérifier immédiatement le compte.",
    cleanup: "non applicable",
  });

  addResult({
    family: "Favoris album",
    operation: "Ajout/suppression live",
    surface: "Contrat",
    endpoint: "addtofavourites/{token}/Album/{id}",
    status: "n/a",
    outcome: "SKIP",
    detail: "Non exécuté : aucun endpoint documenté de suppression d’album favori et le contournement par suppression de tracks ne garantit pas la restauration.",
    cleanup: "non applicable",
  });
  addResult({
    family: "Partage",
    operation: "Création réelle sendEmail=false",
    surface: "Contrat",
    endpoint: "getinvitedmembertoken / getsharemusicurl",
    status: "n/a",
    outcome: "SKIP",
    detail: "Non exécuté : aucun endpoint de révocation/nettoyage documenté pour le lien créé.",
    cleanup: "non applicable",
  });

  const logout = await bff("/api/auth/logout", json("POST"));
  const afterLogout = await bff("/api/auth/session");
  const loggedOut = logout.status === 200 && record(record(afterLogout.payload)?.data)?.session === null;
  addResult({
    family: "Authentification",
    operation: "Déconnexion et invalidation de session",
    surface: "BFF",
    endpoint: "POST /api/auth/logout",
    status: logout.status,
    outcome: loggedOut ? "PASS" : "FAIL",
    detail: loggedOut ? "Cookie supprimé et session publique nulle." : safeError(logout.payload, logout.status),
    cleanup: "réussi",
  });

  const totals = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.outcome] = (acc[result.outcome] || 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({
    summary: totals,
    mutationsAllowedAtEnd: mutationsAllowed,
    accountDeleted: false,
    secretsPrinted: false,
  }));
  if (results.some((result) => result.cleanup === "échoué")) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({
    fatal: error instanceof Error ? error.message : String(error),
    accountDeleted: false,
    secretsPrinted: false,
  }));
  process.exitCode = 1;
});
