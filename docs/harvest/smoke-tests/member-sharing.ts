import { request, type APIRequestContext } from "@playwright/test";

type JsonRecord = Record<string, unknown>;

const baseURL = process.env.HARVEST_TEST_BASE_URL || "http://127.0.0.1:3000";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

async function json(context: APIRequestContext, path: string, init?: Parameters<APIRequestContext["fetch"]>[1]) {
  const response = await context.fetch(path, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok()) {
    const error = record(record(payload).error);
    throw new Error(`${path} returned ${response.status()}: ${String(error.upstreamCode || error.code || error.message || "unknown error")}`);
  }
  return record(payload);
}

async function login(context: APIRequestContext, email: string, password: string) {
  await json(context, "/api/auth/login", { method: "POST", data: { email, password } });
}

async function playlists(context: APIRequestContext) {
  const payload = await json(context, "/api/user/playlists");
  const data = record(payload.data);
  return Array.isArray(data.playlists) ? data.playlists.map(record) : [];
}

async function waitForNewPlaylist(context: APIRequestContext, before: Set<string>) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const found = (await playlists(context)).find((item) => !before.has(String(item.id || "")));
    if (found) return found;
  }
  return null;
}

async function createPlaylist(context: APIRequestContext, title: string) {
  const payload = await json(context, "/api/user/playlists", {
    method: "POST",
    data: { title, description: "Temporary Parigo/Harvest collaboration test" },
  });
  return record(record(payload.data).playlist);
}

async function removePlaylist(context: APIRequestContext, playlistId: string) {
  await json(context, "/api/user/playlists", { method: "DELETE", data: { playlistId } });
}

async function createShare(
  context: APIRequestContext,
  playlist: JsonRecord,
  recipientEmail: string,
  mode: "view" | "collaborate" | "deliver",
  sendEmail: boolean,
) {
  const payload = await json(context, `/api/user/playlists/${encodeURIComponent(String(playlist.id))}/share`, {
    method: "POST",
    data: {
      playlistTitle: String(playlist.title || playlist.name || "Parigo API test"),
      toEmail: recipientEmail,
      message: `Parigo API ${mode} test`,
      mode,
      allowDownload: false,
      allowFollow: false,
      allowSave: true,
      allowShare: false,
      sendEmail,
    },
  });
  return record(record(payload.data).share);
}

function accessToken(shareUrl: string) {
  const url = new URL(shareUrl);
  const token = url.pathname.split("/").filter(Boolean).at(-1);
  if (!token) throw new Error("Harvest share URL did not contain an access token");
  return { token, protocol: url.protocol, host: url.host, path: url.pathname.replace(token, "[token]") };
}

async function main() {
  if (process.env.HARVEST_SHARING_MUTATION_TESTS !== "1") {
    console.log("Harvest sharing tests skipped (set HARVEST_SHARING_MUTATION_TESTS=1 to enable).");
    return;
  }
  const sender = await request.newContext({ baseURL, timeout: 60_000, extraHTTPHeaders: { Origin: baseURL } });
  const recipient = await request.newContext({ baseURL, timeout: 60_000, extraHTTPHeaders: { Origin: baseURL } });
  const senderResources: string[] = [];
  const recipientResources: string[] = [];
  const results: JsonRecord = {};
  try {
    const recipientEmail = required("HARVEST_TEST_RECIPIENT_EMAIL");
    await Promise.all([
      login(sender, required("HARVEST_TEST_MEMBER_EMAIL"), required("HARVEST_TEST_MEMBER_PASSWORD")),
      login(recipient, recipientEmail, required("HARVEST_TEST_RECIPIENT_PASSWORD")),
    ]);
    const recipientBefore = new Set((await playlists(recipient)).map((item) => String(item.id || "")));
    const suffix = new Date().toISOString().replace(/\D/g, "").slice(0, 14);

    const copySource = await createPlaylist(sender, `Parigo API copy ${suffix}`);
    senderResources.push(String(copySource.id));
    const copyShare = await createShare(sender, copySource, recipientEmail, "view", true);
    const copyAccess = accessToken(String(copyShare.url));
    const sharedPayload = await json(sender, `/api/shared-music/${encodeURIComponent(copyAccess.token)}`);
    await json(recipient, `/api/shared-music/${encodeURIComponent(copyAccess.token)}/accept`, {
      method: "POST",
      data: { acceptType: "AsCopy" },
    });
    const copied = await waitForNewPlaylist(recipient, recipientBefore);
    if (copied?.id) recipientResources.push(String(copied.id));
    results.copy = { urlProtocol: copyAccess.protocol, urlHost: copyAccess.host, route: copyAccess.path, readable: Array.isArray(record(sharedPayload.data).playlists), materialized: Boolean(copied?.id), emailed: copyShare.emailed === true };

    const deliveryBefore = new Set((await playlists(recipient)).map((item) => String(item.id || "")));
    const delivery = await createShare(sender, copySource, recipientEmail, "deliver", false);
    const delivered = await waitForNewPlaylist(recipient, deliveryBefore);
    results.directDelivery = {
      delivered: delivery.delivered === true,
      materialized: Boolean(delivered?.id),
      emailed: delivery.emailed === true,
    };

    const collaborationBefore = new Set((await playlists(recipient)).map((item) => String(item.id || "")));
    const collaborationSource = await createPlaylist(sender, `Parigo API collaboration ${suffix}`);
    senderResources.push(String(collaborationSource.id));
    const collaborationShare = await createShare(sender, collaborationSource, recipientEmail, "collaborate", false);
    const collaborationAccess = accessToken(String(collaborationShare.url));
    await json(recipient, `/api/shared-music/${encodeURIComponent(collaborationAccess.token)}/accept`, {
      method: "POST",
      data: { acceptType: "AsCollaboration" },
    });
    const collaboration = await waitForNewPlaylist(recipient, collaborationBefore);
    results.collaboration = { urlProtocol: collaborationAccess.protocol, urlHost: collaborationAccess.host, route: collaborationAccess.path, materialized: Boolean(collaboration?.id) };

    const resetResponse = await recipient.post("/api/user/change-password");
    results.passwordReset = { status: resetResponse.status() };
    console.log(JSON.stringify(results, null, 2));
  } finally {
    for (const playlistId of [...recipientResources].reverse()) {
      await removePlaylist(recipient, playlistId).catch((error) => console.error(`Recipient cleanup failed: ${error instanceof Error ? error.message : error}`));
    }
    for (const playlistId of [...senderResources].reverse()) {
      await removePlaylist(sender, playlistId).catch((error) => console.error(`Sender cleanup failed: ${error instanceof Error ? error.message : error}`));
    }
    await Promise.all([sender.dispose(), recipient.dispose()]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
