export {};

import { chromium, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test";

const baseUrl = process.env.PARIGO_AUDIT_BASE_URL || "http://127.0.0.1:3000";
const runId = `Parigo audit 20260728-ui-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
const pollDelays = [0, 250, 1_000, 3_000, 10_000];

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
  method: "POST" | "PUT" | "DELETE",
  data?: unknown,
) {
  const response = await request.fetch(`${baseUrl}${route}`, {
    method,
    headers: { Origin: baseUrl, "Content-Type": "application/json" },
    data,
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
  for (const delayMs of pollDelays) {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const response = await request.get(`${baseUrl}${route}`, { headers: { "Cache-Control": "no-store" } });
    const payload = await json(response);
    const matched = response.ok() && predicate(payload);
    observations.push({ delayMs, matched });
    if (matched) break;
  }
  return observations;
}

async function cleanupPreviousUiAuditResources(request: APIRequestContext) {
  const removed: Array<{ type: string; id: string; status: number }> = [];
  const searches = dataArray(await json(await request.get(`${baseUrl}/api/user/searches`)), "searches");
  for (const search of searches) {
    if (!String(search.name || "").startsWith("Parigo audit 20260728-ui-")) continue;
    const id = String(search.id || "");
    if (!id) continue;
    const result = await mutate(request, `/api/user/searches?id=${encodeURIComponent(id)}`, "DELETE");
    removed.push({ type: "search", id, status: result.status });
  }
  const playlists = dataArray(await json(await request.get(`${baseUrl}/api/user/playlists`)), "playlists");
  for (const playlist of playlists) {
    const title = String(playlist.title || playlist.name || "");
    if (!title.startsWith("Parigo audit 20260728-ui-")) continue;
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
  const playLabel = await page.getByRole("button", { name: /Écouter / }).first().getAttribute("aria-label") || "";
  const title = playLabel.replace(/^Écouter /, "");
  const labels = await page.locator("button[aria-label]").evaluateAll((nodes, trackTitle) =>
    nodes.map((node) => node.getAttribute("aria-label") || "").filter((label) => label.includes(String(trackTitle))),
  title);
  return { title, labels };
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
  await page.goto(`${baseUrl}/account/favorites`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_200);
  const visibleInAccount = (await page.locator("body").innerText()).includes(inventory.title);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_200);
  const visibleAfterReload = (await page.locator("body").innerText()).includes(inventory.title);
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
    cleanupStatus: cleanup.status,
    cleanupPolling,
  };
}

async function testTrackPanels(page: Page, inventory: { title: string }) {
  await openSearch(page);
  const result: JsonRecord = {};
  console.error("[ui-audit] track: information/versions/lyrics");
  await page.getByRole("button", { name: `Informations sur la piste : ${inventory.title}` }).click();
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
  await page.getByRole("button", { name: `Ouvrir les notes privées : ${inventory.title}` }).click();
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
  await page.getByRole("button", { name: `Ajouter à la file d’attente : ${inventory.title}` }).click();
  result.queueControl = true;
  const historyBefore = await json(await page.request.get(`${baseUrl}/api/user/history`, { timeout: 20_000 }));
  await page.getByRole("button", { name: `Écouter ${inventory.title}` }).click();
  await page.waitForTimeout(6_000);
  const historyAfter = await json(await page.request.get(`${baseUrl}/api/user/history`, { timeout: 20_000 }));
  result.playback = {
    playerVisible: await page.locator('[data-mini-player]').isVisible().catch(() => false),
    historyBeforeCount: dataArray(historyBefore, "items").length,
    historyAfterCount: dataArray(historyAfter, "items").length,
  };
  await page.getByRole("button", { name: /^Pause/ }).first().click().catch(() => undefined);
  console.error("[ui-audit] track: download validation");
  if (process.env.HARVEST_ALLOW_DOWNLOAD_EFFECT === "1") {
    const downloadPromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/user/downloads") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: `Télécharger : ${inventory.title}` }).first().click();
    const downloadResponse = await downloadPromise;
    result.download = {
      validationStatus: downloadResponse.status(),
      actualFileRequested: downloadResponse.ok(),
    };
  } else {
    result.download = {
      buttonExposed: await page.getByRole("button", { name: `Télécharger : ${inventory.title}` }).first().isVisible(),
      actualFileRequested: false,
      skippedReason: "Both current and official validation payloads failed in direct diagnostics",
    };
  }
  console.error("[ui-audit] track: cue sheet");
  const cuePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/cuesheet") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: `Cue sheet : ${inventory.title}` }).first().click();
  const cueResponse = await cuePromise;
  result.cueSheet = { status: cueResponse.status() };
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
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const response = await responsePromise;
  console.error(`[ui-audit] saved search: POST ${response.status()}`);
  const savedSearches = dataArray(
    await json(await page.request.get(`${baseUrl}/api/user/searches`, { timeout: 20_000 })),
    "searches",
  );
  const created = savedSearches.find((item) => item.name === name);
  const searchId = String(created?.id || "");
  const accountPage = await page.context().newPage();
  await accountPage.goto(`${baseUrl}/account/searches`, { waitUntil: "domcontentloaded", timeout: 20_000 });
  await accountPage.getByText(name, { exact: false }).first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
  console.error("[ui-audit] saved search: account page loaded");
  const body = await accountPage.locator("body").innerText();
  await accountPage.close();
  const visible = body.includes(name);
  const displayedDate = body.split("\n").find((line) => /\d{1,2}\/\d{1,2}\/2026/.test(line)) || null;
  let cleanupStatus: number | null = null;
  if (searchId) cleanupStatus = (await mutate(page.request, `/api/user/searches?id=${encodeURIComponent(searchId)}`, "DELETE")).status;
  console.error(`[ui-audit] saved search: cleanup ${cleanupStatus}`);
  return { available, status: response.status(), searchId, visible, displayedDate, cleanupStatus };
}

async function testShortlistConversion(page: Page) {
  await openSearch(page);
  const before = await page.evaluate(() => window.localStorage.getItem("parigo-shortlist"));
  await page.locator("[data-shortlist-trigger]").click();
  const dialog = page.getByRole("dialog", { name: /Shortlist/ });
  const title = `${runId} shortlist`;
  await dialog.getByLabel("Nom de la nouvelle playlist").fill(title);
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/user/playlists") && response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /Créer et vérifier la playlist/ }).click();
  const response = await responsePromise;
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => window.localStorage.getItem("parigo-shortlist"));
  const statusMessage = await dialog.getByRole("status").textContent().catch(() => null);
  const payload = await json(response);
  const playlist = payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
    ? (payload.data as JsonRecord).playlist
    : null;
  return {
    createStatus: response.status(),
    playlistReturned: Boolean(playlist && typeof playlist === "object" && (playlist as JsonRecord).id),
    statusMessage,
    shortlistPreserved: before === after,
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
      console.error("[ui-audit] desktop: saved search");
      extended.savedSearch = await testSavedSearch(page);
      console.error("[ui-audit] desktop: optional email/share");
      extended.emailAndShare = await sendAllowedEmailsAndShare(page);
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
    const desktop = ["mobile", "timezone"].includes(viewportMode) ? null : await runViewport(browser, "desktop", { width: 1440, height: 900 }, true);
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
