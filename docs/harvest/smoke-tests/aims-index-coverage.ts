export {};

const baseUrl = process.env.HARVEST_PREVIEW_BASE_URL || "http://127.0.0.1:3000";
const sampleSize = Math.min(Math.max(Number(process.env.HARVEST_AIMS_INDEX_SAMPLE_SIZE || 30), 1), 100);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function main() {
  if (process.env.HARVEST_AIMS_INDEX_AUDIT !== "1") {
    console.log("AIMS index audit skipped (set HARVEST_AIMS_INDEX_AUDIT=1 to enable). ");
    return;
  }
  const response = await fetch(`${baseUrl}/api/search?view=tracks&page=1&limit=${sampleSize}&sort=recent&translation=off&probe=1`);
  if (!response.ok) throw new Error(`Catalogue sample returned HTTP ${response.status}`);
  const catalogue = record(await response.json());
  const items = Array.isArray(record(catalogue.data).items) ? record(catalogue.data).items as unknown[] : [];
  const samples = items.map(record).filter((item) => Boolean(item.id));
  const results: Array<{ id: string; label: string; indexed: boolean; latencyMs: number }> = [];
  for (const sample of samples) {
    const startedAt = Date.now();
    const similarResponse = await fetch(`${baseUrl}/api/similarity/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: baseUrl },
      body: JSON.stringify({ type: "track", seedTrackIds: [sample.id] }),
    });
    const similar = record(await similarResponse.json().catch(() => ({})));
    if (!similarResponse.ok) throw new Error(`AIMS search failed for ${String(sample.id)} with HTTP ${similarResponse.status}`);
    results.push({
      id: String(sample.id),
      label: String(sample.albumLabel || "unknown"),
      indexed: record(similar.data).indexed === true,
      latencyMs: Date.now() - startedAt,
    });
  }
  const indexed = results.filter((result) => result.indexed).length;
  const byLabel = Object.fromEntries([...new Set(results.map((result) => result.label))].map((label) => {
    const labelResults = results.filter((result) => result.label === label);
    return [label, { indexed: labelResults.filter((result) => result.indexed).length, total: labelResults.length }];
  }));
  console.log(JSON.stringify({
    sampleSize: results.length,
    indexed,
    coveragePercent: results.length ? Math.round((indexed / results.length) * 10_000) / 100 : 0,
    meanLatencyMs: results.length ? Math.round(results.reduce((sum, result) => sum + result.latencyMs, 0) / results.length) : 0,
    byLabel,
  }, null, 2));
  if (results.length && indexed / results.length < 0.95) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
