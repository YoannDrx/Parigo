import { expect, test, type Page } from "@playwright/test";
import { installMemberSession } from "./helpers/member-session";

const sessionPayload = {
  data: {
    session: {
      user: {
        id: "member-empty-states",
        email: "illustrations@parigo.test",
        name: "Parigo Illustrations",
        image: null,
        role: "USER",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      session: { expiresAt: "2027-08-01T00:00:00.000Z" },
    },
  },
};

const shortlistTrack = {
  id: "empty-shortlist-track",
  title: "Piste temporaire",
  duration: 120,
  bpm: 90,
  audioUrl: null,
  albumId: "empty-shortlist-album",
  albumTitle: "Parigo Empty States",
  albumCover: "/images/placeholder-album.svg",
  albumLabel: "Parigo",
  genres: [],
  moods: [],
  isVocal: false,
  waveform: null,
};

const similarityCapabilities = {
  data: {
    track: { advertised: true, enabled: true, multiSeed: true, prioritizeBpm: true },
    prompt: { advertised: true, enabled: true },
    upload: { advertised: false, enabled: false, contentTypes: [], maxBytes: 0, maxDurationSeconds: 0 },
    externalUrl: { advertised: false, enabled: false, platforms: [] },
    playlistSuggestions: false,
  },
};

async function installEmptyMemberData(page: Page) {
  await page.route("**/api/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionPayload) }));
  await page.route("**/api/user/playlist-categories**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { categories: [], capabilities: { playlistSharing: false } } }) }));
  await page.route("**/api/user/playlists**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { playlists: [] } }) }));
  await page.route("**/api/user/favorites/tracks**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tracks: [] } }) }));
  await page.route("**/api/user/downloads**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { downloads: [] } }) }));
  await page.route("**/api/user/history**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { history: [] } }) }));
  await page.route("**/api/user/searches**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { searches: [] } }) }));
  await page.route("**/api/user/tags**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tags: [] } }) }));
  await page.route("**/api/user/communications**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { items: [] } }) }));
  await page.route("**/api/user/comments**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { groups: [] } }) }));
}

test.beforeEach(async ({ page, context, baseURL }) => {
  await installMemberSession(context, baseURL!);
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({ necessary: true, preferences: false, analytics: false, marketing: false, updatedAt: "2026-08-28T00:00:00.000Z" }));
  });
  await installEmptyMemberData(page);
});

test("les états vides du compte restent textuels et sans illustration", async ({ page }) => {
  const cases = [
    ["/account/playlists", "Aucune playlist"],
    ["/account/favorites", "Aucune piste en favoris"],
    ["/account/downloads", "Aucun téléchargement"],
    ["/account/history", "Aucun historique"],
    ["/account/searches", "Aucune recherche enregistrée"],
    ["/account/tags", "Aucun tag pour le moment."],
    ["/account/communications", "Aucune communication enregistrée"],
    ["/account/comments", "Votre carnet de Tracks commence ici."],
  ] as const;

  for (const [path, copy] of cases) {
    await page.goto(path);
    await expect(page.getByText(copy, { exact: true }).first()).toBeVisible();
    await expect(page.locator("main .editorial-empty-state")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test("les listes vides de la recherche catalogue restent textuelles", async ({ page }) => {
  await page.route("**/api/search/filters?**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { groups: [] } }) }));
  await page.route("**/api/search?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data: { items: [], view: "tracks", facets: { categories: [], labels: [], styles: [] } }, meta: { page: 1, pageSize: 30, total: 0, requestId: "empty-search-text" } }),
  }));

  await page.goto("/search?q=requete-sans-resultat");
  await expect(page.getByTestId("empty-search-results")).toBeVisible();
  await expect(page.getByTestId("empty-search-results").locator("img")).toHaveCount(0);
  await expect(page.locator("main .editorial-empty-state")).toHaveCount(0);

  await page.goto("/search?q=requete-sans-resultat&view=albums");
  await expect(page.getByTestId("empty-search-albums")).toBeVisible();
  await expect(page.getByTestId("empty-search-albums").locator("img")).toHaveCount(0);
  await expect(page.locator("main .editorial-empty-state")).toHaveCount(0);
});

test("la similarité sans résultat reste textuelle sur Search", async ({ page }) => {
  await page.route("**/api/similarity/capabilities", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify(similarityCapabilities) }));
  await page.route("**/api/similarity/search", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data: { tracks: [], mode: "prompt" }, meta: { total: 0, durationMs: 12, requestId: "empty-similarity-illustration" } }),
  }));

  await page.goto("/search?mode=ai&source=prompt");
  await page.getByLabel("Décrire la musique recherchée").fill("Un brief volontairement introuvable");
  await page.getByRole("button", { name: "Lancer le brief" }).click();
  await expect(page.getByTestId("empty-similarity-results")).toBeVisible();
  await expect(page.getByTestId("empty-similarity-results").locator("img")).toHaveCount(0);
  await expect(page.locator("main .editorial-empty-state")).toHaveCount(0);
});

test("vider la shortlist révèle son illustration R22", async ({ page }) => {
  await page.addInitScript((track) => {
    window.localStorage.setItem("parigo-shortlist", JSON.stringify({ state: { items: [{ track, addedAt: "2026-08-28T12:00:00.000Z" }] }, version: 2 }));
  }, shortlistTrack);
  await page.route("**/api/similarity/capabilities", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify(similarityCapabilities) }));
  await page.route("**/api/search/filters?**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { groups: [] } }) }));
  await page.route("**/api/search?**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { items: [], view: "tracks", facets: { categories: [], labels: [], styles: [] } }, meta: { page: 1, pageSize: 30, total: 0, requestId: "empty-shortlist-illustration" } }) }));

  await page.goto("/search");
  await page.locator("[data-shortlist-trigger]").click();
  const drawer = page.getByRole("dialog", { name: "Shortlist" });
  await drawer.getByRole("button", { name: "Vider la shortlist" }).click();
  await expect(drawer.getByTestId("empty-shortlist-image")).toHaveAttribute("src", /r22-shortlist-vide-1600x1200/);
});
