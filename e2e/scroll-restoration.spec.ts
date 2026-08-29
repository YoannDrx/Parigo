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

test("le retour d’une fiche restaure la position de sa liste", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/talents");

  const cards = page.getByTestId("composer-directory-results").getByRole("link");
  await expect(cards.nth(12)).toBeVisible({ timeout: 30_000 });
  const selectedCard = cards.nth(12);
  const selectedHref = await selectedCard.getAttribute("href");

  await selectedCard.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  const listScrollY = await page.evaluate(() => window.scrollY);
  expect(listScrollY).toBeGreaterThan(500);

  await selectedCard.click();
  await expect(page).toHaveURL(new RegExp(`${selectedHref?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await page.getByRole("link", { name: /Retour|Back/ }).click();

  await expect(page).toHaveURL(/\/talents$/);
  const restoredCard = page.locator(`a[href="${selectedHref}"]`);
  await expect(restoredCard).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  const restoredBox = await restoredCard.boundingBox();
  const viewport = page.viewportSize();
  expect(restoredBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(restoredBox!.y).toBeGreaterThanOrEqual(0);
  expect(restoredBox!.y).toBeLessThan(viewport!.height);
});

test("le retour d’un album conserve le contexte compositeur", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/talents");
  await page.locator('a[href="/talents/ugly-mac-beer"]').click();
  await expect(page).toHaveURL(/\/talents\/ugly-mac-beer$/);
  const album = page.getByRole("link").filter({ hasText: "Dark Beats" }).first();
  await expect(album).toBeVisible({ timeout: 30_000 });
  await album.click();
  await expect(page).toHaveURL(/\/albums\//);
  await page.getByRole("link", { name: /Retour|Back/ }).first().click();
  await expect(page).toHaveURL(/\/talents\/ugly-mac-beer$/);
});

test("le retour d’un album conserve le contexte Notre label", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/notre-label");
  const album = page.locator('main a[href^="/albums/"]').first();
  await expect(album).toBeVisible({ timeout: 30_000 });
  await album.click();
  await expect(page).toHaveURL(/\/albums\//);
  await page.getByRole("link", { name: /Retour|Back/ }).first().click();
  await expect(page).toHaveURL(/\/notre-label$/);
});

test("le drawer restaure la position exacte de l’accueil au retour de Talents", async ({ page }) => {
  await page.goto("/");
  await page.locator("#process").scrollIntoViewIfNeeded();
  const expectedScrollY = await page.evaluate(() => window.scrollY);
  expect(expectedScrollY).toBeGreaterThan(500);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollBy({ top: -500, behavior: "instant" }));
  const restoredOrigin = await page.evaluate(() => window.scrollY);
  await expect(page.locator("header[data-variant]")).toHaveAttribute("data-header-visible", "true");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.getByRole("dialog", { name: "Menu principal" }).getByRole("link", { name: "Talents", exact: true }).click();
  await expect(page).toHaveURL(/\/talents$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - restoredOrigin)).toBeLessThanOrEqual(16);
});

test("le retour Contact restaure immédiatement le bloc brief de l’accueil", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Ce scénario cible le retour tactile signalé sur la Home.");
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Envoyer un brief" });
  await cta.scrollIntoViewIfNeeded();
  const origin = await page.evaluate(() => window.scrollY);
  expect(origin).toBeGreaterThan(500);

  await cta.click();
  await expect(page).toHaveURL(/\/contact\?subject=brief$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - origin)).toBeLessThanOrEqual(16);
  const restored = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(1_100);
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - restored)).toBeLessThanOrEqual(16);
  await expect(cta).toBeInViewport();
});

test("le logo du header remonte l’accueil déjà actif", async ({ page }) => {
  await page.goto("/");
  await page.locator("#process").scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollBy({ top: -500, behavior: "instant" }));
  await expect(page.locator("header[data-variant]")).toHaveAttribute("data-header-visible", "true");
  await page.getByRole("link", { name: "Parigo — Accueil" }).first().click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2);
  await expect(page).toHaveURL(/\/$/);
});
