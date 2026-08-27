export {};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}

function records(value: unknown, key: string): JsonRecord[] {
  const source = record(value);
  if (!source) return [];
  const match = Object.entries(source).find(([candidate]) => candidate.toLowerCase() === key.toLowerCase());
  return Array.isArray(match?.[1])
    ? match[1].filter((item): item is JsonRecord => Boolean(record(item)))
    : [];
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
    if (keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase()) &&
        (typeof nested === "string" || typeof nested === "number") && String(nested)) {
      return String(nested);
    }
  }
  for (const nested of Object.values(source)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return "";
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function caseInsensitiveValue(source: JsonRecord, expectedKey: string): unknown {
  return Object.entries(source).find(([key]) => key.toLowerCase() === expectedKey.toLowerCase())?.[1];
}

function languageItem(item: JsonRecord) {
  return {
    type: findString(item, ["Type"]).trim(),
    language: findString(item, [
      "LanguageCode_ISO639_1",
      "LanguageCode",
      "Language",
      "CultureCode",
    ]).trim().toLowerCase().split(/[-_]/)[0],
    value: findString(item, ["Value", "Name", "Detail", "Description", "Text"]).trim(),
  };
}

function languageSummary(item: JsonRecord) {
  return records(item, "LanguageItems").map(languageItem).map((entry) => ({
    type: entry.type,
    language: entry.language,
    valueLength: entry.value.length,
    value: entry.value,
  }));
}

function identity(item: JsonRecord) {
  return {
    id: String(item.ID || item.PlaylistID || item.LibraryID || item.AlbumID || ""),
    name: findString(item, ["Name", "DisplayTitle", "Title"]),
    description: findString(item, ["Detail", "Description", "Profile"]),
  };
}

async function main() {
  if (process.env.HARVEST_LOCALIZATION_AUDIT !== "1") {
    console.log("Harvest localization audit skipped (set HARVEST_LOCALIZATION_AUDIT=1 to enable).");
    return;
  }

  const authUrl = process.env.HARVEST_AUTH_URL || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL || "https://service.harvestmedia.net/HMP-WS.svc";
  const oauthResponse = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: required("HARVEST_CLIENT_ID"),
      client_secret: required("HARVEST_CLIENT_SECRET"),
    }),
  });
  if (!oauthResponse.ok) throw new Error(`Harvest OAuth returned HTTP ${oauthResponse.status}`);
  const accessToken = findString(await oauthResponse.json(), ["access_token"]);
  if (!accessToken) throw new Error("Harvest OAuth token missing");

  async function call(path: string, init: RequestInit = {}): Promise<JsonRecord> {
    const response = await fetch(`${serviceUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: accessToken,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Harvest returned HTTP ${response.status} for ${path.split("?")[0]}`);
    return record(await response.json()) || {};
  }

  const service = await call("/getservicetoken", {
    headers: { AccessKey: required("HARVEST_ACCESS_KEY") },
  });
  const serviceToken = findString(service, ["Value", "Token"]);
  const serviceInfo = await call(`/getserviceinfo/${serviceToken}`);
  const similarProviders = caseInsensitiveValue(serviceInfo, "SearchSimilarInfo");
  const aimsProvider = Array.isArray(similarProviders)
    ? similarProviders.filter((item): item is JsonRecord => Boolean(record(item))).find((item) =>
      [item.Type, item.Provider, item.Name].some((value) => String(value || "").toLowerCase().includes("aims")))
    : undefined;
  const aimsSettingsCandidate = aimsProvider ? caseInsensitiveValue(aimsProvider, "Settings") : undefined;
  const aimsSettings = record(aimsSettingsCandidate) || aimsProvider || {};
  const aimsMode = (key: string) => record(caseInsensitiveValue(aimsSettings, key)) || {};
  const regions = await call(`/getregions/${serviceToken}`);
  const regionId = findString(regions, ["ID", "RegionID"]);
  const guest = await call(`/getguestmembertoken/${serviceToken}/${regionId}`);
  const guestToken = findString(guest, ["Value", "Token"]);
  if (!serviceToken || !regionId || !guestToken) throw new Error("Harvest guest-token setup failed");

  const albumId = "750a3d73a7f4dae6";
  const albumResponses = await Promise.all(["en", "fr", "fr-FR"].map(async (language) => {
    const payload = await call(`/getalbum/${guestToken}/${albumId}?returnLibraryCodes=false&languagecode=${encodeURIComponent(language)}`);
    const album = record(payload.Album) || {};
    return {
      language,
      identity: identity(album),
      languageItems: languageSummary(album),
      keys: Object.keys(album).sort(),
    };
  }));
  const [albumTracksEnPayload, albumTracksFrPayload, albumMainTracksPayload] = await Promise.all([
    call(`/getalbumtracks/${guestToken}/${albumId}/includeinactive?skip=0&limit=500&languagecode=en`),
    call(`/getalbumtracks/${guestToken}/${albumId}/includeinactive?skip=0&limit=500&languagecode=fr`),
    call(`/getalbumtracks/${guestToken}/${albumId}/mainonly?skip=0&limit=500&languagecode=fr`),
  ]);
  const albumTracksEn = records(albumTracksEnPayload, "Tracks");
  const albumTracksFr = records(albumTracksFrPayload, "Tracks");
  const albumMainTracks = records(albumMainTracksPayload, "Tracks");

  const librariesPayload = await call(`/getlibraries/${guestToken}`);
  const libraries = records(librariesPayload, "Libraries");
  const libraryFixtures = [
    { id: "9d330c152c37bca0", label: "Musica.it" },
    { id: "b9d701733704e2d7", label: "Parigo" },
  ];
  const libraryResults = [];
  for (const fixture of libraryFixtures) {
    const listItem = libraries.find((item) => findString(item, ["ID"]) === fixture.id) || {};
    const [englishPayload, frenchPayload] = await Promise.all([
      call(`/getlibrary/${guestToken}/${fixture.id}?returnCodes=true&languagecode=en`),
      call(`/getlibrary/${guestToken}/${fixture.id}?returnCodes=true&languagecode=fr`),
    ]);
    const english = record(englishPayload.Library) || {};
    const french = record(frenchPayload.Library) || {};
    libraryResults.push({
      ...fixture,
      list: { identity: identity(listItem), languageItems: languageSummary(listItem) },
      detailEn: { identity: identity(english), languageItems: languageSummary(english), keys: Object.keys(english).sort() },
      detailFr: { identity: identity(french), languageItems: languageSummary(french), keys: Object.keys(french).sort() },
      detailValuesDiffer: identity(english).description !== identity(french).description,
    });
  }

  const playlistQuery = (language: string) =>
    `/getfeaturedplaylistsplaylistonly/${guestToken}?showtrackcount=true&skip=0&limit=100&languagecode=${language}`;
  const [playlistListEnPayload, playlistListFrPayload] = await Promise.all([
    call(playlistQuery("en")),
    call(playlistQuery("fr")),
  ]);
  const playlistListEn = records(playlistListEnPayload, "Playlists");
  const playlistListFr = records(playlistListFrPayload, "Playlists");
  const listFrById = new Map(playlistListFr.map((item) => [findString(item, ["ID", "PlaylistID"]), item]));
  const listComparison = playlistListEn.map((english) => {
    const id = findString(english, ["ID", "PlaylistID"]);
    const french = listFrById.get(id) || {};
    return {
      id,
      en: identity(english),
      fr: identity(french),
      enLanguageItemCount: records(english, "LanguageItems").length,
      frLanguageItemCount: records(french, "LanguageItems").length,
      enLanguageItems: records(english, "LanguageItems").map(languageItem),
      frLanguageItems: records(french, "LanguageItems").map(languageItem),
    };
  });

  const playlistDetails: JsonRecord[] = [];
  const concurrency = 6;
  for (let offset = 0; offset < playlistListEn.length; offset += concurrency) {
    const batch = playlistListEn.slice(offset, offset + concurrency);
    const details = await Promise.all(batch.map(async (playlist) => {
      const id = findString(playlist, ["ID", "PlaylistID"]);
      const payload = await call(`/getfeaturedplaylistandtracks/${guestToken}/${id}`, {
        method: "POST",
        body: "{}",
      });
      return records(payload, "Playlists")[0] || {};
    }));
    playlistDetails.push(...details);
  }

  const playlistAudit = playlistDetails.map((playlist) => {
    const canonical = identity(playlist);
    const entries = records(playlist, "LanguageItems").map(languageItem).filter((entry) => entry.value);
    const grouped = new Map<string, string[]>();
    for (const entry of entries) {
      const key = `${entry.type.toLowerCase()}:${entry.language}`;
      grouped.set(key, [...(grouped.get(key) || []), entry.value]);
    }
    const frenchName = entries.find((entry) => entry.type.toLowerCase() === "featuredplaylistname" && entry.language === "fr")?.value || "";
    const frenchDescription = entries.find((entry) => entry.type.toLowerCase() === "featuredplaylistdescription" && entry.language === "fr")?.value || "";
    const exactDuplicateGroups = [...grouped.entries()].filter(([, values]) => values.length > new Set(values).size);
    const conflictGroups = [...grouped.entries()].filter(([, values]) => new Set(values).size > 1);
    return {
      ...canonical,
      frenchName,
      frenchDescription,
      languageItemCount: entries.length,
      exactDuplicateGroups: exactDuplicateGroups.map(([key, values]) => ({ key, count: values.length, distinct: new Set(values).size })),
      conflictGroups: conflictGroups.map(([key, values]) => ({ key, count: values.length, distinct: new Set(values).size })),
      frenchNameEqualsCanonical: Boolean(frenchName) && frenchName === canonical.name,
      frenchDescriptionEqualsCanonical: Boolean(frenchDescription) && frenchDescription === canonical.description,
    };
  });

  const fourBrandNames = [
    "Brand - New Media",
    "Brand - Lifestyle",
    "Brand - DIY",
    "Brand - Corporate",
  ];
  const detailsByName = new Map(playlistAudit.map((item) => [item.name, item]));
  const report = {
    checkedAt: new Date().toISOString(),
    album: {
      id: albumId,
      responses: albumResponses,
      descriptionsAllEqual: new Set(albumResponses.map((item) => item.identity.description)).size === 1,
      anyLanguageItems: albumResponses.some((item) => item.languageItems.length > 0),
    },
    albumTracks: {
      enCount: albumTracksEn.length,
      frCount: albumTracksFr.length,
      enUniqueIds: new Set(albumTracksEn.map((item) => identity(item).id).filter(Boolean)).size,
      frUniqueIds: new Set(albumTracksFr.map((item) => identity(item).id).filter(Boolean)).size,
      mainOnlyCount: albumMainTracks.length,
      mainOnlyWithLanguageItems: albumMainTracks.filter((item) => records(item, "LanguageItems").length).length,
      enWithLanguageItems: albumTracksEn.filter((item) => records(item, "LanguageItems").length).length,
      frWithLanguageItems: albumTracksFr.filter((item) => records(item, "LanguageItems").length).length,
      differingTitlesByLocale: albumTracksEn.filter((item, index) =>
        identity(item).name !== identity(albumTracksFr[index] || {}).name).length,
    },
    libraries: {
      total: libraries.length,
      fixtures: libraryResults,
    },
    playlists: {
      listEnCount: playlistListEn.length,
      listFrCount: playlistListFr.length,
      sameIds: playlistListEn.length === playlistListFr.length && playlistListEn.every((item) => listFrById.has(findString(item, ["ID", "PlaylistID"]))),
      listRowsDifferingByLocale: listComparison.filter((item) =>
        item.en.name !== item.fr.name || item.en.description !== item.fr.description).length,
      listRowsWithLanguageItems: listComparison.filter((item) => item.enLanguageItemCount || item.frLanguageItemCount).length,
      listLanguageItemTypes: [...new Set(listComparison.flatMap((item) =>
        [...item.enLanguageItems, ...item.frLanguageItems].map((entry) => `${entry.type}:${entry.language}`),
      ))].sort(),
      listLanguageItemsDifferingByLocale: listComparison.filter((item) =>
        JSON.stringify(item.enLanguageItems) !== JSON.stringify(item.frLanguageItems)).length,
      detailCount: playlistAudit.length,
      detailWithFrenchName: playlistAudit.filter((item) => item.frenchName).length,
      detailWithFrenchDescription: playlistAudit.filter((item) => item.frenchDescription).length,
      detailWithExactDuplicateGroups: playlistAudit.filter((item) => item.exactDuplicateGroups.length).length,
      exactDuplicateGroupCount: playlistAudit.reduce((sum, item) => sum + item.exactDuplicateGroups.length, 0),
      detailWithConflictingGroups: playlistAudit.filter((item) => item.conflictGroups.length).length,
      frenchNamesEqualCanonical: playlistAudit.filter((item) => item.frenchNameEqualsCanonical).length,
      frenchDescriptionsEqualCanonical: playlistAudit.filter((item) => item.frenchDescriptionEqualsCanonical).length,
      missingFrenchNames: playlistAudit.filter((item) => !item.frenchName).map((item) => ({ id: item.id, name: item.name })),
      missingFrenchDescriptions: playlistAudit.filter((item) => !item.frenchDescription).map((item) => ({ id: item.id, name: item.name })),
      requestedBrandFixtures: fourBrandNames.map((name) => detailsByName.get(name) || { name, missingFromDetail: true }),
      discoveryTravel: detailsByName.get("Discovery - Travel") || null,
      duplicateSamples: playlistAudit.filter((item) => item.exactDuplicateGroups.length).slice(0, 10),
      conflictSamples: playlistAudit.filter((item) => item.conflictGroups.length).slice(0, 10),
    },
    aimsServiceCapabilities: {
      providerFound: Boolean(aimsProvider),
      track: aimsMode("SimiliarByTrackID"),
      prompt: aimsMode("SimiliarByPrompt"),
      upload: aimsMode("SimiliarByUpload"),
      externalUrl: aimsMode("SimiliarByUrl"),
      allowMultiSeedSearching: caseInsensitiveValue(aimsSettings, "AllowMultiSeedSearching"),
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
