import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/moods-photos");
});

test("sépare les concepts des 36 compositions réelles et conserve le noindex", async ({ page }) => {
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  const concepts = page.getByRole("button", { name: /Concepts IA/ });
  const real = page.getByRole("button", { name: /Locaux réels/ });
  await expect(concepts).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("article")).toHaveCount(78);

  await real.click();
  await expect(real).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("article")).toHaveCount(36);
  await expect(page.locator("#image-r01")).toContainText("Hero — l’orgue dans les vrais locaux");
  await expect(page.locator("#image-r05")).toContainText("Détail signature de l’orgue");
  await expect(page.locator("#image-r36")).toContainText("Close-up bureau, prix et Parigo");
  await expect(page.locator("body")).not.toContainText(/Downloads|Téléchargements|Parigo-references-IA/);
});

test("filtre les étalons et ouvre sources et prompt au clavier", async ({ page }) => {
  await page.getByRole("button", { name: /Locaux réels/ }).click();
  await page.getByRole("button", { name: "Hero", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(1);

  const card = page.locator("#image-r01");
  const sources = card.locator("details").filter({ hasText: "Sources de travail" });
  await sources.locator("summary").focus();
  await page.keyboard.press("Space");
  await expect(sources).toHaveAttribute("open", "");
  await expect(sources.locator("a")).toHaveCount(9);

  const prompt = card.locator("details").filter({ hasText: "Prompt complet" });
  await prompt.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(prompt).toHaveAttribute("open", "");
  await expect(prompt.locator("pre")).toContainText("CONTRAT COMMUN");

  const heroExport = card.getByRole("link", { name: /Horizontal · 1920×1080/ });
  await expect(heroExport).toHaveAttribute("download", "");
  await expect(heroExport).toHaveAttribute("href", /r01-hero-orgue-1920x1080\.avif$/);
});

test("reste contenu sur mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Le contrôle de débordement cible le viewport mobile.");
  await page.getByRole("button", { name: /Locaux réels/ }).click();
  await expect(page.locator("#image-r01")).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toEqual({ clientWidth: 390, scrollWidth: 390 });
});
