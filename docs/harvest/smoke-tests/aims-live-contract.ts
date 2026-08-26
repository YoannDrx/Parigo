export {};

const baseUrl = process.env.HARVEST_PREVIEW_BASE_URL || "http://127.0.0.1:3000";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function syntheticWav(seconds = 5): Buffer {
  const sampleRate = 8_000;
  const samples = sampleRate * seconds;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index += 1) {
    buffer.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 4_000), 44 + index * 2);
  }
  return buffer;
}

async function similarityWithPendingRetry(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/similarity/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: baseUrl },
      body: JSON.stringify(body),
    });
    const payload = record(await response.json().catch(() => ({})));
    if (response.ok) return payload;
    if (response.status !== 202 || attempt === 12) {
      throw new Error(`similarity search returned HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 300)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error("similarity search stayed pending");
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
  const capabilitiesPayload = await json("/api/similarity/capabilities");
  const capabilities = record(capabilitiesPayload.data);
  const trackCapability = record(capabilities.track);
  if (trackCapability.enabled !== true) {
    throw new Error("Similarity TrackID search is not enabled on the target BFF");
  }
  const catalogue = await json("/api/search?view=tracks&page=1&limit=30&sort=recent&translation=off&probe=1");
  const items = Array.isArray(record(catalogue.data).items) ? record(catalogue.data).items as unknown[] : [];
  const seed = record(items.find((item) => Boolean(record(item).id)));
  if (!seed.id) throw new Error("Could not find a catalogue seed track");
  const similar = await json("/api/similarity/search", {
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
    const prompt = await json("/api/similarity/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: baseUrl },
      body: JSON.stringify({ type: "prompt", prompt: "warm cinematic tension sparse piano", locale: "en" }),
    });
    const promptTracks = Array.isArray(record(prompt.data).tracks) ? record(prompt.data).tracks as unknown[] : [];
    if (!promptTracks.length) throw new Error("AIMS prompt contract returned no tracks");
    console.log(JSON.stringify({ check: "aims-prompt-live", resultCount: promptTracks.length }, null, 2));
  }

  if (record(capabilities.upload).enabled === true) {
    const audio = syntheticWav();
    const prepared = record((await json("/api/similarity/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: baseUrl },
      body: JSON.stringify({ fileName: "parigo-audit-synthetic.wav", contentType: "audio/wav", size: audio.length }),
    })).data);
    const uploadUrl = String(prepared.uploadUrl || "");
    const uploadToken = String(prepared.uploadToken || "");
    if (!uploadUrl || !uploadToken) throw new Error("Similarity upload preparation returned no safe references");
    const uploaded = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": String(prepared.contentType || "audio/wave") },
      body: Uint8Array.from(audio).buffer,
    });
    if (!uploaded.ok) throw new Error(`Synthetic similarity upload returned HTTP ${uploaded.status}`);
    const confirmed = record((await json("/api/similarity/uploads/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: baseUrl },
      body: JSON.stringify({ uploadToken }),
    })).data);
    const uploadResult = await similarityWithPendingRetry({ type: "upload", referenceToken: confirmed.referenceToken });
    const uploadTracks = Array.isArray(record(uploadResult.data).tracks) ? record(uploadResult.data).tracks as unknown[] : [];
    console.log(JSON.stringify({ check: "aims-upload-live", syntheticBytes: audio.length, resultCount: uploadTracks.length }, null, 2));
  }

  const externalUrl = process.env.HARVEST_AIMS_TEST_EXTERNAL_URL?.trim()
    || "https://music.youtube.com/watch?v=ZbZSe6N_BXs";
  if (record(capabilities.externalUrl).enabled === true && externalUrl) {
    const reference = record((await json("/api/similarity/references", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: baseUrl },
      body: JSON.stringify({ url: externalUrl }),
    })).data);
    const urlResult = await similarityWithPendingRetry({ type: "url", referenceToken: reference.referenceToken });
    const urlTracks = Array.isArray(record(urlResult.data).tracks) ? record(urlResult.data).tracks as unknown[] : [];
    console.log(JSON.stringify({ check: "aims-url-live", platform: reference.platform, resultCount: urlTracks.length }, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
