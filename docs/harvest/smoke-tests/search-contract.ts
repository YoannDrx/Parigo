export {};

const previewBaseUrl = process.env.HARVEST_PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const pageSize = 30;

type RecordValue = Record<string, unknown>;
type SearchView = "tracks" | "albums";

type HistoricalCase = {
  query: string;
  view: SearchView;
  expectedProfile: "aggregate-title-first" | "title";
};

const historicalMatrix: HistoricalCase[] = [
  { query: "piano sad", view: "tracks", expectedProfile: "aggregate-title-first" },
  { query: "piano triste", view: "tracks", expectedProfile: "aggregate-title-first" },
  { query: "reggae triste", view: "tracks", expectedProfile: "aggregate-title-first" },
  { query: "crime", view: "tracks", expectedProfile: "aggregate-title-first" },
  { query: "mariage", view: "tracks", expectedProfile: "aggregate-title-first" },
  { query: "PGO", view: "albums", expectedProfile: "title" },
];

function record(value: unknown): RecordValue {
  return value && typeof value === "object" ? value as RecordValue : {};
}

function records(value: unknown, key: string): RecordValue[] {
  const candidate = record(value)[key];
  return Array.isArray(candidate)
    ? candidate.filter((item): item is RecordValue => Boolean(item) && typeof item === "object")
    : [];
}

function normalizeWords(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function titleContainsAllWords(title: string, query: string): boolean {
  const normalizedTitle = normalizeWords(title);
  return normalizeWords(query).every((word) => normalizedTitle.includes(word));
}

function resultItems(payload: RecordValue): RecordValue[] {
  return records(record(payload.data), "items");
}

function itemIds(payload: RecordValue): string[] {
  return resultItems(payload).map((item) => String(item.id ?? "")).filter(Boolean);
}

function itemTitles(payload: RecordValue): string[] {
  return resultItems(payload).map((item) => String(item.title ?? "")).filter(Boolean);
}

async function fetchPreview(path: string): Promise<RecordValue> {
  const response = await fetch(`${previewBaseUrl}${path}`);
  if (!response.ok) throw new Error(`Preview BFF returned HTTP ${response.status} for ${path}`);
  return record(await response.json());
}

function matrixKey(testCase: HistoricalCase): string {
  return `${testCase.view}:${testCase.query}`;
}

function referenceTotals(): Record<string, number> {
  const raw = process.env.HISTORICAL_SEARCH_TOTALS_JSON?.trim();
  if (!raw) return {};

  const parsed = record(JSON.parse(raw));
  return Object.fromEntries(Object.entries(parsed).map(([key, value]) => {
    const total = Number(value);
    if (!Number.isFinite(total) || total < 0) {
      throw new Error(`Invalid historical total for ${key}: ${String(value)}`);
    }
    return [key, total];
  }));
}

function assertTitlePrefix(query: string, titles: string[]) {
  let aggregateLaneStarted = false;
  for (const title of titles) {
    const isVerifiedTitle = titleContainsAllWords(title, query);
    if (aggregateLaneStarted && isVerifiedTitle) {
      throw new Error(`A verified title appeared after an aggregate result for "${query}": ${title}`);
    }
    if (!isVerifiedTitle) aggregateLaneStarted = true;
  }
}

async function checkHistoricalCase(testCase: HistoricalCase, references: Record<string, number>) {
  const params = new URLSearchParams({
    q: testCase.query,
    view: testCase.view,
    page: "1",
    limit: String(pageSize),
    type: "main",
    sort: "relevance",
    language: "fr",
    translation: "off",
  });
  const first = await fetchPreview(`/api/search?${params}`);
  const meta = record(first.meta);
  const firstIds = itemIds(first);
  const firstTitles = itemTitles(first);
  const total = Number(meta.total ?? -1);
  const titleMatchTotal = Number(meta.titleMatchTotal ?? 0);

  if (!Number.isInteger(total) || total < 0 || total < firstIds.length) {
    throw new Error(`Invalid total for ${matrixKey(testCase)}: ${String(meta.total)}`);
  }
  if (firstIds.length > pageSize || new Set(firstIds).size !== firstIds.length) {
    throw new Error(`The first page is oversized or contains duplicates for ${matrixKey(testCase)}`);
  }
  if (meta.fieldProfile !== testCase.expectedProfile || meta.searchMode !== "keyword") {
    throw new Error(`Unexpected public search contract for ${matrixKey(testCase)}`);
  }
  if (!Number.isFinite(titleMatchTotal) || titleMatchTotal < 0 || titleMatchTotal > total) {
    throw new Error(`Invalid titleMatchTotal for ${matrixKey(testCase)}: ${String(meta.titleMatchTotal)}`);
  }
  if (testCase.expectedProfile === "aggregate-title-first") {
    assertTitlePrefix(testCase.query, firstTitles);
    const timings = record(meta.timings);
    for (const timing of ["titleSearchMs", "aggregateSearchMs", "enrichmentMs"] as const) {
      if (!Number.isFinite(Number(timings[timing])) || Number(timings[timing]) < 0) {
        throw new Error(`Missing ${timing} for ${matrixKey(testCase)}`);
      }
    }
  }

  const expectedTotal = references[matrixKey(testCase)];
  if (expectedTotal !== undefined && total !== expectedTotal) {
    throw new Error(
      `Historical coverage mismatch for ${matrixKey(testCase)}: production=${expectedTotal}, development=${total}`,
    );
  }

  if (total > pageSize) {
    params.set("page", "2");
    const second = await fetchPreview(`/api/search?${params}`);
    const secondIds = itemIds(second);
    if (secondIds.length > pageSize || secondIds.some((id) => firstIds.includes(id))) {
      throw new Error(`Pagination is oversized or duplicated for ${matrixKey(testCase)}`);
    }

    params.set("page", "1");
    const repeated = await fetchPreview(`/api/search?${params}`);
    if (itemIds(repeated).join("|") !== firstIds.join("|")) {
      throw new Error(`The first page is unstable for ${matrixKey(testCase)}`);
    }
  }

  console.log(JSON.stringify({
    check: matrixKey(testCase),
    developmentTotal: total,
    historicalTotal: expectedTotal ?? "not supplied",
    titleMatchTotal,
    firstTitles: firstTitles.slice(0, 5),
  }, null, 2));
}

async function checkAllPgoAlbumsArePageable() {
  const first = await fetchPreview(
    `/api/search?q=PGO&view=albums&page=1&limit=${pageSize}&type=main&sort=relevance&language=fr&translation=off`,
  );
  const total = Number(record(first.meta).total ?? 0);
  const allIds = [...itemIds(first)];

  for (let page = 2; page <= Math.ceil(total / pageSize); page += 1) {
    const payload = await fetchPreview(
      `/api/search?q=PGO&view=albums&page=${page}&limit=${pageSize}&type=main&sort=relevance&language=fr&translation=off`,
    );
    allIds.push(...itemIds(payload));
  }

  if (allIds.length !== total || new Set(allIds).size !== total) {
    throw new Error(`PGO pagination exposes ${allIds.length} rows (${new Set(allIds).size} unique) for a total of ${total}`);
  }
}

async function main() {
  if (process.env.HARVEST_LIVE_TESTS !== "1") {
    console.log("Search contract skipped. Set HARVEST_LIVE_TESTS=1 to exercise the live Harvest catalogue.");
    return;
  }

  const references = referenceTotals();
  if (!Object.keys(references).length) {
    console.log(
      "Historical totals were not supplied. Capture them from parigomusic.com and set " +
      "HISTORICAL_SEARCH_TOTALS_JSON to make coverage comparison strict.",
    );
  }

  for (const testCase of historicalMatrix) {
    await checkHistoricalCase(testCase, references);
  }
  await checkAllPgoAlbumsArePageable();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
