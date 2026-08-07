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

test("le retour d’un album conserve le contexte Label Parigo", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/label-parigo");
  const album = page.locator('main a[href^="/albums/"]').first();
  await expect(album).toBeVisible({ timeout: 30_000 });
  await album.click();
  await expect(page).toHaveURL(/\/albums\//);
  await page.getByRole("link", { name: /Retour|Back/ }).first().click();
  await expect(page).toHaveURL(/\/label-parigo$/);
});
