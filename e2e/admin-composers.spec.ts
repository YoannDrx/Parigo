import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      updatedAt: "2026-08-03T00:00:00.000Z",
    }));
  });
});

test("le dashboard compositeurs expose les crédits Harvest et leurs liens", async ({ page, request }) => {
  test.setTimeout(120_000);
  const response = await request.get("/admin/compositeurs");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toContain("noindex");

  await page.goto("/admin/compositeurs");
  await expect(page.getByTestId("composer-audit-dashboard")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /Audit des compositeurs/ })).toBeVisible();
  await expect(page.getByText("Diagnostic Harvest en lecture seule")).toBeVisible();

  const firstCredit = page.getByTestId("composer-audit-credit").first();
  await expect(firstCredit).toBeVisible();
  await firstCredit.locator("summary").click();
  await expect(firstCredit.locator('a[href^="/compositeurs/"]')).toBeVisible();
  await expect(firstCredit.locator('a[href^="/albums/"]').first()).toBeVisible();
  await expect(firstCredit.locator('a[href*="?track="]').first()).toBeVisible();
});

test("les métriques ouvrent la file des écarts de crédits", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/compositeurs");
  await page.getByRole("button", { name: /Écarts Composer \/ ayants droit/ }).click();
  await expect(page.getByRole("heading", { name: /pistes? à contrôler/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Composer public manquant" })).toBeVisible();
});

test("la documentation explique les vues, la recherche et les filtres", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/compositeurs");

  const guide = page.getByTestId("composer-audit-help");
  await guide.locator("summary").click();
  await expect(guide.getByRole("heading", { name: "Crédits compositeurs" })).toBeVisible();
  await expect(guide.getByRole("heading", { name: "Écarts Composer / ayants droit" })).toBeVisible();
  await expect(guide.getByRole("heading", { name: "Recherche" })).toBeVisible();
  await expect(guide.getByRole("heading", { name: "Filtres de noms" })).toBeVisible();

  const searchHelp = page.getByRole("button", { name: /Aide : Recherche dans les noms/ });
  await searchHelp.focus();
  await expect(page.getByRole("tooltip")).toContainText(/Recherche dans les noms/i);

  const societyFilter = page.getByRole("button", { name: /NS \/ SACEM/ });
  await societyFilter.focus();
  await expect(page.getByRole("tooltip")).toContainText(/société comme NS ou SACEM/i);
});
