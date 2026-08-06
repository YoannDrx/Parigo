import { readFile } from "node:fs/promises";
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

test("la file de rapprochement expose toutes les identités et ses contrôles", async ({ page, request }) => {
  test.setTimeout(120_000);
  const response = await request.get("/admin/compositeurs");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toContain("noindex");

  await page.goto("/admin/compositeurs");
  await expect(page.getByTestId("composer-audit-dashboard")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Rapprochement des compositeurs" })).toBeVisible();
  await expect(page.getByText("Snapshot Harvest en lecture seule")).toBeVisible();
  await expect(page.getByRole("button", { name: "Actualiser depuis Harvest" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exporter la sélection CSV" })).toBeVisible();

  const identities = page.getByTestId("composer-identity-list").getByTestId("composer-audit-identity");
  await expect(identities.first()).toBeVisible();
  expect(await identities.count()).toBeGreaterThanOrEqual(55);
  await expect(page.getByText(/Autres contributeurs Harvest/)).toBeVisible();
});

test("les filtres se combinent, se restaurent depuis l’URL et se réinitialisent", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/compositeurs?work=all&source=public&bioFr=present&sort=name");

  await expect(page.getByLabel("Travail")).toHaveValue("all");
  await expect(page.getByLabel("Source")).toHaveValue("public");
  await expect(page.getByLabel("Bio FR")).toHaveValue("present");
  await expect(page.getByLabel("Tri", { exact: true })).toHaveValue("name");
  await expect(page.getByTestId("composer-audit-identity").first()).toBeVisible();

  await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
  await expect(page).toHaveURL(/\/admin\/compositeurs$/);
  await expect(page.getByLabel("Travail")).toHaveValue("all");

  await page.getByLabel("Photo").selectOption("missing");
  await expect(page).toHaveURL(/photo=missing/);
  await expect(page.getByTestId("composer-audit-identity").first()).toBeVisible();

  await page.getByLabel("Source").selectOption("public");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter la sélection CSV" }).click();
  const download = await downloadPromise;
  const csvPath = await download.path();
  expect(csvPath).toBeTruthy();
  const csv = await readFile(csvPath!, "utf8");
  expect(csv).toContain('"track_id"');
  expect(csv).toContain('"composer_actuel"');
  expect(csv).toContain('"artist_distinct"');
});

test("un profil déplie ses œuvres et fournit le contexte Harvest sans faux deep link piste", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/compositeurs?work=all&sort=tracks");

  const firstIdentity = page.getByTestId("composer-audit-identity").first();
  await firstIdentity.getByRole("button", { name: /^Ouvrir / }).click();
  await expect(firstIdentity.locator('a[href*="admin.harvestmedia.net/music/music.aspx"]').first()).toBeVisible({ timeout: 30_000 });

  const albumToggle = firstIdentity.getByRole("button", { name: /œuvres?/ }).first();
  await albumToggle.click();
  await expect(firstIdentity.getByRole("button", { name: "Copier le Track ID" }).first()).toBeVisible({ timeout: 30_000 });
  await expect(firstIdentity.getByText("Ayants droit structurés").first()).toBeVisible();
  await expect(firstIdentity.locator('a[href*="?track="]')).toHaveCount(0);
});

test("l’aide explique les identités, les deux états et la lecture seule", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/compositeurs");
  const help = page.getByText("Comprendre le rapprochement");
  await help.click();
  await expect(page.getByText("Identité résolue.")).toBeVisible();
  await expect(page.getByText("Deux états.")).toBeVisible();
  await expect(page.getByText("Aucune écriture.")).toBeVisible();
});

test("l’actualisation invalide le snapshot admin et expose son chargement", async ({ page }) => {
  test.setTimeout(360_000);
  await page.goto("/admin/compositeurs");
  const before = await page.getByTestId("composer-snapshot-time").getAttribute("datetime");

  await page.getByRole("button", { name: "Actualiser depuis Harvest" }).click();
  await expect(page.getByRole("button", { name: "Actualisation…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Actualiser depuis Harvest" })).toBeEnabled({ timeout: 360_000 });
  await expect(page.getByTestId("composer-snapshot-time")).not.toHaveAttribute("datetime", before ?? "", { timeout: 360_000 });
});
