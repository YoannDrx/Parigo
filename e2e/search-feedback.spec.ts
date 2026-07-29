import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      updatedAt: "2026-07-27T00:00:00.000Z",
    }));
  });
});

test("la pagination replace le début des résultats sous le poste de recherche", async ({ page }) => {
  await page.route("**/api/search/filters?**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data: { groups: [] } }),
  }));
  await page.route("**/api/search?**", (route) => {
    const url = new URL(route.request().url());
    const resultPage = Number(url.searchParams.get("page") ?? 1);
    const offset = (resultPage - 1) * 30;
    const itemCount = resultPage >= 2 ? 1 : 30;
    const items = Array.from({ length: itemCount }, (_, index) => {
      const position = offset + index + 1;
      return {
        id: `album-${position}`,
        slug: `album-${position}`,
        title: `Album crime ${position}`,
        cover: "/images/placeholder-album.svg",
        label: "Parigo",
        code: `PGO ${String(position).padStart(3, "0")}`,
        genres: [],
        moods: [],
        trackCount: 10,
      };
    });
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { items, view: "albums", facets: { categories: [], labels: [] } },
        meta: { page: resultPage, pageSize: 30, total: 31, requestId: `pagination-${resultPage}` },
      }),
    });
  });

  await page.goto("/search?q=crime&view=albums&type=main");
  const pagination = page.getByRole("navigation", { name: "Pagination des résultats" });
  await expect(pagination).toBeVisible();
  await page.waitForTimeout(500);
  await pagination.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(500);

  await page.getByRole("button", { name: "Suivant" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("page")).toBe("2");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(100);

  const workspace = page.getByTestId("search-workspace");
  const firstAlbum = page.getByTestId("search-album-grid").locator("article").first();
  await expect(workspace).toBeVisible();
  await expect(firstAlbum).toContainText("Album crime 31");
  const [workspaceBox, firstAlbumBox] = await Promise.all([workspace.boundingBox(), firstAlbum.boundingBox()]);
  expect(workspaceBox).not.toBeNull();
  expect(firstAlbumBox).not.toBeNull();
  expect(firstAlbumBox!.y).toBeGreaterThan(workspaceBox!.y + workspaceBox!.height);

  await page.reload();
  await page.waitForTimeout(500);
  expect(new URL(page.url()).searchParams.get("page")).toBe("2");
  await expect(page.getByTestId("search-album-grid").locator("article").first()).toContainText("Album crime 31");
});

test("le poste mobile défile et la colonne desktop suit la navbar", async ({ page }, testInfo) => {
  await page.goto("/search");
  const workspace = page.getByTestId("search-workspace");
  await expect(workspace).toBeVisible();

  if (testInfo.project.name === "mobile") {
    await expect(workspace).toHaveCSS("position", "relative");
    await workspace.evaluate((element) => {
      element.scrollIntoView({ block: "start", behavior: "instant" });
      window.scrollBy({ top: 600, behavior: "instant" });
    });
    await expect.poll(async () => (await workspace.boundingBox())?.y ?? 0).toBeLessThan(0);
    return;
  }

  const header = page.locator("header");
  const filters = page.getByRole("complementary", { name: "Filtres de recherche" });
  await expect(filters).toBeVisible();
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
  await expect(header).toHaveAttribute("data-header-visible", "true");
  const initialBox = await filters.boundingBox();
  expect(initialBox).not.toBeNull();
  expect(initialBox!.y).toBeGreaterThanOrEqual(80);

  await page.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }));
  await expect(header).toHaveAttribute("data-header-visible", "false");
  await page.waitForTimeout(350);
  const hiddenHeaderBox = await filters.boundingBox();
  expect(hiddenHeaderBox).not.toBeNull();
  expect(hiddenHeaderBox!.y).toBeLessThanOrEqual(14);
  expect(hiddenHeaderBox!.y + hiddenHeaderBox!.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));

  await page.evaluate(() => window.scrollBy({ top: -120, behavior: "instant" }));
  await expect(header).toHaveAttribute("data-header-visible", "true");
  await page.waitForTimeout(350);
  const visibleHeaderBox = await filters.boundingBox();
  expect(visibleHeaderBox).not.toBeNull();
  expect(visibleHeaderBox!.y).toBeGreaterThanOrEqual(80);
});

test("la recherche impose la liste pour les pistes et la grille pour les albums", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/search");

  await expect(page.getByText("Interprétation", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Les critères compris apparaîtront ici avant la recherche", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("search-detected-criteria")).toHaveCount(0);
  await expect(page.getByText("Résultats", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Type de résultats" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Mode d’affichage des résultats" })).toHaveCount(0);
  await expect(page.getByTestId("search-track-grid")).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("layout")).toBe(false);

  const filterScope = testInfo.project.name === "mobile"
    ? page.getByRole("dialog", { name: "Filtres" })
    : page.getByRole("complementary", { name: "Filtres de recherche" });
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: /^Filtres$/ }).click();
  await expect(filterScope).toBeVisible();
  await expect(filterScope.getByText("Style", { exact: true })).toHaveCount(0);
  if (testInfo.project.name === "mobile") {
    await filterScope.getByRole("button", { name: "Fermer" }).last().click();
  }

  const density = page.getByRole("combobox", { name: "Niveau de détail des pistes" });
  const densityCorners = await density.evaluate((node) => ({
    trigger: getComputedStyle(node).borderTopRightRadius,
    corner: getComputedStyle(node.parentElement!, "::before").borderTopRightRadius,
    top: getComputedStyle(node.parentElement!, "::before").top,
    right: getComputedStyle(node.parentElement!, "::before").right,
  }));
  expect(densityCorners.corner).toBe(densityCorners.trigger);
  expect(densityCorners.top).toBe("-1px");
  expect(densityCorners.right).toBe("-1px");
  await density.click();
  await expect(page.getByRole("option", { name: "Piste détaillée" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Piste compacte" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Piste essentielle" })).toBeVisible();
  await page.keyboard.press("Escape");

  const sort = page.getByRole("combobox", { name: "Trier les résultats" });
  await sort.click();
  for (const label of ["Pertinence", "Plus récents", "Plus anciens", "A–Z", "Z–A"]) {
    await expect(page.getByRole("option", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("option", { name: /BPM|Durée/ })).toHaveCount(0);
  await page.keyboard.press("Escape");

  const trackTitle = page.locator(".parigo-track-row__title").first();
  await expect(trackTitle).toBeVisible({ timeout: 30_000 });
  await expect(trackTitle).toHaveJSProperty("tagName", "P");
  await trackTitle.click();
  await expect(page.locator(".track-detail-panel")).toHaveCount(0);

  await page.getByRole("button", { name: "Albums" }).click();
  await expect(page.getByTestId("search-album-grid")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("combobox", { name: "Niveau de détail des pistes" })).toHaveCount(0);
});

test("la saisie ne déclenche plus de fenêtre d’autocomplétion", async ({ page }) => {
  let autocompleteRequests = 0;
  await page.route("**/api/autocomplete?**", async (route) => {
    autocompleteRequests += 1;
    await route.abort();
  });

  await page.goto("/search");
  const input = page.getByRole("searchbox", { name: "Rechercher dans les titres de pistes" });
  await input.fill("crime");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("crime");
  await expect(page.getByRole("region", { name: "Suggestions de recherche" })).toHaveCount(0);
  expect(autocompleteRequests).toBe(0);

  await page.getByRole("button", { name: "Albums" }).click();
  await expect(page.getByRole("searchbox", { name: "Rechercher dans les titres ou références d’albums" })).toBeVisible();
  expect(autocompleteRequests).toBe(0);
});

test("la référence Harvest reste recherchable mais séparée du titre éditorial", async ({ page }) => {
  await page.goto("/search?q=PRTM%200212&view=albums");
  const album = page.getByTestId("search-album-grid").getByRole("link").first();
  await expect(album).toBeVisible({ timeout: 30_000 });
  await expect(album.getByRole("heading")).toHaveText("Between Light and Void");
  await expect(album).toContainText("Réf. PRTM 0212");
  await expect(album.getByRole("heading")).not.toContainText("PRTM 0212");

  await page.goto("/search?q=Between%20Light%20and%20Void&view=albums");
  await expect(page.getByTestId("search-album-grid").getByRole("heading", { name: "Between Light and Void" })).toBeVisible({ timeout: 30_000 });
});

test("le listing se met à jour automatiquement pendant la saisie", async ({ page }) => {
  const searchedTerms: string[] = [];
  await page.route("**/api/search?**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q");
    if (query) searchedTerms.push(query);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { items: [], view: url.searchParams.get("view") === "albums" ? "albums" : "tracks", facets: { categories: [], labels: [] } },
        meta: { page: 1, pageSize: 30, total: 0, requestId: "e2e-live-search" },
      }),
    });
  });
  await page.goto("/search");
  const input = page.getByRole("searchbox", { name: "Rechercher dans les titres de pistes" });
  await input.fill("wedding");
  await expect.poll(() => searchedTerms.includes("wedding"), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("wedding");
});

test("les anciennes URL sont canonicalisées sans disposition, match, Style ni anciens tris", async ({ page }) => {
  await page.goto('/search?keyword=%22crime%22&view=tracks&page=1&layout=grid&match=exact&styles=obsolete&sort=bpm-asc');
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      q: url.searchParams.get("q"),
      match: url.searchParams.has("match"),
      layout: url.searchParams.has("layout"),
      keyword: url.searchParams.has("keyword"),
      styles: url.searchParams.has("styles"),
      sort: url.searchParams.has("sort"),
    };
  }, { timeout: 30_000 }).toEqual({
    q: "crime",
    match: false,
    layout: false,
    keyword: false,
    styles: false,
    sort: false,
  });
});

test("une URL q normale ne devient pas exacte sans action utilisateur", async ({ page }) => {
  await page.goto("/search?q=crime&view=tracks");
  await page.waitForTimeout(800);
  expect(new URL(page.url()).searchParams.get("match")).toBeNull();
});

test("le fallback bilingue est expliqué et peut être désactivé", async ({ page }) => {
  await page.route("**/api/search?**", async (route) => {
    const url = new URL(route.request().url());
    const translated = url.searchParams.get("translate") !== "0";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { items: [], view: "tracks", facets: { bpm: { min: 1, max: 300 }, duration: { min: 1, max: 300 }, categories: [], labels: [] } },
        meta: {
          page: 1,
          pageSize: 30,
          total: 0,
          requestId: "translation-e2e",
          ...(translated ? { queryResolution: { original: "forêt sombre", effective: "dark forest", source: "machine-translation" } } : {}),
        },
      }),
    });
  });

  await page.goto("/search?q=for%C3%AAt%20sombre&view=tracks");
  await expect(page.getByText(/Recherche interprétée comme/)).toBeVisible();
  await page.getByRole("link", { name: /Chercher « forêt sombre » littéralement/ }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("translate")).toBe("0");
  await expect(page.getByText(/Recherche interprétée comme/)).toHaveCount(0);
});

test("le mode intention applique Music For et refuse les briefs non compris", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/search?brief=mariage&resolve=1&view=tracks");
  await expect(page.getByRole("button", { name: "Par intention" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("search-detected-criteria").getByText("Mariage", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
  expect(new URL(page.url()).searchParams.has("categories")).toBe(false);
  expect(new URL(page.url()).searchParams.has("q")).toBe(false);

  const input = page.getByRole("searchbox", { name: "Décrivez votre intention musicale" });
  await input.fill("Armand Dupont");
  await expect(page.getByRole("heading", { name: "Cette intention n’est pas encore comprise." })).toBeVisible();
  expect(new URL(page.url()).searchParams.has("q")).toBe(false);

  await page.getByRole("button", { name: "Par titre", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("Armand Dupont");
  await expect(page.getByRole("heading", { name: "Cette intention n’est pas encore comprise." })).toHaveCount(0);
});
