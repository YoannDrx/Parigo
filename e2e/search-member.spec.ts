import { expect, test, type Page } from "@playwright/test";

const sessionPayload = { data: { session: { user: { id: "member-1", email: "yoann@parigo.test", name: "Yoann Andrieux", image: null, role: "USER", createdAt: "2026-01-01T00:00:00.000Z" }, session: { expiresAt: "2026-08-01T00:00:00.000Z" } } } };
const track = { id: "track-1", title: "Piano documentaire", duration: 148, bpm: 92, audioUrl: null, albumId: "album-1", albumTitle: "Parigo Test Pressing", albumCover: "/images/placeholder-album.jpg", albumLabel: "Parigo", genres: ["Documentary"], moods: ["Intimate"], isVocal: false, waveform: null };
const facets = { bpm: { min: 1, max: 300 }, duration: { min: 1, max: 2029 }, labels: [], categories: [], styles: [] };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({ necessary: true, preferences: false, analytics: false, marketing: false, updatedAt: "2026-07-23T00:00:00.000Z" }));
  });
});

async function mockMemberSearch(page: Page) {
  await page.route("**/api/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionPayload) }));
  await page.route("**/api/search/filters?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { groups: [] } }) }));
  await page.route("**/api/search?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { items: [track], view: "tracks", facets }, meta: { page: 1, pageSize: 30, total: 1, requestId: "request-1", searchHistoryId: "history-1" } }) }));
  await page.route("**/api/user/favorites", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { trackIds: [], albumIds: [] } }) }));
}

test("la recherche connectée se sauvegarde sans ajouter un troisième focus vert", async ({ page }) => {
  await mockMemberSearch(page);
  let savedPayload: Record<string, unknown> | null = null;
  await page.route("**/api/user/searches", async (route) => {
    savedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { search: { id: "history-1", name: "Piano documentaire" } } }) });
  });
  await page.goto("/search?q=piano&view=tracks&type=main");
  const input = page.locator("#catalog-search");
  const searchForm = input.locator("xpath=ancestor::form");
  const before = await searchForm.evaluate((node) => ({ boxShadow: getComputedStyle(node).boxShadow, borderColor: getComputedStyle(node).borderColor }));
  await input.focus();
  const after = await searchForm.evaluate((node) => ({ boxShadow: getComputedStyle(node).boxShadow, borderColor: getComputedStyle(node).borderColor }));
  expect(after).toEqual(before);
  await page.getByRole("button", { name: "Sauvegarder" }).click();
  await page.getByLabel("Nom de la recherche").fill("Piano intime pour documentaire");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("button", { name: "Sauvegardée" })).toBeVisible();
  expect(savedPayload).toMatchObject({ name: "Piano intime pour documentaire", searchHistoryId: "history-1", searchUrl: "/search?q=piano&view=tracks&type=main" });
});

test("les actions et tooltips de recherche suivent la langue active", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le tooltip au survol est vérifié sur un pointeur desktop.");
  await mockMemberSearch(page);
  await page.goto("/search?q=piano&view=tracks&type=main");
  await page.getByRole("link", { name: /English version/ }).click();
  await expect(page.getByRole("heading", { name: "Find the right music." })).toBeVisible();
  const favourite = page.getByRole("button", { name: "Add to favourites" }).first();
  await favourite.hover();
  await expect(page.getByRole("tooltip", { name: "Add to favourites" })).toBeVisible();
  await expect(page.getByRole("button", { name: `Track information : ${track.title}` })).toBeVisible();
  await expect(page.getByRole("button", { name: `Add to playlist : ${track.title}` })).toBeVisible();
});

test("les actions playlist et tag utilisent un popover visible sans dialogue natif", async ({ page }, testInfo) => {
  await mockMemberSearch(page);
  await page.route("**/api/user/playlists", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { playlists: [] } }) }));
  await page.route("**/api/user/tags", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tags: [] } }) }));
  let nativeDialog: string | null = null;
  page.on("dialog", async (dialog) => { nativeDialog = dialog.type(); await dialog.dismiss(); });

  await page.goto("/search?q=piano&view=tracks&type=main");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: `Plus d’actions : ${track.title}` }).click();
  await page.getByRole("button", { name: `Ajouter à une playlist : ${track.title}` }).click();
  const playlistDialog = page.getByRole("dialog", { name: new RegExp(`Ajouter à une playlist — ${track.title}`) });
  await expect(playlistDialog).toBeVisible();
  await expect(playlistDialog.getByText("Aucune playlist pour le moment.", { exact: false })).toBeVisible();
  await expect(playlistDialog.getByRole("link", { name: "Créer une playlist" })).toHaveAttribute("href", "/account/playlists");
  await playlistDialog.getByRole("button", { name: "Fermer" }).click();

  const row = page.locator("article").filter({ hasText: track.title }).first();
  await row.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY));
  if (testInfo.project.name === "mobile" && !(await page.getByRole("button", { name: `Ajouter un tag : ${track.title}` }).isVisible())) {
    await page.getByRole("button", { name: `Plus d’actions : ${track.title}` }).click();
  }
  await page.getByRole("button", { name: `Ajouter un tag : ${track.title}` }).click();
  const tagDialog = page.getByRole("dialog", { name: new RegExp(`Ajouter à un tag — ${track.title}`) });
  await expect(tagDialog).toBeVisible();
  await expect(tagDialog.getByText("Créez d’abord un tag", { exact: false })).toBeVisible();
  const bounds = await tagDialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(8);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(testInfo.project.name === "mobile" ? 836 : 892);
  expect(nativeDialog).toBeNull();
});

test("l’icône de note privée ouvre directement le bon onglet", async ({ page }, testInfo) => {
  await mockMemberSearch(page);
  await page.route("**/api/tracks/track-1", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { track } }) }));
  await page.route("**/api/user/tracks/track-1/comments", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { comments: [] } }) }));
  await page.goto("/search?q=piano&view=tracks&type=main");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: `Plus d’actions : ${track.title}` }).click();
  await page.getByRole("button", { name: `Ouvrir les notes privées : ${track.title}` }).click();
  await expect(page.getByRole("tab", { name: "Notes privées" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByPlaceholder("Intention, timecode, retour client…")).toBeVisible();
});

test("une demande de licence conserve la référence et préremplit le brief", async ({ page }) => {
  await page.goto("/contact?track=track-reference-test");
  await expect(page.getByRole("heading", { name: "Demander une licence pour ce morceau." })).toBeVisible();
  const message = await page.getByRole("textbox", { name: /Projet & licence/ }).inputValue();
  expect(message).toContain("Référence : track-reference-test");
  expect(message).toContain("Médias et territoires :");
  expect(message).toContain("Calendrier :");
});

test("un attribut injecté par une extension sur body ne déclenche plus l’overlay d’hydratation", async ({ page }) => {
  await mockMemberSearch(page);
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("A tree hydrated but some attributes")) hydrationErrors.push(message.text());
  });
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const response = await route.fetch();
    const html = (await response.text()).replace("<body ", '<body cz-shortcut-listen="true" ');
    await route.fulfill({ response, body: html });
  });
  await page.goto("/search?q=piano&view=tracks&type=main");
  await expect(page.getByText(track.title, { exact: true })).toBeVisible();
  await page.waitForTimeout(300);
  expect(hydrationErrors).toEqual([]);
});
