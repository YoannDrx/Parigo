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

  await expect(page.getByRole("heading", { level: 1, name: "Nos Synchros" })).toBeVisible();
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

test("les cartes vidéo utilisent un footer éditorial permanent sur mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Le footer éditorial est spécifique au mobile.");
  await page.setViewportSize({ width: 320, height: 740 });
  for (const [path, cardSelector, mediaSelector, captionSelector] of [
    ["/clips", ".parigo-video-card", ".parigo-video-card__frame", ".parigo-video-card__caption"],
    ["/synchronisations", ".sync-gallery-card", ".home-sync-card__frame", ".home-sync-card__caption"],
  ] as const) {
    await page.goto(path);
    const card = page.locator(cardSelector).first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    const footer = card.locator(".editorial-card__mobile-footer");
    await expect(footer).toBeVisible();
    await expect(card.locator(captionSelector)).toBeHidden();
    await expect(footer).not.toContainText(/Parigo Production Music/i);
    await expect(footer.getByText(/^\d{4}$/)).toBeVisible();
    const [media, footerBox, playBox, detailBox] = await Promise.all([
      card.locator(mediaSelector).boundingBox(),
      footer.boundingBox(),
      footer.getByRole("button", { name: /^(Lire|Play)/ }).boundingBox(),
      footer.getByRole("link", { name: /^(Voir le détail|View)/ }).boundingBox(),
    ]);
    expect(media, `${path} ne publie pas de média`).not.toBeNull();
    expect(footerBox, `${path} ne publie pas de footer`).not.toBeNull();
    expect(footerBox!.y).toBeGreaterThanOrEqual(media!.y + media!.height - 1);
    expect(footerBox!.height).toBeLessThanOrEqual(156);
    expect(playBox!.height).toBeGreaterThanOrEqual(44);
    expect(detailBox!.width).toBeGreaterThanOrEqual(44);
    expect(detailBox!.height).toBeGreaterThanOrEqual(44);
    const mobileCardStyle = () => card.evaluate((node) => {
      const ring = node.querySelector(".parigo-video-card__ring");
      const frame = node.querySelector(".home-sync-card__frame");
      return {
        borderColor: getComputedStyle(node).borderColor,
        boxShadow: getComputedStyle(node).boxShadow,
        transform: getComputedStyle(node).transform,
        cornerWidth: getComputedStyle(node, "::before").width,
        mediaRing: ring ? getComputedStyle(ring).borderColor : getComputedStyle(frame!, "::after").borderColor,
      };
    });
    const restingStyle = await mobileCardStyle();
    await footer.getByRole("button", { name: /^(Lire|Play)/ }).focus();
    expect(await mobileCardStyle()).toEqual(restingStyle);
  }

  await page.goto("/talents");
  const talent = page.locator(".composer-card").first();
  await expect(talent).toBeVisible({ timeout: 30_000 });
  const [talentBox, talentCaption] = await Promise.all([
    talent.boundingBox(),
    talent.locator(".composer-card__caption").boundingBox(),
  ]);
  expect(talentCaption!.y).toBeGreaterThanOrEqual(talentBox!.y - 1);
  expect(talentCaption!.y + talentCaption!.height).toBeLessThanOrEqual(talentBox!.y + talentBox!.height + 1);
});

test("les titres signés et les grilles catalogue restent lisibles sur mobile", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/talents", "/synchronisations", "/privacy"]) {
      await page.goto(path);
      const frame = page.locator(".page-hero__frame");
      const title = frame.getByRole("heading", { level: 1 });
      const signature = title.locator(".parigo-title-signature");
      await expect(signature).toBeVisible();
      const [frameBox, titleBox, signatureBox] = await Promise.all([
        frame.boundingBox(),
        title.boundingBox(),
        signature.boundingBox(),
      ]);
      expect(frameBox, `cadre absent sur ${path} à ${width}px`).not.toBeNull();
      expect(titleBox, `titre absent sur ${path} à ${width}px`).not.toBeNull();
      expect(signatureBox, `signature absente sur ${path} à ${width}px`).not.toBeNull();
      expect(titleBox!.x + titleBox!.width, `titre débordant sur ${path} à ${width}px`).toBeLessThanOrEqual(frameBox!.x + frameBox!.width + 1);
      expect(signatureBox!.x + signatureBox!.width, `signature débordante sur ${path} à ${width}px`).toBeLessThanOrEqual(frameBox!.x + frameBox!.width + 1);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/talents");
  const composerCards = page.locator("[data-testid='composer-directory-results'] .composer-card");
  await expect(composerCards.nth(1)).toBeVisible();
  const [firstComposer, secondComposer] = await Promise.all([
    composerCards.nth(0).boundingBox(),
    composerCards.nth(1).boundingBox(),
  ]);
  expect(Math.abs(firstComposer!.width - firstComposer!.height)).toBeLessThanOrEqual(1);
  expect(secondComposer!.y).toBeGreaterThan(firstComposer!.y + firstComposer!.height - 1);

  await page.goto("/albums");
  const albumCards = page.locator('main a[href^="/albums/"]');
  await expect(albumCards.nth(1)).toBeVisible({ timeout: 30_000 });
  const [firstAlbum, secondAlbum] = await Promise.all([
    albumCards.nth(0).boundingBox(),
    albumCards.nth(1).boundingBox(),
  ]);
  expect(secondAlbum!.y).toBeGreaterThan(firstAlbum!.y + firstAlbum!.height - 1);
});

test("les headers catalogue, synchronisations et légaux partagent la même composition", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "La comparaison typographique desktop suffit ; la version mobile est couverte séparément.");
  const fontSizes: string[] = [];
  for (const path of ["/labels", "/notre-label", "/playlists", "/synchronisations", "/legal"]) {
    await page.goto(path);
    const hero = page.locator(".page-hero__frame");
    const title = hero.getByRole("heading", { level: 1 });
    await expect(hero).toBeVisible();
    await expect(title.locator(".parigo-title-signature")).toHaveCount(1);
    fontSizes.push(await title.evaluate((node) => getComputedStyle(node).fontSize));
  }
  expect(new Set(fontSizes).size).toBe(1);
});

test("les héros éditoriaux publient les titres et introductions validés", async ({ page }) => {
  test.setTimeout(120_000);
  const cases = [
    ["/synchronisations", "Nos Synchros", "Du cinéma à la publicité, nos musiques trouvent leur place à l’image."],
    ["/playlists", "Nos playlists", "Des sélections pour explorer le catalogue autrement."],
    ["/licensing", "Une musique trouvée, une licence maîtrisée", "Chaque projet a ses usages, chaque usage ses droits. Parigo vous accompagne pour obtenir les autorisations adaptées et sécuriser votre licence, en France comme à l’international."],
    ["/labels", "Labels", "Les catalogues que nous avons choisis de représenter"],
    ["/notre-label", "Notre label", "Nos productions originales, au cœur de l’identité musicale de Parigo."],
    ["/clips", "Clips", "Le catalogue Parigo en images, entre clips, teasers et performances live."],
    ["/talents", "Nos talents", "Les compositeurs, artistes et collectifs qui donnent sa couleur au catalogue original Parigo."],
  ] as const;

  for (const [path, title, intro] of cases) {
    await page.goto(path);
    const hero = page.locator(".page-hero__frame");
    await expect(hero.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
    await expect(hero.getByText(intro, { exact: true })).toBeVisible();
  }
});

test("la bordure et les corners des synchronisations restent visibles au survol", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le survol est vérifié avec un pointeur desktop.");
  await page.goto("/synchronisations");
  const card = page.locator(".sync-gallery-card").first();
  const caption = card.locator(".home-sync-card__caption");
  const image = card.locator(".home-sync-card__image");
  await expect(caption).toHaveCSS("opacity", "0");
  await card.hover();
  await expect(caption).toHaveCSS("opacity", "1");
  await expect(image).toHaveCSS("filter", "blur(5px)");
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

test("la recherche compositeurs reste limitée aux profils publics canoniques", async ({ page }) => {
  await page.goto("/talents");
  const search = page.getByPlaceholder("Rechercher par nom…");
  await expect(search).toBeVisible();
  const searchFrame = page.locator(".composer-directory-search");
  await expect(searchFrame).toBeVisible();
  await search.focus();
  await expect(searchFrame).toHaveCSS("box-shadow", "none");
  const card = page.locator(".composer-card").first();
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toHaveAttribute("src", /\/images\/composers\/detail\//);
  await expect(card.locator("img")).toHaveCSS("object-fit", "cover");
  await expect(card.locator(".composer-card__corner")).toHaveCount(2);
  await expect(page.locator(".composer-card").getByText(/^C\s*\/\s*\d+$/)).toHaveCount(0);

  await search.fill("Rebecca");
  await expect(page.locator(".composer-card")).toHaveCount(0);
  await expect(page.getByText("Aucun compositeur ne correspond à cette recherche.")).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("Rebecca");
  await search.fill("Minimatic");
  const results = page.getByTestId("composer-directory-results");
  await expect(results.locator(".composer-card")).toHaveCount(1);
  await expect(results.getByRole("heading", { name: "Minimatic", exact: true })).toBeVisible();
  await expect(results.getByText("Minimatic (NS)", { exact: true })).toHaveCount(0);
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
  await expect(page.locator("main")).not.toContainText("Parigo screening room");
  await expect(page.locator("main")).not.toContainText("16:9");
  const actions = page.getByRole("complementary");
  await expect(actions.getByRole("link", { name: /YouTube/ })).toBeVisible();
  await expect(actions.getByRole("link", { name: "Parler à l’équipe" })).toHaveCount(0);
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

test("previous/next disparaît de toutes les fiches de détail", async ({ page }) => {
  for (const path of [
    "/talents/minimatic",
    "/clips/yt-wrO96WV69aY",
    "/synchronisations/ajvhKSKcas8",
    "/albums/48b4b95fe1f09019",
    "/playlists/22b6c3499f843b2d",
    "/labels/0f9769346759ee5a",
    "/selections/musique-cinematique",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("detail-page-navigation")).toHaveCount(0);
  }
});

test("les pages d’information alignent leurs corners et retirent la signature géographique", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator("main")).not.toContainText("Parigo Music · Paris · France");

  const toc = page.locator(".legal-toc");
  const radii = await toc.evaluate((node) => ({
    container: getComputedStyle(node).borderTopRightRadius,
    corner: getComputedStyle(node, "::before").borderTopRightRadius,
    top: getComputedStyle(node, "::before").top,
    right: getComputedStyle(node, "::before").right,
  }));
  expect(radii.corner).toBe(radii.container);
  expect(radii.top).toBe("-1px");
  expect(radii.right).toBe("-1px");
  await expect(toc).toHaveCSS("scrollbar-gutter", "auto");
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

test("les ondes du héros restent légères et animées sur mobile sans forme circulaire", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await expect(hero.locator("canvas")).toHaveCount(0);
  const fallback = hero.locator(".signal-field-fallback");
  await expect(fallback).toHaveAttribute("data-static", "false");
  await expect(fallback.locator(".signal-field-fallback__wave").first()).toHaveCSS("animation-name", "signal-field-shift");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const reducedFallback = page.getByTestId("home-hero").locator(".signal-field-fallback");
  await expect(reducedFallback).toHaveAttribute("data-static", "true");
  await expect(reducedFallback.locator(".signal-field-fallback__wave").first()).toHaveCSS("animation-name", "none");
});

test("le héros suit la palette Catalogue puis Brief IA", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  const signature = hero.locator(".parigo-title-signature");
  await expect(hero).toHaveAttribute("data-search-mode", "catalog");
  await expect(hero.locator(".signal-field-fallback")).toHaveAttribute("data-mode", "catalog");
  const resolveColorToken = (token: string) => page.evaluate((name) => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = `var(${name})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  }, token);
  const catalogColor = await signature.evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(catalogColor).toBe(await resolveColorToken("--signal"));
  await page.getByRole("button", { name: "Mode de recherche : Catalogue" }).click();
  await page.getByRole("option", { name: /Brief IA/ }).click();
  await expect(hero).toHaveAttribute("data-search-mode", "ai");
  await expect(hero.locator(".signal-field-fallback")).toHaveAttribute("data-mode", "ai");
  await expect.poll(() => signature.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(catalogColor);
  await expect.poll(() => signature.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(await resolveColorToken("--ai-search"));
  await hero.getByRole("button", { name: "Mode de recherche : Brief IA" }).click();
  await hero.getByRole("option", { name: /Catalogue/ }).click();
  await expect.poll(() => signature.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(catalogColor);
});

test("les métriques publiques compactent le contenu après séparateur sur mobile", async ({ page }) => {
  for (const [width, expectedGap] of [[390, 24], [1024, 64]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/clips");
    const firstCard = page.getByTestId("clips-content").locator(".parigo-video-card").first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });
    const [heroBox, cardBox, metrics] = await Promise.all([
      page.locator(".page-hero").boundingBox(),
      firstCard.boundingBox(),
      page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        return {
          gutter: styles.getPropertyValue("--space-page-gutter").trim(),
          divider: styles.getPropertyValue("--space-divider-content").trim(),
          section: styles.getPropertyValue("--space-section-y").trim(),
        };
      }),
    ]);
    expect(heroBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(Math.abs(cardBox!.y - (heroBox!.y + heroBox!.height) - expectedGap)).toBeLessThanOrEqual(1);
    expect(metrics).toEqual(width < 768
      ? { gutter: "1rem", divider: "1.5rem", section: "3rem" }
      : { gutter: "2rem", divider: "4rem", section: "6rem" });
  }
});

test("le héros desktop conserve ses ondes autonomes sans forme organique", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Les ondes desktop sont contrôlées dans le viewport desktop.");
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  const backdrop = hero.getByTestId("organic-hero-backdrop");

  await expect(backdrop).toBeVisible({ timeout: 10_000 });
  await expect(backdrop).toHaveCSS("pointer-events", "none");
  await expect(backdrop.getByTestId("organic-hero-blob")).toHaveCount(0);
  await expect(backdrop.locator("canvas")).toHaveCount(1, { timeout: 10_000 });
  const gradientLayer = backdrop.locator(":scope > div").first();
  expect(await gradientLayer.evaluate((node) => getComputedStyle(node).backgroundImage)).toContain("linear-gradient");
  expect(await gradientLayer.evaluate((node) => getComputedStyle(node).backgroundImage)).not.toContain("radial-gradient");
});

test("les ondes du héros gagnent du contraste uniquement en thème clair", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("parigo-theme", "light"));
  await page.goto("/");
  const signal = page.getByTestId("home-hero").locator(".hero-signal-field");
  await expect(signal).toBeVisible();
  await expect(signal).toHaveCSS("mix-blend-mode", "multiply");
  await expect.poll(() => signal.evaluate((node) => Number(getComputedStyle(node).opacity))).toBeGreaterThanOrEqual(.9);
  expect(await signal.evaluate((node) => getComputedStyle(node).filter)).not.toBe("none");

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  });
  await expect(signal).toHaveCSS("mix-blend-mode", "screen");
  await expect(signal).toHaveCSS("filter", "none");
});

test("les héros des pages internes restent sobres sans formes géométriques en arrière-plan", async ({ page }) => {
  await page.goto("/albums");
  const hero = page.locator(".page-hero");
  await expect(hero).toBeVisible();
  await expect(hero).toHaveCSS("background-image", "none");
  expect(await hero.evaluate((node) => getComputedStyle(node, "::before").content)).toBe("none");
  await expect(hero.locator(".page-hero__title-panel")).toHaveCSS("background-image", "none");
  const aside = hero.locator(".page-hero__aside");
  expect(await aside.evaluate((node) => getComputedStyle(node, "::before").content)).toBe("none");

  await page.goto("/albums/4b21f575ee992534");
  const detailHero = page.locator(".editorial-detail-hero").first();
  await expect(detailHero).toBeVisible();
  expect(await detailHero.evaluate((node) => getComputedStyle(node, "::after").content)).toBe("none");
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

test("About adopte les nouveaux textes et Licensing ouvre sur une grille repliée", async ({ page }) => {
  await page.goto("/licensing");
  await expect(page.getByRole("heading", { level: 1, name: "Une musique trouvée, une licence maîtrisée" })).toBeVisible();
  await expect(page.getByText("Grille indicative", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Un cadre lisible, projet par projet" })).toHaveCount(0);
  await expect(page.getByText("Tarifs publics indicatifs", { exact: false })).toHaveCount(0);
  const rateButtons = page.locator('main button[aria-controls^="licensing-panel-"]');
  await expect(rateButtons).toHaveCount(6);
  expect(await rateButtons.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-expanded")))).toEqual(Array(6).fill("false"));
  await expect(page.locator('main [id^="licensing-panel-"]')).toHaveCount(0);
  for (const removedStep of ["Repérage", "Vérification", "Autorisation", "Diffusion"]) {
    await expect(page.getByText(removedStep, { exact: true })).toHaveCount(0);
  }

  await page.goto("/about");
  await expect(page.locator(".page-hero")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Une librairie avant tout" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Le Monde de demain — Parigo" })).toHaveAttribute("loading", "eager");
  await expect(page.locator("main").getByText("À propos", { exact: true })).toHaveCount(0);
  await expect(page.locator("main").getByText("La musique, une affaire humaine", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Fondée en 2004, Parigo est une librairie musicale indépendante", { exact: false })).toBeVisible();
  await expect(page.getByText("Éditer moins", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Indépendante depuis Paris", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Parler d.un projet/i })).toHaveCount(0);
});

test("About laisse le récit poursuivre sa lecture sous l’image sans colonne étriquée", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/about");

  const story = page.locator(".about-story");
  const flow = await story.evaluate((element) => {
    const image = element.querySelector("img")?.getBoundingClientRect();
    const lastParagraph = element.querySelector("p:last-child");
    if (!image || !lastParagraph) return null;
    const range = document.createRange();
    range.selectNodeContents(lastParagraph);
    return {
      image: { left: image.left, right: image.right, bottom: image.bottom },
      lines: [...range.getClientRects()].map((rect) => ({ left: rect.left, right: rect.right, top: rect.top })),
    };
  });

  expect(flow).not.toBeNull();
  expect(flow!.lines.some((line) => line.top >= flow!.image.bottom - 1 && line.left < flow!.image.right)).toBe(true);

  await page.setViewportSize({ width: 800, height: 900 });
  await page.reload();
  const imageBox = await page.getByRole("img", { name: "Le Monde de demain — Parigo" }).boundingBox();
  const headingBox = await page.getByRole("heading", { level: 1, name: "Une librairie avant tout" }).boundingBox();
  expect(imageBox).not.toBeNull();
  expect(headingBox).not.toBeNull();
  expect(headingBox!.y).toBeGreaterThan(imageBox!.y + imageBox!.height);
  expect(headingBox!.width).toBeGreaterThan(650);
});

test("la page des labels adopte l’intitulé Labels", async ({ page }) => {
  await page.goto("/labels");
  await expect(page.getByRole("heading", { level: 1, name: "Labels" })).toBeVisible();
  await expect(page.locator("footer").getByRole("link", { name: "Labels", exact: true })).toBeVisible();
});

test("la page Clips porte l’introduction éditoriale complète", async ({ page }) => {
  await page.goto("/clips");
  await expect(page.locator("main")).toContainText("Le catalogue Parigo en images, entre clips, teasers et performances live.");
});

test("le détail label privilégie le logo et ne renvoie plus vers son site", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/labels/0f9769346759ee5a");
  const hero = page.locator(".editorial-detail-hero").first();
  await expect(hero).toBeVisible();
  await expect(hero.getByRole("link", { name: /Site web|Website/i })).toHaveCount(0);
  const logoPanel = hero.locator("> div").first();
  const logoPanelBox = await logoPanel.boundingBox();
  expect(logoPanelBox).not.toBeNull();
  expect(logoPanelBox!.height).toBeGreaterThanOrEqual(350);
});

test("le détail compositeur aligne le nom en bas du portrait sans arc décoratif", async ({ page }, testInfo) => {
  await page.goto("/talents/harvest-minimatic-ns-1w2ynwe");
  const hero = page.locator(".editorial-detail-hero");
  await expect(hero).toBeVisible();
  expect(await hero.evaluate((node) => getComputedStyle(node, "::after").content)).toBe("none");
  if (testInfo.project.name === "desktop") {
    const [portraitBox, titleBox] = await Promise.all([
      page.getByTestId("composer-detail-image").locator("..").boundingBox(),
      page.getByRole("heading", { level: 1, name: "Minimatic" }).boundingBox(),
    ]);
    expect(portraitBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(Math.abs((portraitBox!.y + portraitBox!.height) - (titleBox!.y + titleBox!.height))).toBeLessThanOrEqual(2);
  }
});

test("les héros publics n’affichent plus de surtitre décoratif", async ({ page }) => {
  const cases = [
    ["/albums", "Catalogue / Albums"],
    ["/synchronisations", "Music for images"],
    ["/playlists", "Catalogue / Sélections"],
    ["/licensing", "Licensing"],
    ["/notre-label", "Parigo / Discographie"],
    ["/talents", "Talents Parigo"],
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

  await page.goto("/search");
  await expect(page.locator("main h1")).toHaveText("Recherche");
  await expect(page.locator("main")).not.toContainText("Donnez le ton à vos images");
});

test("le formulaire Contact conserve sa composition d’origine sans pièce jointe", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/contact");
  await expect(page.getByText("Racontez-nous votre projet.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Parigo Music", { exact: true }).last()).toBeVisible();
  const companyField = page.locator('input[name="company"]').locator("..");
  const paddingLeft = await companyField.evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingLeft));
  expect(paddingLeft).toBeGreaterThanOrEqual(20);
  await expect(page.getByText("Pièce jointe", { exact: false })).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test("la page Contact présente uniquement l’équipe Parigo demandée", async ({ page }) => {
  await page.goto("/contact");
  const team = page.getByTestId("contact-team");
  await expect(team.getByRole("heading", { level: 2, name: "Notre équipe" })).toBeVisible();
  await expect(team.getByRole("heading", { level: 3 })).toHaveText(["Guillaume Albeck", "Caroline Senyk", "Eliott Grellier"]);
  await expect(team.getByText("Responsable copyright et production musicale", { exact: true })).toBeVisible();
  await expect(team.getByRole("link", { name: "guillaume.albeck@parigomusic.com" })).toHaveAttribute("href", "mailto:guillaume.albeck@parigomusic.com");
  await expect(team.getByRole("link", { name: "caroline.senyk@parigomusic.com" })).toHaveAttribute("href", "mailto:caroline.senyk@parigomusic.com");
  await expect(team.getByRole("link", { name: "eliott.grellier@parigomusic.com" })).toHaveAttribute("href", "mailto:eliott.grellier@parigomusic.com");
  await expect(team.locator("article .font-mono")).toHaveCount(0);
  await expect(team).not.toContainText("Une question urgente ? Appelez-nous :");
  const details = page.getByTestId("contact-details");
  await expect(details).toContainText("Une question urgente ? Appelez-nous :");
  await expect(details).not.toContainText("Demandes de licence, recherches musicales et accompagnement éditorial.");
  const urgentPhone = details.getByRole("link", { name: "+33 (0)6 49 39 69 22" });
  await expect(urgentPhone).toHaveCSS("white-space", "nowrap");
  await expect(urgentPhone.locator("strong")).toHaveCount(0);
  await expect(urgentPhone).toHaveCSS("font-weight", "400");
  await expect(team).not.toContainText("Mélodie");
  await expect(team).not.toContainText("Melody");

  await page.goto("/en/contact");
  await expect(page.getByTestId("contact-team").getByText("Head of Copyright and Music Production", { exact: true })).toBeVisible();
  await expect(page.getByTestId("contact-team")).not.toContainText("Administration");
});

test("la demande de licence mobile conserve ses guillemets français avec un titre compact", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/contact?track=c09811fbd340c24551e1c542a5591171");
  const title = page.locator("main h1");
  await expect(title).toContainText("Low Baller", { timeout: 30_000 });
  expect((await title.textContent()) || "").toContain("« Low Baller »");
  expect(Number.parseFloat(await title.evaluate((node) => getComputedStyle(node).fontSize))).toBeLessThanOrEqual(48);
  expect(await title.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  const message = page.getByRole("textbox", { name: /Projet & licence/ });
  expect(Number.parseFloat(await message.evaluate((node) => getComputedStyle(node).fontSize))).toBeLessThanOrEqual(18);
});

test("les coordonnées Contact suivent le formulaire sur desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le panneau reste dans le flux sur mobile.");
  await page.goto("/contact");
  const details = page.getByTestId("contact-details");
  await expect(details).toHaveCSS("position", "sticky");
  const top = await details.evaluate((node) => getComputedStyle(node).top);
  expect(Number.parseFloat(top)).toBeGreaterThan(0);
});

test("le consentement du formulaire Contact affiche une validation Parigo accessible", async ({ page }) => {
  await page.goto("/contact");
  await page.locator('input[name="name"]').fill("Camille Martin");
  await page.locator('input[name="email"]').fill("camille@example.com");
  await page.locator('textarea[name="message"]').fill("Nous préparons un documentaire et cherchons une musique originale pour le film.");
  await page.locator('button[type="submit"]').click();

  const consent = page.locator('input[name="consent"]');
  const error = page.getByRole("alert").filter({ hasText: "Veuillez accepter l’utilisation de vos informations" });
  await expect(error).toBeVisible();
  await expect(error).toHaveClass(/contact-consent-error/);
  await expect(consent).toHaveAttribute("aria-invalid", "true");
  await expect(consent).toBeFocused();
  await page.locator("label.contact-consent-label").click();
  await expect(error).toHaveCount(0);
  await expect(consent).not.toHaveAttribute("aria-invalid", "true");
});
