import { expect, test } from "@playwright/test";

test("Licensing ouvre sur une introduction textuelle pleine largeur et conserve la grille", async ({ page }) => {
  await page.goto("/licensing");

  await expect(page.locator(".page-hero")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Une musique trouvée, une licence maîtrisée" })).toBeVisible();
  await expect(page.getByText("Licensing · Parigo Music", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("licensing-hero-image")).toHaveCount(0);
  await expect(page.getByTestId("licensing-title-card")).toBeVisible();
  await expect(page.getByText("R29 · L’atelier des droits", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Quatre repères suffisent", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Usages & tarifs", { exact: true })).toHaveCount(0);
  await expect(page.getByText("À chaque projet, son cadre.", { exact: true })).toHaveCount(0);
  await expect(page.locator('main button[aria-controls^="licensing-panel-"]')).toHaveCount(6);
  await expect(page.getByRole("link", { name: "Demander une estimation" })).toHaveAttribute("href", "/contact");
});

test("la 404 met en scène un gros plan de l’orgue et propose deux sorties utiles", async ({ page }, testInfo) => {
  const response = await page.goto("/page-parigo-introuvable");

  expect(response?.status()).toBe(404);
  await expect(page.getByTestId("not-found-background")).toHaveAttribute("src", /r05-orgue-commandes-1600x1200/);
  await expect(page.getByText("404 · Hors signal", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "La piste s’arrête ici" })).toBeVisible();
  await expect(page.getByText("Cette page a quitté le catalogue — mais la musique continue.", { exact: true })).toBeVisible();
  await expect(page.getByText("404", { exact: true })).toHaveCSS("color", "rgb(104, 191, 131)");
  await expect(page.getByRole("region", { name: "La piste s’arrête ici" })).toHaveCSS("text-align", "center");
  const homeLink = page.getByRole("link", { name: "Retour à l’accueil" });
  await expect(homeLink).toHaveAttribute("href", "/");
  await expect(homeLink).toHaveCSS("color", "rgb(11, 17, 13)");
  if (testInfo.project.name === "desktop") {
    await homeLink.hover();
    await expect(homeLink).toHaveCSS("background-color", "rgb(242, 241, 237)");
    await expect(homeLink).toHaveCSS("color", "rgb(11, 17, 13)");
  }
  await expect(page.getByRole("link", { name: "Explorer le catalogue" })).toHaveAttribute("href", "/search");
});

test("Contact ne conserve aucune carte de titre visible", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByTestId("contact-title-card")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, includeHidden: true })).toHaveClass(/sr-only/);

  await page.goto("/en/contact");
  await expect(page.getByTestId("contact-title-card")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, includeHidden: true })).toHaveClass(/sr-only/);
});

test("About, la page Login et la modale Login échangent leurs images sans modifier Signup", async ({ page }, testInfo) => {
  await page.goto("/about");
  await expect(page.locator("main img")).toHaveAttribute("src", /r02-v1-login-1448x1086/);
  await expect(page.locator("main figure")).toHaveCSS("aspect-ratio", "4 / 3");

  await page.goto("/login");
  const switcher = page.getByTestId("auth-switcher");
  await expect(switcher.locator('[data-auth-image="login"] img')).toHaveAttribute("src", /r14-v3-forgot-password-1200x1500/);
  await switcher.getByRole("button", { name: "Afficher le formulaire d’inscription" }).click();
  await expect(switcher.locator('[data-auth-image="register"][data-active="true"] img')).toHaveAttribute("src", /r15-v1-register/);

  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.getByRole("button", { name: "Ouvrir la connexion" }).click();
  const loginDialog = page.getByRole("dialog", { name: "Se connecter" });
  await expect(loginDialog.locator('[data-auth-image="login"] img')).toHaveAttribute("src", /r14-v3-forgot-password-1200x1500/);
});

test("les variantes anglaises conservent les sorties localisées sans image Licensing", async ({ page }) => {
  await page.goto("/en/licensing");
  await expect(page.getByTestId("licensing-hero-image")).toHaveCount(0);
  await expect(page.getByText("A framework for every project.", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Request an estimate" })).toHaveAttribute("href", "/en/contact");

  const response = await page.goto("/en/parigo-page-not-found");
  expect(response?.status()).toBe(404);
  await expect(page.getByTestId("not-found-background")).toHaveAttribute("src", /r05-orgue-commandes-1600x1200/);
  await expect(page.getByRole("heading", { level: 1, name: "The track ends here" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back home" })).toHaveAttribute("href", "/en");
  await expect(page.getByRole("link", { name: "Explore the catalogue" })).toHaveAttribute("href", "/en/search");
});
