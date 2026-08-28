import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/moods-photos");
});

test("préserve les concepts et expose le jalon versionné sans indexation", async ({ page }) => {
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  const concepts = page.getByRole("button", { name: /Concepts IA/ });
  const real = page.getByRole("button", { name: /Locaux réels/ });
  await expect(concepts).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("article")).toHaveCount(78);

  await real.click();
  await expect(real).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("article")).toHaveCount(36);
  await expect(page.locator("#image-r01-v2")).toContainText("Hero — l’orgue dans les vrais locaux");
  await expect(page.locator("#image-r05-v1")).toContainText("Détail signature de l’orgue");
  await expect(page.locator("#image-r36-v1")).toContainText("Close-up bureau, prix et Parigo");
  await expect(page.getByRole("button", { name: "V3 · 1", exact: true })).toBeEnabled();
  await expect(page.locator("#image-r14-v3")).toContainText("Forgot Password — The Trip ajustée");
  await expect(page.locator("#image-r29-v2")).toContainText("L’atelier des droits");
  await expect(page.locator("#image-r30-v2")).toContainText("Le palier au bleu du soir");
  await expect(page.locator("body")).not.toContainText(/Downloads|Téléchargements|Parigo-references-IA/);
});

test("filtre les campagnes et compare R01 V2 avec la V1 au clavier", async ({ page }) => {
  await page.getByRole("button", { name: /Locaux réels/ }).click();

  await page.getByRole("button", { name: "V1 · 36", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(36);
  await page.getByRole("button", { name: "V2 · 8", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(8);
  await page.getByRole("button", { name: "V3 · 1", exact: true }).click();
  await expect(page.locator("#image-r14-v3")).toBeVisible();
  await page.getByRole("button", { name: "Toutes · 45", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(45);

  await page.getByRole("button", { name: "Dernières · 36", exact: true }).click();
  await page.getByRole("button", { name: "Hero", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(1);

  const card = page.locator("#image-r01-v2");
  await card.getByRole("button", { name: "Comparer avec V1" }).focus();
  await page.keyboard.press("Enter");
  await expect(card).toContainText("V1 · Historique");
  await expect(card).toContainText("V2 · Sélectionnée");

  await card.getByRole("button", { name: "Afficher R01 V1" }).click();
  await expect(page.locator("#image-r01-v1")).toBeVisible();
  await page.locator("#image-r01-v1").getByRole("button", { name: "Afficher R01 V2" }).click();

  const selectedCard = page.locator("#image-r01-v2");
  const sources = selectedCard.locator("details").filter({ hasText: "Sources de travail" });
  await sources.locator("summary").focus();
  await page.keyboard.press("Space");
  await expect(sources).toHaveAttribute("open", "");
  await expect(sources.locator("a")).toHaveCount(9);

  const prompt = selectedCard.locator("details").filter({ hasText: "Prompt complet" });
  await prompt.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(prompt).toHaveAttribute("open", "");
  await expect(prompt.locator("pre")).toContainText("CONTRAT DE FIDÉLITÉ 95/5");

  const heroExport = selectedCard.getByRole("link", { name: /Horizontal · 1920×1080/ });
  await expect(heroExport).toHaveAttribute("download", "");
  await expect(heroExport).toHaveAttribute("href", /v2\/r01-hero-orgue-v2-1920x1080\.avif$/);
});

test("filtre les usages dans la campagne V2", async ({ page }) => {
  await page.getByRole("button", { name: /Locaux réels/ }).click();
  await page.getByRole("button", { name: "V2 · 8", exact: true }).click();
  await page.getByRole("button", { name: "Accès", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(2);
  await expect(page.locator("#image-r14-v2")).toBeVisible();
  await expect(page.locator("#image-r15-v2")).toBeVisible();
});

test("reste contenu sur mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Le contrôle de débordement cible le viewport mobile.");
  await page.getByRole("button", { name: /Locaux réels/ }).click();
  await expect(page.locator("#image-r01-v2")).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toEqual({ clientWidth: 390, scrollWidth: 390 });
});
