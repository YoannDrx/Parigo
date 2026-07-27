import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      updatedAt: "2026-07-24T00:00:00.000Z",
    }));
  });
});

test("les labels exposent les vrais volumes, la recherche et les deux vues", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/labels");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/^0 albums$/)).toHaveCount(0);
  await expect(page.locator("article").first()).toContainText(/[1-9]\d* albums/);

  const query = page.getByPlaceholder("Rechercher un label");
  await query.fill("101 Music Compilations");
  await expect(page.getByRole("status")).toContainText("1 résultats");
  await expect(page.getByRole("heading", { level: 2, name: "101 Music Compilations" })).toBeVisible();
  await expect(page).toHaveURL(/q=101\+Music\+Compilations/);

  await page.getByRole("button", { name: "Vue liste" }).click();
  await expect(page.getByRole("button", { name: "Vue liste" })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/view=list/);
});

test("la discographie d’un label se recherche et expose les filtres complets", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/labels/0f9769346759ee5a");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByPlaceholder(/Rechercher dans les albums de/)).toBeVisible();
  await expect(page.getByText("Discographie", { exact: true })).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Tous les filtres" }).click();
  }
  const filterScope = testInfo.project.name === "mobile"
    ? page.getByRole("dialog", { name: "Filtres du catalogue" })
    : page.locator("aside");
  await expect(filterScope.getByRole("heading", { level: 2, name: "Affiner la recherche" })).toBeVisible();
  await expect(filterScope.getByLabel("BPM minimum")).toBeVisible();
  await expect(filterScope.getByLabel("Durée minimum")).toBeVisible();
  await expect(filterScope.getByText("Style", { exact: true })).toHaveCount(0);
});

test("les playlists proposent recherche, ambiance, genre, instrument et usage", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/playlists");
  await expect(page.getByPlaceholder("Rechercher une playlist ou un thème")).toBeVisible();
  for (const label of ["Ambiance", "Genre", "Instrument", "Musique pour"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.locator("main select")).toHaveCount(0);
  const moodFilter = page.locator(".catalog-facet").filter({ hasText: "Ambiance" });
  await moodFilter.getByRole("button").first().click();
  const firstInclude = moodFilter.getByRole("button", { name: /^Inclure / }).first();
  const selectedMood = (await firstInclude.getAttribute("aria-label"))?.replace(/^Inclure /, "");
  await firstInclude.click();
  await expect(page.getByText("1 inclus · 0 exclus", { exact: true })).toBeVisible();
  if (selectedMood) await expect(page.getByRole("button", { name: `Retirer ${selectedMood}` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Sélection par Hugo/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Vue liste" }).click();
  await expect(page).toHaveURL(/view=list/);
});

test("les anciennes collections redirigent vers les albums et ne sont plus navigables", async ({ page }) => {
  await page.goto("/collections/f0924b3e05a93ff2");
  await expect(page).toHaveURL(/\/albums$/);
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu principal" }).getByRole("link", { name: "Collections" })).toHaveCount(0);
});

test("les synchronisations reprennent toute la playlist YouTube avec uniquement les deux vues", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/synchronisations?q=crime&sort=recent&year=2024");
  await expect(page).toHaveURL(/\/synchronisations$/);
  expect(await page.locator(".home-sync-card").count()).toBeGreaterThan(60);
  await expect(page.locator("main select")).toHaveCount(0);
  await expect(page.locator(".sync-gallery-card").first()).toBeVisible();
  await expect(page.getByPlaceholder(/Rechercher une synchronisation/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cartes" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Liste" }).click();
  await expect(page).toHaveURL(/view=list/);
});

test("les clips affichent la sélection éditoriale sans recherche ni filtres et nettoient les anciennes URL", async ({ page }) => {
  await page.goto("/clips?q=crime&type=official-video");
  await expect(page).toHaveURL(/\/clips$/);
  await expect(page.getByRole("heading", { level: 1, name: "Clips" })).toBeVisible();
  await expect(page.locator("main input")).toHaveCount(0);
  await expect(page.locator("main select")).toHaveCount(0);
  await expect(page.locator('main a[href^="/clips/"]').first()).toBeVisible();
});
