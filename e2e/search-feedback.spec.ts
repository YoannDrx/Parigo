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
  await firstAlbum.evaluate(async (album) => {
    await Promise.all(album.getAnimations().map((animation) => animation.finished));
  });
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
    await expect(workspace).toHaveCSS("top", "0px");
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
  await expect(page.getByText("Résultats", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("combobox", { name: "Type de résultats" })).toBeVisible();
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
    const sheet = filterScope.locator(".parigo-drawer");
    await page.waitForTimeout(350);
    const [sheetBox, viewportHeight] = await Promise.all([
      sheet.boundingBox(),
      page.evaluate(() => window.innerHeight),
    ]);
    expect(sheetBox).not.toBeNull();
    expect(sheetBox!.height).toBeGreaterThanOrEqual(viewportHeight - 10);
    expect(sheetBox!.height).toBeLessThan(viewportHeight);
    await filterScope.getByRole("button", { name: "Fermer" }).last().click();

    const [filterBox, resultTypeBox, versionBox, densityBox] = await Promise.all([
      page.getByRole("button", { name: /^Filtres$/ }).boundingBox(),
      page.getByRole("combobox", { name: "Type de résultats" }).boundingBox(),
      page.getByRole("combobox", { name: "Versions des pistes" }).boundingBox(),
      page.getByRole("combobox", { name: "Niveau de détail des pistes" }).boundingBox(),
    ]);
    expect(filterBox).not.toBeNull();
    expect(resultTypeBox).not.toBeNull();
    expect(versionBox).not.toBeNull();
    expect(densityBox).not.toBeNull();
    expect(Math.abs(filterBox!.y - resultTypeBox!.y)).toBeLessThan(2);
    expect(Math.abs(versionBox!.y - densityBox!.y)).toBeLessThan(2);
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

  if (testInfo.project.name === "desktop") {
    await page.setViewportSize({ width: 1920, height: 1000 });
    const firstTrack = page.locator(".parigo-track-row").first();
    await expect(firstTrack).toHaveAttribute("data-density", "full");
    await expect.poll(() => firstTrack.locator(".parigo-track-row__actions :is(button,a):visible").count()).toBeGreaterThanOrEqual(8);
    const fullActionCount = await firstTrack.locator(".parigo-track-row__actions :is(button,a):visible").count();
    for (const [label, value] of [["Piste compacte", "mid"], ["Piste essentielle", "light"]] as const) {
      await density.click();
      await page.getByRole("option", { name: label, exact: true }).click();
      await expect(firstTrack).toHaveAttribute("data-density", value);
      expect(await firstTrack.locator(".parigo-track-row__actions :is(button,a):visible").count()).toBe(fullActionCount);
      await expect(firstTrack.getByRole("button", { name: /Plus d.actions/ })).toBeHidden();
    }
    await density.click();
    await page.getByRole("option", { name: "Piste détaillée", exact: true }).click();
    await expect(firstTrack).toHaveAttribute("data-density", "full");
  }

  const version = page.getByRole("combobox", { name: "Versions des pistes" });
  if (testInfo.project.name === "mobile") {
    const versionValueFits = await version.locator(".parigo-select__value").evaluate((node) => node.scrollWidth <= node.clientWidth);
    expect(versionValueFits).toBe(true);
    await version.click();
    const listbox = page.getByRole("listbox", { name: "Versions des pistes" });
    await expect(listbox).toBeVisible();
    const [listboxBox, versionBox, viewportWidth] = await Promise.all([
      listbox.boundingBox(),
      version.boundingBox(),
      page.evaluate(() => window.innerWidth),
    ]);
    expect(listboxBox).not.toBeNull();
    expect(versionBox).not.toBeNull();
    expect(listboxBox!.x).toBeGreaterThanOrEqual(0);
    expect(listboxBox!.x + listboxBox!.width).toBeLessThanOrEqual(viewportWidth);
    expect(listboxBox!.y).toBeGreaterThanOrEqual(versionBox!.y + versionBox!.height);
    expect(await listbox.getByRole("option").evaluateAll((options) => options.every((option) => option.scrollWidth <= option.clientWidth))).toBe(true);
    await page.keyboard.press("Escape");
  }

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
  const albumTitle = page.locator(".parigo-track-row__album").first();
  await expect(albumTitle).toBeVisible();
  await expect(albumTitle).not.toHaveText("");
  if (testInfo.project.name === "mobile") {
    const albumTitleBox = await albumTitle.boundingBox();
    expect(albumTitleBox).not.toBeNull();
    expect(albumTitleBox!.width).toBeGreaterThan(60);

    for (const [label, value] of [["Piste compacte", "mid"], ["Piste essentielle", "light"]] as const) {
      await density.click();
      await page.getByRole("option", { name: label, exact: true }).click();
      const firstTrack = page.locator(".parigo-track-row").first();
      await expect(firstTrack).toHaveAttribute("data-density", value);
      const compactTitle = firstTrack.locator(".parigo-track-row__title");
      const compactAlbum = firstTrack.locator(".parigo-track-row__album");
      await expect(compactTitle).toBeVisible();
      await expect(compactAlbum).toBeVisible();
      const [compactTitleBox, compactAlbumBox] = await Promise.all([compactTitle.boundingBox(), compactAlbum.boundingBox()]);
      expect(compactTitleBox).not.toBeNull();
      expect(compactAlbumBox).not.toBeNull();
      expect(compactTitleBox!.width).toBeGreaterThan(60);
      expect(compactAlbumBox!.width).toBeGreaterThan(60);
    }
    await density.click();
    await page.getByRole("option", { name: "Piste détaillée", exact: true }).click();
  }
  await trackTitle.click();
  await expect(page.locator(".track-detail-panel")).toHaveCount(0);

  await page.getByRole("combobox", { name: "Type de résultats" }).click();
  await page.getByRole("option", { name: "Albums", exact: true }).click();
  await expect(page.getByTestId("search-album-grid")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("combobox", { name: "Niveau de détail des pistes" })).toHaveCount(0);
});

test("la saisie déclenche une autocomplétion groupée et accessible", async ({ page }) => {
  let autocompleteRequests = 0;
  const autocompleteScopes: Array<string | null> = [];
  await page.route("**/api/autocomplete?**", async (route) => {
    autocompleteRequests += 1;
    autocompleteScopes.push(new URL(route.request().url()).searchParams.get("view"));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { groups: [
        { key: "tracks", count: 1, items: [{ id: "track-1", kind: "track", label: "Crime Scene", subtitle: "Main · PAR001", image: "/images/placeholder-album.svg", href: "/albums/album-1?track=track-1" }] },
        { key: "albums", count: 1, items: [{ id: "album-1", kind: "album", label: "Crime Stories", subtitle: "PAR001", trackCount: 12, image: "/images/placeholder-album.svg", href: "/albums/album-1" }] },
        { key: "playlists", count: 1, items: [{ id: "playlist-1", kind: "playlist", label: "Crime Investigation", subtitle: "Sélection éditoriale", trackCount: 24, image: "/images/placeholder-playlist.svg", href: "/playlists/playlist-1" }] },
        { key: "words", count: 1, items: [{ id: "keyword-1", kind: "keyword", label: "crime" }] },
        { key: "composers", count: 1, items: [{ id: "composer-1", kind: "composer", label: "Jane Doe" }] },
        { key: "labels", count: 1, items: [{ id: "label-1", kind: "label", label: "Parigo" }] },
        { key: "lyrics", count: 1, items: [{ id: "track-lyrics", kind: "lyrics", label: "Crime Song", subtitle: "Trouvé dans les paroles", image: "/images/placeholder-album.svg", href: "/albums/album-2?track=track-lyrics" }] },
      ] } }),
    });
  });

  await page.goto("/search");
  const command = page.getByTestId("catalog-search-command");
  await expect(command.getByRole("button", { name: "Pistes", exact: true })).toHaveCount(0);
  await expect(command.getByRole("button", { name: "Albums", exact: true })).toHaveCount(0);
  const resultType = page.getByRole("combobox", { name: "Type de résultats" });
  await expect(resultType).toBeVisible();
  await command.getByRole("button", { name: "Mode de recherche : Mots-clés" }).click();
  await command.getByRole("option", { name: /Brief IA/ }).click();
  const aiInput = command.getByLabel("Décrire un brief musical assisté par IA");
  await expect(aiInput).toBeVisible();
  await expect(command.getByRole("button", { name: "Recherche AIMS bientôt disponible" })).toBeDisabled();
  await aiInput.fill("Une scène nocturne suspendue");
  await page.waitForTimeout(500);
  expect(new URL(page.url()).searchParams.has("q")).toBe(false);
  await command.getByRole("button", { name: "Mode de recherche : Brief IA" }).click();
  await command.getByRole("option", { name: /Mots-clés/ }).click();
  const input = page.getByRole("combobox", { name: "Rechercher un titre, un mot-clé, une ambiance ou un instrument" });
  await input.hover();
  await input.fill("crime");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("crime");
  await expect(page.getByRole("listbox", { name: "Suggestions de recherche" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Crime Scene" })).toBeVisible();
  await expect(page.getByRole("option", { name: /Crime Stories/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Crime Investigation/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Crime Song/ })).toBeVisible();
  await expect(page.locator(".search-autocomplete-panel img").first()).toBeVisible();
  const [commandBox, panelBox] = await Promise.all([command.boundingBox(), page.locator(".search-autocomplete-panel").boundingBox()]);
  expect(commandBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  expect(Math.abs(panelBox!.width - commandBox!.width)).toBeLessThanOrEqual(2);
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /catalog-search-suggestions-option-0/);
  expect(autocompleteRequests).toBeGreaterThan(0);
  expect(autocompleteScopes.every((scope) => scope === null)).toBe(true);

  await input.press("Escape");
  await expect(page.getByRole("listbox", { name: "Suggestions de recherche" })).toHaveCount(0);
  await resultType.click();
  await page.getByRole("option", { name: "Albums", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("view")).toBe("albums");
  await expect(input).toBeVisible();
});

test("l’autocomplétion conserve un état vide global sans afficher de sections à zéro", async ({ page }) => {
  await page.route("**/api/autocomplete?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { groups: [] } }),
    });
  });

  await page.goto("/search");
  const input = page.getByRole("combobox", { name: "Rechercher un titre, un mot-clé, une ambiance ou un instrument" });
  await input.fill("introuvable");
  const suggestions = page.getByRole("listbox", { name: "Suggestions de recherche" });
  await expect(suggestions).toBeVisible();
  await expect(suggestions).toContainText("Aucun résultat pour « introuvable ».");
  await expect(suggestions.getByRole("heading", { name: "Pistes" })).toHaveCount(0);
  await expect(suggestions.getByRole("heading", { name: "Albums" })).toHaveCount(0);
  await expect(suggestions.getByRole("heading", { name: "Playlists" })).toHaveCount(0);
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
  const input = page.getByRole("combobox", { name: "Rechercher un titre, un mot-clé, une ambiance ou un instrument" });
  await input.fill("wedding");
  await expect.poll(() => searchedTerms.includes("wedding"), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("wedding");
});

test("la sidebar recherche filtre immédiatement par compositeur", async ({ page }, testInfo) => {
  await page.route("**/api/search/composers?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { items: [{ id: "Minimatic", name: "Minimatic", count: 24 }] },
        meta: { matchedTracks: 24, inspectedTracks: 24, incomplete: false },
      }),
    });
  });
  await page.route("**/api/search?**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          items: [],
          view: url.searchParams.get("view") === "albums" ? "albums" : "tracks",
          facets: { categories: [], labels: [] },
        },
        meta: { page: 1, pageSize: 30, total: 0, requestId: "composer-filter-e2e" },
      }),
    });
  });

  await page.goto("/search");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /^Filtres$/ }).click();
  }
  const filterScope = testInfo.project.name === "mobile"
    ? page.getByRole("dialog", { name: "Filtres" })
    : page.getByRole("complementary", { name: "Filtres de recherche" });
  const composerGroup = filterScope.locator("details").filter({ hasText: "Compositeurs" });
  await composerGroup.locator("summary").click();
  await expect(composerGroup).toContainText("Saisissez au moins 2 caractères.");
  await composerGroup.getByPlaceholder("Rechercher un compositeur…").fill("Minimatic");
  await expect(composerGroup.getByTestId("composer-filter-result-count")).toHaveText("1");
  const harvestComposerOption = composerGroup.getByRole("button", { name: "Inclure Minimatic" });
  await expect(harvestComposerOption).toBeVisible();
  await harvestComposerOption.click();
  if (testInfo.project.name === "mobile") {
    await filterScope.getByRole("button", { name: /Voir \d+ résultats/ }).click();
  }
  await expect.poll(() => new URL(page.url()).searchParams.get("composer")).toBe("Minimatic");
  await expect(page.getByRole("button", { name: /^Minimatic/ }).last()).toBeVisible();
});

test("le filtre compositeur préfère la fiche Harvest fraîche à son index encore corrompu", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/search");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /^Filtres$/ }).click();
  }
  const filterScope = testInfo.project.name === "mobile"
    ? page.getByRole("dialog", { name: "Filtres" })
    : page.getByRole("complementary", { name: "Filtres de recherche" });
  const composerGroup = filterScope.locator("details").filter({ hasText: "Compositeurs" });
  await composerGroup.locator("summary").click();
  await composerGroup.getByPlaceholder("Rechercher un compositeur…").fill("sost");
  await expect(composerGroup.getByTestId("composer-filter-result-count")).toHaveText("1");
  await expect(composerGroup).not.toContainText("Sosth�ne Fanou");
  await composerGroup.getByRole("button", { name: "Inclure Sosthène Fanou" }).click();
  if (testInfo.project.name === "mobile") {
    await filterScope.getByRole("button", { name: /Voir \d+ résultats/ }).click();
  }
  await expect.poll(() => new URL(page.url()).searchParams.get("composer")).toBe("Sosthène Fanou");
  await expect(page.getByText("LOUIS VIE", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main")).not.toContainText("Sosth�ne Fanou");
});

test("les anciennes URL sont canonicalisées en préservant le filtre Styles", async ({ page }) => {
  await page.goto('/search?keyword=%22crime%22&view=tracks&page=1&layout=grid&match=exact&styles=obsolete&sort=bpm-asc');
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      q: url.searchParams.get("q"),
      match: url.searchParams.has("match"),
      layout: url.searchParams.has("layout"),
      keyword: url.searchParams.has("keyword"),
      styles: url.searchParams.get("styles"),
      sort: url.searchParams.has("sort"),
    };
  }, { timeout: 30_000 }).toEqual({
    q: "crime",
    match: false,
    layout: false,
    keyword: false,
    styles: "obsolete",
    sort: false,
  });
});

test("une URL q normale ne devient pas exacte sans action utilisateur", async ({ page }) => {
  await page.goto("/search?q=crime&view=tracks");
  await page.waitForTimeout(800);
  expect(new URL(page.url()).searchParams.get("match")).toBeNull();
});

test("la traduction bilingue remplace le champ puis ouvre l’autocomplétion", async ({ page }) => {
  await page.route("**/api/search?**", async (route) => {
    const url = new URL(route.request().url());
    const translation = url.searchParams.get("translation") ?? "offer";
    const query = url.searchParams.get("q");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { items: [], view: "tracks", facets: { bpm: { min: 1, max: 300 }, duration: { min: 1, max: 300 }, categories: [], labels: [], styles: [] } },
        meta: {
          page: 1,
          pageSize: 30,
          total: 0,
          requestId: "translation-e2e",
          searchMode: "keyword",
          fieldProfile: "editorial",
          providerDurationMs: 10,
          ...(translation === "offer" && query === "mariage" ? { translationSuggestion: { original: "mariage", effective: "wedding", source: "machine-translation" } } : {}),
        },
      }),
    });
  });
  await page.route("**/api/autocomplete?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { groups: [
        { key: "words", count: 1, items: [{ id: "translated-keyword", kind: "keyword", label: "wedding" }] },
      ] } }),
    });
  });

  await page.goto("/search?q=mariage&view=tracks");
  await expect(page.getByText(/Rechercher aussi « wedding »/)).toBeVisible();
  await page.getByRole("button", { name: "Rechercher en anglais" }).click();
  const search = page.getByRole("combobox", { name: "Rechercher un titre, un mot-clé, une ambiance ou un instrument" });
  await expect(search).toHaveValue("wedding");
  await expect(search).toBeFocused();
  await expect.poll(() => ({
    query: new URL(page.url()).searchParams.get("q"),
    translation: new URL(page.url()).searchParams.get("translation"),
  })).toEqual({ query: "wedding", translation: "off" });
  await expect(page.getByRole("listbox", { name: "Suggestions de recherche" })).toBeVisible();
  await expect(page.getByRole("option", { name: "wedding" })).toBeVisible();
  await expect(page.getByText(/Rechercher aussi « wedding »/)).toHaveCount(0);
});

test("un ancien brief devient un mot-clé littéral et AIMS reste désactivé", async ({ page }) => {
  await page.goto("/search?brief=mariage&resolve=1&view=tracks&translate=0");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("mariage");
  const url = new URL(page.url());
  expect(url.searchParams.has("brief")).toBe(false);
  expect(url.searchParams.has("resolve")).toBe(false);
  expect(url.searchParams.get("translation")).toBe("off");
  const modeSelect = page.getByRole("button", { name: "Mode de recherche : Mots-clés" });
  await expect(modeSelect).toBeEnabled();
  await modeSelect.click();
  await page.getByRole("option", { name: /Brief IA/ }).click();
  await expect(page.getByRole("button", { name: "Mode de recherche : Brief IA" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Recherche AIMS bientôt disponible" })).toBeDisabled();
  await expect(page.getByTestId("search-detected-criteria")).toHaveCount(0);
});
