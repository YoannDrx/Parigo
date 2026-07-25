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

test("les collections expliquent leur rôle et réutilisent l’explorateur d’albums", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/collections");
  await expect(page.getByText(/styles et univers musicaux/)).toBeVisible();
  await expect(page.getByPlaceholder("Rechercher une collection ou un style")).toBeVisible();
  const firstCollection = page.locator('main a[href^="/collections/"]').first();
  await expect(firstCollection).toBeVisible();
  await firstCollection.click();
  await expect(page.getByPlaceholder(/Rechercher dans la collection/)).toBeVisible({ timeout: 30_000 });
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Tous les filtres" }).click();
  }
  const filterScope = testInfo.project.name === "mobile"
    ? page.getByRole("dialog", { name: "Filtres du catalogue" })
    : page.locator("aside");
  await expect(filterScope.getByLabel("BPM minimum")).toBeVisible();
});

test("une collection distingue pistes indexées et albums réels", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/collections");
  const seventies = page.locator('a[href="/collections/f0924b3e05a93ff2"]');
  await expect(seventies).toContainText(/\d+ pistes indexées/);
  await expect(seventies).not.toContainText("38 albums");
  await seventies.click();
  await expect(page.getByText("1 album", { exact: true })).toBeVisible();
  await expect(page.getByText("1 albums", { exact: true })).toHaveCount(0);
});

test("les synchronisations reprennent toute la playlist YouTube et se filtrent", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/synchronisations");
  const resultStatus = page.getByRole("status");
  await expect(resultStatus).toContainText(/6\d résultats/);
  expect(await page.locator(".home-sync-card").count()).toBeGreaterThan(60);
  await expect(page.locator("main select")).toHaveCount(0);
  await expect(page.locator(".sync-gallery-card").first()).toBeVisible();

  const query = page.getByPlaceholder(/Rechercher une synchronisation/);
  await query.fill("Tokyo Vice");
  await expect(resultStatus).toContainText(/1 résultats/);
  await expect(page.getByRole("heading", { level: 2, name: /Tokyo Vice/i })).toBeVisible();
});
