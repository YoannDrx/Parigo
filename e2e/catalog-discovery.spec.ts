import { expect, test, type Locator } from "@playwright/test";

async function expectSignalAccent(filter: Locator) {
  const colors = await filter.evaluate((button) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--signal-strong)";
    document.body.appendChild(probe);
    const signalColor = getComputedStyle(probe).color;
    probe.remove();
    return {
      borderColor: getComputedStyle(button).borderColor,
      iconColor: getComputedStyle(button.querySelector("svg")!).color,
      signalColor,
    };
  });
  expect(colors.borderColor).toBe(colors.signalColor);
  expect(colors.iconColor).toBe(colors.signalColor);
}

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

test("le poste Albums mobile sépare la recherche et remplit toute la grille de commandes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Cette composition est spécifique au poste Albums mobile.");
  await page.goto("/albums");

  const search = page.getByTestId("catalog-mobile-search");
  const controls = page.getByTestId("catalog-mobile-controls");
  const filter = page.getByRole("button", { name: "Tous les filtres" });
  const sort = page.getByRole("combobox", { name: "Trier les résultats" });
  const view = page.getByRole("group", { name: "Mode d’affichage" });

  await expect(search).toBeVisible();
  await expect(controls).toBeVisible();
  await expect(filter).toBeVisible();
  await expectSignalAccent(filter);

  const [searchBox, controlsBox, filterBox, sortBox, viewBox] = await Promise.all([
    search.boundingBox(),
    controls.boundingBox(),
    filter.boundingBox(),
    sort.boundingBox(),
    view.boundingBox(),
  ]);
  expect(searchBox).not.toBeNull();
  expect(controlsBox).not.toBeNull();
  expect(filterBox).not.toBeNull();
  expect(sortBox).not.toBeNull();
  expect(viewBox).not.toBeNull();

  expect(controlsBox!.y - (searchBox!.y + searchBox!.height)).toBeGreaterThanOrEqual(6);
  expect(filterBox!.width).toBeGreaterThanOrEqual(controlsBox!.width - 20);
  expect(sortBox!.y).toBeGreaterThan(filterBox!.y + filterBox!.height);
  expect(Math.abs(sortBox!.y - viewBox!.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(sortBox!.width - viewBox!.width)).toBeLessThanOrEqual(4);
});

test("le sélecteur d’ordre et le toggle de vue Albums sont alignés sur desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Cet alignement horizontal concerne le poste desktop.");
  await page.goto("/albums");
  const sort = page.getByRole("combobox", { name: "Trier les résultats" });
  const view = page.getByRole("group", { name: "Mode d’affichage" });
  const [sortBox, viewBox] = await Promise.all([sort.boundingBox(), view.boundingBox()]);
  expect(sortBox).not.toBeNull();
  expect(viewBox).not.toBeNull();
  expect(Math.abs(sortBox!.y - viewBox!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(sortBox!.height - viewBox!.height)).toBeLessThanOrEqual(1);
});

test("la recherche Albums privilégie le titre exact tout en respectant un tri manuel", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/albums?q=surf+fiction");

  const firstAlbum = page.locator("[data-album-card]").first();
  const sort = page.getByRole("combobox", { name: "Trier les résultats" });
  await expect(firstAlbum).toContainText("Surf Fiction", { timeout: 30_000 });
  await expect(sort).toContainText("Pertinence");
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("relevance");

  await sort.click();
  await page.getByRole("option", { name: "Plus récents", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("recent");
  await expect(sort).toContainText("Plus récents");
});

test("Notre label conserve Parigo et explique la portée piste de ses filtres", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/notre-label?q=surf+fiction");

  await expect(page.locator("[data-album-card]").first()).toContainText("Surf Fiction", { timeout: 30_000 });
  await expect(page.getByTestId("album-filter-scope")).toContainText("au moins une piste correspondante");
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("relevance");
  const cardLabels = await page.locator("[data-album-card] p").allTextContents();
  expect(cardLabels.filter(Boolean).every((value) => value === "Parigo")).toBe(true);
});

test("Notre label reprend l’accent vert du filtre Albums sur mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Ce traitement concerne le déclencheur mobile.");
  await page.goto("/notre-label");
  const filter = page.getByRole("button", { name: "Tous les filtres" });
  await expect(filter).toBeVisible();
  await expectSignalAccent(filter);
});

test("la première pochette du catalogue est prioritaire pour le LCP", async ({ page }) => {
  await page.goto("/albums");
  const albumImages = page.locator(".album-card img");

  await expect(albumImages.first()).toBeVisible({ timeout: 30_000 });
  await expect(albumImages.first()).not.toHaveAttribute("loading", "lazy");
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1);
  await expect(albumImages.nth(1)).toHaveAttribute("loading", "lazy");
  await expect(albumImages.nth(2)).not.toHaveAttribute("fetchpriority", "high");
});

test("les labels exposent les vrais volumes, la recherche et les deux vues", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/labels");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/^0 albums$/)).toHaveCount(0);
  const firstCards = page.locator(".label-editorial-card");
  expect(await firstCards.count()).toBeGreaterThan(2);
  await expect(firstCards.first()).not.toContainText(/\d+ albums?/i);
  await expect(firstCards.first().locator("svg")).toHaveCount(0);
  await expect(firstCards.first().getByTestId("label-card-overlay")).toHaveCSS("opacity", "0");
  if (testInfo.project.name === "desktop") {
    await firstCards.first().hover({ force: true });
    await expect(firstCards.first().getByTestId("label-card-overlay")).toHaveCSS("opacity", "1");
    await expect(firstCards.first().getByTestId("label-card-overlay")).toHaveCSS("backdrop-filter", /blur\(24px\)/);
    await expect(firstCards.first().getByTestId("label-card-overlay")).toContainText(/\S+/);
  }
  await expect(firstCards.first().locator("p")).toHaveCount(0);
  const firstHeights = await firstCards.evaluateAll((cards) => cards.slice(0, 3).map((card) => card.getBoundingClientRect().height));
  expect(new Set(firstHeights.map((height) => Math.round(height))).size).toBe(1);
  const corners = await firstCards.first().evaluate((card) => ({
    before: getComputedStyle(card, "::before").content,
    after: getComputedStyle(card, "::after").content,
  }));
  expect(corners).toEqual({ before: "none", after: "none" });

  const query = page.getByPlaceholder("Rechercher un label");
  await query.fill("PGO Parigo");
  await expect(page.getByRole("heading", { level: 2, name: "Parigo", exact: true })).toBeVisible({ timeout: 30_000 });
  await query.fill("PRTM");
  await expect(page.getByRole("heading", { level: 2, name: "Primetime Tracks", exact: true })).toBeVisible({ timeout: 30_000 });
  await query.fill("101 Music Compilations");
  await expect(page.getByRole("status").filter({ hasText: "résultats" })).toContainText("1 résultats");
  await expect(page.getByRole("heading", { level: 2, name: "101 Music Compilations" })).toBeVisible();
  await expect(page).toHaveURL(/q=101\+Music\+Compilations/);

  if (testInfo.project.name === "mobile") {
    await expect(page.getByRole("button", { name: "Vue liste" })).toHaveCount(0);
    await expect(page.getByTestId("labels-mosaic")).toBeVisible();
  } else {
    await page.getByRole("button", { name: "Vue liste" }).click();
    await expect(page.getByRole("button", { name: "Vue liste" })).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/view=list/);
  }
});

test("les labels mobiles utilisent une mosaïque carrée", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "La mosaïque mobile est vérifiée sur son viewport dédié.");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/labels");
  const mosaic = page.getByTestId("labels-mosaic");
  await expect(mosaic).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Vue grille" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Vue liste" })).toHaveCount(0);
  const tiles = mosaic.locator('a[href^="/labels/"]');
  const [first, second] = await Promise.all([tiles.nth(0).boundingBox(), tiles.nth(1).boundingBox()]);
  expect(first!.width).toBeGreaterThan(120);
  expect(Math.abs(first!.width - first!.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(second!.y - first!.y)).toBeLessThanOrEqual(1);
  expect(second!.x).toBeGreaterThan(first!.x + first!.width - 1);
  await expect(tiles.first().locator("img, [data-testid='label-logo-fallback']")).toHaveCount(1);
  const fallback = mosaic.locator("[data-testid='label-logo-fallback']").first();
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
  const albumSearch = page.getByPlaceholder(/Titre, référence ou mot-clé dans/);
  await expect(albumSearch).toBeVisible();
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

  await page.getByRole("button", { name: "Albums", exact: true }).click();
  await albumSearch.fill("crime");
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("relevance");
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
  const filterPanel = testInfo.project.name === "mobile" ? page.getByRole("dialog", { name: "Filtre Ambiance" }) : moodFilter;
  if (testInfo.project.name === "mobile") {
    await expect(filterPanel).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("fixed");
    await expect(page.locator(".catalog-facet__mobile-backdrop")).toHaveCSS("backdrop-filter", /blur/);
  }
  const firstInclude = filterPanel.getByRole("button", { name: /^Inclure / }).first();
  const selectedMood = (await firstInclude.getAttribute("aria-label"))?.replace(/^Inclure /, "");
  await firstInclude.click();
  await expect(page.getByText("1 inclus · 0 exclus", { exact: true })).toBeVisible();
  if (selectedMood) await expect(page.getByRole("button", { name: `Retirer ${selectedMood}` })).toBeVisible();
  await page.keyboard.press("Escape");
  if (testInfo.project.name === "mobile") {
    await expect(filterPanel).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("");
  }
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
