export {};

const previewBaseUrl = process.env.HARVEST_PREVIEW_BASE_URL || "http://127.0.0.1:3000";

type RecordValue = Record<string, unknown>;
type SearchView = "tracks" | "albums";

function record(value: unknown): RecordValue {
  return value && typeof value === "object" ? value as RecordValue : {};
}

function records(value: unknown, key: string): RecordValue[] {
  const candidate = record(value)[key];
  return Array.isArray(candidate)
    ? candidate.filter((item): item is RecordValue => Boolean(item) && typeof item === "object")
    : [];
}

function titles(payload: RecordValue): string[] {
  return records(record(payload.data), "items")
    .map((item) => String(item.title ?? ""))
    .filter(Boolean);
}

async function fetchPreview(path: string): Promise<RecordValue> {
  const response = await fetch(`${previewBaseUrl}${path}`);
  if (!response.ok) throw new Error(`Preview BFF returned HTTP ${response.status} for ${path}`);
  return record(await response.json());
}

async function checkEditorialSearch(query: string, view: SearchView, titleBaseline: number) {
  const payload = await fetchPreview(
    `/api/search?q=${encodeURIComponent(query)}&view=${view}&page=1&limit=30&type=main&sort=relevance&language=fr&translation=off`,
  );
  const meta = record(payload.meta);
  const resultTitles = titles(payload);
  const total = Number(meta.total ?? 0);
  if (!resultTitles.length || total < resultTitles.length) {
    throw new Error(`Editorial ${view} search returned an invalid result set for "${query}"`);
  }
  if (meta.fieldProfile !== "editorial" || meta.searchMode !== "keyword") {
    throw new Error(`Editorial ${view} search did not expose the expected public contract`);
  }
  if (total <= titleBaseline) {
    throw new Error(`Editorial ${view} search did not expand the title baseline for "${query}"`);
  }
  if (meta.intentResolution) throw new Error("Keyword search unexpectedly exposed an intent resolution");
  console.log(JSON.stringify({ check: `editorial-${view}`, query, total, examples: resultTitles.slice(0, 5) }, null, 2));
}

async function checkBilingualSuggestion() {
  if (!process.env.DEEPL_AUTH_KEY?.trim()) {
    console.log("Generic translation contract skipped because DEEPL_AUTH_KEY is not configured.");
    return;
  }
  const offered = await fetchPreview("/api/search?q=mariage&view=tracks&page=1&limit=30&type=main&sort=relevance&language=fr&translation=offer");
  const offeredMeta = record(offered.meta);
  const suggestion = record(offeredMeta.translationSuggestion);
  if (suggestion.original !== "mariage" || !suggestion.effective || suggestion.source !== "machine-translation") {
    throw new Error("The French → English suggestion metadata is missing or invalid");
  }
  if (offeredMeta.queryResolution || Number(offeredMeta.total ?? 0) !== 0) {
    throw new Error("The translation suggestion was applied without explicit consent");
  }

  const applied = await fetchPreview("/api/search?q=mariage&view=tracks&page=1&limit=30&type=main&sort=relevance&language=fr&translation=apply");
  const appliedMeta = record(applied.meta);
  const resolution = record(appliedMeta.queryResolution);
  if (resolution.original !== "mariage" || resolution.effective !== suggestion.effective) {
    throw new Error("The accepted translation was not applied consistently");
  }
  if (Number(appliedMeta.total ?? 0) < 1 || titles(applied).length < 1) {
    throw new Error("The accepted English query returned no tracks");
  }

  const literal = await fetchPreview("/api/search?q=mariage&view=tracks&page=1&limit=30&type=main&sort=relevance&language=fr&translation=off");
  if (record(literal.meta).queryResolution || record(literal.meta).translationSuggestion) {
    throw new Error("Translation-off search unexpectedly exposed translation metadata");
  }
}

function findFilterItem(items: RecordValue[], id: string): RecordValue | undefined {
  for (const item of items) {
    if (String(item.id ?? "") === id) return item;
    const nested = findFilterItem(records(item, "children"), id);
    if (nested) return nested;
  }
  return undefined;
}

async function checkFrenchTaxonomyTranslation() {
  const payload = await fetchPreview("/api/search/filters?language=fr");
  const groups = records(record(payload.data), "groups");
  const mood = groups.find((group) => group.key === "moods");
  const sad = mood ? findFilterItem(records(mood, "items"), "ATT_b71182fbd44d6ef6") : undefined;
  if (!sad) throw new Error("Harvest's stable Sad mood identifier is missing from the French taxonomy");
  if (sad.canonicalName !== "Sad" || sad.localizedName !== "Triste") {
    throw new Error(`Harvest has not honored the French Sad translation contract (received canonical=${String(sad.canonicalName)}, localized=${String(sad.localizedName)})`);
  }
}

async function checkAutocompleteTitlePriority() {
  const payload = await fetchPreview("/api/autocomplete?q=crime&language=fr");
  const groups = records(record(payload.data), "groups");
  for (const [key, field] of [["tracks", "trackTitle"], ["albums", "albumTitle"], ["playlists", "playlistTitle"]] as const) {
    const group = groups.find((candidate) => candidate.key === key);
    const first = group ? records(group, "items")[0] : undefined;
    if (!first) continue;
    if (!records(first, "matchEvidence").some((evidence) => evidence.field === field)) {
      throw new Error(`Autocomplete ${key} did not prioritize a literal title match for crime`);
    }
  }
}

async function checkLegacyBriefCompatibility() {
  const payload = await fetchPreview(
    "/api/search?brief=crime&resolve=1&view=tracks&page=1&limit=5&type=main&sort=relevance&language=fr&translate=0",
  );
  const meta = record(payload.meta);
  if (meta.intentResolution || meta.queryResolution || meta.translationSuggestion) {
    throw new Error("A legacy brief unexpectedly re-enabled intent or translation resolution");
  }
  if (meta.searchMode !== "keyword" || Number(meta.total ?? 0) < 1) {
    throw new Error("A legacy brief was not treated as a literal keyword search");
  }
}

async function checkLiteralCompatibility() {
  const title = await fetchPreview(
    "/api/search?q=Piano%20On%20My%20Mind&view=tracks&page=1&limit=30&type=main&sort=relevance&language=fr&translation=off",
  );
  if (!titles(title).includes("Piano On My Mind")) {
    throw new Error("The editorial profile lost a known exact title result");
  }

  const multiWord = await fetchPreview(
    "/api/search?q=dark%20piano&view=tracks&page=1&limit=30&type=main&sort=relevance&language=fr&translation=off",
  );
  if (Number(record(multiWord.meta).total ?? 0) < 1) {
    throw new Error("Harvest's multi-word AND serialization returned no tracks");
  }

  const reference = await fetchPreview(
    "/api/search?q=PRTM%200212&view=albums&page=1&limit=30&type=main&sort=relevance&language=fr&translation=off",
  );
  if (!titles(reference).includes("Between Light and Void") || record(reference.meta).fieldProfile !== "title") {
    throw new Error("The narrow Harvest catalogue-reference compatibility path failed");
  }
}

async function checkAiCapability() {
  const response = await fetch(`${previewBaseUrl}/api/search?mode=ai&q=cinematic&view=tracks`);
  if (response.status !== 503) throw new Error(`AI search unexpectedly returned HTTP ${response.status}`);
  const payload = record(await response.json());
  const error = record(payload.error);
  const capabilities = record(record(payload.meta).capabilities);
  if (error.code !== "FEATURE_UNAVAILABLE" || capabilities.aiPromptSearchAvailable !== false) {
    throw new Error("Disabled AIMS capability contract is invalid");
  }
}

async function main() {
  if (process.env.HARVEST_LIVE_TESTS !== "1") {
    console.log("Search contract skipped. Set HARVEST_LIVE_TESTS=1 to exercise the live Harvest catalogue.");
    return;
  }
  await checkEditorialSearch("crime", "albums", 47);
  await checkEditorialSearch("crime", "tracks", 174);
  await checkEditorialSearch("wedding", "tracks", 171);
  await checkLiteralCompatibility();
  await checkAutocompleteTitlePriority();
  await checkFrenchTaxonomyTranslation();
  await checkLegacyBriefCompatibility();
  await checkBilingualSuggestion();
  await checkAiCapability();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
