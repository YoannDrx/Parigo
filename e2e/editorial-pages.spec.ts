import { expect, test } from "@playwright/test";

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

test("les synchronisations restent contenues sur un écran de 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/synchronisations");

  await expect(page.getByRole("heading", { level: 1, name: "Nos synchronisations." })).toBeVisible();
  await expect(page.locator(".home-sync-card").first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toEqual({ clientWidth: 320, scrollWidth: 320 });

  const firstCard = await page.locator(".home-sync-card").first().boundingBox();
  expect(firstCard).not.toBeNull();
  expect(firstCard!.x).toBeGreaterThanOrEqual(0);
  expect(firstCard!.x + firstCard!.width).toBeLessThanOrEqual(320);
});

test("la bordure et les corners des synchronisations restent visibles au survol", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le survol est vérifié avec un pointeur desktop.");
  await page.goto("/synchronisations");
  const card = page.locator(".sync-gallery-card").first();
  const ring = card.locator(".parigo-video-card__ring");
  await card.hover();
  const ringStyle = await ring.evaluate((node) => {
    const style = getComputedStyle(node);
    return { colour: style.borderTopColor, width: style.borderTopWidth };
  });
  expect(ringStyle.width).not.toBe("0px");
  expect(ringStyle.colour).not.toBe("rgba(0, 0, 0, 0)");
  const topCorner = await card.evaluate((node) => getComputedStyle(node, "::before").width);
  expect(Number.parseFloat(topCorner)).toBeGreaterThan(100);
});

test("la home expose une section Clips reliée à la vidéothèque", async ({ page }) => {
  await page.goto("/");
  const section = page.getByTestId("home-clips-section");
  await expect(section.getByRole("heading", { name: "Clips, teasers et performances" })).toBeVisible();
  await expect(section.getByRole("link", { name: /Voir tous les clips/ })).toHaveAttribute("href", "/clips");
  await expect(section.locator(".parigo-video-card").first()).toBeVisible();
});

test("la recherche et les cards compositeurs utilisent la DA Parigo", async ({ page }) => {
  await page.goto("/compositeurs");
  await expect(page.getByPlaceholder("Rechercher par nom…")).toBeVisible();
  await expect(page.locator(".catalog-search-frame.search-query-frame")).toBeVisible();
  const card = page.locator(".composer-card").first();
  await expect(card).toBeVisible();
  await expect(card.locator(".composer-card__corner")).toHaveCount(2);
  await expect(page.locator(".composer-card").getByText(/^C\s*\/\s*\d+$/)).toHaveCount(0);
});

test("le détail d’une synchronisation contient son titre et masque la description YouTube", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/synchronisations/ajvhKSKcas8");

  const title = page.locator("main h1");
  await expect(title).toBeVisible();
  const mobileVideo = page.getByRole("region", { name: "Lecteur vidéo" });
  expect((await mobileVideo.boundingBox())!.y).toBeLessThan((await title.boundingBox())!.y);
  expect(await title.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await expect(page.locator("main")).not.toContainText("spotify.com");
  await expect(page.locator("main")).not.toContainText("@parigoproductionmusic");
  const actions = page.getByRole("complementary");
  await expect(actions.getByRole("link", { name: "YouTube", exact: true })).toBeVisible();
  await expect(actions.getByRole("link", { name: "Parler à l’équipe" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  const desktopVideoBox = await page.getByRole("region", { name: "Lecteur vidéo" }).boundingBox();
  const desktopTitleBox = await page.locator("main h1").boundingBox();
  expect(desktopVideoBox).not.toBeNull();
  expect(desktopTitleBox).not.toBeNull();
  expect(desktopVideoBox!.x).toBeLessThan(desktopTitleBox!.x);
  expect(await page.locator("main h1").evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
});

test("la home conserve le process et le brief sans les deux sections supprimées", async ({ page }) => {
  await page.goto("/");

  const process = page.locator("#process");
  await expect(process.getByTestId("process-progress")).toBeVisible();
  await expect(process.getByText(/Progression du parcours|Parigo · supervision musicale|Chercher · Écouter · Sélectionner/)).toHaveCount(0);
  await expect(process.locator(".process-step")).toHaveCount(3);
  await expect(process.locator(".process-step > span.absolute")).toHaveCount(0);
  await expect(process.locator(".process-step__signal")).toHaveCount(0);
  await expect(page.locator("#sensations")).toHaveCount(0);
  await expect(page.locator("#editorial-playlists")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Envoyez-nous un brief/ })).toBeVisible();
  await expect(page.getByText("Parlez-nous de votre projet, de votre deadline et de vos références, Nous construisons une sélection pour vous.", { exact: true })).toBeVisible();
  await expect(page.getByText("Sorties, playlists, images et actualités du label — tous nos liens réunis au même endroit.", { exact: true })).toBeVisible();

  const socialSection = page.getByTestId("social-follow-section");
  const socialSpacing = await socialSection.evaluate((node) => {
    const style = getComputedStyle(node);
    return { top: style.paddingTop, bottom: style.paddingBottom };
  });
  expect(socialSpacing.top).toBe(socialSpacing.bottom);

  expect(await page.evaluate(() => {
    const processNode = document.getElementById("process");
    const projectNode = document.querySelector(".project-invitation");
    return Boolean(processNode && projectNode && processNode.compareDocumentPosition(projectNode) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
});

test("le sommaire légal suit la lecture et conserve les ancres natives", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "La colonne sticky est un comportement desktop.");
  await page.goto("/legal");
  const toc = page.locator(".legal-toc");
  const articles = page.locator(".legal-section");
  await expect(toc).toHaveCSS("position", "sticky");
  await expect(toc).toHaveCSS("top", "98px");
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
  const firstTop = (await toc.boundingBox())!.y;
  await page.evaluate(() => window.scrollTo({ top: 940, behavior: "instant" }));
  const secondTop = (await toc.boundingBox())!.y;
  expect(Math.abs(firstTop - secondTop)).toBeLessThanOrEqual(2);

  await articles.last().evaluate((article) => article.scrollIntoView({ block: "start", behavior: "instant" }));
  const lastLink = toc.getByRole("link", { name: /Contact/ });
  await expect(lastLink).toHaveAttribute("aria-current", "location");

  const hostingLink = toc.getByRole("link", { name: /Hébergement/ });
  await hostingLink.click();
  await expect(page).toHaveURL(/#legal-03-hebergement$/);
  await expect(hostingLink).toHaveAttribute("aria-current", "location");
});

test("l’onde du héros reste animée sur mobile sans charger WebGL", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await expect(hero.locator("canvas")).toHaveCount(0);
  const fallback = hero.locator(".signal-field-fallback");
  await expect(fallback).toHaveAttribute("data-static", "false");
  const wave = fallback.locator(".signal-field-fallback__wave").first();
  const before = await wave.evaluate((node) => getComputedStyle(node).transform);
  await page.waitForTimeout(300);
  const after = await wave.evaluate((node) => getComputedStyle(node).transform);
  expect(after).not.toBe(before);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const reducedFallback = page.getByTestId("home-hero").locator(".signal-field-fallback");
  await expect(reducedFallback).toHaveAttribute("data-static", "true");
  await expect(reducedFallback.locator(".signal-field-fallback__wave").first()).toHaveCSS("animation-name", "none");
});

test("les ondes du héros gagnent du contraste uniquement en thème clair", async ({ page }) => {
  await page.goto("/");
  const signal = page.getByTestId("home-hero").locator(".hero-signal-field");
  await expect(signal).toBeVisible();
  const lightStyle = await signal.evaluate((node) => {
    const style = getComputedStyle(node);
    return { filter: style.filter, blend: style.mixBlendMode, opacity: Number(style.opacity) };
  });
  expect(lightStyle.filter).not.toBe("none");
  expect(lightStyle.blend).toBe("multiply");
  expect(lightStyle.opacity).toBeGreaterThanOrEqual(.9);

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  });
  await expect(signal).toHaveCSS("mix-blend-mode", "screen");
  await expect(signal).toHaveCSS("filter", "none");
});

test("les pages institutionnelles restent lisibles à 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const path of ["/about", "/contact", "/licensing", "/legal", "/privacy", "/terms", "/rights"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport, `débordement horizontal sur ${path}`).toEqual({ clientWidth: 320, scrollWidth: 320 });
  }

  await page.goto("/legal");
  const mobileContents = page.locator(".legal-toc-mobile");
  await expect(mobileContents).toBeVisible();
  await mobileContents.locator("summary").click();
  await expect(page.getByRole("navigation", { name: "Sommaire du document" })).toBeVisible();
  await page.getByRole("navigation", { name: "Sommaire du document" }).getByRole("link", { name: /Hébergement/ }).click();
  await expect(mobileContents).not.toHaveAttribute("open", "");
  await expect(page.locator(".legal-section")).toHaveCount(7);
});

test("les héros publics n’affichent plus de surtitre décoratif", async ({ page }) => {
  const cases = [
    ["/search", "Catalogue Parigo"],
    ["/albums", "Catalogue / Albums"],
    ["/synchronisations", "Music for images"],
    ["/playlists", "Catalogue / Sélections"],
    ["/licensing", "Licensing"],
    ["/label-parigo", "Parigo / Discographie"],
    ["/compositeurs", "Talents Parigo"],
    ["/clips", "Images en musique"],
    ["/labels", "Catalogue / Labels"],
    ["/about", "Parigo / Maison indépendante"],
    ["/contact", "Nous contacter"],
    ["/legal", "Informations légales"],
    ["/privacy", "Données & choix"],
    ["/terms", "Règles du service"],
    ["/rights", "Propriété intellectuelle"],
  ] as const;
  for (const [path, label] of cases) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main").getByText(label, { exact: true })).toHaveCount(0);
  }
});

test("le formulaire Contact conserve sa composition d’origine et laisse respirer le champ Entreprise", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/contact");
  await expect(page.getByText("Racontez-nous votre projet.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Parigo Music", { exact: true }).last()).toBeVisible();
  const companyField = page.locator('input[name="company"]').locator("..");
  const paddingLeft = await companyField.evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingLeft));
  expect(paddingLeft).toBeGreaterThanOrEqual(20);
});
