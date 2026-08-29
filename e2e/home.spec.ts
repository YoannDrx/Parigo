import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const formFixtureValue = ["Ui", "Form", "Value", "1"].join("-");
const mediumFormFixture = ["Parigo", "20", "26"].join("");

function wavFixture(durationSeconds = 1) {
  const sampleRate = 8_000;
  const channels = 1;
  const bitsPerSample = 16;
  const sampleCount = sampleRate * durationSeconds;
  const dataSize = sampleCount * channels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

async function waitForHeaderHydration(page: Page) {
  await page.waitForFunction(() => {
    const trigger = document.querySelector('button[aria-controls="global-menu"]');
    return Boolean(trigger && Object.keys(trigger).some((key) => key.startsWith("__reactProps")));
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      updatedAt: "2026-07-23T00:00:00.000Z",
    }));
  });
});

test("le héros ouvre une recherche par similarité IA depuis un brief", async ({ page }, testInfo) => {
  await page.route("**/api/similarity/capabilities", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data: {
      track: { advertised: true, enabled: true, multiSeed: true, prioritizeBpm: true },
      prompt: { advertised: true, enabled: true },
      upload: { advertised: true, enabled: true, contentTypes: ["audio/mpeg", "audio/wav"], maxBytes: 125_829_120, maxDurationSeconds: 900 },
      externalUrl: { advertised: true, enabled: true, platforms: ["youtube", "spotify", "vimeo", "soundcloud", "appleMusic", "tiktok"] },
      playlistSuggestions: true,
    } }),
  }));
  await page.route("**/api/similarity/search", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data: { tracks: [], mode: "prompt" }, meta: { total: 0, durationMs: 10, requestId: "e2e-similarity" } }),
  }));

  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await hero.getByRole("button", { name: "Mode de recherche : Catalogue" }).click();
  const option = hero.getByRole("option", { name: /Similarité/ });
  await expect(option).toBeEnabled();
  await option.click();
  const aiInput = hero.getByRole("combobox", { name: /Brief, lien ou fichier/ });
  await expect(aiInput).not.toBeFocused();
  await expect(hero.getByRole("listbox", { name: "Briefs récents" })).toHaveCount(0);
  const hint = hero.getByLabel("Fonctionnement de la recherche par similarité IA");
  await expect(hint).toContainText("Décrivez une scène, une émotion ou un usage, ou collez un lien public");
  await expect(hint.getByRole("button", { name: "Importer un fichier MP3 ou WAV" })).toBeVisible();
  await expect(hint.getByTitle("YouTube")).toBeVisible();
  await expect(hint.getByTitle("Spotify")).toBeVisible();
  if (testInfo.project.name === "mobile") {
    const heroBox = await hero.boundingBox();
    const hintBox = await hint.boundingBox();
    expect(heroBox).not.toBeNull();
    expect(hintBox).not.toBeNull();
    expect(hintBox!.x).toBeGreaterThanOrEqual(heroBox!.x);
    expect(hintBox!.x + hintBox!.width).toBeLessThanOrEqual(heroBox!.x + heroBox!.width);
    expect(hintBox!.y + hintBox!.height).toBeLessThanOrEqual(heroBox!.y + heroBox!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
  }
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="home-hero"]').analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "critical")).toEqual([]);
  await aiInput.fill("Une tension cinématique nocturne");
  const runBrief = hero.getByRole("button", { name: "Lancer le brief" });
  await expect(runBrief.getByText("Lancer le brief")).toBeVisible();
  await runBrief.click();

  await expect(page).toHaveURL(/\/search\?mode=ai&source=prompt/);
  expect(new URL(page.url()).searchParams.get("q")).toBe("Une tension cinématique nocturne");
  await expect(page.getByRole("region", { name: "Recherche par similarité IA" })).toBeVisible();
  await expect(page.getByText("Aucune piste similaire n’a été trouvée.")).toBeVisible();
});

test("le héros IA reconnaît un lien compatible et un fichier audio", async ({ page }) => {
  await page.route("**/api/similarity/capabilities", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data: {
      track: { advertised: true, enabled: true, multiSeed: true, prioritizeBpm: true },
      prompt: { advertised: true, enabled: true },
      upload: { advertised: true, enabled: true, contentTypes: ["audio/mpeg", "audio/wav"], maxBytes: 125_829_120, maxDurationSeconds: 900 },
      externalUrl: { advertised: true, enabled: true, platforms: ["youtube", "spotify", "vimeo", "soundcloud", "appleMusic", "tiktok"] },
      playlistSuggestions: true,
    } }),
  }));
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await hero.getByRole("button", { name: "Mode de recherche : Catalogue" }).click();
  await hero.getByRole("option", { name: /Similarité IA/ }).click();
  const input = hero.getByRole("combobox", { name: /Brief, lien ou fichier/ });
  const hint = hero.getByLabel("Fonctionnement de la recherche par similarité IA");
  await expect(input).toHaveAttribute("placeholder", "Décrivez une musique, collez un lien ou déposez un MP3/WAV…");
  await input.fill("https://open.spotify.com/track/example");
  await expect(hint.getByTitle("Spotify")).toBeVisible();
  await expect(hero.getByRole("button", { name: "Analyser le lien" })).toBeEnabled();
  await hero.locator(".search-command__form").evaluate((node) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["not-an-audio-file"], "reference.png", { type: "image/png" }));
    node.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  await expect(hero.getByRole("alert")).toContainText("format n’est pas accepté");
  await expect(hero.getByRole("button", { name: "Envoyer et analyser" })).toBeDisabled();
  const fileInput = hint.locator('input[type="file"]');
  await fileInput.setInputFiles({ name: "reference.wav", mimeType: "audio/wav", buffer: wavFixture() });
  await expect(hero.getByText("reference.wav")).toBeVisible();
  await expect(hero.getByRole("button", { name: "Envoyer et analyser" })).toBeEnabled();
  await expect(hero).not.toContainText(/AIMS|Harvest/i);
});

test("la home réserve la shortlist à la page Search", async ({ page }) => {
  await page.route("**/api/similarity/capabilities", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data: {
      track: { advertised: true, enabled: true, multiSeed: true, prioritizeBpm: true },
      prompt: { advertised: true, enabled: true },
      upload: { advertised: true, enabled: true, contentTypes: ["audio/mpeg", "audio/wav"], maxBytes: 125_829_120, maxDurationSeconds: 900 },
      externalUrl: { advertised: true, enabled: true, platforms: ["youtube", "spotify", "vimeo", "soundcloud", "appleMusic", "tiktok"] },
      playlistSuggestions: true,
    } }),
  }));
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await hero.getByRole("button", { name: "Mode de recherche : Catalogue" }).click();
  await hero.getByRole("option", { name: /Similarité IA/ }).click();
  const hint = hero.getByLabel("Fonctionnement de la recherche par similarité IA");
  await expect(hint).not.toContainText(/shortlist/i);
  await expect(hint.getByRole("button", { name: "Importer un fichier MP3 ou WAV" })).toBeVisible();
});

test("la homepage rend la recherche principale et navigue vers les résultats", async ({ page }, testInfo) => {
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await expect(hero).toBeVisible();
  const heroVeilGradients = await hero.locator(".hero-gradflow__veil").evaluate((node) => (
    getComputedStyle(node).backgroundImage.match(/linear-gradient/g)?.length ?? 0
  ));
  expect(heroVeilGradients).toBe(1);
  const backgrounds = await page.evaluate(() => ({
    canvas: getComputedStyle(document.documentElement).backgroundColor,
    hero: getComputedStyle(document.querySelector<HTMLElement>("[data-testid='home-hero']")!).backgroundColor,
  }));
  expect(backgrounds.canvas).toBe(backgrounds.hero);
  await expect(
    page.getByRole("heading", { level: 1, name: /Trouvez la bonne musique/i }),
  ).toBeVisible();
  const heroSignature = page.getByRole("heading", { level: 1 }).locator(".parigo-title-signature");
  await expect(heroSignature).toHaveCount(1);
  if (testInfo.project.name === "desktop") {
    await page.getByRole("heading", { level: 1 }).hover();
    await expect(heroSignature).toHaveCSS("animation-name", "parigo-title-signature-spin");
  }
  await expect(page.getByRole("link", { name: "Entrer dans le catalogue" })).toHaveCount(0);
  const modeSelect = hero.getByRole("button", { name: "Mode de recherche : Catalogue" });
  await expect(modeSelect).toBeEnabled();
  await modeSelect.click();
  const aiOption = hero.getByRole("option", { name: /Similarité IA/ });
  if (await aiOption.isEnabled()) {
    await aiOption.click();
    await expect(hero.getByRole("button", { name: "Mode de recherche : Similarité IA" })).toBeVisible();
    await expect(hero.getByLabel("Brief, lien ou fichier pour la similarité IA")).toBeVisible();
    await expect(hero.getByRole("button", { name: "Lancer le brief" })).toBeDisabled();
    if (testInfo.project.name === "mobile") {
      const hint = hero.getByLabel("Fonctionnement de la recherche par similarité IA");
      const backdrop = hero.getByTestId("hero-gradient-backdrop");
      await expect(hint).toBeVisible();
      await page.evaluate(() => window.scrollTo({ top: 180, behavior: "instant" }));
      const [heroBox, hintBox, backdropBox] = await Promise.all([
        hero.boundingBox(),
        hint.boundingBox(),
        backdrop.boundingBox(),
      ]);
      expect(heroBox).not.toBeNull();
      expect(hintBox).not.toBeNull();
      expect(backdropBox).not.toBeNull();
      expect(hintBox!.y + hintBox!.height).toBeLessThanOrEqual(heroBox!.y + heroBox!.height + 1);
      expect(Math.abs(backdropBox!.height - heroBox!.height)).toBeLessThanOrEqual(1);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    }
    await hero.getByRole("button", { name: "Mode de recherche : Similarité IA" }).click();
    await hero.getByRole("option", { name: /Catalogue/ }).click();
  } else {
    await expect(aiOption).toBeDisabled();
    await modeSelect.click();
  }
  await expect(hero.getByRole("button", { name: "Pistes", exact: true })).toHaveCount(0);
  await expect(hero.getByRole("button", { name: "Albums", exact: true })).toHaveCount(0);
  const searchBar = hero.locator(".search-command__form");
  const search = page.getByLabel("Rechercher dans le catalogue Parigo");
  const submitSearch = hero.getByRole("button", { name: "Rechercher", exact: true });
  await expect(submitSearch).toBeDisabled();
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect.poll(() => searchBar.evaluate((node) => Number.parseFloat(getComputedStyle(node).borderTopLeftRadius))).toBeGreaterThan(5);
  const restingRadius = await searchBar.evaluate((node) => ({
    topLeft: Number.parseFloat(getComputedStyle(node).borderTopLeftRadius),
    topRight: Number.parseFloat(getComputedStyle(node).borderTopRightRadius),
    before: getComputedStyle(node, "::before").content,
    after: getComputedStyle(node, "::after").content,
  }));
  expect(restingRadius.topRight).toBeGreaterThan(restingRadius.topLeft);
  expect(restingRadius.before).toBe("none");
  expect(restingRadius.after).toBe("none");
  await search.focus();
  await expect(submitSearch).toBeDisabled();
  expect(Number.parseFloat(await submitSearch.evaluate((node) => getComputedStyle(node).opacity))).toBeLessThan(0.5);
  await expect.poll(() => searchBar.evaluate((node) => ({
    topLeft: Number.parseFloat(getComputedStyle(node).borderTopLeftRadius),
    topRight: Number.parseFloat(getComputedStyle(node).borderTopRightRadius),
    bottomRight: Number.parseFloat(getComputedStyle(node).borderBottomRightRadius),
    bottomLeft: Number.parseFloat(getComputedStyle(node).borderBottomLeftRadius),
  }))).toEqual({ topLeft: 0, topRight: 16, bottomRight: 0, bottomLeft: 16 });
  const focusedFrame = await searchBar.evaluate((node) => ({
    boxShadow: getComputedStyle(node).boxShadow,
    before: getComputedStyle(node, "::before").content,
    after: getComputedStyle(node, "::after").content,
  }));
  expect(focusedFrame.boxShadow).toContain("inset");
  expect(focusedFrame.before).toBe("none");
  expect(focusedFrame.after).toBe("none");
  await search.fill("piano");
  await expect(submitSearch).toBeEnabled();
  await expect(searchBar).toHaveAttribute("data-has-value", "true");
  await expect.poll(() => searchBar.evaluate((node) => [
    getComputedStyle(node, "::before").content,
    getComputedStyle(node, "::after").content,
  ])).toEqual(["none", "none"]);
  await search.press("Enter");
  await expect(page).toHaveURL(/\/search\?/, { timeout: 30_000 });
  await expect(page.getByTestId("search-workspace")).toBeVisible();
  const resolvedUrl = new URL(page.url());
  expect(resolvedUrl.searchParams.get("q")).toBe("piano");
  expect(resolvedUrl.searchParams.has("brief")).toBe(false);
  expect(resolvedUrl.searchParams.has("categories")).toBe(false);
});

test("les suggestions du héros restent au-dessus de la section suivante", async ({ page }) => {
  await page.route("**/api/autocomplete?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { groups: [
        { key: "filters", count: 2, items: [
          { id: "STYLE_piano", kind: "filter", filterGroup: "styles", label: "Style · Piano", subtitle: "Ajouter comme filtre", matchedTerm: "piano" },
          { id: "INST_piano", kind: "filter", filterGroup: "instruments", label: "Instrument · Piano", subtitle: "Ajouter comme filtre", matchedTerm: "piano" },
        ] },
        { key: "tracks", count: 2, items: [
          { id: "track-piano-1", kind: "track", label: "Melancholy Piano Scene", subtitle: "Full · GZM005", image: "/images/placeholder-album.svg", href: "/albums/album-piano?track=track-piano-1" },
          { id: "track-piano-2", kind: "track", label: "Nostalgic Piano Theme", subtitle: "Full · GZM005", image: "/images/placeholder-album.svg", href: "/albums/album-piano?track=track-piano-2" },
        ] },
        { key: "albums", count: 3, items: [
          { id: "album-piano-1", kind: "album", label: "Piano Stories", subtitle: "Parigo", trackCount: 12, image: "/images/placeholder-album.svg", href: "/albums/album-piano-1" },
          { id: "album-piano-2", kind: "album", label: "Intimate Piano", subtitle: "Parigo", trackCount: 10, image: "/images/placeholder-album.svg", href: "/albums/album-piano-2" },
          { id: "album-piano-3", kind: "album", label: "Modern Piano", subtitle: "Parigo", trackCount: 8, image: "/images/placeholder-album.svg", href: "/albums/album-piano-3" },
        ] },
      ] } }),
    });
  });

  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await hero.getByLabel("Rechercher dans le catalogue Parigo").fill("piano");
  const panel = page.getByRole("listbox", { name: "Suggestions de recherche" });
  await expect(panel).toBeVisible();
  await expect(page.locator("#about")).toBeAttached();

  await page.evaluate(() => {
    const suggestions = document.querySelector<HTMLElement>(".search-autocomplete-panel");
    const nextSection = document.querySelector<HTMLElement>("#about");
    if (!suggestions || !nextSection) return;
    const overlapY = Math.max(suggestions.getBoundingClientRect().top, nextSection.getBoundingClientRect().top) + 8;
    if (overlapY > window.innerHeight - 40) window.scrollBy({ top: overlapY - window.innerHeight / 2, behavior: "instant" });
  });

  await expect.poll(() => page.evaluate(() => {
    const suggestions = document.querySelector<HTMLElement>(".search-autocomplete-panel");
    const nextSection = document.querySelector<HTMLElement>("#about");
    if (!suggestions || !nextSection) return false;
    const panelBox = suggestions.getBoundingClientRect();
    const sectionBox = nextSection.getBoundingClientRect();
    const overlapTop = Math.max(panelBox.top, sectionBox.top);
    const overlapBottom = Math.min(panelBox.bottom, sectionBox.bottom, window.innerHeight);
    if (overlapBottom <= overlapTop) return true;
    const topElement = document.elementFromPoint(panelBox.left + panelBox.width / 2, overlapTop + 4);
    return Boolean(topElement && suggestions.contains(topElement));
  })).toBe(true);

  await expect.poll(() => page.evaluate(() => {
    const copy = document.querySelector<HTMLElement>('[data-testid="home-hero-copy"]');
    const search = document.querySelector<HTMLElement>('[data-testid="home-hero-search-mask"]');
    if (!copy || !search) return null;
    return {
      copyOpacity: Number.parseFloat(getComputedStyle(copy).opacity),
      searchOpacity: Number.parseFloat(getComputedStyle(search).opacity),
    };
  })).toEqual(expect.objectContaining({
    copyOpacity: expect.any(Number),
    searchOpacity: 1,
  }));

  await hero.getByLabel("Rechercher dans le catalogue Parigo").press("Escape");
  await expect(panel).toBeHidden();
});

test("le sélecteur du héros reste contenu sur un petit viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Le placement adaptatif est contrôlé sur mobile.");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  const input = hero.getByLabel("Rechercher dans le catalogue Parigo");
  await expect(input).toHaveAttribute("placeholder", "Titre ou mots-clés…");
  await hero.getByRole("button", { name: "Mode de recherche : Catalogue" }).click();
  const menu = hero.getByRole("listbox", { name: "Choisir le mode de recherche" });
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(8);
  expect(box!.y + box!.height).toBeLessThanOrEqual(560);
  await expect(menu).toHaveAttribute("data-placement", "top");
});

test("le héros conserve un espace lisible sous la navbar sur iPhone SE", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "La composition iPhone SE est contrôlée sur mobile.");
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  const header = page.getByRole("banner");
  const title = page.getByTestId("home-hero").locator('[data-banner-reveal="title"]');
  await expect(page.getByTestId("home-hero-search-mask")).toHaveAttribute("data-banner-mask", "open");
  const [headerBox, titleBox] = await Promise.all([header.boundingBox(), title.boundingBox()]);
  expect(headerBox).not.toBeNull();
  expect(titleBox).not.toBeNull();
  const titleGap = titleBox!.y - (headerBox!.y + headerBox!.height);
  expect(titleGap).toBeGreaterThanOrEqual(64);
  expect(titleGap).toBeLessThanOrEqual(150);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
});

test("la home ne propose DeepL qu’après le lancement d’une recherche vide", async ({ page }) => {
  let submittedSearches = 0;
  await page.route("**/api/autocomplete?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: { groups: [] } }),
    });
  });
  await page.route("**/api/search?**", async (route) => {
    const url = new URL(route.request().url());
    submittedSearches += 1;
    expect(url.searchParams.get("probe")).toBeNull();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { items: [], view: "tracks", facets: { bpm: { min: 1, max: 300 }, duration: { min: 1, max: 300 }, categories: [], labels: [], styles: [] } },
        meta: {
          page: 1,
          pageSize: 30,
          total: 0,
          requestId: "home-translation-e2e",
          searchMode: "keyword",
          fieldProfile: "editorial",
          providerDurationMs: 10,
          ...(url.searchParams.get("q") === "coucher de soleil" ? { translationSuggestion: { original: "coucher de soleil", effective: "sunset", source: "machine-translation" } } : {}),
        },
      }),
    });
  });

  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  const search = hero.getByLabel("Rechercher dans le catalogue Parigo");
  const submitSearch = hero.getByRole("button", { name: "Rechercher", exact: true });
  await expect(submitSearch).toBeDisabled();
  await search.fill("coucher de soleil");
  await expect(submitSearch).toBeEnabled();
  await expect(hero.getByText(/Rechercher aussi.*sunset.*en anglais/)).toHaveCount(0);
  expect(submittedSearches).toBe(0);
  await search.press("Enter");
  await expect(page).toHaveURL(/\/search\?.*q=coucher(?:\+|%20)de(?:\+|%20)soleil/);
  await expect(page.getByText(/Rechercher aussi « sunset »/)).toBeVisible();
  expect(submittedSearches).toBeGreaterThan(0);
});

test("le CTA Qui sommes-nous conserve un contraste lisible dans les deux thèmes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le survol est vérifié avec un pointeur desktop.");
  await page.goto("/");
  await expect(page.getByText("Parigo accompagne les professionnels de l'image et du son dans la recherche de musiques et la gestion des droits.", { exact: false })).toBeVisible();
  const cta = page.getByRole("link", { name: "Découvrir le catalogue" });
  await cta.scrollIntoViewIfNeeded();

  for (const theme of ["light", "dark"]) {
    await page.evaluate((nextTheme) => {
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
    }, theme);
    await cta.hover();
    await expect(cta).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(cta).toHaveCSS("color", "rgb(17, 21, 16)");
  }
});

test("le CTA du brief conserve son contraste dans les deux thèmes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le survol du CTA est un comportement desktop.");
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Envoyer un brief" });
  await expect(page.getByRole("link", { name: "Contacter l’équipe" })).toHaveCount(0);
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await cta.hover();
  await expect(cta).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(cta).toHaveCSS("color", "rgb(16, 20, 16)");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  });
  await cta.hover();
  await expect(cta).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(cta).toHaveCSS("color", "rgb(16, 20, 16)");
});

test("le libellé du rail des synchros reste lisible dans les deux thèmes", async ({ page }) => {
  await page.goto("/");
  const section = page.getByTestId("home-sync-section");
  const label = section.locator(".home-rail__label");
  await label.scrollIntoViewIfNeeded();

  for (const [theme, foreground, background] of [
    ["light", "rgb(242, 241, 237)", "rgb(21, 24, 21)"],
    ["dark", "rgb(21, 24, 21)", "rgb(241, 241, 236)"],
  ] as const) {
    await page.evaluate((nextTheme) => {
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
    }, theme);
    await expect(label).toHaveCSS("color", foreground);
    await expect(section).toHaveCSS("background-color", background);
  }
});

test("la navbar reste minimaliste et expose la signature Parigo dans l’onglet", async ({ page }, testInfo) => {
  await page.goto("/search");

  const iconHref = await page.locator('head link[rel="icon"]').getAttribute("href");
  expect(iconHref).toMatch(/^\/icon\.svg/);
  const iconResponse = await page.request.get(new URL(iconHref!, page.url()).toString());
  expect(iconResponse.ok()).toBe(true);
  expect(iconResponse.headers()["content-type"]).toContain("image/svg+xml");
  expect(await iconResponse.text()).toContain("Parigo Music");

  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await expect(page.locator("#global-menu").getByText(/^0[1-7]$/)).toHaveCount(0);
    return;
  }

  const mainNavigation = page.getByRole("navigation", { name: "Navigation principale" });
  const activeLink = mainNavigation.getByRole("link", { name: "Recherche", exact: true });
  await expect(activeLink).toHaveAttribute("aria-current", "page");
  const activeStyles = await activeLink.evaluate((node) => {
    const style = getComputedStyle(node);
    const marker = getComputedStyle(node, "::after");
    return { background: style.backgroundColor, radius: style.borderRadius, markerHeight: marker.height, markerTransform: marker.transform };
  });
  expect(activeStyles.background).toBe("rgba(0, 0, 0, 0)");
  expect(activeStyles.radius).toBe("0px");
  expect(activeStyles.markerHeight).toBe("2px");
  expect(activeStyles.markerTransform).toBe("matrix(1, 0, 0, 1, 0, 0)");

  const albumsLink = mainNavigation.getByRole("link", { name: "Albums", exact: true });
  await albumsLink.focus();
  await expect.poll(() => albumsLink.evaluate((node) => getComputedStyle(node, "::after").transform)).toBe("matrix(1, 0, 0, 1, 0, 0)");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.locator("#global-menu").getByText(/^0[1-7]$/)).toHaveCount(0);
});

test("la connexion reprend les codes éditoriaux sans indentation artificielle", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.getByRole("button", { name: "Ouvrir la connexion" }).click();

  const dialog = page.getByRole("dialog", { name: "Se connecter" });
  await expect(dialog).toBeVisible();
  const email = dialog.locator("#login-email");
  const password = dialog.locator("#login-password");
  await expect(email).toHaveCSS("padding-left", "16px");
  await expect(password).toHaveCSS("padding-left", "16px");
  await password.fill(formFixtureValue);
  await expect(password).toHaveAttribute("type", "password");
  await dialog.getByRole("button", { name: "Afficher le mot de passe" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue(formFixtureValue);
  await dialog.getByRole("button", { name: "Masquer le mot de passe" }).click();
  await expect(password).toHaveAttribute("type", "password");
  const forgot = dialog.getByRole("button", { name: "Mot de passe oublié" });
  await expect(forgot).toHaveCSS("text-transform", "none");
  expect(Number.parseFloat(await forgot.evaluate((node) => getComputedStyle(node).fontSize))).toBeLessThan(12);
});

test("la connexion traduit l’erreur d’un compte non vérifié", async ({ page }, testInfo) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "FORBIDDEN", message: "Not activated" } }),
    });
  });
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.getByRole("button", { name: "Ouvrir la connexion" }).click();

  const dialog = page.getByRole("dialog", { name: "Se connecter" });
  await dialog.locator("#login-email").fill("pending@parigo.test");
  await dialog.locator("#login-password").fill(formFixtureValue);
  await dialog.getByRole("button", { name: "Se connecter", exact: true }).click();

  const alert = dialog.getByRole("alert");
  await expect(alert).toContainText("validation de votre adresse e-mail");
  await expect(alert).not.toContainText("Not activated");
});

test("les pages d’authentification partagent un panneau coulissant responsive", async ({ page }, testInfo) => {
  await page.goto("/login");
  const switcher = page.getByTestId("auth-switcher");
  const hero = switcher.locator("aside");
  const loginPanel = switcher.locator("#auth-login-panel");
  await expect(switcher).toHaveAttribute("data-auth-view", "login");
  await expect(hero.locator('[data-auth-image="login"][data-active="true"] img')).toHaveAttribute("src", /r14-v3-forgot-password/);
  await expect(hero.locator('[class*="border-l-2"], [class*="border-r-2"]')).toHaveCount(0);
  await expect(hero.getByRole("heading", { name: "Entrez dans le catalogue." })).toBeVisible();
  const [switcherBox, heroBefore, loginBox] = await Promise.all([
    switcher.boundingBox(),
    hero.boundingBox(),
    loginPanel.boundingBox(),
  ]);
  expect(switcherBox).not.toBeNull();
  expect(heroBefore).not.toBeNull();
  expect(loginBox).not.toBeNull();
  if (testInfo.project.name === "mobile") {
    expect(heroBefore!.y + heroBefore!.height).toBeLessThanOrEqual(loginBox!.y + 1);
  } else {
    expect(Math.abs(heroBefore!.width - switcherBox!.width / 2)).toBeLessThanOrEqual(10);
    expect(heroBefore!.x).toBeGreaterThan(loginBox!.x);
  }

  await hero.getByRole("button", { name: "Afficher le formulaire d’inscription" }).click();
  await expect(switcher).toHaveAttribute("data-auth-view", "register");
  await expect(hero.locator('[data-auth-image="register"][data-active="true"] img')).toHaveAttribute("src", /r15-v1-register/);
  await expect(switcher.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
  await expect(hero.getByRole("heading", { name: "Heureux de vous revoir." })).toBeVisible();
  if (testInfo.project.name !== "mobile") {
    await expect.poll(async () => (await hero.boundingBox())?.x ?? Number.POSITIVE_INFINITY).toBeLessThan(heroBefore!.x - switcherBox!.width / 3);
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBe(await page.evaluate(() => document.documentElement.clientHeight));
  await expect(page.locator("footer")).toHaveCount(0);
});

test("le thème et la langue sont basculables et persistants", async ({ page }, testInfo) => {
  const ensureMobileMenuOpen = async () => {
    if (testInfo.project.name !== "mobile") return;
    const menu = page.locator("#global-menu");
    if (!(await menu.isVisible())) {
      await page.getByRole("button", { name: /^(Ouvrir le menu|Open menu)$/ }).click();
    }
    await expect(menu).toBeVisible();
  };

  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  }
  await ensureMobileMenuOpen();
  const controls = testInfo.project.name === "mobile"
    ? page.locator("#global-menu")
    : page.locator("body");
  await controls.getByRole("link", { name: /English version/ }).click();
  await expect(page).toHaveURL(/\/en(?:\/|$)/);
  await expect(page.getByRole("heading", { level: 1, name: /Find the right music/i })).toBeVisible();
  await waitForHeaderHydration(page);
  await ensureMobileMenuOpen();
  const themeControls = testInfo.project.name === "mobile"
    ? page.locator("#global-menu")
    : page.locator("body");
  await themeControls.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await waitForHeaderHydration(page);
  await ensureMobileMenuOpen();
  const restoredThemeControls = testInfo.project.name === "mobile"
    ? page.locator("#global-menu")
    : page.locator("body");
  await restoredThemeControls.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { name: "Who are we" })).toBeVisible();
  for (const heading of ["Who are we", "From brief to selection"]) {
    const element = page.getByRole("heading", { name: heading });
    const color = await element.evaluate((node) => getComputedStyle(node).color);
    const channels = color.match(/\d+/g)?.slice(0, 3).map(Number) ?? [];
    expect(Math.min(...channels)).toBeGreaterThan(180);
  }
  const instagramTile = page.locator('[role="listitem"]').filter({ hasText: "Instagram" });
  await expect(instagramTile).toHaveCSS("background-color", "rgb(255, 255, 255)");
  if (testInfo.project.name === "desktop") {
    const projectCta = page.getByRole("link", { name: "Send a brief" });
    await projectCta.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await projectCta.hover();
    await expect(projectCta).toHaveCSS("color", "rgb(16, 20, 16)");
  }
});

test("la homepage ne contient pas de violation critique axe", async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    const locationUrl = message.location().url;
    const blockedPreviewToolbar = text.includes("https://vercel.live/_next-live/feedback/feedback.js")
      && text.includes("Content Security Policy");
    if (message.type() === "error" && !blockedPreviewToolbar) {
      consoleErrors.push(`${text} @ ${locationUrl}`);
    }
  });
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical")).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("la home expose le catalogue Parigo et un menu modal responsive", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => window.localStorage.setItem("parigo-theme", "light"));
  await page.goto("/");
  await expect(page.getByText(/démo locale/i)).toHaveCount(0);
  const menuTrigger = page.getByRole("button", { name: "Ouvrir le menu" });
  await expect(menuTrigger).toBeVisible();
  await menuTrigger.click();
  const menu = page.getByRole("dialog", { name: "Menu principal" });
  await expect(menu).toBeVisible();
  await page.waitForTimeout(500);
  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.x).toBeLessThanOrEqual(5);
  expect(menuBox!.width).toBeGreaterThanOrEqual((await page.evaluate(() => innerWidth)) - 5);
  expect(Math.ceil(menuBox!.height)).toBeGreaterThanOrEqual((await page.evaluate(() => innerHeight)) - 75);
  await expect(menu).not.toContainText("Paris · France");
  await expect(menu).not.toContainText(/Parigo \/(?: Explorer| Explore)/);
  await expect(menu).not.toContainText("Catalogue, images et compositeurs");
  await expect(menu).toHaveCSS("background-color", "rgb(242, 241, 237)");
  await expect(menu).toHaveCSS("background-image", "none");
  await expect(menu).toHaveCSS("color", "rgb(21, 24, 21)");
  await expect(menu).toHaveCSS("backdrop-filter", "none");
  await expect(menu.locator(".parigo-menu-aside")).toHaveCount(0);
  await expect(menu.getByText("Un projet en tête ?", { exact: true })).toHaveCount(0);
  await expect(menu.locator('a[href="/labels"]')).toContainText("Labels");
  await expect(menu.getByRole("link", { name: "Notre label" })).toBeVisible();
  for (const note of [
    "Par humeur, instrument ou usage",
    "Nos catalogues partenaires",
    "Le catalogue original Parigo",
    "Explorez tous nos albums",
    "Nos musiques à l’image",
    "Nos sélections éditoriales",
    "Comprendre et gérer les droits",
    "Le catalogue en images",
    "Celles et ceux qui créent",
  ]) {
    await expect(menu.getByText(note, { exact: true })).toBeVisible();
  }
  if (testInfo.project.name === "desktop") {
    const labelsCard = menu.locator('a[href="/labels"]');
    await labelsCard.hover({ force: true });
    const arrow = labelsCard.locator(".parigo-menu-card__arrow");
    await expect(arrow).toHaveCSS("transform", "none");
    await expect.poll(() => labelsCard.evaluate((node) => node.matches(":hover"))).toBe(true);
    await expect.poll(() => arrow.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    await expect(labelsCard).toHaveCSS("border-top-left-radius", "0px");
    await expect(labelsCard).toHaveCSS("border-bottom-right-radius", "0px");
    expect(Number.parseFloat(await labelsCard.evaluate((node) => getComputedStyle(node).borderTopRightRadius))).toBeGreaterThan(0);
    expect(Number.parseFloat(await labelsCard.evaluate((node) => getComputedStyle(node).borderBottomLeftRadius))).toBeGreaterThan(0);
  }
  expect(await menu.getByTestId("drawer-navigation").getByRole("link").evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual([
    "/search",
    "/labels",
    "/notre-label",
    "/albums",
    "/synchronisations",
    "/playlists",
    "/licensing",
    "/clips",
    "/talents",
  ]);
  const themeToggle = testInfo.project.name === "mobile"
    ? menu.getByTestId("mobile-menu-controls").getByRole("button", { name: "Passer au thème sombre" })
    : page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: "Passer au thème sombre" });
  await themeToggle.click();
  await expect(menu).toHaveCSS("background-color", "rgb(11, 13, 11)");
  await expect(menu).toHaveCSS("color", "rgb(241, 241, 236)");
  if (testInfo.project.name === "mobile") {
    const mobileControls = menu.getByTestId("mobile-menu-controls");
    await expect(mobileControls).toBeVisible();
    await expect(mobileControls.locator('a[href="/en"]')).toHaveText("EN");
    await expect(mobileControls.getByRole("button", { name: "Passer au thème clair" })).toBeVisible();
    await expect(mobileControls.getByRole("button", { name: "Ouvrir la connexion" })).toBeVisible();
    await mobileControls.getByRole("button", { name: "Ouvrir la connexion" }).focus();
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await expect(menu.getByText("Votre espace", { exact: true })).not.toBeVisible();
    await expect(menu.getByText("Préférences", { exact: true })).not.toBeVisible();
    await expect(menu.getByTestId("embedded-login")).not.toBeVisible();
    const mobileCard = menu.locator(".parigo-menu-card").first();
    expect(await mobileCard.evaluate((node) => getComputedStyle(node, "::before").content)).toBe("none");
    expect(await mobileCard.evaluate((node) => getComputedStyle(node, "::after").content)).toBe("none");
    await expect(mobileCard).toHaveCSS("box-shadow", "none");
    await expect(menu).toHaveCSS("overflow-y", "auto");
    const initialScrollMetrics = await menu.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(initialScrollMetrics.scrollHeight).toBeGreaterThan(initialScrollMetrics.clientHeight);
    await menu.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
    await expect.poll(() => menu.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  } else {
    await expect(menu.getByTestId("mobile-menu-controls")).not.toBeVisible();
    await expect(menu.getByText("Préférences", { exact: true })).not.toBeVisible();
  }
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menu principal" })).toHaveCount(0);

  await expect(page.getByRole("tab", { name: "Nouveautés" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('#featured a[href^="/albums/"]').first()).toBeVisible({ timeout: 30_000 });
  expect(await page.locator('#featured a[href^="/albums/"]').count()).toBeGreaterThan(4);
  expect(await page.locator("main img").count()).toBeGreaterThanOrEqual(8);

  await expect(page.getByRole("heading", { name: "Une sélection, plusieurs récits." })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Synchronisations" })).toHaveCount(0);
});

test("le changement de langue mobile conserve le menu ouvert sans recharger la page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Le contrôle compact de langue est propre au menu mobile.");
  await page.goto("/");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu principal" });
  await expect(menu).toBeVisible();
  await page.evaluate(() => { (window as Window & { __parigoLocaleMarker?: string }).__parigoLocaleMarker = "client-navigation"; });
  await menu.getByTestId("mobile-menu-controls").locator('a[href="/en"]').click();
  await expect(page).toHaveURL(/\/en$/);
  const englishMenu = page.getByRole("dialog", { name: "Main menu" });
  await expect(englishMenu).toBeVisible();
  await expect(englishMenu.getByRole("heading", { name: "Explore Parigo" })).toBeVisible();
  await expect(englishMenu.getByTestId("mobile-menu-controls").locator('a[href="/"]')).toHaveText("FR");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await page.evaluate(() => (window as Window & { __parigoLocaleMarker?: string }).__parigoLocaleMarker)).toBe("client-navigation");
});

test("le footer reprend l’ordre du menu et sépare le compte des réseaux sociaux", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");
  const footer = page.locator("footer");
  const explore = footer.getByRole("heading", { name: "Explorer", exact: true }).locator("xpath=..");
  await expect(explore.getByRole("link", { name: "Labels", exact: true })).toBeVisible();
  expect(await explore.getByRole("link").evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual([
    "/search",
    "/labels",
    "/notre-label",
    "/albums",
    "/synchronisations",
    "/playlists",
    "/clips",
    "/talents",
  ]);
  await expect(footer.getByRole("link", { name: "Licensing", exact: true })).toHaveCount(1);
  await expect(footer.getByRole("link", { name: "Linktree" })).toHaveCount(0);

  const account = footer.getByRole("button", { name: /Créer un compte Parigo/ });
  const instagram = footer.getByRole("link", { name: "Instagram" });
  const accountBox = await account.boundingBox();
  const instagramBox = await instagram.boundingBox();
  expect(accountBox).not.toBeNull();
  expect(instagramBox).not.toBeNull();
  expect(accountBox!.y + accountBox!.height).toBeLessThanOrEqual(instagramBox!.y);
});

test("la home et les pistes proposent des interactions tactiles dédiées", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name !== "mobile", "Ce parcours contrôle spécifiquement la composition tactile.");
  await page.goto("/");
  const showreel = page.getByTestId("home-showreel");
  const showreelTitle = showreel.locator("h2").first();
  await expect(showreel).toBeVisible({ timeout: 30_000 });
  expect(await showreel.evaluate((node) => node.clientHeight)).toBeGreaterThanOrEqual((await page.evaluate(() => innerHeight)) * .95);
  await expect(showreel.getByTestId("home-showreel-video")).toHaveAttribute("src", "/videos/garden-of-eden-showreel.mp4");
  expect(Number.parseFloat(await showreelTitle.evaluate((node) => getComputedStyle(node).fontSize))).toBeGreaterThan(48);

  await page.getByRole("tab", { name: "Playlists" }).click();
  await expect(page.locator('#featured a[href^="/playlists/"]').first()).toBeVisible({ timeout: 30_000 });
  const carouselArrows = page.locator('button[aria-label="Précédent"], button[aria-label="Suivant"]');
  expect(await carouselArrows.count()).toBeGreaterThan(0);
  for (let index = 0; index < await carouselArrows.count(); index += 1) await expect(carouselArrows.nth(index)).toBeHidden();

  await showreelTitle.scrollIntoViewIfNeeded();

  const process = page.locator("#process");
  await process.scrollIntoViewIfNeeded();
  const processCards = page.getByTestId("process-card");
  await expect(processCards).toHaveCount(3);
  for (const number of ["01", "02", "03"]) await expect(process.getByText(number, { exact: true })).toHaveCount(1);
  const processCardBoxes = await processCards.evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().toJSON()));
  expect(Math.abs(processCardBoxes[1].top - processCardBoxes[0].bottom)).toBeLessThanOrEqual(1);

  await expect(page.getByTestId("editorial-mobile-rail")).toHaveCount(0);

  await page.goto("/search?q=piano&view=tracks&type=main");
  const firstPlay = page.getByRole("button", { name: /^Écouter / }).first();
  await expect(firstPlay).toBeVisible({ timeout: 30_000 });
  await expect(firstPlay.getByTestId("track-play-icon")).toBeVisible();
  await expect(page.locator("[data-shortlist-trigger]")).toHaveCount(0);
  await page.getByRole("button", { name: /^Ajouter à la shortlist :/ }).first().click();
  const shortlistTrigger = page.locator("[data-shortlist-trigger]");
  await expect(shortlistTrigger).toBeVisible();
  await page.getByRole("dialog", { name: "Shortlist" }).getByRole("button", { name: "Fermer" }).click();
  await expect(shortlistTrigger).toHaveCSS("right", "12px");
  await expect(shortlistTrigger).toHaveCSS("bottom", "8px");
  const moreActions = page.getByRole("button", { name: /^Plus d’actions :/ }).first();
  await expect(moreActions).toBeVisible();
  await moreActions.click();
  const actions = page.getByRole("dialog", { name: /^Actions de la piste/ }).first();
  await expect(actions).toBeVisible();
  await expect(shortlistTrigger).toHaveCSS("opacity", "0");
  await expect(shortlistTrigger).toHaveCSS("pointer-events", "none");
  await expect(actions.getByText("Télécharger", { exact: true })).toBeVisible();
  await expect(actions.getByText("Playlist", { exact: true })).toBeVisible();
  await expect(actions.getByText("Partager", { exact: true })).toBeVisible();
});

test("les rails de la home bouclent et les synchronisations ouvrent leur lecteur", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await page.getByRole("tab", { name: "Playlists" }).click();
  await expect(page.locator('#featured a[href^="/playlists/"]').first()).toBeVisible({ timeout: 30_000 });
  const featured = page.locator("#featured");
  const featuredArtwork = featured.locator(".home-audio-card img").first();
  await expect(featuredArtwork).toHaveAttribute(
    "src",
    /^https:\/\/d3vy0pmxxxelni\.cloudfront\.net\/assets\/playlistart\//,
  );
  const featuredSrcset = await featuredArtwork.getAttribute("srcset");
  const featuredWidths = [...(featuredSrcset ?? "").matchAll(/[?&]width=(\d+)/g)]
    .map((match) => Number(match[1]));
  expect(featuredWidths.length).toBeGreaterThan(0);
  expect(Math.max(...featuredWidths)).toBe(320);
  expect(featuredSrcset).not.toContain("/_next/image");
  const nextButton = featured.locator('button[aria-label="Suivant"]');
  if (testInfo.project.name === "mobile") await expect(nextButton).toBeHidden();
  else {
    await expect(nextButton).toBeEnabled();
    await expect(nextButton).toHaveClass(/carousel-nav-button--next/);
    await expect(nextButton.locator(".carousel-nav-button__icon")).toBeVisible();
    expect((await nextButton.boundingBox())!.width).toBeLessThanOrEqual(44);
    expect((await nextButton.boundingBox())!.height).toBeLessThanOrEqual(44);
    await nextButton.hover();
    await expect.poll(() => nextButton.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    await expect(page.getByRole("tooltip")).toHaveText("Suivant");
    const inverseButton = page.locator(".carousel-nav-button--inverse").last();
    const inverseColors = await inverseButton.evaluate((node) => ({
      control: getComputedStyle(node).color,
      section: getComputedStyle(node.closest("section")!).backgroundColor,
    }));
    expect(inverseColors.control).not.toBe(inverseColors.section);
  }
  await expect(featured.getByRole("tab", { name: "Synchronisations" })).toHaveCount(0);
  const dedicatedSyncSection = page.getByRole("heading", { name: "Nos synchros" }).locator("xpath=ancestor::section");
  const firstSync = dedicatedSyncSection.locator('a[href^="/synchronisations/"]:visible').first();
  const firstSyncCard = firstSync.locator("xpath=ancestor::article");
  await expect(firstSync).toBeVisible();
  await expect(firstSyncCard.locator("img")).toHaveClass(/object-contain/);
  const syncFrame = await firstSyncCard.locator(".home-sync-card__frame").boundingBox();
  expect(syncFrame).not.toBeNull();
  expect(syncFrame!.width / syncFrame!.height).toBeGreaterThan(1.7);
  const syncCaption = firstSyncCard.locator(".home-sync-card__caption");
  if (testInfo.project.name === "mobile") {
    await expect(syncCaption).toBeHidden();
    const mobileFooter = firstSyncCard.locator(".editorial-card__mobile-footer");
    await expect(mobileFooter).toBeVisible();
    await expect(mobileFooter).not.toContainText(/Synchronisation|Parigo Production Music|\b\d{4}\b/i);
    expect((await mobileFooter.boundingBox())!.height).toBeLessThanOrEqual(64);
    await expect(firstSyncCard.getByRole("button", { name: /^Lire / })).toBeVisible();
    await expect(firstSyncCard.locator(".home-sync-card__frame").getByRole("link", { name: /^Voir le détail/ })).toBeVisible();
    await expect(firstSyncCard.locator(".editorial-video-card__mobile-link")).toBeVisible();
  } else {
    expect(await firstSyncCard.evaluate((node) => getComputedStyle(node, "::before").content)).toBe("none");
    expect(await firstSyncCard.evaluate((node) => getComputedStyle(node, "::after").content)).toBe("none");
    await expect(syncCaption).toHaveCSS("opacity", "0");
    await firstSyncCard.hover();
    await expect(syncCaption).toHaveCSS("opacity", "1");
    await expect(firstSyncCard.locator(".home-sync-card__image")).toHaveCSS("filter", "blur(5px)");
    expect(await firstSyncCard.evaluate((node) => getComputedStyle(node, "::before").content)).toBe("none");
    expect(await firstSyncCard.evaluate((node) => getComputedStyle(node, "::after").content)).toBe("none");
  }
  if (testInfo.project.name === "mobile") {
    const clipCard = page.getByTestId("home-clips-section").locator(".parigo-video-card").first();
    const clipFooter = clipCard.locator(".editorial-card__mobile-footer");
    await expect(clipFooter).toBeVisible();
    await expect(clipFooter).not.toContainText(/Clip Parigo|Parigo Production Music|\b\d{4}\b/i);
    expect((await clipFooter.boundingBox())!.height).toBeLessThanOrEqual(64);
  } else {
    const clipCard = page.getByTestId("home-clips-section").locator(".parigo-video-card").first();
    expect(await clipCard.evaluate((node) => getComputedStyle(node, "::before").content)).toBe("none");
    expect(await clipCard.evaluate((node) => getComputedStyle(node, "::after").content)).toBe("none");
    await clipCard.hover();
    expect(await clipCard.evaluate((node) => getComputedStyle(node, "::before").content)).toBe("none");
    expect(await clipCard.evaluate((node) => getComputedStyle(node, "::after").content)).toBe("none");
  }
  const syncHref = await firstSync.getAttribute("href");
  expect(syncHref).toMatch(/^\/synchronisations\/[^/]+$/);
  await firstSync.click();
  await expect(page).toHaveURL(new RegExp(`${syncHref}$`));
  await expect(page.getByText(/nécessite votre autorisation/)).toBeVisible();
  await page.evaluate(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: true,
      updatedAt: "2026-07-25T00:00:00.000Z",
    }));
    window.dispatchEvent(new Event("parigo:cookie-consent-change"));
  });
  const detailPlay = page.getByRole("button", { name: /^Lire / });
  await expect(detailPlay).toBeVisible();
  await detailPlay.click();
  await expect(page.getByTestId("persistent-clip-iframe")).toBeVisible();
});

test("les rails reprennent le fond de leur section et adaptent leur espacement vertical", async ({ page }, testInfo) => {
  await page.goto("/");
  const sections = [
    page.locator("#featured"),
    page.getByTestId("home-clips-section"),
    page.getByTestId("home-sync-section"),
  ];
  for (const [index, section] of sections.entries()) {
    await section.scrollIntoViewIfNeeded();
    const rail = section.locator(".home-rail").first();
    const card = rail.locator(".home-rail-card, .home-sync-card").first();
    await expect(rail).toBeVisible();
    await expect(card).toBeVisible();
    const colors = await section.evaluate((node) => {
      const railNode = node.querySelector<HTMLElement>(".home-rail");
      const viewportNode = node.querySelector<HTMLElement>('.home-rail > [role="region"]');
      const cardNode = node.querySelector<HTMLElement>(".home-rail-card, .home-sync-card");
      return {
        section: getComputedStyle(node).backgroundColor,
        surface: getComputedStyle(document.querySelector<HTMLElement>("#featured")!).backgroundColor,
        rail: railNode ? getComputedStyle(railNode).backgroundColor : "",
        viewport: viewportNode ? getComputedStyle(viewportNode).backgroundColor : "",
        paddingTop: viewportNode ? getComputedStyle(viewportNode).paddingTop : "",
        paddingBottom: viewportNode ? getComputedStyle(viewportNode).paddingBottom : "",
        card: cardNode ? getComputedStyle(cardNode).backgroundColor : "",
        cardShadow: cardNode ? getComputedStyle(cardNode).boxShadow : "",
      };
    });
    expect(colors.rail).toBe(colors.section);
    expect(colors.viewport).toBe(colors.section);
    expect(colors.paddingTop).toBe("8px");
    expect(colors.paddingBottom).toBe(index === 0 ? "20px" : "0px");
    const usesMobileVideoSurface = testInfo.project.name === "mobile" && index > 0;
    expect(colors.card).toBe(usesMobileVideoSurface ? colors.surface : colors.section);
    if (index === 0) expect(colors.cardShadow).not.toBe("none");
    else expect(colors.cardShadow).toBe("none");
  }
});

test("le showreel occupe le viewport et ne contient plus l’effet de pochettes", async ({ page }) => {
  await page.goto("/");
  const section = page.getByTestId("home-showreel");
  await section.scrollIntoViewIfNeeded();
  const [height, viewportHeight] = await Promise.all([
    section.evaluate((node) => node.clientHeight),
    page.evaluate(() => innerHeight),
  ]);
  expect(height).toBeGreaterThanOrEqual(viewportHeight * .95);
  expect(height).toBeLessThanOrEqual(viewportHeight * 1.2);
  await expect(section.getByRole("heading", { name: /Une musique juste.*Au bon moment.*Pour la bonne image/i })).toBeVisible();
  await expect(section.locator("h2 > span")).toHaveCount(5);
  await expect(section.getByText(/Parigo accompagne chaque année/i)).toHaveCount(0);
  await expect(page.getByTestId("manifesto-album-cover")).toHaveCount(0);
  const video = section.getByTestId("home-showreel-video");
  await expect(video).toHaveAttribute("src", "/videos/garden-of-eden-showreel.mp4");
  await expect(video).toHaveAttribute("poster", "/images/home/garden-of-eden-poster.jpg");
  await expect(section.locator("iframe")).toHaveCount(0);
});

test("le showreel charge le MP4 local et son contrôle sonore sans consentement marketing", async ({ page }) => {
  await page.goto("/");
  const section = page.getByTestId("home-showreel");
  await section.scrollIntoViewIfNeeded();
  const player = section.getByTestId("home-showreel-video");
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute("src", "/videos/garden-of-eden-showreel.mp4");
  await expect(page.getByRole("button", { name: /Activer le son|Couper le son/ })).toBeVisible({ timeout: 30_000 });
});

test("le showreel continue après la section et garde un mute animé accessible", async ({ page }) => {
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.defineProperty(window, "__parigoMediaCalls", { value: calls });
    HTMLMediaElement.prototype.play = function play() {
      calls.push(`play:${this.muted ? "muted" : "audible"}`);
      queueMicrotask(() => this.dispatchEvent(new Event("play")));
      return Promise.resolve();
    };
  });
  await page.goto("/");
  const section = page.getByTestId("home-showreel");
  await section.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (
    (window as typeof window & { __parigoMediaCalls?: string[] }).__parigoMediaCalls ?? []
  ))).toContain("play:audible");
  await expect(page.getByTestId("showreel-sound-active")).toBeVisible();
  await expect(section.getByTestId("showreel-title-square")).toHaveCount(3);
  const titleLetters = section.getByTestId("showreel-title-letter");
  await expect(titleLetters.first()).toHaveCSS("opacity", "1");
  await expect(section.getByTestId("showreel-title-square").last()).toHaveCSS("opacity", "1", { timeout: 6_000 });

  const showreelTop = await section.evaluate((node) => node.getBoundingClientRect().top + scrollY);
  const viewportHeight = await page.evaluate(() => innerHeight);
  await page.evaluate(({ top, viewport }) => scrollTo({ top: top + viewport * .35 }), {
    top: showreelTop,
    viewport: viewportHeight,
  });
  const soundPosition = page.getByTestId("showreel-sound-position");
  await expect(soundPosition).toHaveCount(1);
  await expect(page.locator('button[data-floating="true"][aria-label="Couper le son"]')).toBeVisible();
  await page.waitForTimeout(180);
  const movingSoundBox = await soundPosition.boundingBox();
  await page.waitForTimeout(1_350);
  const settledSoundBox = await soundPosition.boundingBox();
  expect(movingSoundBox).not.toBeNull();
  expect(settledSoundBox).not.toBeNull();
  expect(settledSoundBox!.y).toBeGreaterThan(movingSoundBox!.y);

  await page.evaluate((top) => scrollTo({ top }), showreelTop);
  await expect(page.locator('button[data-floating="true"][aria-label="Couper le son"]')).toBeVisible();
  await expect(soundPosition).toHaveCount(1);

  await page.getByTestId("home-composers").scrollIntoViewIfNeeded();
  const floatingMute = page.locator('button[data-floating="true"][aria-label="Couper le son"]');
  await expect(floatingMute).toHaveAttribute("data-floating", "true");
  const floatingMuteBox = await floatingMute.boundingBox();
  expect(floatingMuteBox).not.toBeNull();
  const viewportWidth = await page.evaluate(() => innerWidth);
  expect(floatingMuteBox!.x + floatingMuteBox!.width).toBeGreaterThan(viewportWidth - 100);

  await floatingMute.click();
  const reattachedSound = page.locator('button[data-floating="false"][aria-label="Activer le son"]');
  await expect(reattachedSound).toHaveCount(1);
  await page.waitForTimeout(1_350);
  const reattachedSoundBox = await soundPosition.boundingBox();
  expect(reattachedSoundBox).not.toBeNull();
  expect(reattachedSoundBox!.y).toBeLessThan(floatingMuteBox!.y);
  await expect(page.getByTestId("showreel-sound-active")).toHaveCount(0);

  const audibleStartsAfterManualStop = await page.evaluate(() => (
    (window as typeof window & { __parigoMediaCalls?: string[] })
      .__parigoMediaCalls?.filter((call) => call === "play:audible").length ?? 0
  ));
  await section.scrollIntoViewIfNeeded();
  await page.getByTestId("home-composers").scrollIntoViewIfNeeded();
  await section.scrollIntoViewIfNeeded();
  await expect(page.locator('button[data-floating="false"][aria-label="Activer le son"]')).toBeVisible();
  await expect(page.getByTestId("showreel-sound-active")).toHaveCount(0);
  expect(await page.evaluate(() => (
    (window as typeof window & { __parigoMediaCalls?: string[] })
      .__parigoMediaCalls?.filter((call) => call === "play:audible").length ?? 0
  ))).toBe(audibleStartsAfterManualStop);

  await page.locator('button[data-floating="false"][aria-label="Activer le son"]').click();
  await expect(page.getByTestId("showreel-sound-active")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (
    (window as typeof window & { __parigoMediaCalls?: string[] })
      .__parigoMediaCalls?.filter((call) => call === "play:audible").length ?? 0
  ))).toBe(audibleStartsAfterManualStop + 1);
});

test("le son du showreel et son contrôle persistent pendant la navigation", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.defineProperty(window, "__parigoPersistentMediaCalls", { value: calls });
    HTMLMediaElement.prototype.play = function play() {
      calls.push(`play:${this.tagName.toLowerCase()}:${this.muted ? "muted" : "audible"}`);
      queueMicrotask(() => this.dispatchEvent(new Event("play")));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function pause() {
      calls.push(`pause:${this.tagName.toLowerCase()}`);
      queueMicrotask(() => this.dispatchEvent(new Event("pause")));
    };
  });
  await page.goto("/");
  const section = page.getByTestId("home-showreel");
  await section.scrollIntoViewIfNeeded();
  await expect(page.getByTestId("showreel-sound-active")).toBeVisible();

  const showreelTop = await section.evaluate((node) => node.getBoundingClientRect().top + scrollY);
  const viewportHeight = await page.evaluate(() => innerHeight);
  await page.evaluate(({ top, viewport }) => scrollTo({ top: top + viewport * .35 }), {
    top: showreelTop,
    viewport: viewportHeight,
  });
  const floatingControl = page.locator('button[data-floating="true"][aria-label="Couper le son"]');
  await expect(floatingControl).toBeVisible();

  const persistentAudio = page.getByTestId("persistent-showreel-audio");
  await persistentAudio.evaluate((audio) => {
    audio.dataset.persistenceMarker = "same-audio-node";
  });
  const audibleCallsBeforeNavigation = await page.evaluate(() => (
    (window as typeof window & { __parigoPersistentMediaCalls?: string[] })
      .__parigoPersistentMediaCalls?.filter((call) => call === "play:audio:audible").length ?? 0
  ));

  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.locator("#global-menu").locator('a[href="/labels"]').click();
  await expect(page).toHaveURL(/\/labels$/);
  await expect(page.getByTestId("persistent-showreel-audio")).toHaveAttribute("data-persistence-marker", "same-audio-node");
  await expect(page.locator('button[data-floating="true"][aria-label="Couper le son"]')).toBeVisible();
  expect(await page.evaluate(() => (
    (window as typeof window & { __parigoPersistentMediaCalls?: string[] })
      .__parigoPersistentMediaCalls?.filter((call) => call === "play:audio:audible").length ?? 0
  ))).toBe(audibleCallsBeforeNavigation);

  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.locator("#global-menu").locator('a[href="/search"]').click();
  const firstTrack = page.getByRole("button", { name: /^Écouter / }).first();
  await expect(firstTrack).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^Ajouter à la shortlist :/ }).first().click();
  const shortlistTrigger = page.locator("[data-shortlist-trigger]");
  await expect(shortlistTrigger).toBeVisible();
  await expect.poll(async () => {
    const [soundBox, shortlistBox] = await Promise.all([
      page.locator('button[data-floating="true"][aria-label="Couper le son"]').boundingBox(),
      shortlistTrigger.boundingBox(),
    ]);
    if (!soundBox || !shortlistBox) return -1;
    return shortlistBox.y - (soundBox.y + soundBox.height);
  }).toBeGreaterThanOrEqual(10);
  await page.getByRole("dialog", { name: "Shortlist" }).getByRole("button", { name: "Fermer", exact: true }).click();
  await firstTrack.click();
  await expect(page.getByTestId("player-dock")).toBeVisible();
  await expect(page.locator('button[data-floating="true"][aria-label="Couper le son"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (
    (window as typeof window & { __parigoPersistentMediaCalls?: string[] })
      .__parigoPersistentMediaCalls ?? []
  ))).toContain("pause:audio");
});

test("la section compositeurs présente un flux désaxé de talents", async ({ page }, testInfo) => {
  await page.goto("/");
  const section = page.getByTestId("home-composers");
  await expect(section.getByRole("heading", { name: "Les talents qui donnent vie à notre catalogue" })).toBeVisible();
  await expect(section.getByText("Une maison de compositeurs", { exact: true })).toHaveCount(0);
  await expect(section).toContainText("Une musique ne naît jamais seule");
  await expect(section).toContainText("Découvrez nos talents");
  await expect(section).not.toContainText("Découvrez les talents qui donnent une identité unique au catalogue original Parigo.");
  await expect(section.getByRole("heading", { level: 3 })).toHaveCount(0);
  for (const removedCard of ["Écouter", "Accompagner", "Construire"]) {
    await expect(section.getByText(removedCard, { exact: true })).toHaveCount(0);
  }
  await expect(section.getByText(/^(?:01|02|03)$/)).toHaveCount(0);
  const cta = section.getByRole("link", { name: "Découvrez nos talents" });
  await expect(cta).toHaveAttribute("href", "/talents");
  await expect(cta).toHaveClass(/home-section-cta/);
  await expect(cta).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(cta.locator(".home-section-cta__arrow")).toBeVisible();
  await expect(cta.locator("xpath=parent::div")).toHaveCSS("justify-content", "center");
  const aboutCta = page.getByRole("link", { name: "Découvrir le catalogue" });
  const [composerCtaShape, aboutCtaShape] = await Promise.all([
    cta.evaluate((node) => {
      const style = getComputedStyle(node);
      return { borderRadius: style.borderRadius, fontSize: style.fontSize, height: style.height, paddingLeft: style.paddingLeft };
    }),
    aboutCta.evaluate((node) => {
      const style = getComputedStyle(node);
      return { borderRadius: style.borderRadius, fontSize: style.fontSize, height: style.height, paddingLeft: style.paddingLeft };
    }),
  ]);
  expect(composerCtaShape).toEqual(aboutCtaShape);
  await expect(section.getByRole("link", { name: "Découvrir nos compositeurs" })).toHaveCount(0);
  const primaryCards = section.locator('.composer-cloud__group:not([aria-hidden="true"]) a[href^="/talents/"]');
  await expect(primaryCards).toHaveCount(63);
  await expect(primaryCards.locator("svg")).toHaveCount(0);
  await expect(section.locator('.composer-cloud__duplicate a[href^="/talents/"]')).toHaveCount(63);
  await expect(section.locator("img")).toHaveCount(126);
  await expect(primaryCards.locator("img").first()).toHaveAttribute("src", /\/images\/composers\/detail\//);
  await expect(primaryCards.locator("img").first()).toHaveCSS("object-fit", "cover");
  const verticalOffsets = await section.locator('.composer-cloud__group:not([aria-hidden="true"]) .composer-cloud__item').evaluateAll((items) => (
    items.map((item) => getComputedStyle(item).paddingTop)
  ));
  expect(new Set(verticalOffsets).size).toBeGreaterThan(8);
  const track = section.locator(".composer-cloud__track");
  await expect(track).toHaveCSS("animation-name", "composer-cloud-drift");
  if (testInfo.project.name === "desktop") {
    await section.locator(".composer-cloud").hover();
    await expect(track).toHaveCSS("animation-play-state", "paused");
  }
  await expect(section.locator("header > p")).toHaveCount(1);
  await expect(section.locator("header > p")).toHaveCSS("border-top-width", "0px");
  await expect(page.getByTestId("composer-sticky-stage")).toHaveCount(0);
});

test("la home adopte les nouvelles accroches éditoriales", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await expect(hero).toContainText("Des compositions originales pensées pour raconter vos images");
  await expect(hero).toContainText("Explorez, écoutez, comparez et licenciez en quelques clics.");
  await expect(hero).not.toContainText("Un catalogue édité pour les monteurs");
  await expect(page.locator("#about").getByRole("heading", { name: "Qui sommes nous" })).toBeVisible();
  await expect(page.getByTestId("home-clips-section")).not.toContainText("Les créations audiovisuelles du label");
});

test("le bouton Play des albums reste visible en thème sombre", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const playIndicator = page.locator("#featured .home-release-play").first();
  await expect(playIndicator).toBeVisible();
  await expect(playIndicator).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(playIndicator).toHaveCSS("opacity", "1");
  const background = await playIndicator.evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(background).not.toBe("rgba(0, 0, 0, 0)");
});

test("les nouveautés se rafraîchissent dès l’affichage initial", async ({ page }) => {
  let releaseRequests = 0;
  await page.route(/\/api\/albums\?/, async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.has("label")) {
      await route.continue();
      return;
    }
    releaseRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          albums: [{
            id: "fresh-release",
            slug: "fresh-release",
            title: "Sortie fraîche",
            cover: "/images/placeholder-album.svg",
            label: "Parigo",
            trackCount: 1,
            releaseDate: "2026-08-06T00:00:00.000Z",
          }],
        },
        meta: { total: 1, page: 1, pageSize: 12 },
      }),
    });
  });

  await page.goto("/");
  const featured = page.locator("#featured");
  await expect(featured.getByText("Sortie fraîche", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(featured.getByRole("tab", { name: "Nouveautés" })).toHaveAttribute("aria-selected", "true");
  expect(releaseRequests).toBeGreaterThan(0);
});

test("les cartes À écouter maintenant séparent lecture et navigation", async ({ page }, testInfo) => {
  const track = (id: string, albumId: string) => ({
    id,
    title: `Piste ${id}`,
    duration: 90,
    audioUrl: null,
    albumId,
    albumTitle: "Sélection de test",
    albumCover: "/images/placeholder-album.svg",
    genres: [],
    moods: [],
    isVocal: false,
    waveform: null,
  });

  await page.route(/\/api\/albums\/[^/?]+$/, async (route) => {
    const albumId = new URL(route.request().url()).pathname.split("/").at(-1)!;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { album: { id: albumId, tracks: [track("album-track", albumId)] }, similarAlbums: [] } }),
    });
  });
  await page.route(/\/api\/playlists\/[^/?]+$/, async (route) => {
    const playlistId = new URL(route.request().url()).pathname.split("/").at(-1)!;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { playlist: { id: playlistId, tracks: [track("playlist-track", "playlist-album")] } } }),
    });
  });

  await page.goto("/");
  const featured = page.locator("#featured");
  await featured.scrollIntoViewIfNeeded();

  const releaseCard = featured.locator(".home-audio-card").first();
  const releasePlay = releaseCard.locator(".home-release-play");
  const releaseCardLink = releaseCard.locator(".home-audio-card__card-link");
  const releaseDetail = releaseCard.getByRole("link", { name: /^Voir le détail de / }).first();
  const releaseHref = await releaseCardLink.getAttribute("href");
  expect(releaseHref).not.toBeNull();
  await expect(releasePlay).toHaveAttribute("aria-label", /^Lire /);
  await expect(releaseCardLink).toHaveAttribute("href", /^\/albums\//);
  await expect(releaseDetail).toHaveAttribute("href", releaseHref!);
  const basePlayBackground = await releasePlay.evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(basePlayBackground).not.toBe("rgba(0, 0, 0, 0)");
  expect(basePlayBackground).not.toBe("transparent");
  if (testInfo.project.name === "desktop") {
    await releasePlay.hover();
    await expect(releasePlay).toHaveCSS("background-color", "rgb(104, 191, 131)");
    await releaseDetail.hover();
    await expect(releaseDetail).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(releaseDetail).toHaveCSS("color", "rgb(21, 24, 21)");
  }

  await releasePlay.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("player-dock")).toBeVisible();
  await expect(releasePlay).toHaveAttribute("aria-label", /^Mettre en pause /);
  await releasePlay.click();
  await expect(releasePlay).toHaveAttribute("aria-label", /^Reprendre /);

  await featured.getByRole("tab", { name: "Playlists" }).click();
  const playlistCard = featured.locator(".home-audio-card").first();
  await expect(playlistCard.locator(".home-release-play")).toHaveAttribute("aria-label", /^Lire /);
  await expect(playlistCard.locator(".home-audio-card__card-link")).toHaveAttribute("href", /^\/playlists\//);
  await playlistCard.locator(".home-release-play").click();
  await expect(playlistCard.locator(".home-release-play")).toHaveAttribute("aria-label", /^Mettre en pause /);

  await featured.getByRole("tab", { name: "Notre label" }).click();
  const parigoCard = featured.locator(".home-audio-card").first();
  const parigoCardLink = parigoCard.locator(".home-audio-card__card-link");
  const parigoHref = await parigoCardLink.getAttribute("href");
  expect(parigoHref).toMatch(/^\/albums\//);
  await expect(parigoCard.locator(".home-release-play")).toHaveAttribute("aria-label", /^Lire /);
  await expect(parigoCard.getByRole("link", { name: /^Voir le détail de / })).toHaveCount(2);
  await parigoCardLink.click();
  await expect(page).toHaveURL(new RegExp(`${parigoHref}$`));
});

test("le player étendu mobile devient une bottom sheet ajustée au contenu", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Le verrouillage demandé concerne le player mobile.");
  await page.setViewportSize({ width: 320, height: 520 });
  const tracks = Array.from({ length: 8 }, (_, index) => ({
    id: `mobile-player-${index}`,
    title: `Piste mobile ${index + 1}`,
    duration: 90,
    audioUrl: null,
    albumId: "mobile-player-album",
    albumTitle: "Sélection mobile",
    albumCover: "/images/placeholder-album.svg",
    genres: [],
    moods: [],
    isVocal: false,
    waveform: null,
  }));
  await page.route(/\/api\/albums\/[^/?]+$/, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { album: { id: "mobile-player-album", tracks }, similarAlbums: [] } }),
  }));

  await page.goto("/");
  await page.locator("#featured").scrollIntoViewIfNeeded();
  await page.locator("#featured .home-release-play").first().click();
  const player = page.getByTestId("player-dock");
  await expect(player).toBeVisible();
  const pageScroll = await page.evaluate(() => window.scrollY);
  await player.getByRole("button", { name: "Agrandir le lecteur" }).click();
  await expect(player).toHaveClass(/parigo-player--expanded/);
  await expect.poll(() => page.evaluate(() => document.body.style.position)).toBe("fixed");
  const playerBox = (await player.boundingBox())!;
  expect(playerBox.height).toBeLessThanOrEqual(520 * .78 + 1);
  expect(Math.abs(playerBox.y + playerBox.height - 520)).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: "Fermer le panneau du lecteur" })).toBeVisible();
  const scrollArea = player.locator(".parigo-player__expanded");
  const scrollMetrics = await scrollArea.evaluate((node) => ({ clientHeight: node.clientHeight, scrollHeight: node.scrollHeight }));
  expect(scrollMetrics.clientHeight).toBeLessThanOrEqual(scrollMetrics.scrollHeight);
  if (scrollMetrics.scrollHeight > scrollMetrics.clientHeight) {
    await scrollArea.evaluate((node) => { node.scrollTop = node.scrollHeight; });
    await expect.poll(() => scrollArea.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await player.getByRole("button", { name: "Réduire le lecteur" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(pageScroll);
});

test("l’image About reste fixe pendant le défilement", async ({ page }) => {
  await page.goto("/");
  const image = page.getByTestId("home-about-image");
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", /r01-v1-home/);
  await expect(image).toHaveCSS("transform", "none");
  const about = page.locator("#about");
  const metrics = await about.evaluate((node) => {
    const bounds = node.getBoundingClientRect();
    return { top: bounds.top + window.scrollY, height: bounds.height };
  });
  await page.evaluate(({ top, height }) => window.scrollTo(0, top + height * .7), metrics);
  await expect(image).toHaveCSS("transform", "none");
  await expect(page.getByTestId("home-about-parallax")).toHaveCount(0);
  await expect(page.getByTestId("home-parallax-interlude")).toHaveCount(0);
  await expect(page.getByText("Quand la musique rencontre l’image", { exact: false })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
});

test("le héros garde sa chorégraphie et les textes des autres sections restent statiques", async ({ page }) => {
  await page.goto("/");
  const heroContent = page.getByTestId("home-hero-content");
  const heroCopy = page.getByTestId("home-hero-copy");
  const heroWords = page.getByTestId("home-hero-title-word");
  const descriptionLines = page.getByTestId("home-hero-description-line");
  const heroSearch = page.getByTestId("home-hero-search-reveal");
  const heroSearchMask = page.getByTestId("home-hero-search-mask");

  await expect(heroContent).toHaveAttribute("data-home-hero-motion", "animated");
  await expect(heroWords).toHaveCount(4);
  await expect(descriptionLines).toHaveCount(2);
  await expect(heroWords.last()).toHaveCSS("opacity", "1");
  await expect(descriptionLines.last()).toHaveCSS("opacity", "1");
  await expect(heroSearch).toHaveCSS("opacity", "1");
  await expect(heroSearchMask).toHaveAttribute("data-banner-mask", "open");
  await expect(heroSearchMask).toHaveCSS("overflow", "visible");

  const copyOpacityBefore = Number.parseFloat(await heroCopy.evaluate((node) => getComputedStyle(node).opacity));
  const searchOpacityBefore = Number.parseFloat(await heroSearchMask.evaluate((node) => getComputedStyle(node).opacity));
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * .72));
  await expect.poll(() => heroCopy.evaluate((node) => Number.parseFloat(getComputedStyle(node).opacity))).toBeLessThan(copyOpacityBefore - .25);
  await expect.poll(() => heroSearchMask.evaluate((node) => Number.parseFloat(getComputedStyle(node).opacity))).toBeLessThan(searchOpacityBefore - .25);
  await expect.poll(() => heroContent.evaluate((node) => getComputedStyle(node).transform)).not.toBe("none");

  const opacityTrail = await page.evaluate(async () => {
    const hero = document.querySelector<HTMLElement>('[data-testid="home-hero"]');
    const copy = document.querySelector<HTMLElement>('[data-testid="home-hero-copy"]');
    const search = document.querySelector<HTMLElement>('[data-testid="home-hero-search-mask"]');
    if (!hero || !copy || !search) return [];
    const heroBottom = hero.getBoundingClientRect().bottom + window.scrollY;
    const step = Math.max(48, Math.round(window.innerHeight / 10));
    const samples: Array<{ copy: number; search: number }> = [];
    for (let y = 0; y <= heroBottom + step; y += step) {
      window.scrollTo(0, y);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      samples.push({
        copy: Number.parseFloat(getComputedStyle(copy).opacity),
        search: Number.parseFloat(getComputedStyle(search).opacity),
      });
    }
    return samples;
  });
  expect(opacityTrail.length).toBeGreaterThan(4);
  for (let index = 1; index < opacityTrail.length; index += 1) {
    expect(opacityTrail[index].copy).toBeLessThanOrEqual(opacityTrail[index - 1].copy + 0.01);
    expect(opacityTrail[index].search).toBeLessThanOrEqual(opacityTrail[index - 1].search + 0.01);
  }
  expect(opacityTrail.at(-1)!.copy).toBeLessThanOrEqual(0.01);
  expect(opacityTrail.at(-1)!.search).toBeLessThanOrEqual(0.01);

  const featuredReveal = page.locator('#featured [data-home-reveal="static"]').first();
  await featuredReveal.scrollIntoViewIfNeeded();
  await expect(featuredReveal).toHaveCSS("opacity", "1");
  await expect(featuredReveal).toHaveCSS("transform", "none");

  const clipsReveal = page.getByTestId("home-clips-section").locator('[data-home-reveal="static"]').first();
  await clipsReveal.scrollIntoViewIfNeeded();
  await expect(clipsReveal).toHaveCSS("opacity", "1");
  await expect(clipsReveal).toHaveCSS("transform", "none");

  const processReveal = page.locator('#process [data-home-reveal="static"]').first();
  await processReveal.scrollIntoViewIfNeeded();
  await expect(processReveal).toHaveCSS("opacity", "1");
  await expect(processReveal).toHaveCSS("transform", "none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
});

test("le mouvement réduit conserve l’image About et le héros statiques", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByTestId("home-about-image")).toHaveCSS("transform", "none");
  await expect(page.getByTestId("home-about-parallax")).toHaveCount(0);
  await expect(page.getByTestId("home-parallax-interlude")).toHaveCount(0);
  await expect(page.getByTestId("home-hero-content")).toHaveAttribute("data-home-hero-motion", "static");
  await expect(page.getByTestId("home-hero-title-word").first()).toHaveCSS("transform", "none");
  await expect(page.getByTestId("home-hero-description-line").first()).toHaveCSS("transform", "none");
  await expect(page.getByTestId("home-hero-search-reveal")).toHaveCSS("transform", "none");
  await expect(page.getByTestId("home-hero-search-mask")).toHaveAttribute("data-banner-mask", "open");
});

test("le showreel reste sans effet au survol et introduit la relation avec les compositeurs", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le survol est contrôlé avec un pointeur desktop.");
  await page.goto("/");
  const section = page.getByTestId("home-showreel");
  await section.scrollIntoViewIfNeeded();
  const box = await section.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * .2, box!.y + box!.height * .25);
  await page.mouse.move(box!.x + box!.width * .8, box!.y + box!.height * .75);
  await expect(page.getByTestId("manifesto-album-cover")).toHaveCount(0);
  const composers = page.getByTestId("home-composers");
  const composerTitle = composers.getByRole("heading", { name: "Les talents qui donnent vie à notre catalogue" });
  await composerTitle.scrollIntoViewIfNeeded();
  await expect(composerTitle).toBeVisible();
  const composerIntro = composers.getByText(/^Une musique ne naît jamais seule/);
  await expect(composerIntro).toHaveCSS("opacity", "1");
  await expect(composerIntro).toHaveCSS("transform", "none");
  await expect(composerTitle.locator(".reveal-segment")).toHaveCount(0);
  await expect(composers.getByText(/^Parigo \//)).toHaveCount(0);
  await expect(composers.locator('.composer-cloud__group:not([aria-hidden="true"]) a[href^="/talents/"]')).toHaveCount(63);
  const cta = composers.getByRole("link", { name: "Découvrez nos talents" });
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const [cloudBox, ctaBox] = await Promise.all([
    composers.locator(".composer-cloud").boundingBox(),
    cta.boundingBox(),
  ]);
  expect(cloudBox).not.toBeNull();
  expect(ctaBox).not.toBeNull();
  expect(ctaBox!.y - (cloudBox!.y + cloudBox!.height)).toBeGreaterThanOrEqual(0);
  expect(ctaBox!.y - (cloudBox!.y + cloudBox!.height)).toBeLessThanOrEqual(18);
});

test("les logos clients défilent en bandeau entre les synchronisations et le fil Parigo", async ({ page }, testInfo) => {
  await page.goto("/");
  const sync = page.getByTestId("home-sync-section");
  const partners = page.getByTestId("home-partners-section");
  const social = page.getByTestId("social-follow-section");
  await expect(sync).toBeVisible();
  await expect(social).toBeVisible();
  await expect(partners.getByRole("heading", { name: "Ils nous font confiance" })).toBeVisible();
  await expect(partners.getByText("Du streaming au cinéma", { exact: false })).toHaveCount(0);
  await expect(partners).toHaveCSS("background-color", "rgb(11, 17, 13)");
  await expect(partners.locator(".partner-marquee__group:not(.partner-marquee__duplicate) img")).toHaveCount(12);
  await expect(partners.locator(".partner-marquee__duplicate img")).toHaveCount(12);
  await expect(partners.locator('a[href^="/labels/"]')).toHaveCount(0);
  const track = partners.locator(".partner-marquee__track");
  await expect(track).toHaveCSS("animation-name", "partner-marquee");
  await expect(track).toHaveCSS("animation-duration", "42s");
  await partners.locator(".partner-marquee").hover();
  await expect(track).toHaveCSS("animation-play-state", "running");
  await expect.poll(() => track.evaluate((node) => node.getAnimations()[0]?.playbackRate)).toBeCloseTo(0.32, 2);
  await partners.getByRole("heading", { name: "Ils nous font confiance" }).hover();
  await expect.poll(() => track.evaluate((node) => node.getAnimations()[0]?.playbackRate)).toBe(1);
  expect(await page.getByTestId("home-showreel").evaluate((node) => node.parentElement?.nextElementSibling?.getAttribute("data-testid"))).toBe("home-sync-section");
  expect(await page.evaluate(([syncId, partnersId, socialId]) => {
    const syncNode = document.querySelector(syncId)!;
    const partnersNode = document.querySelector(partnersId)!;
    const socialNode = document.querySelector(socialId)!;
    return Boolean(syncNode.compareDocumentPosition(partnersNode) & Node.DOCUMENT_POSITION_FOLLOWING)
      && Boolean(partnersNode.compareDocumentPosition(socialNode) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, ['[data-testid="home-sync-section"]', '[data-testid="home-partners-section"]', '[data-testid="social-follow-section"]'])).toBe(true);
  expect(await partners.evaluate((node) => getComputedStyle(node).marginLeft)).toBe("0px");
  if (testInfo.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 740 });
    const items = partners.locator(".partner-marquee__group:not(.partner-marquee__duplicate) .partner-marquee__item");
    const [first, second] = await Promise.all([items.nth(0).boundingBox(), items.nth(1).boundingBox()]);
    expect(first!.width + second!.width).toBeLessThanOrEqual(296);
    const fadeWidth = await partners.locator(".partner-marquee").evaluate((node) => Number.parseFloat(getComputedStyle(node, "::before").width));
    expect(fadeWidth).toBeLessThanOrEqual(13);

    const socialIcon = social.locator(".social-platform-icon").first();
    const linktree = social.locator(".social-follow-cta");
    await expect(socialIcon).toHaveCSS("animation-name", "social-platform-float");
    await expect(linktree).toHaveCSS("animation-name", "none");
  } else {
    const fadeWidth = await partners.locator(".partner-marquee").evaluate((node) => Number.parseFloat(getComputedStyle(node, "::before").width));
    expect(fadeWidth).toBeLessThanOrEqual(128);
  }
});

test("les trois segments de la home restent égaux et le footer toujours sombre", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  const tabs = page.getByRole("tablist", { name: "Sélections mises en avant" });
  await tabs.scrollIntoViewIfNeeded();
  const widths = await tabs.getByRole("tab").evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width));
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
  await tabs.getByRole("tab", { name: "Notre label" }).click();
  await expect(tabs.getByRole("tab", { name: "Notre label" })).toHaveAttribute("aria-selected", "true");

  const footer = page.locator("footer.parigo-footer");
  await footer.scrollIntoViewIfNeeded();
  const lightBackground = await footer.evaluate((node) => getComputedStyle(node).backgroundColor);
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  });
  await expect(footer).toHaveCSS("background-color", lightBackground);
});

test("le showreel respecte la réduction des animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.getByTestId("home-showreel");
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("iframe")).toHaveCount(0);
  await expect(section.getByTestId("home-showreel-video")).toBeVisible();
  await expect(page.getByTestId("manifesto-album-cover")).toHaveCount(0);
  await expect(section.getByRole("heading", { name: /Une musique juste/i })).toBeVisible();
  await expect(section.getByRole("button", { name: /Activer le son|Couper le son/ })).toHaveCount(0);
  const composerTitle = page.getByTestId("home-composers").getByRole("heading", { name: "Les talents qui donnent vie à notre catalogue" });
  await composerTitle.scrollIntoViewIfNeeded();
  await expect(composerTitle.locator(".reveal-segment")).toHaveCount(0);
  const composerIntro = page.getByTestId("home-composers").getByText(/^Une musique ne naît jamais seule/);
  await expect(composerIntro).toHaveCSS("opacity", "1");
  await expect(composerIntro).toHaveCSS("transform", "none");
});

test("la page albums propose une vue liste réellement compacte", async ({ page }, testInfo) => {
  await page.goto("/albums");
  await expect(page.getByRole("heading", { level: 1, name: "Albums", exact: true })).toBeVisible();
  const albumCards = page.locator("[data-album-card]");
  await expect(albumCards.first()).toBeVisible({ timeout: 30_000 });
  await expect(albumCards.first().locator(".album-reference-tag")).toContainText(/^Réf\.\s+\S+/);
  expect(await page.locator(".album-reference-tag").count()).toBe(await albumCards.count());
  await page.getByRole("button", { name: "Vue liste" }).click();
  const firstRow = page.locator('main a[href^="/albums/"]').filter({ has: page.locator("h2") }).first();
  await expect(firstRow).toBeVisible({ timeout: 30_000 });
  const rowBox = await firstRow.boundingBox();
  const coverBox = await firstRow.locator("img").boundingBox();
  expect(rowBox).not.toBeNull();
  expect(coverBox).not.toBeNull();
  expect(rowBox!.height).toBeLessThanOrEqual(150);
  expect(coverBox!.width).toBeLessThanOrEqual(100);
  if (testInfo.project.name !== "mobile") {
    const title = firstRow.locator(".catalog-list-row__title");
    const initialBackground = await firstRow.evaluate((node) => getComputedStyle(node).backgroundImage);
    const initialColor = await title.evaluate((node) => getComputedStyle(node).color);
    await firstRow.hover();
    await expect.poll(() => firstRow.evaluate((node) => getComputedStyle(node).backgroundImage)).not.toBe(initialBackground);
    await expect.poll(() => title.evaluate((node) => getComputedStyle(node).color)).not.toBe(initialColor);
  }
});

test("une playlist Harvest avec une plage de BPM ouvre son détail", async ({ page }) => {
  await page.goto("/playlists/a408d52f57e8de96");
  await expect(page.getByRole("heading", { level: 1, name: "Découverte - Voyage" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Lapochka", { exact: true })).toBeVisible();
  expect(await page.getByRole("button", { name: /^Écouter / }).count()).toBeGreaterThan(5);
});

test("la recherche par mots-clés depuis l’accueil alimente le lecteur persistant", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name === "mobile", "Le parcours mobile du menu est couvert séparément.");
  await page.goto("/");
  await page.getByLabel("Rechercher dans le catalogue Parigo").fill("piano");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page).toHaveURL(/q=piano/);
  expect(new URL(page.url()).searchParams.has("brief")).toBe(false);
  expect(new URL(page.url()).searchParams.has("categories")).toBe(false);
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
  const firstTrack = page.getByRole("button", { name: /^Écouter / }).first();
  const trackTitle = (await firstTrack.getAttribute("aria-label"))?.replace(/^Écouter /, "") || "";
  await firstTrack.click();
  const player = page.getByTestId("player-dock");
  await expect(player).toContainText(trackTitle);
  const playerInstance = await player.getAttribute("data-player-instance");
  await expect.poll(async () => player.getByTestId("player-time-current").textContent(), { timeout: 15_000 }).not.toBe("0:00");
  const elapsedBeforeNavigation = await player.getByTestId("player-time-current").textContent();
  await expect(player.getByRole("button", { name: /Ajouter à une playlist/ })).toBeVisible();
  await expect(player.getByRole("button", { name: /Télécharger/ })).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(350);
  await page.locator('header a[href="/albums"]').click();
  await expect(page).toHaveURL(/\/albums$/, { timeout: 30_000 });
  await expect(player).toContainText(trackTitle);
  await expect(player).toHaveAttribute("data-player-instance", playerInstance || "");
  await expect(player.getByTestId("player-time-current")).not.toHaveText("0:00");
  expect(elapsedBeforeNavigation).not.toBe("0:00");
});

test("la shortlist expose son état sans contenu prédictif persistant à vide", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(testInfo.project.name === "mobile", "L’état compact de la shortlist est vérifié en desktop.");
  await page.goto("/search");
  await expect(page.getByRole("heading", { name: "Recherches suggérées" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Suggestions de recherche" })).toHaveCount(0);
  const searchInput = page.locator("#catalog-search");
  const focusedForm = searchInput.locator("xpath=ancestor::form");
  const restingShadow = await focusedForm.evaluate((node) => getComputedStyle(node).boxShadow);
  await searchInput.focus();
  await expect.poll(() => focusedForm.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe(restingShadow);
  await expect.poll(() => focusedForm.evaluate((node) => getComputedStyle(node).boxShadow)).toContain("inset");
  await expect(searchInput).toHaveCSS("outline-style", "none");
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-shortlist-trigger]")).toHaveCount(0);
  const add = page.getByRole("button", { name: /^Ajouter à la shortlist :/ }).first();
  await add.click();
  await expect(page.getByRole("dialog", { name: "Shortlist" })).toBeVisible();
  await expect(page.locator("[data-shortlist-trigger]")).toHaveCSS("right", "20px");
  await expect(page.locator("[data-shortlist-trigger]")).toHaveCSS("bottom", "12px");
  await page.getByRole("button", { name: "Connectez-vous", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Se connecter" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Écouter / }).first().click();
  const playerDock = page.getByTestId("player-dock");
  const shortlistTrigger = page.locator("[data-shortlist-trigger]");
  await expect(playerDock).toBeVisible();
  await expect.poll(async () => {
    const [playerBox, triggerBox] = await Promise.all([playerDock.boundingBox(), shortlistTrigger.boundingBox()]);
    return playerBox && triggerBox ? playerBox.y - (triggerBox.y + triggerBox.height) : -1;
  }).toBeGreaterThanOrEqual(10);
  const remove = page.getByRole("button", { name: /^Retirer de la shortlist :/ }).first();
  await expect(remove).toHaveAttribute("aria-pressed", "true");
});

test("l’ancien endpoint IA reste indisponible quand la Similarité est active", async ({ page }) => {
  await page.goto("/search");
  const modeSelect = page.getByRole("button", { name: "Mode de recherche : Catalogue" });
  await expect(modeSelect).toBeEnabled();
  await modeSelect.click();
  await page.getByRole("option", { name: /Similarité IA/ }).click();
  await expect(page.getByRole("button", { name: "Mode de recherche : Similarité IA" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lancer le brief" })).toBeDisabled();
  const response = await page.request.get("/api/search?mode=ai&q=techno&view=tracks&limit=1");
  expect(response.status()).toBe(503);
  const contract = await response.json();
  expect(contract.error.code).toBe("FEATURE_UNAVAILABLE");
  expect(contract.meta.capabilities.aiPromptSearchAvailable).toBe(false);
});

test("la recherche exacte reste accessible depuis le champ unifié", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/search");
  const input = page.getByRole("combobox", { name: "Rechercher dans le catalogue" });
  await input.fill("piano");
  await input.press("Enter");
  await expect(page).toHaveURL(/q=piano/, { timeout: 30_000 });
  const url = new URL(page.url());
  expect(url.searchParams.has("brief")).toBe(false);
  expect(url.searchParams.has("categories")).toBe(false);
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
});

test("les suggestions et les tags enrichis restent lisibles", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Les tags de piste détaillés sont réservés à la densité desktop.");
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.goto("/search?q=piano&view=tracks&type=main");
  const moreTags = page.locator(".parigo-track-row__more-tags").first();
  await expect(moreTags).toBeVisible({ timeout: 30_000 });
  await expect(moreTags).toHaveAttribute("aria-label", /^Autres tags :/);
  await moreTags.click();
  await expect(moreTags.locator("xpath=ancestor::article").locator(".track-detail-panel")).toHaveCount(0);
});

test("les héros playlists et synchronisations conservent leurs contenus", async ({ page }) => {
  await page.goto("/playlists");
  const playlistsTitle = page.getByRole("heading", { level: 1, name: "Nos playlists" });
  const titleBox = await playlistsTitle.boundingBox();
  const heroBox = await playlistsTitle.locator("xpath=ancestor::header").boundingBox();
  expect(titleBox).not.toBeNull();
  expect(heroBox).not.toBeNull();
  expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(heroBox!.x + heroBox!.width);
  expect(titleBox!.y + titleBox!.height).toBeLessThanOrEqual(heroBox!.y + heroBox!.height);

  await page.goto("/synchronisations");
  const youtube = page.getByRole("link", { name: "Playlist YouTube" });
  const firstCard = page.locator(".home-sync-card").first();
  await expect(youtube).toBeVisible();
  expect((await youtube.boundingBox())!.y).toBeLessThan((await firstCard.boundingBox())!.y);
});

test("la recherche expose des vues, tris et filtres partageables", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/search?q=techno&view=tracks&type=main");

  await expect(page.getByTestId("search-workspace")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });

  if (testInfo.project.name === "mobile") {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.getByRole("button", { name: "Filtres" }).click();
    await expect(page.getByRole("dialog", { name: "Filtres" })).toBeVisible();
    await page.waitForTimeout(400);
    await page.getByRole("dialog", { name: "Filtres" }).locator("summary").filter({ hasText: "Instruments" }).click();
    const pianoFilter = page.getByRole("button", { name: /^Inclure Piano$/ }).first();
    await pianoFilter.scrollIntoViewIfNeeded();
    await pianoFilter.press("Enter");
    const applyFilters = page.getByRole("button", { name: /Voir .* résultats/ });
    await applyFilters.focus();
    await applyFilters.press("Enter");
    await expect(page).toHaveURL(/categories=ATT_51bcfc1bd83261cd/);
    return;
  }

  await page.getByRole("combobox", { name: "Type de résultats" }).click();
  await page.getByRole("option", { name: "Albums", exact: true }).click();
  await expect(page).toHaveURL(/view=albums/);
  await expect(page.locator('main a[href^="/albums/"] h2').first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("combobox", { name: "Trier les résultats" }).click();
  await page.getByRole("option", { name: "Plus récents" }).click();
  await expect(page).toHaveURL(/sort=recent/);
});

test("les filtres tri-état rendent inclusions et exclusions visibles", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name === "mobile", "Le panneau mobile est couvert dans le parcours précédent.");
  await page.goto("/search?q=piano&view=tracks&type=main");
  await page.locator("aside").locator("summary").filter({ hasText: "Instruments" }).click();
  const includePiano = page.getByRole("button", { name: "Inclure Piano" }).first();
  await expect(includePiano).toBeVisible({ timeout: 30_000 });
  await includePiano.click();
  await expect(page).toHaveURL(/categories=ATT_51bcfc1bd83261cd/);
  await expect(page.getByText(/1 inclus · 0 exclus/)).toBeVisible();
  await page.locator("aside").locator("summary").filter({ hasText: "Genre" }).click();
  const excludeAmbient = page.getByRole("button", { name: "Exclure Ambient" }).first();
  await excludeAmbient.click();
  await expect(page).toHaveURL(/categories=.*-ATT_df36fdca961e0855/);
  await expect(page.getByText(/1 inclus · 1 exclus/)).toBeVisible();
});

test("une piste expose ses informations, versions et paroles", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le panneau détaillé est vérifié en desktop.");
  await page.goto("/search?q=Piano%20On%20My%20Mind&view=tracks&type=main");
  await expect(page.getByText("Piano On My Mind", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  const informationButton = page.getByRole("button", { name: /Informations sur la piste : Piano On My Mind/ });
  if (!(await informationButton.isVisible())) {
    await page.getByRole("button", { name: /Plus d’actions : Piano On My Mind/ }).click();
  }
  await informationButton.click();
  const detailTabs = page.getByRole("tablist").filter({ has: page.getByRole("tab", { name: "Informations" }) });
  await expect(detailTabs.getByRole("tab", { name: "Informations" })).toBeVisible();
  await expect(detailTabs.getByText(/^(01|02|03|04)$/)).toHaveCount(0);
  await page.getByRole("tab", { name: "Versions" }).click();
  const versionsPanel = page.getByRole("tabpanel");
  await expect(versionsPanel).toBeVisible();
  await expect.poll(async () =>
    await versionsPanel.locator(".track-detail-version").count()
      + await versionsPanel.getByText("Aucune version alternative disponible.").count(),
  ).toBeGreaterThan(0);
  await page.getByRole("tab", { name: "Paroles" }).click();
  await expect(page.getByText("Paroles non disponibles.")).toBeVisible();
});

test("la modale de compte bascule entre connexion et inscription complète", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  }
  await page.getByRole("button", { name: "Ouvrir la connexion" }).click();
  const dialog = page.locator('[role="dialog"][aria-labelledby^="auth-"]');
  const backdrop = page.getByTestId("auth-modal-backdrop");
  await expect(backdrop).toHaveCSS("background-color", "rgb(7, 9, 7)");
  await expect(backdrop).toHaveCSS("backdrop-filter", "none");
  const switcher = dialog.getByTestId("auth-switcher");
  await expect(switcher).toHaveAttribute("data-auth-view", "login");
  await expect(dialog.getByRole("heading", { name: "Se connecter" })).toBeVisible();
  const registerSwitch = dialog.getByRole("button", { name: "Afficher le formulaire d’inscription" });
  if (testInfo.project.name !== "mobile") {
    await registerSwitch.hover();
    await expect(registerSwitch).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(registerSwitch).toHaveCSS("color", "rgb(16, 17, 14)");
  }
  await registerSwitch.click();
  await expect(switcher).toHaveAttribute("data-auth-view", "register");
  await expect(dialog.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
  const loginSwitch = dialog.getByRole("button", { name: "Afficher le formulaire de connexion" });
  if (testInfo.project.name !== "mobile") {
    await loginSwitch.hover();
    await expect(loginSwitch).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(loginSwitch).toHaveCSS("color", "rgb(16, 17, 14)");
  }
  await expect(dialog.getByLabel("Prénom *")).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Profil professionnel" })).toBeVisible();
  await expect(dialog.getByText("1/2")).toHaveCount(0);
  if (testInfo.project.name === "mobile") {
    const switcherBox = await switcher.boundingBox();
    expect(switcherBox).not.toBeNull();
    await page.mouse.move(switcherBox!.x + switcherBox!.width / 2, switcherBox!.y + 120);
    await page.mouse.wheel(0, 700);
    await expect.poll(() => switcher.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    await switcher.evaluate((node) => node.scrollTo({ top: node.scrollHeight, behavior: "instant" }));
    await expect(dialog.locator("#auth-register-panel button[type=submit]")).toBeInViewport();
  }
  await page.keyboard.press("Escape");
  expect(await backdrop.count()).toBe(1);
  await expect(dialog).toHaveCount(0);
  await expect(backdrop).toHaveCount(0);
  if (testInfo.project.name === "mobile") {
    await expect(page.getByRole("dialog", { name: "Menu principal" })).toBeVisible();
  }
});

test("le reset n’annonce pas un e-mail quand la route Harvest manque", async ({ page }, testInfo) => {
  await page.route("**/api/auth/forgot-password", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { accepted: true, deliveryConfigured: false } }),
  }));
  await page.goto("/forgot-password");
  const artwork = page.getByTestId("password-recovery-artwork");
  await expect(artwork).toHaveAttribute("data-photo-id", "R11V1");
  await expect(artwork.locator("p")).toHaveCount(0);
  await expect(page.getByTestId("password-recovery-card")).not.toContainText("Récupération du compte");
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(await page.evaluate(() => document.documentElement.clientHeight));
  await page.getByLabel("Adresse e-mail du compte").fill("member@example.invalid");
  await page.getByRole("button", { name: "Recevoir mon lien sécurisé" }).click();

  await expect(page.getByText("La réinitialisation par e-mail n’est pas encore configurée. Contactez Parigo pour récupérer votre accès.")).toBeVisible();
  await expect(page.getByText(/Parigo vient d’envoyer un lien/)).toHaveCount(0);
});

test("Forgot Password confirme l’envoi sans révéler l’existence du compte", async ({ page }) => {
  await page.route("**/api/auth/forgot-password", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { accepted: true, deliveryConfigured: true } }),
  }));
  await page.goto("/forgot-password");
  await page.getByLabel("Adresse e-mail du compte").fill("member@example.invalid");
  await page.getByRole("button", { name: "Recevoir mon lien sécurisé" }).click();

  await expect(page.getByRole("heading", { level: 2, name: "Consultez votre boîte mail" })).toBeVisible();
  await expect(page.getByText("Si un compte correspond à cette adresse", { exact: false })).toBeVisible();
  await expect(page.getByText("member@example.invalid")).toHaveCount(0);
});

test("Reset Password distingue le lien expiré puis confirme le nouvel accès", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page.getByTestId("password-recovery-artwork").locator("p")).toHaveCount(0);
  await expect(page.getByTestId("password-recovery-card")).not.toContainText("Lien de réinitialisation");
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(await page.evaluate(() => document.documentElement.clientHeight));
  await expect(page.getByRole("heading", { level: 2, name: "Ce lien n’est plus valide" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Demander un nouveau lien" })).toHaveAttribute("href", "/forgot-password");

  await page.route("**/api/auth/reset-password**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { valid: true } }),
  }));
  await page.goto("/reset-password?token=fresh-reset-token");
  await page.getByLabel("Nouveau mot de passe *").fill(formFixtureValue);
  await page.getByLabel("Confirmer le mot de passe *").fill(formFixtureValue);
  await page.getByRole("button", { name: "Sécuriser mon accès" }).click();

  await expect(page.getByRole("heading", { level: 2, name: "Votre accès est sécurisé" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/login");
});

test("les anciens liens FLEX change-password restent compatibles", async ({ page }) => {
  await page.route("**/api/auth/reset-password?token=legacy-reset-token", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { valid: true } }),
  }));

  await page.goto("/change-password/legacy-reset-token");

  await expect(page).toHaveURL(/\/change-password\/legacy-reset-token$/);
  const artwork = page.getByTestId("password-recovery-artwork");
  await expect(artwork).toHaveAttribute("data-photo-id", "R13V2");
  await expect(artwork.locator("p")).toHaveCount(0);
  await expect(page.getByTestId("password-recovery-card")).not.toContainText("Sécurité du compte");
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(await page.evaluate(() => document.documentElement.clientHeight));
  await expect(page.getByRole("heading", { level: 1, name: "Changer votre mot de passe" })).toBeVisible();
  await expect(page.getByPlaceholder("Saisissez-le à nouveau")).toBeVisible();
  const password = page.getByLabel("Nouveau mot de passe *");
  await password.fill(mediumFormFixture);
  await expect(page.getByRole("meter", { name: "Force du mot de passe" })).toHaveAttribute("aria-valuenow", "2");
  await expect(page.getByText("Moyen", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
});

test("le faux parcours change-password demo n’existe plus", async ({ page }) => {
  const response = await page.goto("/change-password/demo");
  expect(response?.status()).toBe(404);
  await expect(page.getByTestId("password-recovery-card")).toHaveCount(0);
});

test("l’inscription Parigo expose le profil complet sans scroll de page", async ({ page }) => {
  await page.goto("/register");
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(await page.evaluate(() => document.documentElement.clientHeight));
  await expect(page.locator("footer")).toHaveCount(0);
  await page.getByLabel("Prénom *").fill("Test");
  await page.getByLabel("Nom *", { exact: true }).fill("Parigo");
  await page.getByLabel(/E-mail.*utilisé comme identifiant/i).fill("test@example.invalid");
  const password = page.getByLabel("Mot de passe *", { exact: true });
  const strength = page.getByRole("meter", { name: "Force du mot de passe" });
  await password.fill("test");
  await expect(strength).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByText("Faible", { exact: true })).toBeVisible();
  await password.fill(mediumFormFixture);
  await expect(strength).toHaveAttribute("aria-valuenow", "2");
  await expect(page.getByText("Moyen", { exact: true })).toBeVisible();
  await password.fill(formFixtureValue);
  await expect(strength).toHaveAttribute("aria-valuenow", "3");
  await expect(page.getByText("Fort", { exact: true })).toBeVisible();
  await page.getByLabel("Confirmer le mot de passe *").fill(formFixtureValue);
  await expect(page.getByText("Les mots de passe correspondent.")).toBeVisible();
  await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Masquer le mot de passe", exact: true }).click();
  await expect(page.getByLabel("Pays *")).toBeVisible();
  await expect(page.getByLabel("Société")).toBeVisible();
  await expect(page.getByLabel("Format de téléchargement préféré")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel(/Recevoir la newsletter/i)).toBeVisible();
  await expect(page.getByLabel(/conditions d’utilisation/i)).not.toBeChecked();
  await expect(page.getByLabel(/politique de confidentialité/i)).not.toBeChecked();
  await expect(page.getByText(/^[12]\/2$/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Continuer|Retour/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Créer un compte", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Veuillez cocher les deux cases obligatoires" })).toBeVisible();
});
