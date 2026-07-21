import { chromium } from "@playwright/test";

export {};

const keyword = process.env.HARVEST_PARITY_KEYWORD || "piano";
const legacyBaseUrl = process.env.HARVEST_LEGACY_BASE_URL || "https://www.parigomusic.com";
const previewBaseUrl = process.env.HARVEST_PREVIEW_BASE_URL || "http://127.0.0.1:3000";

type RecordValue = Record<string, unknown>;

function records(value: unknown, key: string): RecordValue[] {
  if (!value || typeof value !== "object") return [];
  const candidate = (value as RecordValue)[key];
  return Array.isArray(candidate) ? candidate.filter((item): item is RecordValue => Boolean(item) && typeof item === "object") : [];
}

function ids(items: RecordValue[]): string[] {
  return items.map((item) => String(item.ID ?? item.id ?? "")).filter(Boolean).slice(0, 30);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const legacySearch = page.waitForResponse(
      (response) => response.url().includes("flex-coordinator") && response.url().endsWith("/search") && response.request().method() === "POST",
      { timeout: 45_000 },
    );
    await page.goto(`${legacyBaseUrl}/search?keyword=${encodeURIComponent(`"${keyword}"`)}&view=tracks&page=1`, { waitUntil: "domcontentloaded" });
    const legacyResponse = await legacySearch;
    const legacyEnvelope = await legacyResponse.json() as RecordValue;
    const legacyPayload = legacyEnvelope.data as RecordValue;
    const previewResponse = await fetch(`${previewBaseUrl}/api/search?q=${encodeURIComponent(keyword)}&view=tracks&page=1&limit=30&type=main&sort=relevance&language=fr`);
    if (!previewResponse.ok) throw new Error(`Preview BFF returned HTTP ${previewResponse.status}`);
    const previewPayload = await previewResponse.json() as RecordValue;
    const previewData = previewPayload.data as RecordValue;
    const previewMeta = previewPayload.meta as RecordValue;
    const legacyIds = ids(records(legacyPayload, "Tracks"));
    const previewIds = ids(records(previewData, "items"));
    const legacyTotal = Number(legacyPayload.TotalTracks ?? 0);
    const previewTotal = Number(previewMeta.total ?? 0);
    const firstDifference = legacyIds.findIndex((id, index) => previewIds[index] !== id);
    console.log(JSON.stringify({ keyword, legacyTotal, previewTotal, compared: Math.min(legacyIds.length, previewIds.length), firstDifference, legacyTop: legacyIds.slice(0, 5), previewTop: previewIds.slice(0, 5) }, null, 2));
    if (legacyTotal !== previewTotal || firstDifference !== -1 || legacyIds.length !== previewIds.length) {
      throw new Error("Harvest search parity differs from the historical Parigo production ranking");
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
