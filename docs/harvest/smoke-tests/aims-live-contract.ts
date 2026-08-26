export {};

const baseUrl = process.env.HARVEST_PREVIEW_BASE_URL || "http://127.0.0.1:3000";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function json(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const payload = record(await response.json().catch(() => ({})));
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 300)}`);
  return payload;
}

async function main() {
  if (process.env.HARVEST_AIMS_LIVE_TESTS !== "1") {
    console.log("AIMS live contract skipped (set HARVEST_AIMS_LIVE_TESTS=1 to enable). ");
    return;
  }
  const capabilitiesPayload = await json("/api/aims/capabilities");
  const capabilities = record(capabilitiesPayload.data);
  const trackCapability = record(capabilities.track);
  if (capabilities.provider !== "AIMS" || trackCapability.enabled !== true) {
    throw new Error("AIMS TrackID search is not enabled on the target BFF");
  }
  const catalogue = await json("/api/search?view=tracks&page=1&limit=30&sort=recent&translation=off&probe=1");
  const items = Array.isArray(record(catalogue.data).items) ? record(catalogue.data).items as unknown[] : [];
  const seed = record(items.find((item) => Boolean(record(item).id)));
  if (!seed.id) throw new Error("Could not find a catalogue seed track");
  const similar = await json("/api/aims/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify({ type: "track", seedTrackIds: [seed.id] }),
  });
  const similarData = record(similar.data);
  const tracks = Array.isArray(similarData.tracks) ? similarData.tracks : [];
  if (similarData.mode !== "track" || typeof similarData.indexed !== "boolean") {
    throw new Error("AIMS TrackID response does not match the public contract");
  }
  console.log(JSON.stringify({
    check: "aims-track-live",
    seedId: seed.id,
    indexed: similarData.indexed,
    resultCount: tracks.length,
    total: record(similar.meta).total,
  }, null, 2));

  if (record(capabilities.prompt).enabled === true) {
    const prompt = await json("/api/aims/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: baseUrl },
      body: JSON.stringify({ type: "prompt", prompt: "warm cinematic tension sparse piano", locale: "en" }),
    });
    const promptTracks = Array.isArray(record(prompt.data).tracks) ? record(prompt.data).tracks as unknown[] : [];
    if (!promptTracks.length) throw new Error("AIMS prompt contract returned no tracks");
    console.log(JSON.stringify({ check: "aims-prompt-live", resultCount: promptTracks.length }, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
