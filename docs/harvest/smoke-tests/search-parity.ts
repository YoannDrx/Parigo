import { chromium, type Page } from "@playwright/test";

export {};

const keywords = (process.env.HARVEST_PARITY_KEYWORDS || process.env.HARVEST_PARITY_KEYWORD || "crime,boogie")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const legacyBaseUrl = process.env.HARVEST_LEGACY_BASE_URL || "https://www.parigomusic.com";
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

function ids(items: RecordValue[]): string[] {
  return items.map((item) => String(item.ID ?? item.id ?? "")).filter(Boolean).slice(0, 30);
}

function titles(items: RecordValue[]): string[] {
  return items.map((item) => String(item.Title ?? item.title ?? item.label ?? "")).filter(Boolean);
}

async function captureLegacySearch(page: Page, keyword: string, view: SearchView, exact = false) {
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("flex-coordinator")
      && response.url().endsWith("/search")
      && response.request().method() === "POST",
    { timeout: 45_000 },
  );
  const legacyKeyword = exact ? `"${keyword}"` : keyword;
  await page.goto(
    `${legacyBaseUrl}/search?keyword=${encodeURIComponent(legacyKeyword)}&view=${view}&page=1`,
    { waitUntil: "domcontentloaded" },
  );
  const envelope = record(await (await responsePromise).json());
  return record(envelope.data);
}

async function fetchPreview(path: string) {
  const response = await fetch(`${previewBaseUrl}${path}`);
  if (!response.ok) throw new Error(`Preview BFF returned HTTP ${response.status} for ${path}`);
  return record(await response.json());
}

function assertSameRanking(keyword: string, view: SearchView, legacyPayload: RecordValue, previewPayload: RecordValue) {
  const previewData = record(previewPayload.data);
  const previewMeta = record(previewPayload.meta);
  const legacyKey = view === "tracks" ? "Tracks" : "Albums";
  const legacyTotalKey = view === "tracks" ? "TotalTracks" : "TotalAlbums";
  const legacyIds = ids(records(legacyPayload, legacyKey));
  const previewIds = ids(records(previewData, "items"));
  const legacyTotal = Number(legacyPayload[legacyTotalKey] ?? 0);
  const previewTotal = Number(previewMeta.total ?? 0);
  const firstDifference = legacyIds.findIndex((id, index) => previewIds[index] !== id);

  console.log(JSON.stringify({
    check: `global-${view}`,
    keyword,
    legacyTotal,
    previewTotal,
    compared: Math.min(legacyIds.length, previewIds.length),
    firstDifference,
    legacyTop: legacyIds.slice(0, 5),
    previewTop: previewIds.slice(0, 5),
  }, null, 2));

  // The two public surfaces can observe a small catalogue-count drift while
  // Harvest refreshes its indexes. Ranking parity is intentionally measured on
  // the first page, which is the user-visible compatibility contract.
  if (firstDifference !== -1 || legacyIds.length !== previewIds.length) {
    throw new Error(`Harvest ${view} ranking differs from historical production for "${keyword}"`);
  }
}

async function checkAutocomplete(keyword: string) {
  const payload = await fetchPreview(`/api/autocomplete?q=${encodeURIComponent(keyword)}&language=fr`);
  const groups = records(record(payload.data), "groups");
  const kinds = groups.map((group) => String(group.key));
  const items = groups.flatMap((group) => Array.isArray(group.items) ? group.items.map(record) : []);

  if (kinds.includes("styles")) throw new Error("Autocomplete exposed the forbidden Styles group");
  if (!items.length) throw new Error(`Autocomplete returned no suggestions for "${keyword}"`);
  if (!groups.every((group) => Number(group.count ?? 0) >= (Array.isArray(group.items) ? group.items.length : 0))) {
    throw new Error(`Autocomplete group totals are invalid for "${keyword}"`);
  }
  const trackTitles = titles(items.filter((item) => item.kind === "track"));
  const expectedTracks = keyword.toLocaleLowerCase() === "crime"
    ? ["A Tampered Crime Scene", "For Crime Out Loud", "Perfect Little Crime", "Crime Scene", "OUR CRIME"]
    : keyword.toLocaleLowerCase() === "boogie"
      ? ["Jukebox Boogie", "Barstool Boogie", "Analog Boogie"]
      : [];
  for (const expected of expectedTracks) {
    if (!trackTitles.some((title) => title.toLocaleLowerCase() === expected.toLocaleLowerCase())) {
      throw new Error(`Autocomplete is missing "${expected}" for "${keyword}"`);
    }
  }

  console.log(JSON.stringify({
    check: "autocomplete",
    keyword,
    groups: groups.map((group) => ({
      key: group.key,
      count: group.count,
      examples: titles(Array.isArray(group.items) ? group.items.map(record) : []).slice(0, 3),
    })),
  }, null, 2));
}

async function checkExactSearch(keyword: string) {
  const payload = await fetchPreview(
    `/api/search?q=${encodeURIComponent(keyword)}&match=exact&view=tracks&page=1&limit=30&type=main&sort=relevance&language=fr`,
  );
  const data = record(payload.data);
  const resultTitles = titles(records(data, "items"));
  if (!resultTitles.length) throw new Error(`Exact search returned no tracks for "${keyword}"`);

  console.log(JSON.stringify({
    check: "exact-tracks",
    keyword,
    resultCount: resultTitles.length,
    examples: resultTitles.slice(0, 8),
  }, null, 2));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const keyword of keywords) {
      for (const view of ["tracks", "albums"] satisfies SearchView[]) {
        const legacyPayload = await captureLegacySearch(page, keyword, view);
        const previewPayload = await fetchPreview(
          `/api/search?q=${encodeURIComponent(keyword)}&view=${view}&page=1&limit=30&type=main&sort=relevance&language=fr`,
        );
        assertSameRanking(keyword, view, legacyPayload, previewPayload);
      }
      await checkAutocomplete(keyword);
      await checkExactSearch(keyword);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
