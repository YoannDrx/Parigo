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
  await page.goto("/compositeurs");

  const cards = page.getByTestId("composer-directory-results").getByRole("link");
  await expect(cards.nth(12)).toBeVisible({ timeout: 30_000 });
  const selectedCard = cards.nth(12);
  const selectedHref = await selectedCard.getAttribute("href");

  await selectedCard.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  const listScrollY = await page.evaluate(() => window.scrollY);
  expect(listScrollY).toBeGreaterThan(500);

  await selectedCard.click();
  await expect(page).toHaveURL(new RegExp(`${selectedHref?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  await page.getByRole("link", { name: /Tous les compositeurs|All composers/ }).click();

  await expect(page).toHaveURL(/\/compositeurs$/);
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
