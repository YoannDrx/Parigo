import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("la homepage rend la recherche principale et navigue vers les résultats", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /Music for image/i }),
  ).toBeVisible();
  const search = page.getByLabel("Décrivez la musique que vous imaginez");
  await search.fill("Un piano intime pour un documentaire");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/search\?/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Trouver la bonne musique/i })).toBeVisible();
});

test("le thème et la langue sont basculables et persistants", async ({ page }, testInfo) => {
  await page.goto("/");
  const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await rejectCookies.isVisible()) await rejectCookies.click();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  }
  const controls = testInfo.project.name === "mobile"
    ? page.locator("#global-menu")
    : page.locator("body");
  await controls.getByRole("button", { name: "English version" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Music for image/i })).toBeVisible();
  await controls.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByText("An independent music library for images, stories and emotion.")).toBeVisible();
});

test("la homepage ne contient pas de violation critique axe", async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${message.text()} @ ${message.location().url}`);
  });
  await page.goto("/");
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical")).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("la home expose le catalogue Parigo et un menu modal responsive", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await expect(page.getByText(/démo locale/i)).toHaveCount(0);
  await page.getByRole("tab", { name: "Nouveautés" }).click();
  await expect(page.locator('#featured a[href^="/albums/"]').first()).toBeVisible({ timeout: 30_000 });
  expect(await page.locator('#featured a[href^="/albums/"]').count()).toBeGreaterThan(4);
  expect(await page.locator("main img").count()).toBeGreaterThanOrEqual(8);

  const playlistsTitle = page.getByRole("heading", {
    name: "Une sélection, plusieurs récits.",
  });
  await playlistsTitle.scrollIntoViewIfNeeded();
  await expect(playlistsTitle).toBeVisible();

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu principal" })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menu principal" })).toHaveCount(0);
});

test("les rails de la home bouclent et les synchronisations ouvrent leur lecteur", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await expect(page.locator('#featured a[href^="/playlists/"]').first()).toBeVisible({ timeout: 30_000 });
  const featured = page.locator("#featured");
  await expect(featured.getByRole("button", { name: "Suivant" })).toBeEnabled();
  await featured.getByRole("tab", { name: "Synchronisations" }).click();
  const firstSync = featured.locator('a[href^="/synchronisations/"]').first();
  await expect(firstSync).toBeVisible();
  await expect(firstSync.locator("img")).toHaveClass(/object-contain/);
  const syncFrame = await firstSync.locator(".home-sync-card__frame").boundingBox();
  expect(syncFrame).not.toBeNull();
  expect(syncFrame!.width / syncFrame!.height).toBeGreaterThan(1.7);
  await firstSync.click();
  await expect(page).toHaveURL(/\/synchronisations\/tokyo-vice$/);
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/Ke41rOP9Nm8"]')).toBeVisible();
});

test("la recherche par mot-clé préserve la requête et alimente le lecteur persistant", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name === "mobile", "Le parcours mobile du menu est couvert séparément.");
  await page.goto("/");
  await page.getByLabel("Décrivez la musique que vous imaginez").fill("piano");
  await page.getByRole("button", { name: "Recherche", exact: true }).click();
  await expect(page).toHaveURL(/q=piano/);
  expect(new URL(page.url()).searchParams.has("categories")).toBe(false);
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
  const firstTrack = page.getByRole("button", { name: /^Écouter / }).first();
  const trackTitle = (await firstTrack.getAttribute("aria-label"))?.replace(/^Écouter /, "") || "";
  await firstTrack.click();
  const player = page.getByTestId("player-dock");
  await expect(player).toContainText(trackTitle);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(350);
  await page.locator('header a[href="/albums"]').click();
  await expect(page).toHaveURL(/\/albums$/, { timeout: 30_000 });
  await expect(player).toContainText(trackTitle);
});

test("la recherche expose des vues, tris et filtres partageables", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/search?q=techno&view=tracks&type=main");
  const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await rejectCookies.isVisible()) await rejectCookies.click({ force: true });

  await expect(page.getByRole("heading", { name: /Trouver la bonne musique/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });

  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Filtres" }).click();
    await expect(page.getByRole("dialog", { name: "Filtres" })).toBeVisible();
    await page.waitForTimeout(400);
    await page.getByRole("dialog", { name: "Filtres" }).locator("summary").filter({ hasText: "Instruments" }).click();
    const pianoFilter = page.getByRole("button", { name: /^Inclure Piano$/ }).first();
    await pianoFilter.scrollIntoViewIfNeeded();
    await pianoFilter.press("Enter");
    const applyFilters = page.getByRole("button", { name: /Voir .* résultats/ });
    await applyFilters.focus();
    await applyFilters.press("Enter");
    await expect(page).toHaveURL(/categories=ATT_51bcfc1bd83261cd/);
    return;
  }

  await page.getByRole("button", { name: "Albums", exact: true }).click();
  await expect(page).toHaveURL(/view=albums/);
  await expect(page.locator('main a[href^="/albums/"] h2').first()).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Trier les résultats").selectOption("title");
  await expect(page).toHaveURL(/sort=title/);
});

test("les filtres tri-état rendent inclusions et exclusions visibles", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name === "mobile", "Le panneau mobile est couvert dans le parcours précédent.");
  await page.goto("/search?q=piano&view=tracks&type=main");
  await page.locator("aside").locator("summary").filter({ hasText: "Instruments" }).click();
  const includePiano = page.getByRole("button", { name: "Inclure Piano" }).first();
  await expect(includePiano).toBeVisible({ timeout: 30_000 });
  await includePiano.click();
  await expect(page).toHaveURL(/categories=ATT_51bcfc1bd83261cd/);
  await expect(page.getByText(/1 inclus, 0 exclus/)).toBeVisible();
  const excludeAmbient = page.getByRole("button", { name: "Exclure Ambient" }).first();
  await excludeAmbient.click();
  await expect(page).toHaveURL(/categories=.*-ATT_df36fdca961e0855/);
  await expect(page.getByText(/1 inclus, 1 exclus/)).toBeVisible();
});

test("une piste expose ses informations, versions et paroles", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le panneau détaillé est vérifié en desktop.");
  await page.goto("/search?q=piano&view=tracks&type=main");
  await expect(page.getByText("Piano On My Mind", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /Informations sur la piste : Piano On My Mind/ }).click();
  await expect(page.getByRole("tab", { name: "Informations" })).toBeVisible();
  await page.getByRole("tab", { name: "Versions" }).click();
  await expect(page.locator("span").filter({ hasText: /^underscore$/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "Paroles" }).click();
  await expect(page.getByText("Paroles non disponibles.")).toBeVisible();
});

test("la modale de compte bascule entre connexion et inscription complète", async ({ page }, testInfo) => {
  await page.goto("/");
  const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await rejectCookies.isVisible()) await rejectCookies.click();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  }
  await page.getByRole("button", { name: "Ouvrir la connexion" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Se connecter" })).toBeVisible();
  await dialog.getByRole("button", { name: "Créer un compte" }).click();
  await expect(dialog.getByRole("heading", { name: "Créer un compte" })).toBeVisible();
  await expect(dialog.getByLabel("Prénom *")).toBeVisible();
  await expect(dialog.getByText("1/2")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("l’inscription Parigo expose le profil complet en deux étapes", async ({ page }) => {
  await page.goto("/register");
  const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await rejectCookies.isVisible()) await rejectCookies.click();
  await page.getByLabel("Prénom *").fill("Test");
  await page.getByLabel("Nom *", { exact: true }).fill("Parigo");
  await page.getByLabel(/E-mail.*utilisé comme identifiant/i).fill("test@example.invalid");
  await page.getByLabel("Mot de passe *", { exact: true }).fill("ParigoTest1");
  await page.getByLabel("Confirmer le mot de passe *").fill("ParigoTest1");
  await page.getByRole("button", { name: "Continuer vers le profil" }).click();
  await expect(page.getByText("2/2")).toBeVisible();
  await expect(page.getByLabel("Pays *")).toBeVisible();
  await expect(page.getByLabel("Société")).toBeVisible();
  await expect(page.getByLabel("Format de téléchargement préféré")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel(/Recevoir la newsletter/i)).toBeVisible();
  await expect(page.getByLabel(/conditions d’utilisation/i)).not.toBeChecked();
  await expect(page.getByLabel(/politique de confidentialité/i)).not.toBeChecked();
});
