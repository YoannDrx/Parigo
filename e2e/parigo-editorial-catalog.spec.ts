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

test("le catalogue général s’intitule Albums et la home relie le Label Parigo", async ({ page }) => {
  await page.goto("/albums");
  await expect(page.getByRole("heading", { level: 1, name: "Albums", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Nos albums", exact: true })).toHaveCount(0);

  await page.goto("/");
  await page.getByRole("tab", { name: "Label Parigo" }).click();
  const section = page.locator("section").filter({ has: page.getByRole("tab", { name: "Label Parigo" }) });
  await expect(section.getByRole("link", { name: "Tout voir" })).toHaveAttribute("href", "/label-parigo");
});

test("le Label Parigo impose le label et conserve les fonctions du catalogue", async ({ page }) => {
  await page.goto("/label-parigo");
  await expect(page.getByRole("heading", { level: 1, name: "Label Parigo" })).toBeVisible();
  await expect(page.getByPlaceholder("Rechercher dans le label Parigo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Vue liste" })).toBeVisible();
  await expect(page.getByText("Label", { exact: true })).toHaveCount(0);
  const cardLabels = await page.locator("main a[href^='/albums/'] p").allTextContents();
  expect(cardLabels.filter(Boolean).every((value) => value === "Parigo")).toBe(true);
});

test("les anciennes routes Sorties Parigo redirigent définitivement", async ({ page }) => {
  await page.goto("/sorties-parigo");
  await expect(page).toHaveURL(/\/label-parigo$/);
  await page.goto("/en/sorties-parigo");
  await expect(page).toHaveURL(/\/en\/label-parigo$/);
});

test("un ancien slug Harvest redirige vers le profil public stable et ses albums Harvest", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/compositeurs/harvest-ugly-mac-beer-1u58k7l");
  await expect(page).toHaveURL(/\/compositeurs\/ugly-mac-beer$/);
  await expect(page.getByRole("heading", { level: 1, name: "Ugly Mac Beer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Albums Parigo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Clips" })).toHaveCount(0);
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

test("l’annuaire publie exactement les 45 profils canoniques", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/compositeurs");
  const directory = page.getByTestId("composer-directory-results");
  await expect(directory.locator("a")).toHaveCount(45);
  const minimatic = directory.locator('a[href="/compositeurs/minimatic"]');
  await expect(minimatic).toHaveCount(1);
  await minimatic.click();
  await expect(page).toHaveURL(/\/compositeurs\/minimatic$/);
  await expect(page.getByRole("heading", { level: 1, name: "Minimatic" })).toBeVisible();
  await expect(page.getByText(/Crédits Harvest associés/)).toBeVisible();
});

test("une bio réellement absente ne génère aucun bloc de remplacement", async ({ page }) => {
  await page.goto("/compositeurs/xavier-sibre");
  await expect(page.getByRole("heading", { level: 1, name: "Xavier Sibre" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Biographie" })).toHaveCount(0);
});

test("les clips YouTube n’infèrent aucun crédit musical local", async ({ page }) => {
  await page.goto("/clips/yt-jfTecY6qM2Q");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByText(/nécessite votre autorisation/)).toBeVisible();
  await page.evaluate((value) => {
    window.localStorage.setItem("parigo-cookie-consent", value);
    window.dispatchEvent(new Event("parigo:cookie-consent-change"));
  }, consent(true));
  await expect(page.locator('iframe[src*="youtube-nocookie.com"]')).toHaveCount(0);
  await page.getByRole("button", { name: /^Lire / }).click();
  await expect(page.getByTestId("persistent-clip-iframe")).toBeVisible();
  await expect(page.getByText("Aucun crédit compositeur n’est déduit localement.")).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Ugly Mac Beer", exact: true })).toHaveCount(0);
});

test("les slugs éditoriaux inconnus sont de vraies 404", async ({ request }) => {
  expect((await request.get("/compositeurs/profil-inconnu")).status()).toBe(404);
  expect((await request.get("/clips/clip-inconnu")).status()).toBe(404);
});

test("les pages anglaises exposent canoniques et hreflang", async ({ page }) => {
  await page.goto("/en/compositeurs");
  await expect(page.getByRole("heading", { level: 1, name: "Composers" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/compositeurs$/);
  await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute("href", /\/compositeurs$/);

  await page.goto("/en/label-parigo");
  await expect(page.getByRole("heading", { level: 1, name: "Parigo Label" })).toBeVisible();
});
