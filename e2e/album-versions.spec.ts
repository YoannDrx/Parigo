import { expect, test } from "@playwright/test";
import { installMemberSession } from "./helpers/member-session";

const ALBUM_ID = "4b21f575ee992534";

test.beforeEach(async ({ context, page, baseURL }) => {
  await installMemberSession(context, baseURL!);
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      updatedAt: "2026-07-29T00:00:00.000Z",
    }));
  });
});

test("le détail album groupe réellement les versions et simplifie ses métadonnées", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(testInfo.project.name === "mobile", "La hiérarchie et la barre d’actions complète sont contrôlées sur desktop.");

  await page.goto(`/albums/${ALBUM_ID}`);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Between Light and Void");
  await expect(page.getByTestId("album-label-meta")).toContainText("Primetime Tracks");
  await expect(page.getByTestId("album-label-meta")).toContainText("Réf. PRTM 0212");
  await expect(page.getByText("Crédits compositeurs", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Partager l’album" })).toBeVisible();
  await expect(page.locator(".album-actions__favorite")).toHaveCount(0);

  const mainTracks = page.locator('[data-track-kind="main"]');
  const alternateTracks = page.locator('[data-track-kind="alternate"]');
  await expect(mainTracks).toHaveCount(12);
  await expect(alternateTracks).toHaveCount(0);

  await page.getByRole("button", { name: "Toutes les versions" }).click();
  await expect(alternateTracks).toHaveCount(24);
  await expect(mainTracks.first().getByTestId("track-display-number")).toHaveText("1");
  await expect(alternateTracks.nth(0).getByTestId("track-display-number")).toHaveText("1.1");
  await expect(alternateTracks.nth(1).getByTestId("track-display-number")).toHaveText("1.2");
  await expect(alternateTracks.nth(0)).toContainText("Bed (No Drums)");
  await expect(alternateTracks.nth(0).locator(".parigo-track-row__title")).not.toHaveCSS("white-space", "nowrap");

  const mainBox = await mainTracks.first().boundingBox();
  const alternateBox = await alternateTracks.first().boundingBox();
  expect(mainBox).not.toBeNull();
  expect(alternateBox).not.toBeNull();
  expect(alternateBox!.x).toBeGreaterThan(mainBox!.x);
});

test("le panneau piste respire et les versions retrouvent les actions de la piste principale", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(testInfo.project.name === "mobile", "La barre d’actions complète est contrôlée sur desktop.");

  await page.goto(`/albums/${ALBUM_ID}`);
  await page.getByRole("button", { name: /^Informations sur la piste : Between Light and Void$/ }).click();

  const panel = page.locator(".track-detail-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByText("À propos de la piste", { exact: true })).toBeVisible();
  await expect(panel.getByText("Repères", { exact: true })).toBeVisible();
  await expect(panel.getByText("Référence album", { exact: true })).toBeVisible();
  await expect(panel.getByText("Code CD", { exact: true })).toHaveCount(0);

  await panel.getByRole("tab", { name: "Versions" }).click();
  const version = panel.locator(".track-detail-version").first();
  await expect(version).toBeVisible();
  await expect(version.getByText(/BPM/).or(version.locator("span").filter({ hasText: /^\d+$/ })).first()).toBeVisible();
  await expect(version.getByRole("button", { name: /favoris/ })).toBeVisible();
  await expect(version.getByRole("button", { name: /Informations sur la piste/ })).toBeVisible();
  await expect(version.getByRole("button", { name: /Télécharger/ })).toBeVisible();
  await expect(version.getByRole("button", { name: /Ajouter à une playlist/ })).toBeVisible();
  await expect(version.getByRole("button", { name: /Ajouter à la file d’attente/ })).toBeVisible();
  await expect(version.getByRole("button", { name: /Ajouter à la shortlist|Retirer de la shortlist/ })).toBeVisible();
  await expect(version.getByRole("button", { name: /Partager/ })).toBeVisible();
  await expect(version.getByRole("link", { name: /Demander une licence/ })).toBeVisible();
});

test("le CTA du footer et le panneau piste restent compacts sur un écran étroit", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le viewport étroit est configuré explicitement dans ce parcours.");
  await page.setViewportSize({ width: 320, height: 740 });

  await page.goto("/");
  const footer = page.locator("footer");
  const account = footer.getByRole("button", { name: "Créer un compte Parigo" });
  const instagram = footer.getByRole("link", { name: "Instagram" });
  await expect(account).toBeVisible();
  await expect(footer.getByText(/Espace personnel/)).toHaveCount(0);
  const accountBox = await account.boundingBox();
  const instagramBox = await instagram.boundingBox();
  expect(accountBox).not.toBeNull();
  expect(instagramBox).not.toBeNull();
  expect(accountBox!.width).toBeLessThan(230);
  expect(accountBox!.y + accountBox!.height).toBeLessThanOrEqual(instagramBox!.y);

  await page.goto(`/albums/${ALBUM_ID}`);
  await page.getByRole("button", { name: /^Plus d’actions : Between Light and Void$/ }).click();
  await page.getByRole("button", { name: /^Informations sur la piste : Between Light and Void$/ }).click();
  await expect(page.locator(".track-detail-panel")).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toEqual({ clientWidth: 320, scrollWidth: 320 });
});
