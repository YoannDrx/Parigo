import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const formFixtureValue = ["Ui", "Form", "Value", "1"].join("-");

async function waitForHeaderHydration(page: Page) {
  await page.waitForFunction(() => {
    const trigger = document.querySelector('button[aria-controls="global-menu"]');
    return Boolean(trigger && Object.keys(trigger).some((key) => key.startsWith("__reactProps")));
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      updatedAt: "2026-07-23T00:00:00.000Z",
    }));
  });
});

test("la homepage rend la recherche principale et navigue vers les résultats", async ({ page }, testInfo) => {
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await expect(hero).toBeVisible();
  const backgrounds = await page.evaluate(() => ({
    canvas: getComputedStyle(document.documentElement).backgroundColor,
    hero: getComputedStyle(document.querySelector<HTMLElement>("[data-testid='home-hero']")!).backgroundColor,
  }));
  expect(backgrounds.canvas).toBe(backgrounds.hero);
  await expect(
    page.getByRole("heading", { level: 1, name: /Trouvez la bonne musique/i }),
  ).toBeVisible();
  const heroSignature = page.getByRole("heading", { level: 1 }).locator(".parigo-title-signature");
  await expect(heroSignature).toHaveCount(1);
  if (testInfo.project.name === "desktop") {
    await page.getByRole("heading", { level: 1 }).hover();
    await expect(heroSignature).toHaveCSS("animation-name", "parigo-title-signature-spin");
  }
  await expect(page.getByRole("link", { name: "Entrer dans le catalogue" })).toHaveCount(0);
  await expect(hero.getByText("Interprétation", { exact: true })).toHaveCount(0);
  const search = page.getByLabel("Décrivez la musique que vous imaginez");
  await search.fill("Un piano intime pour un documentaire");
  await expect(hero.getByText("Interprétation", { exact: true })).toBeVisible();
  await expect(hero.getByText("Piano", { exact: true })).toBeVisible();
  await search.press("Enter");
  await expect(page).toHaveURL(/\/search\?/, { timeout: 30_000 });
  await expect(page.getByTestId("search-workspace")).toBeVisible();
  await expect(page.getByTestId("search-detected-criteria").getByText("Piano", { exact: true })).toBeVisible();
  const resolvedUrl = new URL(page.url());
  expect(resolvedUrl.searchParams.get("brief")).toBe("Un piano intime pour un documentaire");
  expect(resolvedUrl.searchParams.has("q")).toBe(false);
  expect(resolvedUrl.searchParams.has("categories")).toBe(false);
});

test("le CTA Qui sommes-nous conserve un contraste lisible dans les deux thèmes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le survol est vérifié avec un pointeur desktop.");
  await page.goto("/");
  await expect(page.getByText("Parigo accompagne les professionnels de l'image et du son dans la recherche de musiques et la gestion des droits.", { exact: false })).toBeVisible();
  const cta = page.getByRole("link", { name: "Découvrir le catalogue" });
  await cta.scrollIntoViewIfNeeded();

  for (const theme of ["light", "dark"]) {
    await page.evaluate((nextTheme) => {
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
    }, theme);
    await cta.hover();
    await expect(cta).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(cta).toHaveCSS("color", "rgb(17, 21, 16)");
  }
});

test("le CTA du brief conserve son contraste dans les deux thèmes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le survol du CTA est un comportement desktop.");
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Envoyer un brief" });
  await cta.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await cta.hover();
  await expect(cta).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(cta).toHaveCSS("color", "rgb(16, 20, 16)");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  });
  await cta.hover();
  await expect(cta).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(cta).toHaveCSS("color", "rgb(16, 20, 16)");
});

test("la navbar reste minimaliste et expose la signature Parigo dans l’onglet", async ({ page }, testInfo) => {
  await page.goto("/search");

  const iconHref = await page.locator('head link[rel="icon"]').getAttribute("href");
  expect(iconHref).toMatch(/^\/icon\.svg/);
  const iconResponse = await page.request.get(new URL(iconHref!, page.url()).toString());
  expect(iconResponse.ok()).toBe(true);
  expect(iconResponse.headers()["content-type"]).toContain("image/svg+xml");
  expect(await iconResponse.text()).toContain("Parigo Music");

  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await expect(page.locator("#global-menu").getByText(/^0[1-7]$/)).toHaveCount(0);
    return;
  }

  const mainNavigation = page.getByRole("navigation", { name: "Navigation principale" });
  const activeLink = mainNavigation.getByRole("link", { name: "Recherche", exact: true });
  await expect(activeLink).toHaveAttribute("aria-current", "page");
  const activeStyles = await activeLink.evaluate((node) => {
    const style = getComputedStyle(node);
    const marker = getComputedStyle(node, "::after");
    return { background: style.backgroundColor, radius: style.borderRadius, markerHeight: marker.height, markerTransform: marker.transform };
  });
  expect(activeStyles.background).toBe("rgba(0, 0, 0, 0)");
  expect(activeStyles.radius).toBe("0px");
  expect(activeStyles.markerHeight).toBe("2px");
  expect(activeStyles.markerTransform).toBe("matrix(1, 0, 0, 1, 0, 0)");

  const albumsLink = mainNavigation.getByRole("link", { name: "Albums", exact: true });
  await albumsLink.focus();
  await expect.poll(() => albumsLink.evaluate((node) => getComputedStyle(node, "::after").transform)).toBe("matrix(1, 0, 0, 1, 0, 0)");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(page.locator("#global-menu").getByText(/^0[1-7]$/)).toHaveCount(0);
});

test("la connexion reprend les codes éditoriaux sans indentation artificielle", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.getByRole("button", { name: "Ouvrir la connexion" }).click();

  const dialog = page.getByRole("dialog", { name: "Se connecter" });
  await expect(dialog).toBeVisible();
  const email = dialog.locator("#login-email");
  const password = dialog.locator("#login-password");
  await expect(email).toHaveCSS("padding-left", "16px");
  await expect(password).toHaveCSS("padding-left", "16px");
  await password.fill(formFixtureValue);
  await expect(password).toHaveAttribute("type", "password");
  await dialog.getByRole("button", { name: "Afficher le mot de passe" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue(formFixtureValue);
  await dialog.getByRole("button", { name: "Masquer le mot de passe" }).click();
  await expect(password).toHaveAttribute("type", "password");
  const forgot = dialog.getByRole("button", { name: "Mot de passe oublié" });
  await expect(forgot).toHaveCSS("text-transform", "none");
  expect(Number.parseFloat(await forgot.evaluate((node) => getComputedStyle(node).fontSize))).toBeLessThan(12);
});

test("la connexion traduit l’erreur d’un compte non vérifié", async ({ page }, testInfo) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "FORBIDDEN", message: "Not activated" } }),
    });
  });
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.getByRole("button", { name: "Ouvrir la connexion" }).click();

  const dialog = page.getByRole("dialog", { name: "Se connecter" });
  await dialog.locator("#login-email").fill("pending@parigo.test");
  await dialog.locator("#login-password").fill(formFixtureValue);
  await dialog.getByRole("button", { name: "Se connecter", exact: true }).click();

  const alert = dialog.getByRole("alert");
  await expect(alert).toContainText("validation de votre adresse e-mail");
  await expect(alert).not.toContainText("Not activated");
});

test("le thème et la langue sont basculables et persistants", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  }
  const controls = testInfo.project.name === "mobile"
    ? page.locator("#global-menu")
    : page.locator("body");
  await controls.getByRole("link", { name: /English version/ }).click();
  await expect(page).toHaveURL(/\/en(?:\/|$)/);
  await expect(page.getByRole("heading", { level: 1, name: /Find the right music/i })).toBeVisible();
  await waitForHeaderHydration(page);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator("#global-menu")).toBeVisible();
  }
  const themeControls = testInfo.project.name === "mobile"
    ? page.locator("#global-menu")
    : page.locator("body");
  await themeControls.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("main").getByText(/A curated catalogue built for editors, music supervisors and producers/)).toBeVisible();
  for (const heading of ["Who are we", "From brief to selection"]) {
    const element = page.getByRole("heading", { name: heading });
    const color = await element.evaluate((node) => getComputedStyle(node).color);
    const channels = color.match(/\d+/g)?.slice(0, 3).map(Number) ?? [];
    expect(Math.min(...channels)).toBeGreaterThan(180);
  }
  const instagramTile = page.locator('[role="listitem"]').filter({ hasText: "Instagram" });
  await expect(instagramTile).toHaveCSS("background-color", "rgb(255, 255, 255)");
  if (testInfo.project.name === "desktop") {
    const projectCta = page.getByRole("link", { name: "Send a brief" });
    await projectCta.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await projectCta.hover();
    await expect(projectCta).toHaveCSS("color", "rgb(16, 20, 16)");
  }
});

test("la homepage ne contient pas de violation critique axe", async ({ page }) => {
  test.setTimeout(60_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    const locationUrl = message.location().url;
    const blockedPreviewToolbar = text.includes("https://vercel.live/_next-live/feedback/feedback.js")
      && text.includes("Content Security Policy");
    if (message.type() === "error" && !blockedPreviewToolbar) {
      consoleErrors.push(`${text} @ ${locationUrl}`);
    }
  });
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical")).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("la home expose le catalogue Parigo et un menu modal responsive", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await expect(page.getByText(/démo locale/i)).toHaveCount(0);
  const menuTrigger = page.getByRole("button", { name: "Ouvrir le menu" });
  await expect(menuTrigger).toBeVisible();
  await menuTrigger.click();
  const menu = page.getByRole("dialog", { name: "Menu principal" });
  await expect(menu).toBeVisible();
  await page.waitForTimeout(500);
  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.x).toBeLessThanOrEqual(5);
  expect(menuBox!.width).toBeGreaterThanOrEqual((await page.evaluate(() => innerWidth)) - 5);
  expect(Math.ceil(menuBox!.height)).toBeGreaterThanOrEqual((await page.evaluate(() => innerHeight)) - 75);
  await expect(menu).not.toContainText("Paris · France");
  await expect(menu).not.toContainText(/Parigo \/(?: Explorer| Explore)/);
  await expect(menu).not.toContainText("Catalogue, images et compositeurs");
  expect(await menu.evaluate((node) => getComputedStyle(node).backgroundImage)).not.toContain("repeating-linear-gradient");
  await expect(menu.locator('a[href="/labels"]')).toContainText("Labels");
  await expect(menu.getByRole("link", { name: "Label Parigo" })).toBeVisible();
  if (testInfo.project.name === "desktop") {
    const labelsCard = menu.locator('a[href="/labels"]');
    await labelsCard.hover({ force: true });
    const arrow = labelsCard.locator(".parigo-menu-card__arrow");
    await expect(arrow).toHaveCSS("transform", "none");
    await expect.poll(() => labelsCard.evaluate((node) => node.matches(":hover"))).toBe(true);
    await expect.poll(() => arrow.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    await expect(labelsCard).toHaveCSS("border-top-left-radius", "0px");
    await expect(labelsCard).toHaveCSS("border-bottom-right-radius", "0px");
    expect(Number.parseFloat(await labelsCard.evaluate((node) => getComputedStyle(node).borderTopRightRadius))).toBeGreaterThan(0);
    expect(Number.parseFloat(await labelsCard.evaluate((node) => getComputedStyle(node).borderBottomLeftRadius))).toBeGreaterThan(0);
  }
  expect(await menu.getByTestId("drawer-navigation").getByRole("link").evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual([
    "/search",
    "/labels",
    "/label-parigo",
    "/albums",
    "/synchronisations",
    "/playlists",
    "/licensing",
    "/clips",
    "/compositeurs",
  ]);
  if (testInfo.project.name === "mobile") {
    await expect(menu.getByText("Compte", { exact: true })).toBeVisible();
    await expect(menu.getByText("Préférences", { exact: true })).toBeVisible();
    await expect(menu).toHaveCSS("overflow-y", "auto");
    const initialScrollMetrics = await menu.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(initialScrollMetrics.scrollHeight).toBeGreaterThan(initialScrollMetrics.clientHeight);
    await menu.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
    await expect.poll(() => menu.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(menu.getByRole("link", { name: "Confidentialité" })).toBeVisible();
  } else {
    await expect(menu.getByText("Compte", { exact: true })).not.toBeVisible();
    await expect(menu.getByText("Préférences", { exact: true })).not.toBeVisible();
  }
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menu principal" })).toHaveCount(0);

  await expect(page.getByRole("tab", { name: "Nouveautés" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('#featured a[href^="/albums/"]').first()).toBeVisible({ timeout: 30_000 });
  expect(await page.locator('#featured a[href^="/albums/"]').count()).toBeGreaterThan(4);
  expect(await page.locator("main img").count()).toBeGreaterThanOrEqual(8);

  await expect(page.getByRole("heading", { name: "Une sélection, plusieurs récits." })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Synchronisations" })).toHaveCount(0);
});

test("le footer reprend l’ordre du menu et sépare le compte des réseaux sociaux", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/");
  const footer = page.locator("footer");
  const explore = footer.getByRole("heading", { name: "Explorer", exact: true }).locator("xpath=..");
  await expect(explore.getByRole("link", { name: "Labels", exact: true })).toBeVisible();
  expect(await explore.getByRole("link").evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual([
    "/search",
    "/labels",
    "/label-parigo",
    "/albums",
    "/synchronisations",
    "/playlists",
    "/licensing",
    "/clips",
    "/compositeurs",
  ]);

  const account = footer.getByRole("button", { name: /Créer un compte Parigo/ });
  const instagram = footer.getByRole("link", { name: "Instagram" });
  const accountBox = await account.boundingBox();
  const instagramBox = await instagram.boundingBox();
  expect(accountBox).not.toBeNull();
  expect(instagramBox).not.toBeNull();
  expect(accountBox!.y + accountBox!.height).toBeLessThanOrEqual(instagramBox!.y);
});

test("la home et les pistes proposent des interactions tactiles dédiées", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name !== "mobile", "Ce parcours contrôle spécifiquement la composition tactile.");
  await page.goto("/");
  const showreel = page.getByTestId("home-showreel");
  const showreelTitle = showreel.locator("h2").first();
  await expect(showreel).toBeVisible({ timeout: 30_000 });
  expect(await showreel.evaluate((node) => node.clientHeight)).toBeGreaterThanOrEqual((await page.evaluate(() => innerHeight)) * .95);
  await expect(showreel.getByTestId("home-showreel-video")).toHaveAttribute("src", "/videos/garden-of-eden-showreel.mp4");
  expect(Number.parseFloat(await showreelTitle.evaluate((node) => getComputedStyle(node).fontSize))).toBeGreaterThan(48);

  await page.getByRole("tab", { name: "Playlists" }).click();
  await expect(page.locator('#featured a[href^="/playlists/"]').first()).toBeVisible({ timeout: 30_000 });
  const carouselArrows = page.locator('button[aria-label="Précédent"], button[aria-label="Suivant"]');
  expect(await carouselArrows.count()).toBeGreaterThan(0);
  for (let index = 0; index < await carouselArrows.count(); index += 1) await expect(carouselArrows.nth(index)).toBeHidden();

  await showreelTitle.scrollIntoViewIfNeeded();

  const process = page.locator("#process");
  await process.scrollIntoViewIfNeeded();
  expect((await page.getByTestId("process-progress").boundingBox())!.height).toBeGreaterThanOrEqual(4);

  await expect(page.getByTestId("editorial-mobile-rail")).toHaveCount(0);

  await page.goto("/search?q=piano&view=tracks&type=main");
  const firstPlay = page.getByRole("button", { name: /^Écouter / }).first();
  await expect(firstPlay).toBeVisible({ timeout: 30_000 });
  await expect(firstPlay.getByTestId("track-play-icon")).toBeVisible();
  await expect(page.locator("[data-shortlist-trigger]")).toHaveCount(0);
  await page.getByRole("button", { name: /^Ajouter à la shortlist :/ }).first().click();
  const shortlistTrigger = page.locator("[data-shortlist-trigger]");
  await expect(shortlistTrigger).toBeVisible();
  await page.getByRole("dialog", { name: "Shortlist" }).getByRole("button", { name: "Fermer" }).click();
  await expect(shortlistTrigger).toHaveCSS("right", "12px");
  await expect(shortlistTrigger).toHaveCSS("bottom", "8px");
  const moreActions = page.getByRole("button", { name: /^Plus d’actions :/ }).first();
  await expect(moreActions).toBeVisible();
  await moreActions.click();
  const actions = page.getByRole("region", { name: /^Actions pour/ }).first();
  await expect(actions).toBeVisible();
  await expect(shortlistTrigger).toHaveCSS("opacity", "0");
  await expect(shortlistTrigger).toHaveCSS("pointer-events", "none");
  await expect(actions.getByText("Télécharger", { exact: true })).toBeVisible();
  await expect(actions.getByText("Playlist", { exact: true })).toBeVisible();
  await expect(actions.getByText("Partager", { exact: true })).toBeVisible();
});

test("les rails de la home bouclent et les synchronisations ouvrent leur lecteur", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await page.getByRole("tab", { name: "Playlists" }).click();
  await expect(page.locator('#featured a[href^="/playlists/"]').first()).toBeVisible({ timeout: 30_000 });
  const featured = page.locator("#featured");
  const featuredArtwork = featured.locator('a[href^="/playlists/"] img').first();
  await expect(featuredArtwork).toHaveAttribute(
    "src",
    /^https:\/\/d3vy0pmxxxelni\.cloudfront\.net\/assets\/playlistart\//,
  );
  const featuredSrcset = await featuredArtwork.getAttribute("srcset");
  const featuredWidths = [...(featuredSrcset ?? "").matchAll(/[?&]width=(\d+)/g)]
    .map((match) => Number(match[1]));
  expect(featuredWidths.length).toBeGreaterThan(0);
  expect(Math.max(...featuredWidths)).toBe(320);
  expect(featuredSrcset).not.toContain("/_next/image");
  const nextButton = featured.locator('button[aria-label="Suivant"]');
  if (testInfo.project.name === "mobile") await expect(nextButton).toBeHidden();
  else {
    await expect(nextButton).toBeEnabled();
    await expect(nextButton).toHaveClass(/home-rail-nav--next/);
    expect((await nextButton.boundingBox())!.width).toBeLessThanOrEqual(44);
    expect((await nextButton.boundingBox())!.height).toBeLessThanOrEqual(44);
    await nextButton.hover();
    await expect.poll(() => nextButton.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    await expect(page.getByRole("tooltip")).toHaveText("Suivant");
    const inverseButton = page.locator(".home-rail-nav--inverse").last();
    const inverseColors = await inverseButton.evaluate((node) => ({
      control: getComputedStyle(node).color,
      section: getComputedStyle(node.closest("section")!).backgroundColor,
    }));
    expect(inverseColors.control).not.toBe(inverseColors.section);
  }
  await expect(featured.getByRole("tab", { name: "Synchronisations" })).toHaveCount(0);
  const dedicatedSyncSection = page.getByRole("heading", { name: "Nos synchronisations" }).locator("xpath=ancestor::section");
  const firstSync = dedicatedSyncSection.locator('a[href^="/synchronisations/"]').first();
  const firstSyncCard = firstSync.locator("xpath=ancestor::article");
  await expect(firstSync).toBeVisible();
  await expect(firstSyncCard.locator("img")).toHaveClass(/object-contain/);
  const syncFrame = await firstSyncCard.locator(".home-sync-card__frame").boundingBox();
  expect(syncFrame).not.toBeNull();
  expect(syncFrame!.width / syncFrame!.height).toBeGreaterThan(1.7);
  const syncCaption = firstSyncCard.locator(".home-sync-card__caption");
  if (testInfo.project.name === "mobile") {
    await expect(syncCaption).toHaveCSS("opacity", "1");
  } else {
    await expect(syncCaption).toHaveCSS("opacity", "0");
    await firstSyncCard.hover();
    await expect(syncCaption).toHaveCSS("opacity", "1");
    await expect(firstSyncCard.locator(".home-sync-card__image")).toHaveCSS("filter", "blur(5px)");
  }
  const syncHref = await firstSync.getAttribute("href");
  expect(syncHref).toMatch(/^\/synchronisations\/[^/]+$/);
  await firstSync.click();
  await expect(page).toHaveURL(new RegExp(`${syncHref}$`));
  await expect(page.getByText(/nécessite votre autorisation/)).toBeVisible();
  await page.evaluate(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: true,
      updatedAt: "2026-07-25T00:00:00.000Z",
    }));
    window.dispatchEvent(new Event("parigo:cookie-consent-change"));
  });
  const detailPlay = page.getByRole("button", { name: /^Lire / });
  await expect(detailPlay).toBeVisible();
  await detailPlay.click();
  await expect(page.getByTestId("persistent-clip-iframe")).toBeVisible();
});

test("les trois rails éditoriaux laissent apparaître exactement le fond de leur section", async ({ page }) => {
  await page.goto("/");
  const sections = [
    page.locator("#featured"),
    page.getByTestId("home-clips-section"),
    page.getByTestId("home-sync-section"),
  ];
  for (const section of sections) {
    await section.scrollIntoViewIfNeeded();
    const rail = section.locator(".home-rail").first();
    const card = rail.locator(".home-rail-card, .home-sync-card").first();
    await expect(rail).toBeVisible();
    await expect(card).toBeVisible();
    const colors = await section.evaluate((node) => {
      const railNode = node.querySelector<HTMLElement>(".home-rail");
      const cardNode = node.querySelector<HTMLElement>(".home-rail-card, .home-sync-card");
      return {
        section: getComputedStyle(node).backgroundColor,
        rail: railNode ? getComputedStyle(railNode).backgroundColor : "",
        card: cardNode ? getComputedStyle(cardNode).backgroundColor : "",
      };
    });
    expect(colors.rail).toBe("rgba(0, 0, 0, 0)");
    expect(colors.card).toBe(colors.section);
  }
});

test("le showreel occupe le viewport et ne contient plus l’effet de pochettes", async ({ page }) => {
  await page.goto("/");
  const section = page.getByTestId("home-showreel");
  await section.scrollIntoViewIfNeeded();
  const [height, viewportHeight] = await Promise.all([
    section.evaluate((node) => node.clientHeight),
    page.evaluate(() => innerHeight),
  ]);
  expect(height).toBeGreaterThanOrEqual(viewportHeight * .95);
  expect(height).toBeLessThanOrEqual(viewportHeight * 1.2);
  await expect(section.getByRole("heading", { name: /Une musique juste.*Au bon moment.*Pour la bonne image/i })).toBeVisible();
  await expect(section.locator("h2 > span")).toHaveCount(5);
  await expect(section.getByText(/Parigo accompagne chaque année/i)).toHaveCount(0);
  await expect(page.getByTestId("manifesto-album-cover")).toHaveCount(0);
  const video = section.getByTestId("home-showreel-video");
  await expect(video).toHaveAttribute("src", "/videos/garden-of-eden-showreel.mp4");
  await expect(video).toHaveAttribute("poster", "/images/home/garden-of-eden-poster.jpg");
  await expect(section.locator("iframe")).toHaveCount(0);
});

test("le showreel charge le MP4 local et son contrôle sonore sans consentement marketing", async ({ page }) => {
  await page.goto("/");
  const section = page.getByTestId("home-showreel");
  await section.scrollIntoViewIfNeeded();
  const player = section.getByTestId("home-showreel-video");
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute("src", "/videos/garden-of-eden-showreel.mp4");
  await expect(page.getByRole("button", { name: /Activer le son|Couper le son/ })).toBeVisible({ timeout: 30_000 });
});

test("le showreel continue après la section et garde un mute animé accessible", async ({ page }) => {
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.defineProperty(window, "__parigoMediaCalls", { value: calls });
    HTMLMediaElement.prototype.play = function play() {
      calls.push(`play:${this.muted ? "muted" : "audible"}`);
      queueMicrotask(() => this.dispatchEvent(new Event("play")));
      return Promise.resolve();
    };
  });
  await page.goto("/");
  const section = page.getByTestId("home-showreel");
  await section.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (
    (window as typeof window & { __parigoMediaCalls?: string[] }).__parigoMediaCalls ?? []
  ))).toContain("play:audible");
  await expect(page.getByTestId("showreel-sound-active")).toBeVisible();
  await expect(section.getByTestId("showreel-title-square")).toHaveCount(3);
  const titleLetters = section.getByTestId("showreel-title-letter");
  await expect(titleLetters.first()).toHaveCSS("opacity", "1");
  await expect(section.getByTestId("showreel-title-square").last()).toHaveCSS("opacity", "1", { timeout: 6_000 });

  const showreelTop = await section.evaluate((node) => node.getBoundingClientRect().top + scrollY);
  const viewportHeight = await page.evaluate(() => innerHeight);
  await page.evaluate(({ top, viewport }) => scrollTo({ top: top + viewport * .35 }), {
    top: showreelTop,
    viewport: viewportHeight,
  });
  const soundPosition = page.getByTestId("showreel-sound-position");
  await expect(soundPosition).toHaveCount(1);
  await expect(page.locator('button[data-floating="true"][aria-label="Couper le son"]')).toBeVisible();
  await page.waitForTimeout(180);
  const movingSoundBox = await soundPosition.boundingBox();
  await page.waitForTimeout(1_350);
  const settledSoundBox = await soundPosition.boundingBox();
  expect(movingSoundBox).not.toBeNull();
  expect(settledSoundBox).not.toBeNull();
  expect(settledSoundBox!.y).toBeGreaterThan(movingSoundBox!.y);

  await page.evaluate((top) => scrollTo({ top }), showreelTop);
  await expect(page.locator('button[data-floating="true"][aria-label="Couper le son"]')).toBeVisible();
  await expect(soundPosition).toHaveCount(1);

  await page.getByTestId("home-composers").scrollIntoViewIfNeeded();
  const floatingMute = page.locator('button[data-floating="true"][aria-label="Couper le son"]');
  await expect(floatingMute).toHaveAttribute("data-floating", "true");
  const floatingMuteBox = await floatingMute.boundingBox();
  expect(floatingMuteBox).not.toBeNull();
  const viewportWidth = await page.evaluate(() => innerWidth);
  expect(floatingMuteBox!.x + floatingMuteBox!.width).toBeGreaterThan(viewportWidth - 100);

  await floatingMute.click();
  const reattachedSound = page.locator('button[data-floating="false"][aria-label="Activer le son"]');
  await expect(reattachedSound).toHaveCount(1);
  await page.waitForTimeout(1_350);
  const reattachedSoundBox = await soundPosition.boundingBox();
  expect(reattachedSoundBox).not.toBeNull();
  expect(reattachedSoundBox!.y).toBeLessThan(floatingMuteBox!.y);
  await expect(page.getByTestId("showreel-sound-active")).toHaveCount(0);

  const audibleStartsAfterManualStop = await page.evaluate(() => (
    (window as typeof window & { __parigoMediaCalls?: string[] })
      .__parigoMediaCalls?.filter((call) => call === "play:audible").length ?? 0
  ));
  await section.scrollIntoViewIfNeeded();
  await page.getByTestId("home-composers").scrollIntoViewIfNeeded();
  await section.scrollIntoViewIfNeeded();
  await expect(page.locator('button[data-floating="false"][aria-label="Activer le son"]')).toBeVisible();
  await expect(page.getByTestId("showreel-sound-active")).toHaveCount(0);
  expect(await page.evaluate(() => (
    (window as typeof window & { __parigoMediaCalls?: string[] })
      .__parigoMediaCalls?.filter((call) => call === "play:audible").length ?? 0
  ))).toBe(audibleStartsAfterManualStop);

  await page.locator('button[data-floating="false"][aria-label="Activer le son"]').click();
  await expect(page.getByTestId("showreel-sound-active")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (
    (window as typeof window & { __parigoMediaCalls?: string[] })
      .__parigoMediaCalls?.filter((call) => call === "play:audible").length ?? 0
  ))).toBe(audibleStartsAfterManualStop + 1);
});

test("le son du showreel et son contrôle persistent pendant la navigation", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.defineProperty(window, "__parigoPersistentMediaCalls", { value: calls });
    HTMLMediaElement.prototype.play = function play() {
      calls.push(`play:${this.tagName.toLowerCase()}:${this.muted ? "muted" : "audible"}`);
      queueMicrotask(() => this.dispatchEvent(new Event("play")));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function pause() {
      calls.push(`pause:${this.tagName.toLowerCase()}`);
      queueMicrotask(() => this.dispatchEvent(new Event("pause")));
    };
  });
  await page.goto("/");
  const section = page.getByTestId("home-showreel");
  await section.scrollIntoViewIfNeeded();
  await expect(page.getByTestId("showreel-sound-active")).toBeVisible();

  const showreelTop = await section.evaluate((node) => node.getBoundingClientRect().top + scrollY);
  const viewportHeight = await page.evaluate(() => innerHeight);
  await page.evaluate(({ top, viewport }) => scrollTo({ top: top + viewport * .35 }), {
    top: showreelTop,
    viewport: viewportHeight,
  });
  const floatingControl = page.locator('button[data-floating="true"][aria-label="Couper le son"]');
  await expect(floatingControl).toBeVisible();

  const persistentAudio = page.getByTestId("persistent-showreel-audio");
  await persistentAudio.evaluate((audio) => {
    audio.dataset.persistenceMarker = "same-audio-node";
  });
  const audibleCallsBeforeNavigation = await page.evaluate(() => (
    (window as typeof window & { __parigoPersistentMediaCalls?: string[] })
      .__parigoPersistentMediaCalls?.filter((call) => call === "play:audio:audible").length ?? 0
  ));

  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.locator("#global-menu").locator('a[href="/labels"]').click();
  await expect(page).toHaveURL(/\/labels$/);
  await expect(page.getByTestId("persistent-showreel-audio")).toHaveAttribute("data-persistence-marker", "same-audio-node");
  await expect(page.locator('button[data-floating="true"][aria-label="Couper le son"]')).toBeVisible();
  expect(await page.evaluate(() => (
    (window as typeof window & { __parigoPersistentMediaCalls?: string[] })
      .__parigoPersistentMediaCalls?.filter((call) => call === "play:audio:audible").length ?? 0
  ))).toBe(audibleCallsBeforeNavigation);

  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.locator("#global-menu").locator('a[href="/search"]').click();
  const firstTrack = page.getByRole("button", { name: /^Écouter / }).first();
  await expect(firstTrack).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^Ajouter à la shortlist :/ }).first().click();
  const shortlistTrigger = page.locator("[data-shortlist-trigger]");
  await expect(shortlistTrigger).toBeVisible();
  await expect.poll(async () => {
    const [soundBox, shortlistBox] = await Promise.all([
      page.locator('button[data-floating="true"][aria-label="Couper le son"]').boundingBox(),
      shortlistTrigger.boundingBox(),
    ]);
    if (!soundBox || !shortlistBox) return -1;
    return shortlistBox.y - (soundBox.y + soundBox.height);
  }).toBeGreaterThanOrEqual(10);
  await page.getByRole("dialog", { name: "Shortlist" }).getByRole("button", { name: "Fermer", exact: true }).click();
  await firstTrack.click();
  await expect(page.getByTestId("player-dock")).toBeVisible();
  await expect(page.locator('button[data-floating="true"][aria-label="Couper le son"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (
    (window as typeof window & { __parigoPersistentMediaCalls?: string[] })
      .__parigoPersistentMediaCalls ?? []
  ))).toContain("pause:audio");
});

test("la section compositeurs présente un flux désaxé de talents", async ({ page }, testInfo) => {
  await page.goto("/");
  const section = page.getByTestId("home-composers");
  await expect(section.getByRole("heading", { name: "Les talents qui donnent vie à notre catalogue" })).toBeVisible();
  await expect(section.getByText("Une maison de compositeurs", { exact: true })).toHaveCount(0);
  await expect(section).toContainText("Une musique ne naît jamais seule");
  await expect(section).toContainText("Découvrez nos talents");
  await expect(section).not.toContainText("Découvrez les talents qui donnent une identité unique au catalogue original Parigo.");
  await expect(section.getByRole("heading", { level: 3 })).toHaveCount(0);
  for (const removedCard of ["Écouter", "Accompagner", "Construire"]) {
    await expect(section.getByText(removedCard, { exact: true })).toHaveCount(0);
  }
  await expect(section.getByText(/^(?:01|02|03)$/)).toHaveCount(0);
  const cta = section.getByRole("link", { name: "Découvrez nos talents" });
  await expect(cta).toHaveAttribute("href", "/compositeurs");
  await expect(cta).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(cta.locator("span")).toHaveCSS("text-decoration-line", "underline");
  await expect(section.getByRole("link", { name: "Découvrir nos compositeurs" })).toHaveCount(0);
  const primaryCards = section.locator('.composer-cloud__group:not([aria-hidden="true"]) a[href^="/compositeurs/"]');
  await expect(primaryCards).toHaveCount(55);
  await expect(primaryCards.locator("svg")).toHaveCount(0);
  await expect(section.locator('.composer-cloud__duplicate a[href^="/compositeurs/"]')).toHaveCount(55);
  await expect(section.locator("img")).toHaveCount(110);
  await expect(primaryCards.locator("img").first()).toHaveAttribute("src", /\/images\/composers\/detail\//);
  await expect(primaryCards.locator("img").first()).toHaveCSS("object-fit", "cover");
  const verticalOffsets = await section.locator('.composer-cloud__group:not([aria-hidden="true"]) .composer-cloud__item').evaluateAll((items) => (
    items.map((item) => getComputedStyle(item).paddingTop)
  ));
  expect(new Set(verticalOffsets).size).toBeGreaterThan(8);
  const track = section.locator(".composer-cloud__track");
  await expect(track).toHaveCSS("animation-name", "composer-cloud-drift");
  if (testInfo.project.name === "desktop") {
    await section.locator(".composer-cloud").hover();
    await expect(track).toHaveCSS("animation-play-state", "paused");
  }
  await expect(section.locator("header > p")).toHaveCount(1);
  await expect(section.locator("header > p")).toHaveCSS("border-top-width", "0px");
  await expect(page.getByTestId("composer-sticky-stage")).toHaveCount(0);
});

test("la home adopte les nouvelles accroches éditoriales", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await expect(hero).toContainText("Des compositions originales pensées pour raconter vos images");
  await expect(hero).toContainText("Explorez, écoutez, comparez et licenciez en quelques clics.");
  await expect(hero).not.toContainText("Un catalogue édité pour les monteurs");
  await expect(page.locator("#about").getByRole("heading", { name: "Qui sommes nous" })).toBeVisible();
  await expect(page.getByTestId("home-clips-section")).not.toContainText("Les créations audiovisuelles du label");
});

test("le bouton Play des albums reste visible en thème sombre", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const playIndicator = page.locator("#featured .home-release-play").first();
  await expect(playIndicator).toBeVisible();
  await expect(playIndicator).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(playIndicator).toHaveCSS("opacity", "1");
  const background = await playIndicator.evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(background).not.toBe("rgba(0, 0, 0, 0)");
});

test("les nouveautés se rafraîchissent dès l’affichage initial", async ({ page }) => {
  let releaseRequests = 0;
  await page.route(/\/api\/albums\?/, async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.has("label")) {
      await route.continue();
      return;
    }
    releaseRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          albums: [{
            id: "fresh-release",
            slug: "fresh-release",
            title: "Sortie fraîche",
            cover: "/images/placeholder-album.svg",
            label: "Parigo",
            trackCount: 1,
            releaseDate: "2026-08-06T00:00:00.000Z",
          }],
        },
        meta: { total: 1, page: 1, pageSize: 12 },
      }),
    });
  });

  await page.goto("/");
  const featured = page.locator("#featured");
  await expect(featured.getByText("Sortie fraîche", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(featured.getByRole("tab", { name: "Nouveautés" })).toHaveAttribute("aria-selected", "true");
  expect(releaseRequests).toBeGreaterThan(0);
});

test("les cartes À écouter maintenant séparent lecture et navigation", async ({ page }) => {
  const track = (id: string, albumId: string) => ({
    id,
    title: `Piste ${id}`,
    duration: 90,
    audioUrl: null,
    albumId,
    albumTitle: "Sélection de test",
    albumCover: "/images/placeholder-album.svg",
    genres: [],
    moods: [],
    isVocal: false,
    waveform: null,
  });

  await page.route(/\/api\/albums\/[^/?]+$/, async (route) => {
    const albumId = new URL(route.request().url()).pathname.split("/").at(-1)!;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { album: { id: albumId, tracks: [track("album-track", albumId)] }, similarAlbums: [] } }),
    });
  });
  await page.route(/\/api\/playlists\/[^/?]+$/, async (route) => {
    const playlistId = new URL(route.request().url()).pathname.split("/").at(-1)!;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { playlist: { id: playlistId, tracks: [track("playlist-track", "playlist-album")] } } }),
    });
  });

  await page.goto("/");
  const featured = page.locator("#featured");
  await featured.scrollIntoViewIfNeeded();

  const releaseCard = featured.locator(".home-audio-card").first();
  const releasePlay = releaseCard.locator(".home-release-play");
  const releaseCardLink = releaseCard.locator(".home-audio-card__card-link");
  const releaseDetail = releaseCard.getByRole("link", { name: /^Voir le détail de / }).first();
  const releaseHref = await releaseCardLink.getAttribute("href");
  expect(releaseHref).not.toBeNull();
  await expect(releasePlay).toHaveAttribute("aria-label", /^Lire /);
  await expect(releaseCardLink).toHaveAttribute("href", /^\/albums\//);
  await expect(releaseDetail).toHaveAttribute("href", releaseHref!);

  await releasePlay.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("player-dock")).toBeVisible();
  await expect(releasePlay).toHaveAttribute("aria-label", /^Mettre en pause /);
  await releasePlay.click();
  await expect(releasePlay).toHaveAttribute("aria-label", /^Reprendre /);

  await featured.getByRole("tab", { name: "Playlists" }).click();
  const playlistCard = featured.locator(".home-audio-card").first();
  await expect(playlistCard.locator(".home-release-play")).toHaveAttribute("aria-label", /^Lire /);
  await expect(playlistCard.locator(".home-audio-card__card-link")).toHaveAttribute("href", /^\/playlists\//);
  await playlistCard.locator(".home-release-play").click();
  await expect(playlistCard.locator(".home-release-play")).toHaveAttribute("aria-label", /^Mettre en pause /);

  await featured.getByRole("tab", { name: "Label Parigo" }).click();
  const parigoCard = featured.locator(".home-audio-card").first();
  const parigoCardLink = parigoCard.locator(".home-audio-card__card-link");
  const parigoHref = await parigoCardLink.getAttribute("href");
  expect(parigoHref).toMatch(/^\/albums\//);
  await expect(parigoCard.locator(".home-release-play")).toHaveAttribute("aria-label", /^Lire /);
  await expect(parigoCard.getByRole("link", { name: /^Voir le détail de / })).toHaveCount(2);
  await parigoCardLink.click();
  await expect(page).toHaveURL(new RegExp(`${parigoHref}$`));
});

test("le showreel reste sans effet au survol et introduit la relation avec les compositeurs", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le survol est contrôlé avec un pointeur desktop.");
  await page.goto("/");
  const section = page.getByTestId("home-showreel");
  await section.scrollIntoViewIfNeeded();
  const box = await section.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * .2, box!.y + box!.height * .25);
  await page.mouse.move(box!.x + box!.width * .8, box!.y + box!.height * .75);
  await expect(page.getByTestId("manifesto-album-cover")).toHaveCount(0);
  const composers = page.getByTestId("home-composers");
  await expect(composers.getByRole("heading", { name: "Les talents qui donnent vie à notre catalogue" })).toBeVisible();
  await expect(composers.getByText(/^Parigo \//)).toHaveCount(0);
  await expect(composers.locator('.composer-cloud__group:not([aria-hidden="true"]) a[href^="/compositeurs/"]')).toHaveCount(55);
});

test("les logos clients défilent en bandeau entre les synchronisations et le fil Parigo", async ({ page }) => {
  await page.goto("/");
  const sync = page.getByTestId("home-sync-section");
  const partners = page.getByTestId("home-partners-section");
  const social = page.getByTestId("social-follow-section");
  await expect(sync).toBeVisible();
  await expect(social).toBeVisible();
  await expect(partners.getByRole("heading", { name: "Ils nous ont fait confiance" })).toBeVisible();
  await expect(partners).toHaveCSS("background-color", "rgb(11, 17, 13)");
  await expect(partners.locator(".partner-marquee__group:not(.partner-marquee__duplicate) img")).toHaveCount(12);
  await expect(partners.locator(".partner-marquee__duplicate img")).toHaveCount(12);
  await expect(partners.locator('a[href^="/labels/"]')).toHaveCount(0);
  const track = partners.locator(".partner-marquee__track");
  await expect(track).toHaveCSS("animation-name", "partner-marquee");
  await partners.locator(".partner-marquee").hover();
  await expect(track).toHaveCSS("animation-play-state", "paused");
  expect(await page.evaluate(([syncId, partnersId, socialId]) => {
    const syncNode = document.querySelector(syncId)!;
    const partnersNode = document.querySelector(partnersId)!;
    const socialNode = document.querySelector(socialId)!;
    return Boolean(syncNode.compareDocumentPosition(partnersNode) & Node.DOCUMENT_POSITION_FOLLOWING)
      && Boolean(partnersNode.compareDocumentPosition(socialNode) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, ['[data-testid="home-sync-section"]', '[data-testid="home-partners-section"]', '[data-testid="social-follow-section"]'])).toBe(true);
  expect(await partners.evaluate((node) => getComputedStyle(node).marginLeft)).toBe("0px");
});

test("le showreel respecte la réduction des animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.getByTestId("home-showreel");
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("iframe")).toHaveCount(0);
  await expect(section.getByTestId("home-showreel-video")).toBeVisible();
  await expect(page.getByTestId("manifesto-album-cover")).toHaveCount(0);
  await expect(section.getByRole("heading", { name: /Une musique juste/i })).toBeVisible();
  await expect(section.getByRole("button", { name: /Activer le son|Couper le son/ })).toHaveCount(0);
});

test("la page albums propose une vue liste réellement compacte", async ({ page }, testInfo) => {
  await page.goto("/albums");
  await expect(page.getByRole("heading", { level: 1, name: "Albums", exact: true })).toBeVisible();
  const albumCards = page.locator("[data-album-card]");
  await expect(albumCards.first()).toBeVisible({ timeout: 30_000 });
  await expect(albumCards.first().locator(".album-reference-tag")).toContainText(/^Réf\.\s+\S+/);
  expect(await page.locator(".album-reference-tag").count()).toBe(await albumCards.count());
  await page.getByRole("button", { name: "Vue liste" }).click();
  const firstRow = page.locator('main a[href^="/albums/"]').filter({ has: page.locator("h2") }).first();
  await expect(firstRow).toBeVisible({ timeout: 30_000 });
  const rowBox = await firstRow.boundingBox();
  const coverBox = await firstRow.locator("img").boundingBox();
  expect(rowBox).not.toBeNull();
  expect(coverBox).not.toBeNull();
  expect(rowBox!.height).toBeLessThanOrEqual(150);
  expect(coverBox!.width).toBeLessThanOrEqual(100);
  if (testInfo.project.name !== "mobile") {
    const title = firstRow.locator(".catalog-list-row__title");
    const initialBackground = await firstRow.evaluate((node) => getComputedStyle(node).backgroundImage);
    const initialColor = await title.evaluate((node) => getComputedStyle(node).color);
    await firstRow.hover();
    await expect.poll(() => firstRow.evaluate((node) => getComputedStyle(node).backgroundImage)).not.toBe(initialBackground);
    await expect.poll(() => title.evaluate((node) => getComputedStyle(node).color)).not.toBe(initialColor);
  }
});

test("une playlist Harvest avec une plage de BPM ouvre son détail", async ({ page }) => {
  await page.goto("/playlists/a408d52f57e8de96");
  await expect(page.getByRole("heading", { level: 1, name: "Discovery - Travel" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Lapochka", { exact: true })).toBeVisible();
  expect(await page.getByRole("button", { name: /^Écouter / }).count()).toBeGreaterThan(5);
});

test("la recherche depuis l’accueil interprète l’intention et alimente le lecteur persistant", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name === "mobile", "Le parcours mobile du menu est couvert séparément.");
  await page.goto("/");
  await page.getByLabel("Décrivez la musique que vous imaginez").fill("piano");
  await page.getByRole("button", { name: "Recherche", exact: true }).click();
  await expect(page).toHaveURL(/brief=piano/);
  await expect(page.getByTestId("search-detected-criteria").getByText("Piano", { exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.has("categories")).toBe(false);
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
  const firstTrack = page.getByRole("button", { name: /^Écouter / }).first();
  const trackTitle = (await firstTrack.getAttribute("aria-label"))?.replace(/^Écouter /, "") || "";
  await firstTrack.click();
  const player = page.getByTestId("player-dock");
  await expect(player).toContainText(trackTitle);
  const playerInstance = await player.getAttribute("data-player-instance");
  await expect.poll(async () => player.getByTestId("player-time-current").textContent(), { timeout: 15_000 }).not.toBe("0:00");
  const elapsedBeforeNavigation = await player.getByTestId("player-time-current").textContent();
  await expect(player.getByRole("button", { name: /Ajouter à une playlist/ })).toBeVisible();
  await expect(player.getByRole("button", { name: /Télécharger/ })).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(350);
  await page.locator('header a[href="/albums"]').click();
  await expect(page).toHaveURL(/\/albums$/, { timeout: 30_000 });
  await expect(player).toContainText(trackTitle);
  await expect(player).toHaveAttribute("data-player-instance", playerInstance || "");
  await expect(player.getByTestId("player-time-current")).not.toHaveText("0:00");
  expect(elapsedBeforeNavigation).not.toBe("0:00");
});

test("la shortlist expose son état sans contenu prédictif persistant à vide", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(testInfo.project.name === "mobile", "L’état compact de la shortlist est vérifié en desktop.");
  await page.goto("/search");
  await expect(page.getByRole("heading", { name: "Recherches suggérées" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Suggestions de recherche" })).toHaveCount(0);
  const searchInput = page.locator("#catalog-search");
  const focusedForm = searchInput.locator("xpath=ancestor::form");
  const restingShadow = await focusedForm.evaluate((node) => getComputedStyle(node).boxShadow);
  await searchInput.focus();
  expect(await focusedForm.evaluate((node) => getComputedStyle(node).boxShadow)).toBe(restingShadow);
  await expect(searchInput).toHaveCSS("outline-style", "none");
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-shortlist-trigger]")).toHaveCount(0);
  const add = page.getByRole("button", { name: /^Ajouter à la shortlist :/ }).first();
  await add.click();
  await expect(page.getByRole("dialog", { name: "Shortlist" })).toBeVisible();
  await expect(page.locator("[data-shortlist-trigger]")).toHaveCSS("right", "20px");
  await expect(page.locator("[data-shortlist-trigger]")).toHaveCSS("bottom", "12px");
  await page.getByRole("button", { name: "Connectez-vous", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Se connecter" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Écouter / }).first().click();
  const playerDock = page.getByTestId("player-dock");
  const shortlistTrigger = page.locator("[data-shortlist-trigger]");
  await expect(playerDock).toBeVisible();
  await expect.poll(async () => {
    const [playerBox, triggerBox] = await Promise.all([playerDock.boundingBox(), shortlistTrigger.boundingBox()]);
    return playerBox && triggerBox ? playerBox.y - (triggerBox.y + triggerBox.height) : -1;
  }).toBeGreaterThanOrEqual(10);
  const remove = page.getByRole("button", { name: /^Retirer de la shortlist :/ }).first();
  await expect(remove).toHaveAttribute("aria-pressed", "true");
});

test("la recherche assistée résout Techno dans le bon groupe sans double contrainte", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(testInfo.project.name === "mobile", "La résolution de taxonomie est identique sur la feuille mobile.");
  await page.goto("/search");
  await page.getByRole("button", { name: "Par intention" }).click();
  const input = page.getByRole("searchbox", { name: "Décrivez votre intention musicale" });
  await input.fill("Une techno magnétique avec voix");
  const interpretation = page.getByTestId("search-detected-criteria");
  await expect(interpretation).toContainText("Techno");
  await expect(interpretation).not.toContainText("bientôt disponible");

  await input.fill("Une techno qui tabasse.");
  await expect(interpretation).toContainText("Techno");
  await expect(interpretation).toContainText("Énergique");
  await expect.poll(() => new URL(page.url()).searchParams.get("brief"), {
    timeout: 30_000,
  }).toBe("Une techno qui tabasse.");
  const contractResponse = await page.request.get(
    "/api/search?brief=Une%20techno%20qui%20tabasse.&resolve=1&view=tracks&limit=1",
  );
  expect(contractResponse.ok()).toBe(true);
  const contract = await contractResponse.json();
  expect(contract.meta.intentResolution.categoryIds).toEqual([
    "ATT_8c1be9ece2483e34",
    "ATT_b242dfd7a2cf175e",
  ]);

  const url = new URL(page.url());
  expect(url.searchParams.has("q")).toBe(false);
  expect(url.searchParams.get("brief")).toBe("Une techno qui tabasse.");
  expect(url.searchParams.has("categories")).toBe(false);
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
});

test("la recherche exacte reste accessible depuis le champ unifié", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/search");
  const input = page.getByRole("searchbox", { name: "Rechercher dans les titres de pistes" });
  await input.fill("piano");
  await input.press("Enter");
  await expect(page).toHaveURL(/q=piano/, { timeout: 30_000 });
  const url = new URL(page.url());
  expect(url.searchParams.has("brief")).toBe(false);
  expect(url.searchParams.has("categories")).toBe(false);
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
});

test("les suggestions et les tags enrichis restent lisibles", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Les tags de piste détaillés sont réservés à la densité desktop.");
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.goto("/search?q=piano&view=tracks&type=main");
  const moreTags = page.locator(".parigo-track-row__more-tags").first();
  await expect(moreTags).toBeVisible({ timeout: 30_000 });
  await moreTags.hover();
  await expect(page.getByRole("tooltip")).toContainText("Autres tags");
  await moreTags.click();
  await expect(moreTags.locator("xpath=ancestor::article").locator(".track-detail-panel")).toHaveCount(0);
});

test("les héros playlists et synchronisations conservent leurs contenus", async ({ page }) => {
  await page.goto("/playlists");
  const playlistsTitle = page.getByRole("heading", { level: 1, name: "Les playlists" });
  const titleBox = await playlistsTitle.boundingBox();
  const heroBox = await playlistsTitle.locator("xpath=ancestor::header").boundingBox();
  expect(titleBox).not.toBeNull();
  expect(heroBox).not.toBeNull();
  expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(heroBox!.x + heroBox!.width);
  expect(titleBox!.y + titleBox!.height).toBeLessThanOrEqual(heroBox!.y + heroBox!.height);

  await page.goto("/synchronisations");
  const youtube = page.getByRole("link", { name: "Playlist YouTube" });
  const firstCard = page.locator(".home-sync-card").first();
  await expect(youtube).toBeVisible();
  expect((await youtube.boundingBox())!.y).toBeLessThan((await firstCard.boundingBox())!.y);
});

test("la recherche expose des vues, tris et filtres partageables", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/search?q=techno&view=tracks&type=main");

  await expect(page.getByTestId("search-workspace")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });

  if (testInfo.project.name === "mobile") {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
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
  await page.getByRole("combobox", { name: "Trier les résultats" }).click();
  await page.getByRole("option", { name: "Plus récents" }).click();
  await expect(page).toHaveURL(/sort=recent/);
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
  await expect(page.getByText(/1 inclus · 0 exclus/)).toBeVisible();
  await page.locator("aside").locator("summary").filter({ hasText: "Genre" }).click();
  const excludeAmbient = page.getByRole("button", { name: "Exclure Ambient" }).first();
  await excludeAmbient.click();
  await expect(page).toHaveURL(/categories=.*-ATT_df36fdca961e0855/);
  await expect(page.getByText(/1 inclus · 1 exclus/)).toBeVisible();
});

test("une piste expose ses informations, versions et paroles", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le panneau détaillé est vérifié en desktop.");
  await page.goto("/search?q=Piano%20On%20My%20Mind&view=tracks&type=main");
  await expect(page.getByText("Piano On My Mind", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  const informationButton = page.getByRole("button", { name: /Informations sur la piste : Piano On My Mind/ });
  if (!(await informationButton.isVisible())) {
    await page.getByRole("button", { name: /Plus d’actions : Piano On My Mind/ }).click();
  }
  await informationButton.click();
  const detailTabs = page.getByRole("tablist").filter({ has: page.getByRole("tab", { name: "Informations" }) });
  await expect(detailTabs.getByRole("tab", { name: "Informations" })).toBeVisible();
  await expect(detailTabs.getByText(/^(01|02|03|04)$/)).toHaveCount(0);
  await page.getByRole("tab", { name: "Versions" }).click();
  await expect(page.locator("span").filter({ hasText: /^underscore$/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "Paroles" }).click();
  await expect(page.getByText("Paroles non disponibles.")).toBeVisible();
});

test("la modale de compte bascule entre connexion et inscription complète", async ({ page }, testInfo) => {
  await page.goto("/");
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

test("le reset n’annonce pas un e-mail quand la route Harvest manque", async ({ page }) => {
  await page.route("**/api/auth/forgot-password", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { accepted: true, deliveryConfigured: false } }),
  }));
  await page.goto("/forgot-password");
  await page.getByLabel("E-mail").fill("member@example.invalid");
  await page.getByRole("button", { name: "Envoyer le lien" }).click();

  await expect(page.getByText("La réinitialisation par e-mail n’est pas encore configurée. Contactez Parigo pour récupérer votre accès.")).toBeVisible();
  await expect(page.getByText(/Parigo vient d’envoyer un lien/)).toHaveCount(0);
});

test("les anciens liens FLEX change-password restent compatibles", async ({ page }) => {
  await page.route("**/api/auth/reset-password?token=legacy-reset-token", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { valid: true } }),
  }));

  await page.goto("/change-password/legacy-reset-token");

  await expect(page).toHaveURL(/\/reset-password\?token=legacy-reset-token$/);
  await expect(page.getByText("Nouveau mot de passe", { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("Confirmer")).toBeVisible();
});

test("l’inscription Parigo expose le profil complet en deux étapes", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Prénom *").fill("Test");
  await page.getByLabel("Nom *", { exact: true }).fill("Parigo");
  await page.getByLabel(/E-mail.*utilisé comme identifiant/i).fill("test@example.invalid");
  await page.getByLabel("Mot de passe *", { exact: true }).fill(formFixtureValue);
  await page.getByLabel("Confirmer le mot de passe *").fill(formFixtureValue);
  await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).click();
  await expect(page.getByLabel("Mot de passe *", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Masquer le mot de passe", exact: true }).click();
  await page.getByRole("button", { name: "Continuer vers le profil" }).click();
  await expect(page.getByText("2/2")).toBeVisible();
  await expect(page.getByLabel("Pays *")).toBeVisible();
  await expect(page.getByLabel("Société")).toBeVisible();
  await expect(page.getByLabel("Format de téléchargement préféré")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel(/Recevoir la newsletter/i)).toBeVisible();
  await expect(page.getByLabel(/conditions d’utilisation/i)).not.toBeChecked();
  await expect(page.getByLabel(/politique de confidentialité/i)).not.toBeChecked();
  await page.getByRole("button", { name: "Créer un compte", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Veuillez cocher les deux cases obligatoires" })).toBeVisible();
});
