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

test("les postes de filtrage défilent sur mobile et restent visibles sur desktop", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  for (const path of ["/albums", "/playlists", "/labels"]) {
    await page.goto(path);
    const workspace = page.getByTestId("catalog-workspace");
    await expect(workspace).toBeVisible();
    await expect(workspace).toHaveCSS("position", testInfo.project.name === "mobile" ? "relative" : "sticky");
    if (testInfo.project.name === "mobile") await expect(workspace).toHaveCSS("top", "0px");
    await workspace.evaluate((element) => {
      element.scrollIntoView({ block: "start", behavior: "instant" });
      window.scrollBy({ top: 600, behavior: "instant" });
    });
    await page.waitForTimeout(350);
    const workspaceBox = await workspace.boundingBox();
    expect(workspaceBox, `poste catalogue absent sur ${path}`).not.toBeNull();
    if (testInfo.project.name === "mobile") {
      expect(workspaceBox!.y, `poste catalogue encore sticky sur mobile sur ${path}`).toBeLessThan(0);
    } else {
      expect(workspaceBox!.y, `poste catalogue non sticky sur ${path}`).toBeGreaterThanOrEqual(0);
      expect(workspaceBox!.y, `poste catalogue trop bas sur ${path}`).toBeLessThanOrEqual(84);
    }

    if (path === "/albums" && testInfo.project.name !== "mobile") {
      const filters = page.locator(".search-filter-sticky");
      await expect(filters).toHaveCSS("position", "sticky");
      const filterBox = await filters.boundingBox();
      expect(filterBox).not.toBeNull();
      expect(filterBox!.y).toBeGreaterThanOrEqual(0);
      expect(filterBox!.y).toBeLessThanOrEqual(90);
    }
  }
});

test("la première pochette du catalogue est prioritaire pour le LCP", async ({ page }) => {
  await page.goto("/albums");
  const albumImages = page.locator(".album-card img");

  await expect(albumImages.first()).toBeVisible({ timeout: 30_000 });
  await expect(albumImages.first()).toHaveAttribute("fetchpriority", "high");
  await expect(albumImages.first()).not.toHaveAttribute("loading", "lazy");
  await expect(albumImages.nth(1)).toHaveAttribute("fetchpriority", "high");
  await expect(albumImages.nth(1)).not.toHaveAttribute("loading", "lazy");
  await expect(albumImages.nth(2)).not.toHaveAttribute("fetchpriority", "high");
});

test("les labels exposent les vrais volumes, la recherche et les deux vues", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/labels");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/^0 albums$/)).toHaveCount(0);
  await expect(page.locator("article").first()).toContainText(/[1-9]\d* albums/);
  const firstCards = page.locator(".label-editorial-card");
  expect(await firstCards.count()).toBeGreaterThan(2);
  await expect(firstCards.first().locator("p")).toHaveCount(0);
  const firstHeights = await firstCards.evaluateAll((cards) => cards.slice(0, 3).map((card) => card.getBoundingClientRect().height));
  expect(new Set(firstHeights.map((height) => Math.round(height))).size).toBe(1);
  const corners = await firstCards.first().evaluate((card) => ({
    top: getComputedStyle(card, "::before").top,
    right: getComputedStyle(card, "::before").right,
    bottom: getComputedStyle(card, "::after").bottom,
    left: getComputedStyle(card, "::after").left,
  }));
  expect(corners).toEqual({ top: "-1px", right: "-1px", bottom: "-1px", left: "-1px" });

  const query = page.getByPlaceholder("Rechercher un label");
  await query.fill("101 Music Compilations");
  await expect(page.getByRole("status").filter({ hasText: "résultats" })).toContainText("1 résultats");
  await expect(page.getByRole("heading", { level: 2, name: "101 Music Compilations" })).toBeVisible();
  await expect(page).toHaveURL(/q=101\+Music\+Compilations/);

  if (testInfo.project.name === "mobile") {
    await expect(page.getByRole("button", { name: "Vue liste" })).toHaveCount(0);
    await expect(page.getByTestId("labels-mobile-list")).toBeVisible();
  } else {
    await page.getByRole("button", { name: "Vue liste" }).click();
    await expect(page.getByRole("button", { name: "Vue liste" })).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/view=list/);
  }
});

test("les labels mobiles utilisent une liste logo-first unique", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "La liste logo-first est spécifique au mobile.");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/labels");
  const list = page.getByTestId("labels-mobile-list");
  await expect(list).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Vue grille" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Vue liste" })).toHaveCount(0);
  const rows = list.locator('a[href^="/labels/"]');
  const [first, second] = await Promise.all([rows.nth(0).boundingBox(), rows.nth(1).boundingBox()]);
  expect(first!.width).toBeGreaterThanOrEqual(280);
  expect(first!.height).toBeGreaterThanOrEqual(84);
  expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
  await expect(rows.first().locator("img, [data-testid='label-logo-fallback']")).toHaveCount(1);
  const fallback = list.locator("[data-testid='label-logo-fallback']").first();
  if (await fallback.count()) {
    await expect(fallback).not.toContainText("PM");
    await expect(fallback).toHaveCSS("border-top-width", "0px");
    await expect(fallback.locator(".rounded-full")).toHaveCount(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("la discographie d’un label se recherche et expose les filtres complets", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/labels/0f9769346759ee5a");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByPlaceholder(/Rechercher dans les albums de/)).toBeVisible();
  await expect(page.getByText("Discographie", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Albums", exact: true })).toHaveAttribute("aria-pressed", "true");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Tous les filtres" }).click();
  }
  const filterScope = testInfo.project.name === "mobile"
    ? page.getByRole("dialog", { name: "Filtres du catalogue" })
    : page.locator("aside");
  await expect(filterScope.getByRole("heading", { level: 2, name: "Affiner la recherche" })).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.waitForTimeout(350);
    const [sheetBox, viewportHeight] = await Promise.all([
      filterScope.locator(".mobile-filter-sheet").boundingBox(),
      page.evaluate(() => window.innerHeight),
    ]);
    expect(sheetBox).not.toBeNull();
    expect(sheetBox!.height).toBeGreaterThanOrEqual(viewportHeight - 10);
    expect(sheetBox!.height).toBeLessThan(viewportHeight);
  }
  await expect(filterScope.getByLabel("BPM minimum")).toBeVisible();
  await expect(filterScope.getByLabel("Durée minimum")).toBeVisible();
  await expect(filterScope.getByText("Compositeurs", { exact: true })).toBeVisible();
  await expect(filterScope.getByText("Styles", { exact: true })).toBeVisible();
  if (testInfo.project.name === "mobile") await filterScope.getByRole("button", { name: /Afficher \d+ résultats/ }).click();
  await page.getByRole("button", { name: "Pistes", exact: true }).click();
  await expect(page).toHaveURL(/kind=tracks/);
  await expect(page.locator(".search-results-ledger")).toBeVisible({ timeout: 30_000 });
});

test("Albums et Notre label filtrent par un compositeur unique sans perdre le label fixe", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.route("**/api/search/composers?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { items: [{ id: "Minimatic", name: "Minimatic", count: 12 }] },
        meta: { matchedTracks: 12, inspectedTracks: 12, incomplete: false },
      }),
    });
  });

  for (const path of ["/albums", "/notre-label"]) {
    await page.goto(path);
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Tous les filtres" }).click();
    }
    const scope = testInfo.project.name === "mobile"
      ? page.getByRole("dialog", { name: "Filtres du catalogue" })
      : page.locator("aside");
    const composerGroup = scope.locator("details").filter({ hasText: "Compositeurs" });
    await composerGroup.locator("summary").click();
    await composerGroup.getByPlaceholder("Rechercher un compositeur…").fill("Minimatic");
    await expect(composerGroup.getByRole("button", { name: "Inclure Minimatic" })).toBeVisible();
    await composerGroup.getByRole("button", { name: "Inclure Minimatic" }).click();
    if (testInfo.project.name === "mobile") {
      await scope.getByRole("button", { name: /Afficher \d+ résultats/ }).click();
    }
    await expect.poll(() => new URL(page.url()).searchParams.get("composer")).toBe("Minimatic");
    await expect(page.getByRole("button", { name: "Retirer Minimatic" })).toBeVisible();
    if (path === "/notre-label") {
      const cardLabels = await page.locator("main a[href^='/albums/'] p").allTextContents();
      expect(cardLabels.filter(Boolean).every((value) => value === "Parigo")).toBe(true);
    }
  }
});

test("les playlists proposent une ligne compacte de facettes et uniquement le tri alphabétique", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/playlists");
  await expect(page.getByPlaceholder("Rechercher une playlist ou un thème")).toHaveCount(0);
  for (const label of ["Ambiance", "Genre", "Instrument", "Musique pour"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.locator("main select")).toHaveCount(0);
  await expect(page.getByText("Plus de pistes", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/métadonnées des pistes contenues dans les playlists/)).toHaveCount(0);
  await expect(page.getByText(/metadata of tracks contained in the playlists/)).toHaveCount(0);
  if (testInfo.project.name === "mobile") {
    const cards = page.getByTestId("playlist-grid").locator(".playlist-card");
    const [firstCard, secondCard] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox()]);
    expect(firstCard!.width).toBeGreaterThanOrEqual(280);
    expect(secondCard!.y).toBeGreaterThanOrEqual(firstCard!.y + firstCard!.height + 15);
    await expect(cards.first()).toContainText(/pistes/);
  }
  if (testInfo.project.name !== "mobile") {
    await page.setViewportSize({ width: 1280, height: 800 });
    const filters = page.getByTestId("playlist-filters");
    const filterBox = await filters.boundingBox();
    const orderBox = await page.getByRole("combobox", { name: "Trier les résultats" }).boundingBox();
    expect(filterBox).not.toBeNull();
    expect(orderBox).not.toBeNull();
    expect(Math.abs(filterBox!.y - orderBox!.y)).toBeLessThanOrEqual(4);
  }
  const moodFilter = page.locator(".catalog-facet").filter({ hasText: "Ambiance" });
  await moodFilter.getByRole("button").first().click();
  const firstInclude = moodFilter.getByRole("button", { name: /^Inclure / }).first();
  const selectedMood = (await firstInclude.getAttribute("aria-label"))?.replace(/^Inclure /, "");
  await firstInclude.click();
  await expect(page.getByText("1 inclus · 0 exclus", { exact: true })).toBeVisible();
  if (selectedMood) await expect(page.getByRole("button", { name: `Retirer ${selectedMood}` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Sélection par Hugo/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Pistes", exact: true }).click();
  await expect(page).toHaveURL(/kind=tracks/);
  await expect(page.locator(".search-results-ledger")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Playlists", exact: true }).click();
  await page.getByRole("button", { name: "Vue liste" }).click();
  await expect(page).toHaveURL(/view=list/);
  const firstRow = page.locator("main .catalog-list-row").first();
  await expect(firstRow).toBeVisible();
  if (testInfo.project.name !== "mobile") {
    const title = firstRow.locator(".catalog-list-row__title");
    const initialBackground = await firstRow.evaluate((node) => getComputedStyle(node).backgroundImage);
    const initialColor = await title.evaluate((node) => getComputedStyle(node).color);
    await firstRow.hover();
    await expect.poll(() => firstRow.evaluate((node) => getComputedStyle(node).backgroundImage)).not.toBe(initialBackground);
    await expect.poll(() => title.evaluate((node) => getComputedStyle(node).color)).not.toBe(initialColor);
  }
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
