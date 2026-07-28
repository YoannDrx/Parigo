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

function normalize(value: string): string {
  return value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

async function checkTitleSearch(query: string, view: SearchView) {
  const payload = await fetchPreview(
    `/api/search?q=${encodeURIComponent(query)}&view=${view}&page=1&limit=30&type=main&sort=relevance&language=fr`,
  );
  const resultTitles = titles(payload);
  const total = Number(record(payload.meta).total ?? 0);
  if (!resultTitles.length || total < resultTitles.length) {
    throw new Error(`Strict ${view} search returned an invalid result set for "${query}"`);
  }
  const invalid = resultTitles.filter((title) => !normalize(title).includes(normalize(query)));
  if (invalid.length) {
    throw new Error(`Strict ${view} search leaked titles without "${query}": ${invalid.slice(0, 3).join(", ")}`);
  }
  console.log(JSON.stringify({ check: `strict-${view}`, query, total, examples: resultTitles.slice(0, 5) }, null, 2));
  return { total, titles: resultTitles };
}

async function checkPrefixExpansion() {
  const crime = await checkTitleSearch("crime", "tracks");
  const crim = await checkTitleSearch("crim", "tracks");
  if (crim.total < crime.total) throw new Error('"crim" unexpectedly returns fewer tracks than "crime"');
  if (!crim.titles.some((title) => normalize(title).includes("crimson"))) {
    throw new Error('"crim" did not expose a title containing "crimson" on the first page');
  }
}

async function checkBilingualFallback() {
  if (!process.env.DEEPL_AUTH_KEY?.trim()) {
    console.log("Generic translation contract skipped because DEEPL_AUTH_KEY is not configured.");
    return;
  }
  const payload = await fetchPreview("/api/search?q=mariage&view=tracks&page=1&limit=30&type=main&sort=relevance&language=fr");
  const meta = record(payload.meta);
  const resolution = record(meta.queryResolution);
  if (resolution.original !== "mariage" || !resolution.effective || resolution.source !== "machine-translation") {
    throw new Error("The generic French → English resolution metadata is missing or invalid");
  }
  const effective = normalize(String(resolution.effective));
  const invalid = titles(payload).filter((title) => !normalize(title).includes(effective));
  if (invalid.length) throw new Error(`Translated title search leaked invalid tracks: ${invalid.slice(0, 3).join(", ")}`);

  const literal = await fetchPreview("/api/search?q=mariage&view=tracks&page=1&limit=30&type=main&sort=relevance&language=fr&translate=0");
  if (record(literal.meta).queryResolution) throw new Error("Literal search unexpectedly exposed translation metadata");
}

async function main() {
  if (process.env.HARVEST_LIVE_TESTS !== "1") {
    console.log("Search contract skipped. Set HARVEST_LIVE_TESTS=1 to exercise the live Harvest catalogue.");
    return;
  }
  await checkTitleSearch("crime", "albums");
  await checkPrefixExpansion();
  await checkTitleSearch("wedding", "tracks");
  await checkBilingualFallback();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
