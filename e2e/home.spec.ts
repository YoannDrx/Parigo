import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("la homepage rend la recherche principale et navigue vers les résultats", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /La musique.*prend l’image/i }),
  ).toBeVisible();
  const search = page.getByLabel("Décrivez la musique que vous imaginez");
  await search.fill("Un piano intime pour un documentaire");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/search\?/);
  await expect(page.getByRole("heading", { name: /Quel son porte votre image/i })).toBeVisible();
});

test("le thème et la langue sont basculables et persistants", async ({ page }, testInfo) => {
  await page.goto("/");
  const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await rejectCookies.isVisible()) await rejectCookies.click();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  }
  await page.getByRole("button", { name: "English version" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Music.*takes the frame/i })).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByText("Independent music library · Paris")).toBeVisible();
});

test("la homepage ne contient pas de violation critique axe", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${message.text()} @ ${message.location().url}`);
  });
  await page.goto("/");
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical")).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("la home expose les médias artistes et un menu modal responsive", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/démo locale/i)).toHaveCount(0);
  expect(await page.locator("main img").count()).toBeGreaterThanOrEqual(20);

  const artistsTitle = page.getByRole("heading", {
    name: "Des artistes, pas des algorithmes.",
  });
  await artistsTitle.scrollIntoViewIfNeeded();
  await expect(artistsTitle).toBeVisible();

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.getByRole("button", { name: "Ouvrir le menu" })).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.getByRole("dialog", { name: "Menu principal" })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menu principal" })).toHaveCount(0);
});

test("la recherche assistée alimente le lecteur persistant", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le parcours mobile du menu est couvert séparément.");
  await page.goto("/");
  await page.getByRole("button", { name: "Une techno magnétique sans voix" }).click();
  await page.getByRole("button", { name: "Recherche", exact: true }).click();
  await expect(page).toHaveURL(/genre=techno/);
  await expect(page.getByText(/résultats?$/).first()).toBeVisible();
  const firstTrack = page.getByRole("button", { name: /^Écouter / }).first();
  const trackTitle = (await firstTrack.getAttribute("aria-label"))?.replace(/^Écouter /, "") || "";
  await firstTrack.click();
  const player = page.getByTestId("player-dock");
  await expect(player).toContainText(trackTitle);
  await page.locator('header a[href="/albums"]').click();
  await expect(page).toHaveURL(/\/albums$/);
  await expect(player).toContainText(trackTitle);
});

test("la recherche expose des vues, tris et filtres partageables", async ({ page }, testInfo) => {
  await page.goto("/search?q=techno&view=tracks");
  const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await rejectCookies.isVisible()) await rejectCookies.click();

  await expect(page.getByRole("heading", { name: /Quel son porte votre image/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Écouter Track One" })).toBeVisible();

  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Filtres" }).click();
    await expect(page.getByRole("dialog", { name: "Filtres" })).toBeVisible();
    await page.waitForTimeout(400);
    const instrumentalFilter = page.getByRole("button", { name: "Instrumental" });
    await instrumentalFilter.scrollIntoViewIfNeeded();
    await instrumentalFilter.press("Enter");
    await page.getByRole("button", { name: /Voir \d+ résultats/ }).click();
    await expect(page).toHaveURL(/vocal=false/);
    return;
  }

  await page.getByRole("button", { name: "Albums", exact: true }).click();
  await expect(page).toHaveURL(/view=albums/);
  await expect(page.getByRole("heading", { name: "Acid" })).toBeVisible();
  await page.getByLabel("Trier les résultats").selectOption("bpm-asc");
  await expect(page).toHaveURL(/sort=bpm-asc/);
});
