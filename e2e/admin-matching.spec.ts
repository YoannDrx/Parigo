import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      updatedAt: "2026-07-30T00:00:00.000Z",
    }));
  });
});

test("le dashboard est public par URL mais exclu des moteurs", async ({ page, request }) => {
  test.setTimeout(120_000);
  const response = await request.get("/admin/matching");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toContain("noindex");

  await page.goto("/admin/matching");
  await expect(page.getByTestId("matching-dashboard")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /Contrôle des relations/ })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByText("Outil interne accessible par URL, sans authentification")).toBeVisible();
  await expect(page.getByText(/L’API Harvest décrit le catalogue actuel/)).toBeVisible();
});

test("les inventaires Portfolio et Sheet restent exhaustifs", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/matching");

  await page.getByRole("button", { name: "Compositeurs", exact: true }).click();
  await expect(page.getByTestId("matching-composer-rows").locator("tr")).toHaveCount(69);
  await expect(page.getByRole("columnheader", { name: "Présence API Harvest ?" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Non détectés dans Harvest/ })).toBeVisible();

  await page.getByText("Sources & diagnostic").click();
  await page.getByRole("button", { name: "Sheet Caroline" }).click();
  await expect(page.getByTestId("matching-sheet-row")).toHaveCount(96);
  await expect(page.getByText("À vérifier", { exact: true }).first()).toBeVisible();
});

test("une décision reste locale et peut être préparée dans le panneau", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/matching");
  await page.locator("button[aria-label^='Voir les preuves']:visible").first().click();
  const drawer = page.getByTestId("matching-review-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "Comparaison des sources" })).toBeVisible();
  await drawer.getByPlaceholder("Ex. Caroline, Yoann…").fill("Caroline");
  await drawer.getByPlaceholder(/Décision, doute restant/).fill("Relecture en cours.");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("parigo-matching-review-v1"))).not.toBeNull();
});

test("les liens Portfolio et les corrections rapides restent opérationnels", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/matching");

  const quickNote = page.locator('input[aria-label^="Note de matching pour"]:visible').first();
  await quickNote.fill("Alias contrôlé depuis la file.");
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("parigo-matching-review-v1"))).toContain("Alias contrôlé depuis la file.");
  await page.reload();
  await expect(page.locator('input[aria-label^="Note de matching pour"]:visible').first()).toHaveValue("Alias contrôlé depuis la file.");

  await page.getByRole("button", { name: "Compositeurs", exact: true }).click();
  await expect(page.locator('a[href^="/compositeurs/"]').first()).toBeVisible();
  await expect(page.locator('a[href^="https://synck-psi.vercel.app/fr/artistes/"]').first()).toBeVisible();
});

test("les tableaux gardent leur en-tête et le sélecteur multiple reste lisible", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/matching");

  await page.getByRole("button", { name: "Albums", exact: true }).click();
  const table = page.getByTestId("matching-albums-table");
  const head = table.locator("thead");
  await expect(head).toHaveCSS("position", "sticky");
  await table.evaluate((element) => { element.scrollTop = 700; });
  await expect(head).toBeVisible();

  await page.getByRole("button", { name: "Compositeurs", exact: true }).click();
  const composerTable = page.getByTestId("matching-composer-table");
  const composerHead = composerTable.locator("thead");
  await expect(composerHead).toHaveCSS("position", "sticky");
  await composerTable.evaluate((element) => { element.scrollTop = 700; });
  await expect(composerHead).toBeVisible();

  await page.getByRole("button", { name: "Albums", exact: true }).click();
  await page.getByRole("combobox", { name: "Compositeurs attendus dans le CMS" }).first().click();
  const dialog = page.getByRole("dialog", { name: /Compositeurs à associer/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByPlaceholder(/Rechercher par nom/)).toBeVisible();
  const options = dialog.getByRole("checkbox");
  await expect(options.first()).toBeVisible();
  await options.first().click();
  await options.nth(1).click();
  await dialog.getByRole("button", { name: "Appliquer la sélection" }).click();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("parigo-matching-review-v1"))).toContain("selectedComposerSlugs");
});
