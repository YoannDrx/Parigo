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
  await page.route("**/api/search/filters?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { groups: [{
        key: "moods",
        label: "Ambiance",
        selection: "include-exclude",
        total: 1,
        available: 1,
        items: [{ id: "ATT_crime", name: "Crime", canonicalName: "Crime", localizedName: "Crime" }],
      }] } }),
    });
  });
  await page.route("**/api/autocomplete?**", async (route) => {
    autocompleteRequests += 1;
    autocompleteScopes.push(new URL(route.request().url()).searchParams.get("view"));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { groups: [
        { key: "filters", count: 1, items: [{ id: "ATT_crime", kind: "filter", filterGroup: "moods", label: "Ambiance · Crime", subtitle: "Ajouter comme filtre", canonicalName: "Crime", localizedName: "Crime", matchedTerm: "crime" }] },
        { key: "titles", count: 3, items: [
          { id: "track-1", kind: "track", label: "Crime Scene", subtitle: "Main · PAR001", image: "/images/placeholder-album.svg", href: "/albums/album-1?track=track-1", matchEvidence: [{ field: "trackTitle", value: "Crime Scene", matchedTerms: ["crime"] }] },
          { id: "album-1", kind: "album", label: "Crime Stories", subtitle: "PAR001", trackCount: 12, image: "/images/placeholder-album.svg", href: "/albums/album-1", matchEvidence: [{ field: "albumTitle", value: "Crime Stories", matchedTerms: ["crime"] }] },
          { id: "playlist-1", kind: "playlist", label: "Crime Investigation", subtitle: "Sélection éditoriale", trackCount: 24, image: "/images/placeholder-playlist.svg", href: "/playlists/playlist-1", matchEvidence: [{ field: "playlistTitle", value: "Crime Investigation", matchedTerms: ["crime"] }] },
        ] },
        { key: "tracks", count: 1, items: [{ id: "track-2", kind: "track", label: "Evidence Room", subtitle: "Main · PAR002", image: "/images/placeholder-album.svg", href: "/albums/album-2?track=track-2", matchEvidence: [{ field: "keyword", value: "Crime", matchedTerms: ["crime"] }] }] },
        { key: "words", count: 1, items: [{ id: "keyword-1", kind: "keyword", label: "crime" }] },
        { key: "composers", count: 1, items: [{ id: "composer-1", kind: "composer", label: "Jane Doe" }] },
        { key: "labels", count: 1, items: [{ id: "label-1", kind: "label", label: "Parigo" }] },
      ] } }),
    });
  });

  await page.goto("/search");
  const command = page.getByTestId("catalog-search-command");
  await expect(command.getByRole("button", { name: "Pistes", exact: true })).toHaveCount(0);
  await expect(command.getByRole("button", { name: "Albums", exact: true })).toHaveCount(0);
  const resultType = page.getByRole("combobox", { name: "Type de résultats" });
  await expect(resultType).toBeVisible();
  await command.getByRole("button", { name: "Mode de recherche : Catalogue" }).click();
  await command.getByRole("option", { name: /Brief IA/ }).click();
  const aiInput = command.getByLabel("Décrire un brief musical assisté par IA");
  await expect(aiInput).toBeVisible();
  await expect(command.getByRole("button", { name: "Recherche AIMS bientôt disponible" })).toBeDisabled();
  await aiInput.fill("Une scène nocturne suspendue");
  await page.waitForTimeout(500);
  expect(new URL(page.url()).searchParams.has("q")).toBe(false);
  await command.getByRole("button", { name: "Mode de recherche : Brief IA" }).click();
  await command.getByRole("option", { name: /Catalogue/ }).click();
  const input = page.getByRole("combobox", { name: "Rechercher dans le catalogue" });
  await input.hover();
  await input.fill("crime");
  expect(new URL(page.url()).searchParams.get("q")).toBeNull();
  await expect(page.getByRole("listbox", { name: "Suggestions de recherche" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Filtres trouvés" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dans les titres" })).toBeVisible();
  const titleGroup = page.getByRole("group", { name: "Dans les titres" });
  await expect(titleGroup.getByRole("heading", { name: "Pistes", exact: true })).toBeVisible();
  await expect(titleGroup.getByRole("heading", { name: "Albums", exact: true })).toBeVisible();
  await expect(titleGroup.getByRole("heading", { name: "Playlists", exact: true })).toBeVisible();
  const entityHeadings = await page.locator(".search-autocomplete-panel h3").allTextContents();
  expect(entityHeadings.indexOf("Dans les titres")).toBeLessThan(entityHeadings.indexOf("Filtres trouvés"));
  expect(entityHeadings.indexOf("Filtres trouvés")).toBeLessThan(entityHeadings.indexOf("Pistes"));
  expect(entityHeadings.indexOf("Dans les titres")).toBeLessThan(entityHeadings.indexOf("Pistes"));
  await expect(input).not.toHaveAttribute("aria-activedescendant");
  await expect(page.getByRole("option", { name: "Crime Scene" })).toBeVisible();
  await expect(page.getByRole("option", { name: /Crime Stories/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Crime Investigation/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dans les paroles" })).toHaveCount(0);
  await expect(page.locator(".search-autocomplete-panel").getByLabel("Raisons de la correspondance")).toHaveCount(0);
  await expect(page.locator(".search-autocomplete-panel img").first()).toBeVisible();
  const [commandBox, panelBox] = await Promise.all([command.boundingBox(), page.locator(".search-autocomplete-panel").boundingBox()]);
  expect(commandBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  expect(Math.abs(panelBox!.width - commandBox!.width)).toBeLessThanOrEqual(2);
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /catalog-search-suggestions-option-0/);
  await input.press("Enter");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  await expect(page.locator(".search-autocomplete-panel")).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBeNull();
  await expect.poll(() => new URL(page.url()).searchParams.get("categories")).toBe("ATT_crime");
  await expect(page.getByText("Ambiance · Crime", { exact: true }).last()).toBeVisible();
  expect(autocompleteRequests).toBeGreaterThan(0);
  expect(autocompleteScopes.every((scope) => scope === null)).toBe(true);

  await input.press("Escape");
  await expect(page.getByRole("listbox", { name: "Suggestions de recherche" })).toHaveCount(0);
  await resultType.click();
  await page.getByRole("option", { name: "Albums", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("view")).toBe("albums");
  await expect(input).toBeVisible();
});

test("un filtre traduit consomme son terme et les filtres appliqués restent visibles", async ({ page }, testInfo) => {
  await page.route("**/api/search/filters?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { groups: [
        { key: "genre", label: "Genre", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_a111111111111111", name: "Reggae" }] },
        { key: "moods", label: "Ambiance", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_c333333333333333", name: "Triste", canonicalName: "Sad", localizedName: "Triste" }] },
        { key: "musicFor", label: "Music For", selection: "include-exclude", total: 1, available: 1, items: [{ id: "ATT_d444444444444444", name: "Mariage", canonicalName: "Wedding", localizedName: "Mariage" }] },
      ] } }),
    });
  });
  await page.route("**/api/autocomplete?**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q")?.toLocaleLowerCase("fr") ?? "";
    const items = [
      ...(query.includes("reggae") ? [
        { id: "ATT_a111111111111111", kind: "filter", filterGroup: "genre", label: "Genre · Reggae", subtitle: "Ajouter comme filtre", canonicalName: "Reggae", localizedName: "Reggae", matchedTerm: "reggae" },
        { id: "STYLE_b222222222222222", kind: "filter", filterGroup: "styles", label: "Style · Reggae", subtitle: "Ajouter comme filtre", canonicalName: "Reggae", localizedName: "Reggae", matchedTerm: "reggae" },
      ] : []),
      ...(query.includes("triste") ? [
        { id: "ATT_c333333333333333", kind: "filter", filterGroup: "moods", label: "Ambiance · Triste (Sad)", subtitle: "Correspond à « triste » · Ajouter comme filtre", canonicalName: "Sad", localizedName: "Triste", matchedTerm: "triste" },
      ] : []),
    ];
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { groups: [{
        key: "filters",
        count: items.length,
        items,
      }] } }),
    });
  });

  await page.goto("/");
  const input = page.getByRole("combobox", { name: "Rechercher dans le catalogue Parigo" });
  await input.fill("reggae triste");
  const suggestions = page.getByRole("listbox", { name: "Suggestions de recherche" });
  await expect(suggestions).toBeVisible();
  await suggestions.getByRole("option", { name: /Ambiance · Triste \(Sad\)/ }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("reggae");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Filtres à appliquer au lancement")).toBeVisible();
  await page.getByRole("button", { name: "Voir les résultats · 1 filtre" }).click();
  await expect.poll(() => {
    const url = new URL(page.url());
    return { path: url.pathname, q: url.searchParams.get("q"), categories: url.searchParams.get("categories") };
  }).toEqual({ path: "/search", q: "reggae", categories: "ATT_c333333333333333" });
  const searchInput = page.getByRole("combobox", { name: "Rechercher dans le catalogue" });
  await searchInput.focus();
  const appliedSuggestions = page.getByRole("listbox", { name: "Suggestions de recherche" });
  await expect(appliedSuggestions).toBeVisible();
  await expect(page.getByText("Filtres appliqués", { exact: true })).toBeVisible();
  await expect(page.locator(".search-autocomplete-panel").getByRole("button", { name: /Ambiance · Sad/ })).toBeVisible();
  await expect(appliedSuggestions.getByRole("option", { name: /Genre · Reggae/ })).toHaveAttribute("aria-selected", "false");
  await appliedSuggestions.getByRole("option", { name: /Genre · Reggae/ }).click();
  await expect(searchInput).toHaveValue("");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBeNull();
  await expect.poll(() => new URL(page.url()).searchParams.get("categories")).toBe("ATT_a111111111111111,ATT_c333333333333333");
  const appliedPanel = page.locator(".search-autocomplete-panel");
  await expect(appliedPanel.getByRole("button", { name: /Genre · Reggae/ })).toBeVisible();
  await expect(appliedPanel.getByRole("button", { name: /Ambiance · Sad/ })).toBeVisible();
  await appliedPanel.getByRole("button", { name: /Genre · Reggae/ }).click();
  await expect(searchInput).toHaveValue("");
  await expect.poll(() => new URL(page.url()).searchParams.get("categories")).toBe("ATT_c333333333333333");

  await searchInput.press("Escape");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /^Filtres/ }).click();
  }
  const filterScope = testInfo.project.name === "mobile"
    ? page.getByRole("dialog", { name: "Filtres" })
    : page.getByRole("complementary", { name: "Filtres de recherche" });
  const moodsGroup = filterScope.locator("details").filter({ hasText: "Ambiances" });
  await moodsGroup.locator("summary").click();
  const canonicalMood = moodsGroup.getByText("Sad", { exact: true });
  await expect(canonicalMood).toBeVisible();
  await expect(canonicalMood).toHaveAttribute("title", "Sad");
  await expect(moodsGroup.getByText("Triste (Sad)", { exact: true })).toHaveCount(0);
  const usesGroup = filterScope.locator("details").filter({ hasText: "Usages" });
  await usesGroup.locator("summary").click();
  await expect(usesGroup.getByText("Wedding", { exact: true })).toBeVisible();
  await expect(usesGroup.getByText("Mariage", { exact: true })).toHaveCount(0);
  await usesGroup.getByPlaceholder("Filtrer usages").fill("mariage");
  await expect(usesGroup.getByText("Wedding", { exact: true })).toBeVisible();
});

test("l’autocomplétion conserve un état vide global sans afficher de sections à zéro", async ({ page }) => {
  await page.route("**/api/autocomplete?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { groups: [] } }),
    });
  });

  await page.goto("/search");
  const input = page.getByRole("combobox", { name: "Rechercher dans le catalogue" });
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

test("le listing attend une soumission explicite pendant la saisie", async ({ page }) => {
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
  const input = page.getByRole("combobox", { name: "Rechercher dans le catalogue" });
  await input.fill("wedding");
  await page.waitForTimeout(500);
  expect(searchedTerms).not.toContain("wedding");
  expect(new URL(page.url()).searchParams.get("q")).toBeNull();
  await input.press("Enter");
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

test("DeepL reste hors du panneau et ne se propose qu’après une recherche vide", async ({ page }) => {
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
          ...(translation === "offer" && query === "coucher de soleil" ? { translationSuggestion: { original: "coucher de soleil", effective: "sunset", source: "machine-translation" } } : {}),
        },
      }),
    });
  });
  await page.route("**/api/autocomplete?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { groups: [
        { key: "words", count: 1, items: [{ id: "translated-keyword", kind: "keyword", label: "sunset" }] },
      ] } }),
    });
  });

  await page.goto("/search?q=coucher%20de%20soleil&view=tracks");
  await expect(page.getByText(/Rechercher aussi « sunset »/)).toBeVisible();
  const search = page.getByRole("combobox", { name: "Rechercher dans le catalogue" });
  await search.focus();
  const autocompletePanel = page.locator(".search-autocomplete-panel");
  await expect(autocompletePanel).toHaveCount(0);
  await page.getByRole("button", { name: "Rechercher en anglais" }).click();
  await expect(search).toHaveValue("sunset");
  await expect(search).toBeFocused();
  await expect.poll(() => ({
    query: new URL(page.url()).searchParams.get("q"),
    translation: new URL(page.url()).searchParams.get("translation"),
  })).toEqual({ query: "sunset", translation: "off" });
  await expect(page.getByRole("listbox", { name: "Suggestions de recherche" })).toBeVisible();
  await expect(page.getByRole("option", { name: "sunset" })).toBeVisible();
  await expect(page.getByText(/Rechercher aussi « sunset »/)).toHaveCount(0);
});

test("une correspondance de filtre partielle n’empêche pas DeepL après soumission", async ({ page }) => {
  await page.route("**/api/autocomplete?**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    const groups = query === "dark forest"
      ? [{ key: "titles", count: 1, items: [{ id: "dark-forest", kind: "track", label: "The Dark Forest", href: "/albums/forest?track=dark-forest", matchEvidence: [{ field: "trackTitle", value: "The Dark Forest", matchedTerms: ["dark", "forest"] }] }] }]
      : [{ key: "filters", count: 1, items: [{ id: "ATT_dark", kind: "filter", filterGroup: "moods", label: "Ambiance · Sombre (Dark)", canonicalName: "Dark", localizedName: "Sombre", matchedTerm: "sombre" }] }];
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { groups } }) });
  });
  await page.route("**/api/search?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("q") !== "une forêt sombre") {
      await route.continue();
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { items: [], view: "tracks", facets: { bpm: { min: 1, max: 300 }, duration: { min: 1, max: 300 }, categories: [], labels: [], styles: [] } },
        meta: { page: 1, pageSize: 1, total: 0, requestId: "partial-filter-translation", translationSuggestion: { original: "une forêt sombre", effective: "dark forest", source: "machine-translation" } },
      }),
    });
  });

  await page.goto("/search");
  const search = page.getByRole("combobox", { name: "Rechercher dans le catalogue" });
  await search.fill("une forêt sombre");
  const panel = page.locator(".search-autocomplete-panel");
  await expect(panel.getByRole("option", { name: /Ambiance · Sombre \(Dark\)/ })).toBeVisible();
  await expect(panel.getByText(/dark forest/i)).toHaveCount(0);
  await search.press("Enter");
  const translation = page.getByRole("button", { name: "Rechercher en anglais" });
  await expect(translation).toBeVisible();
  await translation.click();
  await expect(search).toHaveValue("dark forest");
  await expect(panel.getByRole("option", { name: "The Dark Forest" })).toBeVisible();
});

test("le changement de langue conserve toute la recherche en cours", async ({ page }, testInfo) => {
  await page.route("**/api/search?**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { items: [], view: url.searchParams.get("view") === "albums" ? "albums" : "tracks", facets: { categories: [], labels: [], styles: [] } },
        meta: { page: 1, pageSize: 30, total: 0, requestId: "language-preservation-e2e" },
      }),
    });
  });
  await page.route("**/api/search/filters?**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { groups: [] } }) });
  });

  await page.goto("/search?q=reggae&categories=ATT_c333333333333333&styles=STYLE_b222222222222222&sort=title&view=tracks&type=main&translation=off");
  const languageLink = testInfo.project.name === "mobile"
    ? await (async () => {
      await page.getByRole("button", { name: "Ouvrir le menu" }).click();
      return page.getByRole("dialog", { name: "Menu principal" }).locator('a[href^="/en/search?"]');
    })()
    : page.locator('a.nav-control[href^="/en/search?"]');
  await expect(languageLink).toBeVisible();
  await languageLink.click();
  await expect(page.getByRole("combobox", { name: "Search the catalog" })).toHaveValue("reggae");
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      pathname: url.pathname,
      q: url.searchParams.get("q"),
      categories: url.searchParams.get("categories"),
      styles: url.searchParams.get("styles"),
      sort: url.searchParams.get("sort"),
      translation: url.searchParams.get("translation"),
    };
  }).toEqual({
    pathname: "/en/search",
    q: "reggae",
    categories: "ATT_c333333333333333",
    styles: "STYLE_b222222222222222",
    sort: "title",
    translation: "off",
  });
});

test("une suggestion trouvée par préfixe dans les paroles ouvre, surligne et centre sa preuve", async ({ page }) => {
  await page.goto("/search");
  const search = page.getByRole("combobox", { name: "Rechercher dans le catalogue" });
  await search.fill("happy balad");
  const lyricsGroup = page.getByRole("group", { name: "Dans les paroles" });
  await expect(lyricsGroup).toBeVisible({ timeout: 30_000 });
  await lyricsGroup.getByRole("option").first().click();
  await expect.poll(() => {
    const url = new URL(page.url());
    return { panel: url.searchParams.get("panel"), highlight: url.searchParams.get("highlight"), hasTrack: Boolean(url.searchParams.get("track")) };
  }, { timeout: 30_000 }).toEqual({ panel: "lyrics", highlight: "happy balad", hasTrack: true });
  await expect(page.getByRole("tab", { name: "Paroles" })).toHaveAttribute("aria-selected", "true");
  const highlightedWord = page.locator(".track-detail-panel mark").first();
  await expect(highlightedWord).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".track-detail-panel mark").filter({ hasText: /^balad$/i }).first()).toBeVisible();
  await expect(highlightedWord).toBeFocused();
  await expect.poll(async () => highlightedWord.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    return rect.top >= 88 && center >= window.innerHeight * 0.25 && center <= window.innerHeight * 0.75;
  })).toBe(true);
});

test("un ancien brief devient un mot-clé littéral et AIMS reste désactivé", async ({ page }) => {
  await page.goto("/search?brief=mariage&resolve=1&view=tracks&translate=0");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("mariage");
  const url = new URL(page.url());
  expect(url.searchParams.has("brief")).toBe(false);
  expect(url.searchParams.has("resolve")).toBe(false);
  expect(url.searchParams.get("translation")).toBe("off");
  const modeSelect = page.getByRole("button", { name: "Mode de recherche : Catalogue" });
  await expect(modeSelect).toBeEnabled();
  await modeSelect.click();
  await page.getByRole("option", { name: /Brief IA/ }).click();
  await expect(page.getByRole("button", { name: "Mode de recherche : Brief IA" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Recherche AIMS bientôt disponible" })).toBeDisabled();
  await expect(page.getByTestId("search-detected-criteria")).toHaveCount(0);
});
