import { expect, test, type Page } from "@playwright/test";

const consent = (marketing: boolean) => JSON.stringify({
  necessary: true,
  preferences: false,
  analytics: false,
  marketing,
  updatedAt: "2026-07-25T00:00:00.000Z",
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript((value) => {
    window.localStorage.setItem("parigo-cookie-consent", value);
  }, consent(false));
});

async function colourChannels(locator: ReturnType<Page["getByRole"]>) {
  return locator.evaluate((node) => {
    const parse = (value: string) => value.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number) ?? [];
    const style = getComputedStyle(node);
    return { foreground: parse(style.color), background: parse(style.backgroundColor) };
  });
}

function luminance([red, green, blue]: number[]) {
  const channels = [red, green, blue].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: number[], background: number[]) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("le CTA Licensing reste lisible dans ses états et les deux thèmes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le survol est vérifié avec un pointeur desktop.");
  await page.goto("/licensing");
  const cta = page.getByRole("link", { name: "Demander une estimation" });

  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
      document.documentElement.style.colorScheme = value;
    }, theme);
    await page.waitForTimeout(350);
    const normal = await colourChannels(cta);
    expect(contrast(normal.foreground, normal.background)).toBeGreaterThanOrEqual(4.5);
    await cta.hover();
    const hovered = await colourChannels(cta);
    expect(contrast(hovered.foreground, hovered.background)).toBeGreaterThanOrEqual(4.5);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(350);
  }
});

test("le catalogue général s’intitule Albums et la home relie Notre label", async ({ page }) => {
  await page.goto("/albums");
  await expect(page.getByRole("heading", { level: 1, name: "Albums", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Nos albums", exact: true })).toHaveCount(0);

  await page.goto("/");
  await page.getByRole("tab", { name: "Notre label" }).click();
  const section = page.locator("section").filter({ has: page.getByRole("tab", { name: "Notre label" }) });
  await expect(section.getByRole("link", { name: "Tout voir" })).toHaveAttribute("href", "/notre-label");
});

test("Notre label impose le label et conserve les fonctions du catalogue", async ({ page }) => {
  await page.goto("/notre-label");
  await expect(page.getByRole("heading", { level: 1, name: "Notre label" })).toBeVisible();
  await expect(page.getByPlaceholder("Rechercher dans notre label")).toBeVisible();
  await expect(page.getByRole("button", { name: "Vue liste" })).toBeVisible();
  await expect(page.getByText("Label", { exact: true })).toHaveCount(0);
  const cardLabels = await page.locator("main a[href^='/albums/'] p").allTextContents();
  expect(cardLabels.filter(Boolean).every((value) => value === "Parigo")).toBe(true);
});

test("les anciennes routes Label Parigo et Sorties Parigo n’existent plus", async ({ page }) => {
  for (const path of ["/label-parigo", "/en/label-parigo", "/sorties-parigo", "/en/sorties-parigo"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test("les anciennes routes Compositeurs redirigent vers Talents", async ({ page }) => {
  await page.goto("/compositeurs");
  await expect(page).toHaveURL(/\/talents$/);
  await expect(page.getByRole("heading", { level: 1, name: "Nos talents" })).toBeVisible();

  await page.goto("/en/compositeurs/ugly-mac-beer");
  await expect(page).toHaveURL(/\/en\/talents\/ugly-mac-beer$/);
});

test("un ancien slug Harvest redirige vers le profil public stable et ses albums Harvest", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/talents/harvest-ugly-mac-beer-1u58k7l");
  await expect(page).toHaveURL(/\/talents\/ugly-mac-beer$/);
  await expect(page.getByRole("heading", { level: 1, name: "Ugly Mac Beer" })).toBeVisible();
  await expect(page.getByTestId("composer-detail-image")).toHaveAttribute("src", /\/images\/composers\/detail\/ugly_mac_beer/);
  await expect(page.getByRole("heading", { name: "Albums Parigo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Clips" })).toBeVisible();
  const album = page.getByRole("link").filter({ hasText: "Dark Beats" }).first();
  await expect(album).toBeVisible();
  await album.click();
  await expect(page.getByRole("link", { name: "Ugly Mac Beer", exact: true }).first()).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: /^Plus d’actions :/ }).first().click();
  }
  await page.getByRole("button", { name: /^Informations sur la piste/ }).first().click();
  await expect(page.locator(".track-detail-panel").getByRole("link", { name: "Ugly Mac Beer" })).toBeVisible();
});

test("l’annuaire publie exactement les 63 profils canoniques", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/talents");
  await expect(page.getByRole("heading", { level: 1, name: "Nos talents" })).toBeVisible();
  const directory = page.getByTestId("composer-directory-results");
  await expect(directory.locator("a")).toHaveCount(63);
  await expect(directory.locator('a[href="/talents/pierre-millet"]')).toHaveCount(0);
  await expect(directory.locator('a[href="/talents/mutant-ninja"]')).toHaveCount(0);
  await expect(directory.getByText("Schérazade", { exact: true })).toBeVisible();
  await expect(directory.getByText("Schérazade Aissahine", { exact: true })).toHaveCount(0);
  await expect(directory.locator('a[href="/talents/nicolas-pisani"]')).toHaveCount(1);
  await expect(directory.locator('a[href="/talents/tcheep"]')).toHaveCount(1);
  await expect(directory.locator('a[href="/talents/blanka"]')).toHaveCount(1);
  await expect(directory.locator('a[href="/talents/chicho-cortez"]')).toHaveCount(1);
  await expect(directory.locator('a[href="/talents/gerz"]')).toHaveCount(1);
  await expect(directory.locator('a[href="/talents/yann-lean"]')).toHaveCount(1);
  await expect(directory.locator('a[href="/talents/nsdos"]')).toHaveCount(1);
  await expect(directory.locator('a[href="/talents/kokane"]')).toHaveCount(1);
  const minimatic = directory.locator('a[href="/talents/minimatic"]');
  await expect(minimatic).toHaveCount(1);
  await minimatic.click();
  await expect(page).toHaveURL(/\/talents\/minimatic$/);
  await expect(page.getByRole("heading", { level: 1, name: "Minimatic" })).toBeVisible();
  await expect(page.getByText(/Crédits Harvest associés/)).toHaveCount(0);
});

test("Kokane publie son portrait, ses biographies et sa discographie Parigo", async ({ page }) => {
  await page.goto("/talents/kokane");
  await expect(page.getByRole("heading", { level: 1, name: "Kokane" })).toBeVisible();
  await expect(page.getByTestId("composer-detail-image")).toHaveAttribute("src", /\/images\/composers\/detail\/kokane/);
  await expect(page.getByTestId("composer-biography")).toContainText(
    "Kokane, de son vrai nom Jerry B. Long Jr., est un rappeur, chanteur, auteur et producteur américain",
  );
  await expect(page.getByRole("link").filter({ hasText: "Diggin Hip-Hop Vol.2" }).first()).toBeVisible();

  await page.goto("/en/talents/kokane");
  await expect(page.getByTestId("composer-biography")).toContainText(
    "Kokane, real name Jerry B. Long Jr., is an American rapper, singer, songwriter and producer",
  );
});

test("les nouveaux profils publient leurs noms de scène et le contenu disponible", async ({ page }) => {
  await page.goto("/talents/forever-pavot");
  await expect(page.getByRole("heading", { level: 1, name: "Forever Pavot" })).toBeVisible();
  await expect(page.locator('img[src*="forever_pavot"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Biographie" })).toHaveCount(0);
  await expect(page.getByTestId("composer-biography")).toHaveClass(/w-full/);

  await page.goto("/en/talents/frederic-hanak");
  await expect(page.getByRole("heading", { level: 1, name: "Frédéric Hanak" })).toBeVisible();
  await expect(page.getByText(/widely regarded as one of the leading figures/)).toBeVisible();

  await page.goto("/talents/the-real-fake-mc");
  await expect(page.getByRole("heading", { level: 1, name: "The Real Fake MC" })).toBeVisible();
  await expect(page.locator('img[src*="the_real_fake_mc"]')).toBeVisible();
  await expect(page.getByText(/de son vrai nom Clyde Kingrap/)).toBeVisible();

  await page.goto("/talents/stan-galouo");
  await expect(page.getByRole("heading", { level: 1, name: "Stan Galouo" })).toBeVisible();
  await expect(page.getByTestId("composer-detail-image")).toHaveAttribute("src", /\/images\/composers\/detail\/stan_galouo/);

  await page.goto("/talents/patrice-dambrine");
  await expect(page.getByRole("heading", { level: 1, name: "Patrice Dambrine" })).toBeVisible();
  const patriceImage = page.getByTestId("composer-detail-image");
  await expect(patriceImage).toHaveAttribute("src", /\/images\/composers\/detail\/patrice_dambrine/);
  const patriceRatios = await patriceImage.evaluate((image: HTMLImageElement) => ({
    rendered: image.getBoundingClientRect().width / image.getBoundingClientRect().height,
    objectFit: getComputedStyle(image).objectFit,
  }));
  expect(Math.abs(1 - patriceRatios.rendered)).toBeLessThan(0.02);
  expect(patriceRatios.objectFit).toBe("cover");
  await expect(page.getByText(/Patrice Dambrine est un musicien, compositeur et producteur français/)).toBeVisible();
});

test("Offset Prod publie sa biographie, son portrait et son album Harvest", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/talents/nicolas-pisani");
  await expect(page.getByRole("heading", { level: 1, name: "Offset Prod" })).toBeVisible();
  await expect(page.getByTestId("composer-detail-image")).toHaveAttribute(
    "src",
    /\/images\/composers\/detail\/nicolas_pisani/,
  );
  await expect(page.getByTestId("composer-biography")).toContainText(
    "OFFSET PROD, de son vrai nom Nicolas Pisani, est un compositeur, producteur, ingénieur du son et sound designer français",
  );
  await expect(page.getByRole("link").filter({ hasText: "Brand Content" }).first()).toBeVisible();
});

test("Yann Lean publie sa photo et ses biographies française et anglaise", async ({ page }) => {
  await page.goto("/talents/yann-lean");
  await expect(page.getByRole("heading", { level: 1, name: "Yann Lean" })).toBeVisible();
  await expect(page.getByTestId("composer-detail-image")).toHaveAttribute("src", /\/images\/composers\/detail\/yann_lean/);
  await expect(page.getByTestId("composer-biography")).toContainText(
    "Yann Lean, de son vrai nom Yannick Le Léannec, est un DJ, compositeur, sound designer et ingénieur du son français",
  );

  await page.goto("/en/talents/yann-lean");
  await expect(page.getByTestId("composer-biography")).toContainText(
    "Yann Lean, real name Yannick Le Léannec, is a French DJ, composer, sound designer and sound engineer",
  );
});

test("Synthwave Retrowave crédite Schérazade comme auteur de ses chansons", async ({ page }, testInfo) => {
  await page.goto("/albums/48b4b95fe1f09019");
  const song = page.locator('[data-track-id="23b92c9b02375642f77e44705437fccb"]');
  if (testInfo.project.name === "mobile") {
    await song.getByRole("button", { name: /^Plus d’actions :/ }).click();
  }
  await song.getByRole("button", { name: /^Informations sur la piste/ }).click();
  const details = testInfo.project.name === "mobile"
    ? page.locator(".track-detail-sheet .track-detail-panel")
    : song.locator(".track-detail-panel");
  await expect(details.getByText("Auteur", { exact: true })).toBeVisible();
  await expect(details.getByRole("link", { name: "Schérazade", exact: true })).toHaveAttribute(
    "href",
    "/talents/scherazade-aissahine",
  );
});

test("Tcheep, Blanka, Chicho Cortez, Gerz et NSDOS publient leurs portraits, bios et discographies exactes", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/talents/tcheep");
  await expect(page.getByRole("heading", { level: 1, name: "Tcheep" })).toBeVisible();
  await expect(page.getByTestId("composer-detail-image")).toHaveAttribute("src", /\/images\/composers\/detail\/tcheep/);
  await expect(page.getByTestId("composer-biography")).toContainText(
    "Tcheep est un beatmaker et producteur français",
  );
  await expect(page.getByRole("link").filter({ hasText: "Diggin Hip-Hop Vol.2" }).first()).toBeVisible();
  await expect(page.getByRole("link").filter({ hasText: "Lofi Hip Hop" }).first()).toBeVisible();

  await page.goto("/talents/chicho-cortez");
  await expect(page.getByRole("heading", { level: 1, name: "Chicho Cortez" })).toBeVisible();
  await expect(page.getByTestId("composer-detail-image")).toHaveAttribute("src", /\/images\/composers\/detail\/chicho_cortez/);
  await expect(page.getByTestId("composer-biography")).toContainText(
    "Chicho Cortez est un producteur et beatmaker français issu de la scène lyonnaise",
  );
  await expect(page.getByRole("link").filter({ hasText: "Caught In The Trap" }).first()).toBeVisible();
  await expect(page.getByRole("link").filter({ hasText: "Lofi Hip Hop" }).first()).toBeVisible();

  await page.goto("/talents/blanka");
  await expect(page.getByRole("heading", { level: 1, name: "Blanka" })).toBeVisible();
  await expect(page.getByTestId("composer-detail-image")).toHaveAttribute("src", /\/images\/composers\/detail\/blanka/);
  await expect(page.getByTestId("composer-biography")).toContainText(
    "Blanka est un beatmaker, producteur et ingénieur du son français",
  );
  await expect(page.getByTestId("composer-biography")).not.toContainText("Je préfère nettement cette version");
  await expect(page.getByRole("link").filter({ hasText: "Diggin Hip-Hop Vol.2" }).first()).toBeVisible();

  await page.goto("/talents/gerz");
  await expect(page.getByRole("heading", { level: 1, name: "Gerz Marcellino" })).toBeVisible();
  await expect(page.getByTestId("composer-detail-image")).toHaveAttribute("src", /\/images\/composers\/detail\/gerz/);
  await expect(page.getByTestId("composer-biography")).toContainText(
    "Gerz Marcellino est un DJ, producteur, turntablist et artiste visuel français",
  );
  await expect(page.getByRole("link").filter({ hasText: "Caught In The Trap" }).first()).toBeVisible();

  await page.goto("/talents/nsdos");
  await expect(page.getByRole("heading", { level: 1, name: "NSDOS" })).toBeVisible();
  await expect(page.getByTestId("composer-detail-image")).toHaveAttribute("src", /\/images\/composers\/detail\/nsdos/);
  await expect(page.getByTestId("composer-biography")).toContainText(
    "NSDOS est un artiste pluridisciplinaire français né à Paris en 1984",
  );
  await expect(page.getByRole("link").filter({ hasText: "Odyssey Suites And Remixes" }).first()).toBeVisible();
});

test("les quatre profils rematchés utilisent leurs noms, portraits et bios éditoriaux", async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.goto("/talents/aeon-seven");
  await expect(page.getByRole("heading", { level: 1, name: "Aeon Seven" })).toBeVisible();
  await expect(page.locator('img[src*="aeon_seven"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Biographie" })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("Stéphane Delplanque");
  expect((await request.get("/talents/stephane-delplanque")).status()).toBe(404);

  await page.goto("/talents/victor-baillet");
  await expect(page.getByRole("heading", { level: 1, name: "Victor Baillet" })).toBeVisible();
  await expect(page.getByText(/Mr Viktor \(Victor Baillet\) est un DJ/)).toBeVisible();

  await page.goto("/talents/vincent-bouhelier");
  await expect(page.getByRole("heading", { level: 1, name: "Vincent Bouhelier" })).toBeVisible();
  await expect(page.getByText(/Aociz est un DJ, producteur et turntablist français/)).toBeVisible();

  await page.goto("/en/talents/thierry-los");
  await expect(page.getByRole("heading", { level: 1, name: "Thierry Los" })).toBeVisible();
  await expect(page.getByText(/distinctive figure on the independent music scene/)).toBeVisible();
});

test("les fiches talent affichent les rôles au masculin", async ({ page }) => {
  await page.goto("/talents/flore");
  await expect(page.getByRole("heading", { level: 1, name: "Flore" })).toBeVisible();
  await expect(page.getByText("Compositeur", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Compositrice", { exact: true })).toHaveCount(0);
  await page.goto("/talents/charlotte-savary");
  await expect(page.getByRole("heading", { level: 1, name: "Charlotte Savary" })).toBeVisible();
  await expect(page.getByText("Compositeur", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Compositrice", { exact: true })).toHaveCount(0);
});

test("les biographies éditoriales nouvellement fournies sont publiées", async ({ page }) => {
  await page.goto("/talents/xavier-sibre");
  await expect(page.getByRole("heading", { level: 1, name: "Xavier Sibre" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Xavier Sibre" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Biographie" })).toHaveCount(0);
  await expect(page.getByText(/multi-instrumentiste, compositeur et arrangeur français/)).toBeVisible();
});

test("After In Paris publie les cinq albums attestés par Harvest", async ({ page }) => {
  await page.goto("/talents/after-in-paris");
  const albums = page.locator("section").filter({ has: page.getByRole("heading", { name: "Albums Parigo" }) });
  await expect(albums.locator('a[href^="/albums/"]')).toHaveCount(5);
  for (const title of ["Paris Postcards", "A French Romance", "The Projectionist", "Solo Piano", "Solo Piano Vol.2"]) {
    await expect(albums.getByText(title, { exact: true })).toBeVisible();
  }
  const releases = await albums.locator("[data-album-card][data-release-date]").evaluateAll((cards) => (
    cards.map((card) => card.getAttribute("data-release-date")!)
  ));
  expect(releases.length).toBeGreaterThan(1);
  expect(releases).toEqual([...releases].sort((left, right) => Date.parse(right) - Date.parse(left)));
});

test("le détail clip masque les descriptions, conserve YouTube et contient son titre", async ({ page }) => {
  await page.goto("/clips/yt-6JYSP7NekGo");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByText(/nécessite votre autorisation/)).toBeVisible();
  await page.evaluate((value) => {
    window.localStorage.setItem("parigo-cookie-consent", value);
    window.dispatchEvent(new Event("parigo:cookie-consent-change"));
  }, consent(true));
  await expect(page.locator('iframe[src*="youtube-nocookie.com"]')).toHaveCount(0);
  await page.getByRole("button", { name: /^Lire / }).click();
  await expect(page.getByTestId("persistent-clip-iframe")).toBeVisible();
  const panel = page.getByTestId("clip-detail-panel");
  const title = page.getByTestId("clip-detail-title");
  await expect(title).toBeVisible();
  await expect(panel.locator("p")).toHaveCount(0);
  await expect(panel.getByRole("link", { name: "YouTube" })).toHaveAttribute(
    "href",
    "https://www.youtube.com/watch?v=6JYSP7NekGo",
  );
  expect(await panel.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await title.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
});

test("les relations manuelles publient les clips sur chaque profil compositeur concerné", async ({ page }) => {
  await page.goto("/talents/charlotte-savary");
  const clips = page.getByTestId("composer-clips-section");
  await expect(clips.getByRole("heading", { level: 2, name: "Clips" })).toBeVisible();
  await expect(clips.locator('a[href="/clips/yt-NDDGIB9_0qo"]')).not.toHaveCount(0);
  await expect(clips.locator('a[href="/clips/yt-6JYSP7NekGo"]')).not.toHaveCount(0);

  await page.goto("/talents/aiwa");
  await expect(page.getByTestId("composer-clips-section")).toHaveCount(0);
});

test("les relations clip sont réciproques et peuvent publier plusieurs talents", async ({ page }) => {
  await page.goto("/clips/yt-wrO96WV69aY");
  const minimaticRelations = page.getByTestId("clip-talents-section");
  await expect(minimaticRelations.getByRole("link", { name: /Minimatic/ })).toHaveAttribute("href", "/talents/minimatic");
  await expect(page.getByTestId("clip-album-section")).toContainText("PGO0050");

  await page.goto("/clips/yt-lsXj6hGHM-Q");
  const lofiRelations = page.getByTestId("clip-talents-section");
  for (const talent of ["Bonetrips", "Tcheep", "Chicho Cortez"]) {
    await expect(lofiRelations.getByRole("link", { name: new RegExp(talent) })).toBeVisible();
  }
  await expect(page.getByTestId("clip-album-section")).toContainText("PGO0051");
});

test("les slugs éditoriaux inconnus sont de vraies 404", async ({ request }) => {
  expect((await request.get("/talents/profil-inconnu")).status()).toBe(404);
  expect((await request.get("/clips/clip-inconnu")).status()).toBe(404);
});

test("les pages anglaises exposent canoniques et hreflang", async ({ page }) => {
  await page.goto("/en/talents");
  await expect(page.getByRole("heading", { level: 1, name: "Our talent" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/talents$/);
  await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute("href", /\/talents$/);

  await page.goto("/en/notre-label");
  await expect(page.getByRole("heading", { level: 1, name: "Our label" })).toBeVisible();
});
