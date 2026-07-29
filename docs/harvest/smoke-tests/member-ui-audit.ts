export {};

import { chromium, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { stat } from "node:fs/promises";

const baseUrl = process.env.PARIGO_AUDIT_BASE_URL || "http://127.0.0.1:3000";
const runId = `Parigo audit 20260729-ui-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
const pollOffsets = [0, 250, 1_000, 3_000, 10_000, 30_000];

type JsonRecord = Record<string, unknown>;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function json(response: { json(): Promise<unknown> }): Promise<JsonRecord> {
  const payload = await response.json().catch(() => ({}));
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload as JsonRecord : {};
}

async function login(request: APIRequestContext): Promise<number> {
  const response = await request.post(`${baseUrl}/api/auth/login`, {
    headers: { Origin: baseUrl },
    data: {
      email: required("HARVEST_TEST_MEMBER_EMAIL"),
      password: required("HARVEST_TEST_MEMBER_PASSWORD"),
    },
  });
  if (!response.ok()) throw new Error(`Member login returned HTTP ${response.status()}`);
  return response.status();
}

async function mutate(
  request: APIRequestContext,
  route: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  data?: unknown,
) {
  const response = await request.fetch(`${baseUrl}${route}`, {
    method,
    headers: { Origin: baseUrl, "Content-Type": "application/json" },
    data,
    timeout: 90_000,
  });
  return { status: response.status(), payload: await json(response) };
}

function dataArray(payload: JsonRecord, key: string): JsonRecord[] {
  const data = payload.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const value = (data as JsonRecord)[key];
  return Array.isArray(value) ? value.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

async function waitForMemberState(
  request: APIRequestContext,
  route: string,
  predicate: (payload: JsonRecord) => boolean,
) {
  const observations: Array<{ delayMs: number; matched: boolean }> = [];
  for (let index = 0; index < pollOffsets.length; index += 1) {
    const delayMs = pollOffsets[index];
    const previous = index === 0 ? 0 : pollOffsets[index - 1];
    if (delayMs > previous) await new Promise((resolve) => setTimeout(resolve, delayMs - previous));
    const response = await request.get(`${baseUrl}${route}`, { headers: { "Cache-Control": "no-store" } });
    const payload = await json(response);
    const matched = response.ok() && predicate(payload);
    observations.push({ delayMs, matched });
    if (matched) break;
  }
  return observations;
}

function dataRecord(payload: JsonRecord, key: string): JsonRecord {
  const data = payload.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const value = (data as JsonRecord)[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

async function currentProfile(request: APIRequestContext): Promise<JsonRecord> {
  return dataRecord(await json(await request.get(`${baseUrl}/api/user/profile`, {
    headers: { "Cache-Control": "no-store" },
  })), "profile");
}

async function uploadProfileImage(
  request: APIRequestContext,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  const prepare = await request.post(`${baseUrl}/api/user/profile/image`, {
    headers: { Origin: baseUrl },
    data: { fileName: file.name, contentType: file.mimeType },
  });
  const prepared = await json(prepare);
  const data = prepared.data && typeof prepared.data === "object" && !Array.isArray(prepared.data)
    ? prepared.data as JsonRecord
    : {};
  const uploadUrl = String(data.uploadUrl || "");
  const fileName = String(data.fileName || "");
  if (!prepare.ok() || !uploadUrl || !fileName) {
    throw new Error(`Profile image preparation returned HTTP ${prepare.status()}`);
  }
  const upload = await request.put(uploadUrl, {
    headers: { "Content-Type": file.mimeType },
    data: file.buffer,
  });
  if (!upload.ok()) throw new Error(`Profile image upload returned HTTP ${upload.status()}`);
  const confirm = await request.patch(`${baseUrl}/api/user/profile/image`, {
    headers: { Origin: baseUrl },
    data: { fileName },
  });
  if (!confirm.ok()) throw new Error(`Profile image confirmation returned HTTP ${confirm.status()}`);
  return { prepareStatus: prepare.status(), uploadStatus: upload.status(), confirmStatus: confirm.status() };
}

async function cleanupPreviousUiAuditResources(request: APIRequestContext) {
  const removed: Array<{ type: string; id: string; status: number }> = [];
  const searches = dataArray(await json(await request.get(`${baseUrl}/api/user/searches`)), "searches");
  for (const search of searches) {
    if (!/^Parigo audit 2026072[89]-ui-/.test(String(search.name || ""))) continue;
    const id = String(search.id || "");
    if (!id) continue;
    const result = await mutate(request, `/api/user/searches?id=${encodeURIComponent(id)}`, "DELETE");
    removed.push({ type: "search", id, status: result.status });
  }
  const playlists = dataArray(await json(await request.get(`${baseUrl}/api/user/playlists`)), "playlists");
  for (const playlist of playlists) {
    const title = String(playlist.title || playlist.name || "");
    if (!/^Parigo audit 2026072[89]-ui-/.test(title)) continue;
    const id = String(playlist.id || "");
    if (!id) continue;
    const result = await mutate(request, "/api/user/playlists", "DELETE", { playlistId: id });
    removed.push({ type: "playlist", id, status: result.status });
  }
  return removed;
}

async function installLocalPreferences(context: BrowserContext) {
  await context.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      updatedAt: "2026-07-28T00:00:00.000Z",
    }));
    window.localStorage.setItem("parigo-locale", "fr");
  });
}

async function openSearch(page: Page) {
  await page.goto(`${baseUrl}/search?q=piano`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Écouter / }).first().waitFor({ state: "visible" });
}

async function addAnonymousShortlist(page: Page) {
  await page.evaluate(() => window.localStorage.removeItem("parigo-shortlist"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Écouter / }).first().waitFor({ state: "visible" });
  const buttons = page.getByRole("button", { name: /Ajouter à la shortlist/ });
  const labels = await buttons.evaluateAll((nodes) => nodes.slice(0, 3).map((node) => node.getAttribute("aria-label") || ""));
  for (const label of labels) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.waitForTimeout(450);
    const openDrawer = page.getByRole("dialog", { name: /Shortlist/ });
    if (await openDrawer.isVisible().catch(() => false)) {
      await openDrawer.getByRole("button", { name: "Fermer", exact: true }).click();
      await openDrawer.waitFor({ state: "hidden" });
    }
  }
  const initial = await page.evaluate(() => window.localStorage.getItem("parigo-shortlist"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Écouter / }).first().waitFor({ state: "visible" });
  const reloaded = await page.evaluate(() => window.localStorage.getItem("parigo-shortlist"));
  await page.locator("[data-shortlist-trigger]").click();
  const dialog = page.getByRole("dialog", { name: /Shortlist/ });
  const itemCount = await dialog.locator('[aria-label^="Retirer de la shortlist"]').count();
  const connectVisible = await dialog.getByRole("button", { name: "Connectez-vous" }).isVisible().catch(() => false);
  const anonymousMemberRequests: string[] = [];
  const capture = (request: { url(): string }) => {
    if (request.url().includes("/api/user/")) anonymousMemberRequests.push(request.url().replace(baseUrl, ""));
  };
  page.on("request", capture);
  const down = dialog.getByRole("button", { name: "Descendre" }).filter({ visible: true });
  if (await down.count()) await down.first().click();
  const playSelection = dialog.getByRole("button", { name: /Écouter la sélection/ });
  const playSelectionAvailable = await playSelection.isVisible().catch(() => false);
  const drawerActions = await dialog.getByRole("button").allInnerTexts();
  if (playSelectionAvailable) {
    await playSelection.click();
    await page.waitForTimeout(600);
  }
  page.off("request", capture);
  const reordered = await page.evaluate(() => window.localStorage.getItem("parigo-shortlist"));
  let loginPromptOpened = false;
  if (connectVisible) {
    await dialog.getByRole("button", { name: "Connectez-vous" }).click();
    loginPromptOpened = await page.getByRole("dialog").isVisible().catch(() => false);
    await page.keyboard.press("Escape");
  } else {
    await dialog.getByRole("button", { name: "Fermer", exact: true }).click().catch(() => undefined);
  }
  return {
    labels,
    itemCount,
    connectVisible,
    loginPromptOpened,
    persistedAfterReload: initial === reloaded,
    reordered: reloaded !== reordered,
    memberRequestsBeforeLogin: anonymousMemberRequests.length,
    rawHasAddedAt: Boolean(initial?.includes("addedAt")),
    playSelectionAvailable,
    drawerActions,
  };
}

async function actionInventory(page: Page) {
  const playButton = page.getByRole("button", { name: /Écouter / }).first();
  const playLabel = await playButton.getAttribute("aria-label") || "";
  const title = playLabel.replace(/^Écouter /, "");
  const trackId = await playButton.locator("xpath=ancestor::article[@data-track-id][1]").getAttribute("data-track-id") || "";
  const labels = await page.locator("button[aria-label]").evaluateAll((nodes, trackTitle) =>
    nodes.map((node) => node.getAttribute("aria-label") || "").filter((label) => label.includes(String(trackTitle))),
  title);
  return { title, trackId, labels };
}

async function visibleTrackAction(page: Page, title: string, label: string) {
  let action = page.getByRole("button", { name: label, exact: true }).filter({ visible: true }).first();
  if (await action.isVisible().catch(() => false)) return action;

  const trigger = page
    .getByRole("button", { name: `Plus d’actions : ${title}`, exact: true })
    .filter({ visible: true })
    .first();
  if (await trigger.isVisible().catch(() => false)) await trigger.click();

  action = page.getByRole("button", { name: label, exact: true }).filter({ visible: true }).first();
  await action.waitFor({ state: "visible", timeout: 10_000 });
  return action;
}

async function testFavourite(page: Page, inventory: { title: string }) {
  let button = page.getByRole("button", { name: "Ajouter aux favoris", exact: true }).filter({ visible: true }).first();
  if (!await button.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: `Plus d’actions : ${inventory.title}` }).click();
    button = page.getByRole("button", { name: "Ajouter aux favoris", exact: true }).filter({ visible: true }).first();
  }
  if (!await button.isVisible().catch(() => false)) return { available: false };
  const [response] = await Promise.all([
    page.waitForResponse((candidate) =>
      candidate.url().endsWith("/api/user/favorites/tracks") && candidate.request().method() === "POST",
    ),
    button.click(),
  ]);
  const body = response.request().postDataJSON() as { trackId?: string };
  const trackId = body.trackId || "";
  const polling = await waitForMemberState(page.request, "/api/user/favorites/tracks", (payload) =>
    JSON.stringify(payload).includes(trackId),
  );
  const accountResponse = page.waitForResponse(
    (candidate) =>
      candidate.url().endsWith("/api/user/favorites/tracks") &&
      candidate.request().method() === "GET",
    { timeout: 30_000 },
  );
  await page.goto(`${baseUrl}/account/favorites`, { waitUntil: "domcontentloaded" });
  await accountResponse;
  await page.getByText(inventory.title, { exact: true }).first().waitFor({
    state: "visible",
    timeout: 30_000,
  }).catch(() => undefined);
  const visibleInAccount = await page.getByText(inventory.title, { exact: true }).first().isVisible().catch(() => false);
  const reloadResponse = page.waitForResponse(
    (candidate) =>
      candidate.url().endsWith("/api/user/favorites/tracks") &&
      candidate.request().method() === "GET",
    { timeout: 30_000 },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await reloadResponse;
  await page.getByText(inventory.title, { exact: true }).first().waitFor({
    state: "visible",
    timeout: 30_000,
  }).catch(() => undefined);
  const visibleAfterReload = await page.getByText(inventory.title, { exact: true }).first().isVisible().catch(() => false);
  await page.request.post(`${baseUrl}/api/auth/logout`, { headers: { Origin: baseUrl } });
  await login(page.request);
  const reconnectResponse = page.waitForResponse(
    (candidate) =>
      candidate.url().endsWith("/api/user/favorites/tracks") &&
      candidate.request().method() === "GET",
    { timeout: 30_000 },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await reconnectResponse;
  await page.getByText(inventory.title, { exact: true }).first().waitFor({
    state: "visible",
    timeout: 30_000,
  }).catch(() => undefined);
  const visibleAfterReconnect = await page.getByText(inventory.title, { exact: true }).first().isVisible().catch(() => false);
  const cleanup = await mutate(page.request, "/api/user/favorites/tracks", "DELETE", { trackId });
  const cleanupPolling = await waitForMemberState(page.request, "/api/user/favorites/tracks", (payload) =>
    !JSON.stringify(payload).includes(trackId),
  );
  return {
    available: true,
    trackId,
    addStatus: response.status(),
    polling,
    visibleInAccount,
    visibleAfterReload,
    visibleAfterReconnect,
    cleanupStatus: cleanup.status,
    cleanupPolling,
  };
}

async function testTrackPanels(page: Page, inventory: { title: string; trackId?: string }) {
  await openSearch(page);
  const result: JsonRecord = {};
  console.error("[ui-audit] track: information/versions/lyrics");
  await (
    await visibleTrackAction(
      page,
      inventory.title,
      `Informations sur la piste : ${inventory.title}`,
    )
  ).click();
  result.informationPanel = await page.getByRole("tabpanel").isVisible().catch(() => false);
  const versions = page.getByRole("button", { name: /Versions/ });
  if (await versions.count()) {
    await versions.first().click();
    result.versionsPanel = await page.getByRole("tabpanel").isVisible().catch(() => false);
  }
  const lyrics = page.getByRole("button", { name: /Paroles/ });
  if (await lyrics.count()) {
    await lyrics.first().click();
    result.lyricsPanel = await page.getByRole("tabpanel").isVisible().catch(() => false);
  }
  await (
    await visibleTrackAction(
      page,
      inventory.title,
      `Ouvrir les notes privées : ${inventory.title}`,
    )
  ).click();
  const textarea = page.getByPlaceholder(/Intention, timecode/);
  await textarea.fill(`${runId} note`);
  const notePromise = page.waitForResponse((response) =>
    response.url().includes("/api/user/tracks/") &&
    response.url().endsWith("/comments") &&
    response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Ajouter la note" }).click();
  const noteResponse = await notePromise;
  result.note = {
    status: noteResponse.status(),
    message: await page.getByText(/accès|indisponible|impossible|expir/i).first().textContent().catch(() => null),
  };
  console.error("[ui-audit] track: queue/playback/history");
  await (
    await visibleTrackAction(
      page,
      inventory.title,
      `Ajouter à la file d’attente : ${inventory.title}`,
    )
  ).click();
  result.queueControl = true;
  const historyBefore = await json(await page.request.get(`${baseUrl}/api/user/history`, { timeout: 20_000 }));
  await page.getByRole("button", { name: `Écouter ${inventory.title}` }).click();
  await page.waitForTimeout(35_000);
  const playerVisible = await page.getByTestId("player-dock").isVisible().catch(() => false);
  const historyPolling = inventory.trackId
    ? await waitForMemberState(
        page.request,
        "/api/user/history",
        (payload) => JSON.stringify(payload).includes(inventory.trackId || ""),
      )
    : [];
  const historyAfter = await json(await page.request.get(`${baseUrl}/api/user/history`, { timeout: 20_000 }));
  await page.goto(`${baseUrl}/account/history`, { waitUntil: "domcontentloaded" });
  await page.getByText(inventory.title, { exact: true }).first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined);
  result.playback = {
    playerVisible,
    historyBeforeCount: dataArray(historyBefore, "history").length,
    historyAfterCount: dataArray(historyAfter, "history").length,
    historyPolling,
    visibleInAccount: await page.getByText(inventory.title, { exact: true }).first().isVisible().catch(() => false),
  };
  await page.getByRole("button", { name: /^Pause/ }).first().click().catch(() => undefined);
  // The account verification above deliberately leaves Search. Reopen it before
  // exercising controls that only exist on a search result row.
  await openSearch(page);
  console.error("[ui-audit] track: download validation");
  if (process.env.HARVEST_ALLOW_DOWNLOAD_EFFECT === "1") {
    const profileBeforeDownload = await currentProfile(page.request);
    const historyBeforeDownload = dataArray(
      await json(await page.request.get(`${baseUrl}/api/user/downloads`)),
      "downloads",
    );
    const browserDownloadPromise = page.waitForEvent("download", { timeout: 60_000 }).catch(() => null);
    const downloadPromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/user/downloads") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: `Télécharger : ${inventory.title}` }).first().click();
    const downloadResponse = await downloadPromise;
    const downloadPayload = await json(downloadResponse);
    const downloadData = downloadPayload.data && typeof downloadPayload.data === "object" && !Array.isArray(downloadPayload.data)
      ? downloadPayload.data as JsonRecord
      : {};
    const browserDownload = downloadResponse.ok() && Array.isArray(downloadData.downloadUrls) && downloadData.downloadUrls.length
      ? await browserDownloadPromise
      : null;
    const filePath = browserDownload ? await browserDownload.path() : null;
    const fileSize = filePath ? (await stat(filePath)).size : 0;
    const historyAfterDownload = await waitForMemberState(
      page.request,
      "/api/user/downloads",
      (payload) => dataArray(payload, "downloads").length > historyBeforeDownload.length,
    );
    const profileAfterDownload = await currentProfile(page.request);
    result.download = {
      validationStatus: downloadResponse.status(),
      actualFileRequested: downloadResponse.ok(),
      directDownloadReturned: Array.isArray(downloadData.downloadUrls) && downloadData.downloadUrls.length > 0,
      emailRequested: Boolean(downloadData.requested),
      fileReceived: Boolean(browserDownload),
      fileName: browserDownload?.suggestedFilename() || null,
      fileSize,
      historyBeforeCount: historyBeforeDownload.length,
      historyPolling: historyAfterDownload,
      quotaBefore: {
        used: profileBeforeDownload.downloadsUsed ?? null,
        remaining: profileBeforeDownload.downloadsRemaining ?? null,
      },
      quotaAfter: {
        used: profileAfterDownload.downloadsUsed ?? null,
        remaining: profileAfterDownload.downloadsRemaining ?? null,
      },
    };
    // A direct browser download may replace the current document; always restore
    // the Search surface before continuing with the cue-sheet action.
    await openSearch(page);
  } else {
    const downloadButton = await visibleTrackAction(
      page,
      inventory.title,
      `Télécharger : ${inventory.title}`,
    );
    result.download = {
      buttonExposed: await downloadButton.isVisible(),
      actualFileRequested: false,
      skippedReason: "Both current and official validation payloads failed in direct diagnostics",
    };
    await page
      .getByRole("button", { name: `Fermer les actions : ${inventory.title}`, exact: true })
      .filter({ visible: true })
      .first()
      .click()
      .catch(() => undefined);
  }
  console.error("[ui-audit] track: cue sheet");
  const cueButton = await visibleTrackAction(
    page,
    inventory.title,
    `Cue sheet : ${inventory.title}`,
  );
  const cuePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/cuesheet") && response.request().method() === "POST",
  );
  await cueButton.click();
  const cueResponse = await cuePromise;
  const cueAlert = page.getByRole("alert").filter({ hasText: /cue sheet/i }).first();
  const errorVisible = await cueAlert.isVisible().catch(() => false);
  const dismiss = cueAlert.getByRole("button", { name: "Fermer le message" });
  const dismissible = await dismiss.isVisible().catch(() => false);
  if (dismissible) await dismiss.click();
  result.cueSheet = {
    status: cueResponse.status(),
    errorVisible,
    dismissible,
    dismissed: dismissible ? !await cueAlert.isVisible().catch(() => false) : false,
  };
  console.error("[ui-audit] track: done");
  return result;
}

async function testSavedSearch(page: Page) {
  console.error("[ui-audit] saved search: open Search");
  await openSearch(page);
  const save = page.getByRole("button", { name: "Sauvegarder", exact: true });
  const available = await save.isEnabled().catch(() => false);
  if (!available) return { available: false };
  console.error("[ui-audit] saved search: open form");
  await save.click();
  const name = `${runId} saved search`;
  await page.getByLabel("Nom de la recherche").fill(name);
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/user/searches") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const response = await responsePromise;
  console.error(`[ui-audit] saved search: POST ${response.status()}`);
  const savedSearches = dataArray(
    await json(await page.request.get(`${baseUrl}/api/user/searches`, { timeout: 30_000 })),
    "searches",
  );
  const created = savedSearches.find((item) => item.name === name);
  const searchId = String(created?.id || "");
  const accountPage = await page.context().newPage();
  const accountListResponse = accountPage.waitForResponse(
    (candidate) => candidate.url().endsWith("/api/user/searches") && candidate.request().method() === "GET",
    { timeout: 30_000 },
  );
  await accountPage.goto(`${baseUrl}/account/searches`, { waitUntil: "domcontentloaded", timeout: 20_000 });
  await accountListResponse.catch(() => undefined);
  await accountPage.getByText(name, { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => undefined);
  console.error("[ui-audit] saved search: account page loaded");
  const body = await accountPage.locator("body").innerText();
  await page.request.post(`${baseUrl}/api/auth/logout`, { headers: { Origin: baseUrl } });
  await login(page.request);
  const reconnectListResponse = accountPage.waitForResponse(
    (candidate) => candidate.url().endsWith("/api/user/searches") && candidate.request().method() === "GET",
    { timeout: 30_000 },
  );
  await accountPage.reload({ waitUntil: "domcontentloaded" });
  await reconnectListResponse.catch(() => undefined);
  await accountPage.getByText(name, { exact: false }).first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => undefined);
  const visibleAfterReconnect = await accountPage.getByText(name, { exact: false }).first().isVisible().catch(() => false);
  await accountPage.close();
  const visible = body.includes(name);
  const displayedDate = body.split("\n").find((line) => /\d{1,2}\/\d{1,2}\/2026/.test(line)) || null;
  let cleanupStatus: number | null = null;
  if (searchId) {
    try {
      cleanupStatus = (
        await mutate(page.request, `/api/user/searches?id=${encodeURIComponent(searchId)}`, "DELETE")
      ).status;
    } catch {
      const searchesAfterFailure = dataArray(
        await json(await page.request.get(`${baseUrl}/api/user/searches`, { timeout: 30_000 })),
        "searches",
      );
      if (!searchesAfterFailure.some((item) => item.id === searchId)) {
        cleanupStatus = 204;
      } else {
        cleanupStatus = (
          await mutate(page.request, `/api/user/searches?id=${encodeURIComponent(searchId)}`, "DELETE")
        ).status;
      }
    }
  }
  console.error(`[ui-audit] saved search: cleanup ${cleanupStatus}`);
  return {
    available,
    status: response.status(),
    searchId,
    visible,
    visibleAfterReconnect,
    displayedDate,
    cleanupStatus,
  };
}

async function testTagCrossPage(page: Page, inventory: { title: string }) {
  const tagName = `${runId} tag`;
  const initialTagsPromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/user/tags" &&
    response.request().method() === "GET",
  );
  await page.goto(`${baseUrl}/account/tags`, { waitUntil: "domcontentloaded" });
  await initialTagsPromise;
  await page.getByPlaceholder("Nom du nouveau tag").fill(tagName);
  const createPromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/user/tags") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Créer", exact: true }).click();
  const createResponse = await createPromise;
  const createPayload = await json(createResponse);
  const tag = dataRecord(createPayload, "tag");
  const tagId = String(tag.id || "");
  if (!createResponse.ok() || !tagId) {
    return { createStatus: createResponse.status(), tagId: "", cleanupStatus: null };
  }

  let cleanupStatus: number | null = null;
  let trackId = "";
  try {
    await openSearch(page);
    let addTag = page.getByRole("button", { name: `Ajouter un tag : ${inventory.title}` }).filter({ visible: true }).first();
    if (!await addTag.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: `Plus d’actions : ${inventory.title}` }).click();
      addTag = page.getByRole("button", { name: `Ajouter un tag : ${inventory.title}` }).filter({ visible: true }).first();
    }
    await addTag.click();
    const popover = page.getByRole("dialog", { name: `Ajouter à un tag — ${inventory.title}` });
    await popover.waitFor({ state: "visible" });
    const [association] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(`/api/user/tags/${encodeURIComponent(tagId)}/tracks`) &&
          response.request().method() === "POST",
        { timeout: 60_000 },
      ),
      popover.getByRole("button", { name: tagName }).click(),
    ]);
    const requestBody = association.request().postDataJSON() as { trackIds?: string[] };
    trackId = requestBody.trackIds?.[0] || "";

    const polling = association.ok()
      ? await waitForMemberState(
          page.request,
          `/api/user/tags/${encodeURIComponent(tagId)}/tracks`,
          (payload) => JSON.stringify(payload).includes(trackId),
        )
      : [];
    await popover.getByRole("link", { name: "Voir dans mes tags" }).click();
    await page.waitForURL((url) => url.pathname === "/account/tags" && url.searchParams.get("tag") === tagId);
    await page.getByText(inventory.title, { exact: true }).waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
    const visibleInAccount = await page.getByText(inventory.title, { exact: true }).isVisible().catch(() => false);
    const selectedInUrl = new URL(page.url()).searchParams.get("tag") === tagId;
    const reloadTracksResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/user/tags/${encodeURIComponent(tagId)}/tracks`) &&
      response.request().method() === "GET",
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await reloadTracksResponse;
    await page.getByText(inventory.title, { exact: true }).waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
    const visibleAfterReload = await page.getByText(inventory.title, { exact: true }).isVisible().catch(() => false);
    await page.request.post(`${baseUrl}/api/auth/logout`, { headers: { Origin: baseUrl } });
    await login(page.request);
    const reconnectTracksResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/user/tags/${encodeURIComponent(tagId)}/tracks`) &&
      response.request().method() === "GET",
    );
    await page.goto(`${baseUrl}/account/tags?tag=${encodeURIComponent(tagId)}`, { waitUntil: "domcontentloaded" });
    await reconnectTracksResponse;
    await page.getByText(inventory.title, { exact: true }).waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
    const visibleAfterReconnect = await page.getByText(inventory.title, { exact: true }).isVisible().catch(() => false);

    const removeAssociation = await mutate(
      page.request,
      `/api/user/tags/${encodeURIComponent(tagId)}/tracks`,
      "POST",
      { action: "remove", trackIds: [trackId] },
    );
    const absentPolling = await waitForMemberState(
      page.request,
      `/api/user/tags/${encodeURIComponent(tagId)}/tracks`,
      (payload) => !JSON.stringify(payload).includes(trackId),
    );
    return {
      createStatus: createResponse.status(),
      tagId,
      associationStatus: association.status(),
      trackId,
      polling,
      selectedInUrl,
      visibleInAccount,
      visibleAfterReload,
      visibleAfterReconnect,
      removeAssociationStatus: removeAssociation.status,
      absentPolling,
    };
  } finally {
    const cleanup = await mutate(page.request, `/api/user/tags/${encodeURIComponent(tagId)}`, "DELETE");
    cleanupStatus = cleanup.status;
    if (cleanupStatus >= 400) {
      throw new Error(`Temporary tag cleanup returned HTTP ${cleanupStatus}`);
    }
  }
}

async function testProfileAndImage(page: Page) {
  const initial = await currentProfile(page.request);
  const originalCompany = String(initial.company || "");
  const originalImage = String(initial.image || "");
  const originalImageUrl = originalImage
    ? new URL(originalImage, baseUrl).toString()
    : "";
  let originalFile: { name: string; mimeType: string; buffer: Buffer } | null = null;

  if (originalImageUrl) {
    const download = await page.request.get(originalImageUrl);
    const mimeType = String(download.headers()["content-type"] || "").split(";")[0];
    if (!download.ok() || !["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      return {
        profileField: { skipped: "Original profile image could not be backed up safely" },
        image: { skipped: "Existing image was left untouched because exact restoration was not guaranteed" },
      };
    }
    const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
    originalFile = {
      name: `profile-original.${extension}`,
      mimeType,
      buffer: Buffer.from(await download.body()),
    };
  }

  const sentinel = `${runId} société`;
  const initialProfilePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/user/profile") && response.request().method() === "GET",
  );
  await page.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded" });
  await initialProfilePromise;
  await page.getByLabel("Société").fill(sentinel);
  const updatePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/user/profile") && response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const update = await updatePromise;
  const changed = String((await currentProfile(page.request)).company || "") === sentinel;
  const restoreProfile = await mutate(page.request, "/api/user/profile", "PUT", { company: originalCompany });
  const profileRestored = String((await currentProfile(page.request)).company || "") === originalCompany;
  if (!profileRestored) throw new Error("The original company field was not restored");

  const neutralFile = {
    name: "parigo-audit-neutral.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR42mP8z8DAwMDAxMDAwMAAAA0AAf5+7XkAAAAASUVORK5CYII=",
      "base64",
    ),
  };
  let uploadStatus: number | null = null;
  let deleteStatus: number | null = null;
  let neutralVisible = false;
  let removed = false;
  let restored = !originalFile;
  try {
    const profileReloadPromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/user/profile") && response.request().method() === "GET",
    );
    await page.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded" });
    await profileReloadPromise;
    const uploadPromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/user/profile/image") && response.request().method() === "POST",
    );
    await page.locator('input[type="file"]').setInputFiles(neutralFile);
    const upload = await uploadPromise;
    uploadStatus = upload.status();
    neutralVisible = Boolean(String((await currentProfile(page.request)).image || ""));

    await page.getByRole("button", { name: "Supprimer la photo" }).waitFor({ state: "visible", timeout: 10_000 });
    const deletePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/user/profile/image") && response.request().method() === "DELETE",
    );
    await page.getByRole("button", { name: "Supprimer la photo" }).click();
    const deletion = await deletePromise;
    deleteStatus = deletion.status();
    removed = !String((await currentProfile(page.request)).image || "");
  } finally {
    if (originalFile) {
      await uploadProfileImage(page.request, originalFile);
      restored = Boolean(String((await currentProfile(page.request)).image || ""));
      if (!restored) throw new Error("The original profile image was not restored");
    }
  }
  return {
    profileField: {
      updateStatus: update.status(),
      changed,
      restoreStatus: restoreProfile.status,
      restored: profileRestored,
    },
    image: {
      initialImagePresent: Boolean(originalImage),
      uploadStatus,
      neutralVisible,
      deleteStatus,
      removed,
      originalRestored: restored,
    },
  };
}

async function testSettingsSafety(page: Page) {
  const original = await currentProfile(page.request);
  const originalSubscribed = Boolean(original.subscribed);
  const settingsProfilePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/user/profile") && response.request().method() === "GET",
  );
  await page.goto(`${baseUrl}/account/settings`, { waitUntil: "domcontentloaded" });
  await settingsProfilePromise;
  const toggle = page.getByRole("switch");
  await toggle.waitFor({ state: "visible" });
  const mutationPromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/user/profile") && response.request().method() === "PUT",
  );
  await toggle.click();
  const mutation = await mutationPromise;
  const toggled = Boolean((await currentProfile(page.request)).subscribed) === !originalSubscribed;
  const restore = await mutate(page.request, "/api/user/profile", "PUT", { subscribed: originalSubscribed });
  const restored = Boolean((await currentProfile(page.request)).subscribed) === originalSubscribed;
  if (!restored) throw new Error("The original subscription state was not restored");

  const deleteRequests: string[] = [];
  const capture = (request: { url(): string; method(): string }) => {
    if (request.url().endsWith("/api/user/delete")) deleteRequests.push(request.method());
  };
  page.on("request", capture);
  await page.getByRole("button", { name: /Supprimer mon compte/ }).click();
  const confirmationVisible = await page.getByPlaceholder("SUPPRIMER").isVisible().catch(() => false);
  await page.getByRole("button", { name: "Annuler", exact: true }).click().catch(() => undefined);
  page.off("request", capture);
  return {
    subscriptionStatus: mutation.status(),
    toggled,
    restoreStatus: restore.status,
    restored,
    deleteConfirmationVisible: confirmationVisible,
    deleteRequests: deleteRequests.length,
  };
}

async function testContact(page: Page, trackId: string) {
  if (process.env.HARVEST_ALLOW_CONTACT_EFFECT !== "1") {
    return { skipped: "HARVEST_ALLOW_CONTACT_EFFECT is not 1" };
  }
  await page.goto(`${baseUrl}/contact?track=${encodeURIComponent(trackId)}`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="name"]').fill("Anthlogan — audit Parigo");
  await page.locator('input[name="company"]').fill("Parigo Music");
  await page.locator('input[name="email"]').fill(required("HARVEST_TEST_MEMBER_EMAIL"));
  await page.locator('textarea[name="message"]').fill(`${runId}\nMessage de contact de test autorisé. Merci de ne pas traiter.`);
  await page.locator('input[name="consent"]').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(2_100);
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/contact") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Envoyer/ }).click();
  const response = await responsePromise;
  return {
    status: response.status(),
    sentMessageVisible: await page.getByText("Message envoyé", { exact: true }).isVisible().catch(() => false),
    provider: "Resend via Parigo",
    harvestEndpointUsed: false,
  };
}

async function testShortlistConversion(page: Page) {
  await openSearch(page);
  const before = await page.evaluate(() => window.localStorage.getItem("parigo-shortlist"));
  await page.locator("[data-shortlist-trigger]").click();
  const dialog = page.getByRole("dialog", { name: /Shortlist/ });
  const title = `${runId} shortlist`;
  await dialog.getByLabel("Nom de la nouvelle playlist").fill(title);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/user/playlists") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  await dialog.getByRole("button", { name: "Créer la playlist", exact: true }).click();
  const response = await responsePromise;
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => window.localStorage.getItem("parigo-shortlist"));
  const feedback = response.ok() ? dialog.getByRole("status") : dialog.getByRole("alert");
  const statusMessage = await feedback.textContent().catch(() => null);
  const dismiss = feedback.getByRole("button", { name: "Fermer le message" });
  const dismissible = await dismiss.isVisible().catch(() => false);
  if (dismissible) await dismiss.click();
  const dismissed = dismissible ? !await feedback.isVisible().catch(() => false) : false;
  const payload = await json(response);
  const playlist = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
    ? (payload.data as JsonRecord).playlist
    : null;
  const playlistRecord = playlist && typeof playlist === "object" && !Array.isArray(playlist)
    ? playlist as JsonRecord
    : {};
  const playlistId = String(playlistRecord.id || "");
  const expectedTrackIds = Array.isArray(playlistRecord.tracks)
    ? (playlistRecord.tracks as JsonRecord[]).map((track) => String(track.id || "")).filter(Boolean)
    : [];
  let remoteTrackIds: string[] = [];
  let visibleInAccount = false;
  let visibleAfterReconnect = false;
  let cleanupStatus: number | null = null;
  let absentAfterCleanup = false;
  if (playlistId) {
    try {
      const detail = dataRecord(
        await json(await page.request.get(`${baseUrl}/api/user/playlists/${encodeURIComponent(playlistId)}`)),
        "playlist",
      );
      remoteTrackIds = Array.isArray(detail.tracks)
        ? (detail.tracks as JsonRecord[]).map((track) => String(track.id || "")).filter(Boolean)
        : [];
      const accountPage = await page.context().newPage();
      const accountDetailResponse = accountPage.waitForResponse(
        (candidate) =>
          candidate.url().endsWith(`/api/user/playlists/${encodeURIComponent(playlistId)}`) &&
          candidate.request().method() === "GET",
        { timeout: 30_000 },
      );
      await accountPage.goto(`${baseUrl}/account/playlists/${encodeURIComponent(playlistId)}`, {
        waitUntil: "domcontentloaded",
      });
      await accountDetailResponse;
      if (expectedTrackIds[0]) {
        await accountPage.locator(`[data-track-id="${expectedTrackIds[0]}"]`).waitFor({
          state: "visible",
          timeout: 30_000,
        }).catch(() => undefined);
      }
      visibleInAccount = (await Promise.all(expectedTrackIds.map((trackId) =>
        accountPage.locator(`[data-track-id="${trackId}"]`).count().then((count) => count > 0),
      ))).every(Boolean);
      await page.request.post(`${baseUrl}/api/auth/logout`, { headers: { Origin: baseUrl } });
      await login(page.request);
      const reconnectDetailResponse = accountPage.waitForResponse(
        (candidate) =>
          candidate.url().endsWith(`/api/user/playlists/${encodeURIComponent(playlistId)}`) &&
          candidate.request().method() === "GET",
        { timeout: 30_000 },
      );
      await accountPage.reload({ waitUntil: "domcontentloaded" });
      await reconnectDetailResponse;
      if (expectedTrackIds[0]) {
        await accountPage.locator(`[data-track-id="${expectedTrackIds[0]}"]`).waitFor({
          state: "visible",
          timeout: 30_000,
        }).catch(() => undefined);
      }
      visibleAfterReconnect = (await Promise.all(expectedTrackIds.map((trackId) =>
        accountPage.locator(`[data-track-id="${trackId}"]`).count().then((count) => count > 0),
      ))).every(Boolean);
      await accountPage.close();
    } finally {
      cleanupStatus = (await mutate(page.request, "/api/user/playlists", "DELETE", { playlistId })).status;
      const cleanupPolling = await waitForMemberState(
        page.request,
        "/api/user/playlists",
        (candidate) => !JSON.stringify(candidate).includes(playlistId),
      );
      absentAfterCleanup = Boolean(cleanupPolling.at(-1)?.matched);
      if (!absentAfterCleanup) {
        throw new Error(`Temporary shortlist playlist ${playlistId} was not cleaned up`);
      }
    }
  }
  return {
    createStatus: response.status(),
    playlistReturned: Boolean(playlistId),
    playlistId,
    expectedTrackIds,
    remoteTrackIds,
    orderVerified: expectedTrackIds.length > 0 &&
      expectedTrackIds.every((trackId, index) => remoteTrackIds[index] === trackId),
    visibleInAccount,
    visibleAfterReconnect,
    statusMessage,
    dismissible,
    dismissed,
    shortlistPreserved: before === after,
    cleanupStatus,
    absentAfterCleanup,
  };
}

async function visitAccount(page: Page) {
  const pages: Array<{ route: string; status: number | null; dateSamples: string[] }> = [];
  for (const route of [
    "/account",
    "/account/favorites",
    "/account/playlists",
    "/account/searches",
    "/account/history",
    "/account/downloads",
    "/account/tags",
    "/account/settings",
  ]) {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    const text = await page.locator("body").innerText();
    pages.push({
      route,
      status: response?.status() || null,
      dateSamples: text.split("\n").filter((line) => /\b\d{1,2}\/\d{1,2}\/2026\b/.test(line)).slice(0, 3),
    });
  }
  return pages;
}

async function sendAllowedEmailsAndShare(page: Page) {
  if (process.env.HARVEST_ALLOW_EMAIL_EFFECTS !== "1") return { skipped: "HARVEST_ALLOW_EMAIL_EFFECTS is not 1" };
  const reset = await page.request.post(`${baseUrl}/api/user/change-password`, { headers: { Origin: baseUrl } });

  const playlistsBeforePayload = await json(await page.request.get(`${baseUrl}/api/user/playlists`));
  const before = dataArray(playlistsBeforePayload, "playlists");
  const featuredPayload = await json(await page.request.get(`${baseUrl}/api/playlists?limit=1`));
  const featured = dataArray(featuredPayload, "playlists")[0];
  const featuredId = String(featured?.id || "");
  let copiedId = "";
  let copyStatus: number | null = null;
  let shareStatus: number | null = null;
  let shareEmailed = false;
  let cleanupStatus: number | null = null;
  if (featuredId) {
    const copy = await mutate(page.request, "/api/user/playlists/copy-featured", "POST", { playlistId: featuredId });
    copyStatus = copy.status;
    await page.waitForTimeout(800);
    const afterPayload = await json(await page.request.get(`${baseUrl}/api/user/playlists`));
    const after = dataArray(afterPayload, "playlists");
    const beforeIds = new Set(before.map((item) => String(item.id || "")));
    const copied = after.find((item) => !beforeIds.has(String(item.id || "")));
    copiedId = String(copied?.id || "");
    if (copiedId) {
      const share = await mutate(page.request, `/api/user/playlists/${encodeURIComponent(copiedId)}/share`, "POST", {
        playlistTitle: String(copied?.title || "Parigo audit playlist"),
        toEmail: required("HARVEST_TEST_MEMBER_EMAIL"),
        message: `${runId} — partage de test autorisé`,
        shareType: "Sync",
        allowDownload: false,
        allowFollow: false,
        allowSave: true,
        allowShare: false,
        sendEmail: true,
      });
      shareStatus = share.status;
      const shareData = share.payload.data;
      if (shareData && typeof shareData === "object" && !Array.isArray(shareData)) {
        const shareValue = (shareData as JsonRecord).share;
        shareEmailed = Boolean(shareValue && typeof shareValue === "object" && !Array.isArray(shareValue) && (shareValue as JsonRecord).emailed);
      }
      cleanupStatus = (await mutate(page.request, "/api/user/playlists", "DELETE", { playlistId: copiedId })).status;
    }
  }
  return {
    passwordResetStatus: reset.status(),
    copyStatus,
    copiedPlaylistIdentified: Boolean(copiedId),
    shareStatus,
    shareEmailed,
    cleanupStatus,
  };
}

async function timezoneAudit(browser: Browser) {
  const results: Array<{ timezone: string; birthdayLines: string[]; datedLines: string[]; dateContexts: string[][] }> = [];
  for (const timezone of ["UTC", "Europe/Paris", "Australia/Sydney"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR", timezoneId: timezone });
    await installLocalPreferences(context);
    const page = await context.newPage();
    await login(page.request);
    await page.goto(`${baseUrl}/account/searches`, { waitUntil: "domcontentloaded" });
    await page.getByText("Birthday", { exact: true }).waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
    const lines = (await page.locator("body").innerText()).split("\n");
    const birthdayIndex = lines.findIndex((line) => line.includes("Birthday"));
    results.push({
      timezone,
      birthdayLines: birthdayIndex >= 0 ? lines.slice(birthdayIndex, birthdayIndex + 8) : [],
      datedLines: lines.filter((line) => /Birthday|2026/.test(line)).slice(0, 12),
      dateContexts: lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /\d{1,2}\/\d{1,2}\/2026/.test(line))
        .slice(0, 4)
        .map(({ index }) => lines.slice(Math.max(0, index - 4), index + 2)),
    });
    await context.close();
  }
  return results;
}

async function testNewDocumentedCapabilities(page: Page) {
  await openSearch(page);
  const inventory = await actionInventory(page);
  const tagCrossPage = await testTagCrossPage(page, inventory);

  await openSearch(page);
  const rightsResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/tracks/") &&
    response.url().endsWith("/right-holders") &&
    response.request().method() === "GET",
  );
  let informationButton = page.getByRole("button", {
    name: `Informations sur la piste : ${inventory.title}`,
  }).filter({ visible: true }).first();
  if (!await informationButton.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: `Plus d’actions : ${inventory.title}` }).click();
    informationButton = page.getByRole("button", {
      name: `Informations sur la piste : ${inventory.title}`,
    }).filter({ visible: true }).first();
  }
  await informationButton.click();
  const rightsResponse = await rightsResponsePromise;
  const rightsPayload = await json(rightsResponse);
  const rightHolders = dataArray(rightsPayload, "rightHolders");
  const rightHoldersVisible = await page.getByText("Ayants droit", { exact: true }).last().isVisible().catch(() => false);

  const searches = dataArray(
    await json(await page.request.get(`${baseUrl}/api/user/searches`, { timeout: 30_000 })),
    "searches",
  );
  const existingSearch = searches[0];
  let savedSearchRename: JsonRecord = { tested: false, reason: "No existing saved search" };
  if (existingSearch?.id && existingSearch?.name) {
    const searchId = String(existingSearch.id);
    const originalName = String(existingSearch.name);
    const temporaryName = `${runId} rename`;
    await page.goto(`${baseUrl}/account/searches`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: `Renommer ${originalName}` }).click();
    await page.getByLabel("Nouveau nom de la recherche").fill(temporaryName);
    const renameResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith(`/api/user/searches/${encodeURIComponent(searchId)}`) &&
      response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Enregistrer le nom" }).click();
    const renameResponse = await renameResponsePromise;
    const visible = await page.getByText(temporaryName, { exact: true }).isVisible().catch(() => false);
    const restore = await mutate(
      page.request,
      `/api/user/searches/${encodeURIComponent(searchId)}`,
      "PATCH",
      { name: originalName },
    );
    const restored = dataArray(
      await json(await page.request.get(`${baseUrl}/api/user/searches`, { timeout: 30_000 })),
      "searches",
    ).some((search) => String(search.id) === searchId && String(search.name) === originalName);
    savedSearchRename = {
      tested: true,
      status: renameResponse.status(),
      visible,
      restoreStatus: restore.status,
      restored,
    };
  }

  const categoryName = `Parigo audit ${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
  let categoryId = "";
  let duplicateId = "";
  const playlistFacts: JsonRecord = {};
  try {
    await page.goto(`${baseUrl}/account/playlists`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    const categoryInput = page.getByLabel("Nom du nouveau dossier");
    await categoryInput.fill(categoryName);
    const categoryForm = page.locator("form").filter({ has: categoryInput });
    const categorySubmit = categoryForm.locator('button[type="submit"]');
    await categorySubmit.waitFor({ state: "visible" });
    await page.waitForFunction(
      (selector) => {
        const button = document.querySelector<HTMLButtonElement>(selector);
        return Boolean(button && !button.disabled);
      },
      'form button[type="submit"]',
    );
    const categoryResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/user/playlist-categories") &&
      response.request().method() === "POST",
    );
    await categorySubmit.click();
    const categoryResponse = await categoryResponsePromise;
    categoryId = String(dataRecord(await json(categoryResponse), "category").id || "");
    playlistFacts.categoryCreateStatus = categoryResponse.status();
    playlistFacts.categoryVisible = await page.getByText(categoryName, { exact: false }).first().isVisible().catch(() => false);

    const playlists = dataArray(
      await json(await page.request.get(`${baseUrl}/api/user/playlists`)),
      "playlists",
    );
    const source = playlists[0];
    if (source?.id) {
      const sourceId = String(source.id);
      const sourceDetailResponsePromise = page.waitForResponse((response) =>
        response.url().endsWith(`/api/user/playlists/${encodeURIComponent(sourceId)}`) &&
        response.request().method() === "GET",
      );
      await page.goto(`${baseUrl}/account/playlists/${encodeURIComponent(sourceId)}`, {
        waitUntil: "domcontentloaded",
      });
      const sourceDetailResponse = await sourceDetailResponsePromise;
      playlistFacts.sourceDetailStatus = sourceDetailResponse.status();
      if (!sourceDetailResponse.ok()) {
        throw new Error(`Source playlist detail returned HTTP ${sourceDetailResponse.status()}`);
      }
      await page.getByRole("combobox", { name: "Dossier de la playlist" }).waitFor({
        state: "visible",
        timeout: 60_000,
      });
      await page.getByRole("combobox", { name: "Dossier de la playlist" }).click();
      const moveResponsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/user/playlists/${encodeURIComponent(sourceId)}/placement`) &&
          response.request().method() === "PATCH",
        { timeout: 90_000 },
      );
      await page.getByRole("option", { name: categoryName }).click();
      playlistFacts.moveStatus = (await moveResponsePromise).status();

      const sourceDetail = dataRecord(
        await json(await page.request.get(`${baseUrl}/api/user/playlists/${encodeURIComponent(sourceId)}`)),
        "playlist",
      );
      const sourceTracks = Array.isArray(sourceDetail.tracks) ? sourceDetail.tracks as JsonRecord[] : [];
      const query = String(sourceTracks[0]?.title || "").split(/\s+/)[0] || "";
      if (query) {
        const searchResponsePromise = page.waitForResponse((response) =>
          response.url().includes(`/api/user/playlists/${encodeURIComponent(sourceId)}/tracks?`) &&
          response.request().method() === "GET",
        );
        await page.getByPlaceholder("Titre, description, mot-clé…").fill(query);
        const searchResponse = await searchResponsePromise;
        const searchPayload = await json(searchResponse);
        const searchData = searchPayload.data && typeof searchPayload.data === "object" && !Array.isArray(searchPayload.data)
          ? searchPayload.data as JsonRecord
          : {};
        playlistFacts.serverSearchStatus = searchResponse.status();
        playlistFacts.serverSearchTotal = Number(searchData.total || 0);
        playlistFacts.serverSearchVisible = await page.getByText(/résultat\(s\) Harvest/).isVisible().catch(() => false);
      }

      const duplicateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/user/playlists/${encodeURIComponent(sourceId)}/duplicate`) &&
          response.request().method() === "POST",
        { timeout: 90_000 },
      );
      await page.getByRole("button", { name: "Dupliquer" }).click();
      const duplicateResponse = await duplicateResponsePromise;
      const duplicatedPlaylist = dataRecord(await json(duplicateResponse), "playlist");
      duplicateId = String(duplicatedPlaylist.id || "");
      const duplicateTitle = String(duplicatedPlaylist.title || "");
      playlistFacts.duplicateStatus = duplicateResponse.status();
      playlistFacts.duplicateIdReturned = Boolean(duplicateId);
      if (duplicateId) {
        await page.waitForURL((url) => url.pathname === `/account/playlists/${duplicateId}`);
        if (duplicateTitle) {
          await page.waitForFunction(
            (title) => document.body.innerText.includes(String(title)),
            duplicateTitle,
            { timeout: 60_000 },
          ).catch(() => undefined);
        }
        playlistFacts.duplicateVisible = duplicateTitle
          ? (await page.locator("body").innerText()).includes(duplicateTitle)
          : false;
      }
    } else {
      playlistFacts.sourceAvailable = false;
    }

    await page.goto(`${baseUrl}/account/communications`, { waitUntil: "domcontentloaded" });
    playlistFacts.communicationsPageVisible = await page.getByRole("heading", {
      name: "Communications",
    }).last().isVisible().catch(() => false);
  } finally {
    if (duplicateId) {
      playlistFacts.duplicateCleanupStatus = (
        await mutate(page.request, "/api/user/playlists", "DELETE", { playlistId: duplicateId })
      ).status;
    }
    if (categoryId) {
      playlistFacts.categoryCleanupStatus = (
        await mutate(
          page.request,
          `/api/user/playlist-categories/${encodeURIComponent(categoryId)}`,
          "DELETE",
        )
      ).status;
    }
  }

  return {
    inventory,
    tagCrossPage,
    rightHolders: {
      status: rightsResponse.status(),
      count: rightHolders.length,
      visible: rightHoldersVisible,
    },
    savedSearchRename,
    playlists: playlistFacts,
  };
}

async function runViewport(browser: Browser, name: "desktop" | "mobile", viewport: { width: number; height: number }, full: boolean) {
  const context = await browser.newContext({
    viewport,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    acceptDownloads: true,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await installLocalPreferences(context);
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().replace(/https?:\/\/\S+/g, "<URL>"));
  });
  try {
    if (full && process.env.HARVEST_UI_RESUME === "saved-search") {
      const loginStatus = await login(page.request);
      const savedSearch = await testSavedSearch(page);
      const logout = await page.request.post(`${baseUrl}/api/auth/logout`, { headers: { Origin: baseUrl } });
      return {
        viewport: name,
        size: `${viewport.width}x${viewport.height}`,
        resumedAt: "saved-search",
        loginStatus,
        savedSearch,
        logoutStatus: logout.status(),
        consoleErrors,
        accountDeleted: false,
        secretsPrinted: false,
      };
    }
    if (process.env.HARVEST_UI_RESUME === "capabilities") {
      const loginStatus = await login(page.request);
      const capabilities = await testNewDocumentedCapabilities(page);
      const logout = await page.request.post(`${baseUrl}/api/auth/logout`, { headers: { Origin: baseUrl } });
      return {
        viewport: name,
        size: `${viewport.width}x${viewport.height}`,
        resumedAt: "capabilities",
        loginStatus,
        capabilities,
        logoutStatus: logout.status(),
        consoleErrors,
        accountDeleted: false,
        secretsPrinted: false,
      };
    }
    if (full && process.env.HARVEST_UI_RESUME === "effects") {
      const loginStatus = await login(page.request);
      const search = await json(await page.request.get(`${baseUrl}/api/search?q=piano&limit=1`));
      const trackId = String(dataArray(search, "items")[0]?.id || "");
      const emailAndShare = await sendAllowedEmailsAndShare(page);
      const contact = trackId
        ? await testContact(page, trackId)
        : { skipped: "No verified track id was available" };
      const logout = await page.request.post(`${baseUrl}/api/auth/logout`, { headers: { Origin: baseUrl } });
      return {
        viewport: name,
        size: `${viewport.width}x${viewport.height}`,
        resumedAt: "effects",
        loginStatus,
        emailAndShare,
        contact,
        logoutStatus: logout.status(),
        consoleErrors,
        accountDeleted: false,
        secretsPrinted: false,
      };
    }
    if (full && process.env.HARVEST_UI_RESUME === "track") {
      const loginStatus = await login(page.request);
      await openSearch(page);
      const inventory = await actionInventory(page);
      const trackPanels = await testTrackPanels(page, inventory);
      const logout = await page.request.post(`${baseUrl}/api/auth/logout`, { headers: { Origin: baseUrl } });
      return {
        viewport: name,
        size: `${viewport.width}x${viewport.height}`,
        resumedAt: "track",
        loginStatus,
        inventory,
        trackPanels,
        logoutStatus: logout.status(),
        consoleErrors,
        accountDeleted: false,
        secretsPrinted: false,
      };
    }
    if (full && process.env.HARVEST_UI_RESUME === "tag") {
      const loginStatus = await login(page.request);
      await openSearch(page);
      const inventory = await actionInventory(page);
      const tagCrossPage = await testTagCrossPage(page, inventory);
      const profileAndImage = await testProfileAndImage(page);
      const settingsSafety = await testSettingsSafety(page);
      const emailAndShare = await sendAllowedEmailsAndShare(page);
      const contact = tagCrossPage.trackId
        ? await testContact(page, String(tagCrossPage.trackId))
        : { skipped: "No verified track id was available" };
      const logout = await page.request.post(`${baseUrl}/api/auth/logout`, { headers: { Origin: baseUrl } });
      return {
        viewport: name,
        size: `${viewport.width}x${viewport.height}`,
        resumedAt: "tag",
        loginStatus,
        inventory,
        tagCrossPage,
        profileAndImage,
        settingsSafety,
        emailAndShare,
        contact,
        logoutStatus: logout.status(),
        consoleErrors,
        accountDeleted: false,
        secretsPrinted: false,
      };
    }
    console.error(`[ui-audit] ${name}: anonymous shortlist`);
    await openSearch(page);
    const shortlistAnonymous = await addAnonymousShortlist(page);
    console.error(`[ui-audit] ${name}: login and inventory`);
    const loginStatus = await login(page.request);
    const preflightCleanup = full ? await cleanupPreviousUiAuditResources(page.request) : [];
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Écouter / }).first().waitFor({ state: "visible" });
    const shortlistAfterLogin = await page.evaluate(() => window.localStorage.getItem("parigo-shortlist"));
    const inventory = await actionInventory(page);
    console.error(`[ui-audit] ${name}: favourite`);
    const favourite = await testFavourite(page, inventory);
    console.error(`[ui-audit] ${name}: shortlist conversion`);
    const conversion = await testShortlistConversion(page);
    console.error(`[ui-audit] ${name}: account pages`);
    const accountPages = await visitAccount(page);
    console.error(`[ui-audit] ${name}: extended=${full}`);
    const extended: JsonRecord = {};
    if (full) {
      extended.trackPanels = await testTrackPanels(page, inventory);
      console.error("[ui-audit] desktop: Search → tag → Account");
      extended.tagCrossPage = await testTagCrossPage(page, inventory);
      console.error("[ui-audit] desktop: saved search");
      extended.savedSearch = await testSavedSearch(page);
      console.error("[ui-audit] desktop: profile field and profile image");
      extended.profileAndImage = await testProfileAndImage(page);
      console.error("[ui-audit] desktop: settings safety");
      extended.settingsSafety = await testSettingsSafety(page);
      console.error("[ui-audit] desktop: optional email/share");
      extended.emailAndShare = await sendAllowedEmailsAndShare(page);
      const favouriteTrackId = favourite && typeof favourite === "object" && "trackId" in favourite
        ? String(favourite.trackId || "")
        : "";
      console.error("[ui-audit] desktop: optional contact and acknowledgement");
      extended.contact = favouriteTrackId
        ? await testContact(page, favouriteTrackId)
        : { skipped: "No verified track id was available" };
    }
    const logout = await page.request.post(`${baseUrl}/api/auth/logout`, { headers: { Origin: baseUrl } });
    return {
      viewport: name,
      size: `${viewport.width}x${viewport.height}`,
      loginStatus,
      preflightCleanup,
      shortlistAnonymous,
      shortlistAfterLoginPreserved: Boolean(shortlistAfterLogin),
      inventory,
      favourite,
      conversion,
      accountPages,
      ...extended,
      logoutStatus: logout.status(),
      consoleErrors,
      accountDeleted: false,
      secretsPrinted: false,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  if (process.env.HARVEST_MEMBER_UI_AUDIT !== "1") {
    console.log("Harvest member UI audit skipped.");
    return;
  }
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const viewportMode = process.env.HARVEST_UI_VIEWPORT || "all";
    const desktop = ["mobile", "timezone"].includes(viewportMode)
      ? null
      : await runViewport(
          browser,
          "desktop",
          { width: 1440, height: 900 },
          process.env.HARVEST_UI_CORE_ONLY !== "1",
        );
    const mobile = ["desktop", "timezone"].includes(viewportMode) ? null : await runViewport(browser, "mobile", { width: 390, height: 844 }, false);
    const timezones = await timezoneAudit(browser);
    console.log(JSON.stringify({
      runId,
      desktop,
      mobile,
      timezones,
      accountDeleted: false,
      secretsPrinted: false,
    }));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    fatal: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack?.replace(/https?:\/\/\S+/g, "<URL>") : undefined,
    accountDeleted: false,
    secretsPrinted: false,
  }));
  process.exitCode = 1;
});
