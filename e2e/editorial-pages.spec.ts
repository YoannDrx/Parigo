import { expect, test, type Page } from "@playwright/test";

async function enableSimilarityForVisualTest(page: Page) {
  await page.route("**/api/similarity/capabilities", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ data: {
      track: { advertised: true, enabled: true, multiSeed: true, prioritizeBpm: true },
      prompt: { advertised: true, enabled: true },
      upload: { advertised: true, enabled: true, contentTypes: ["audio/mpeg", "audio/wav"], maxBytes: 125_829_120, maxDurationSeconds: 900 },
      externalUrl: { advertised: true, enabled: true, platforms: ["youtube", "spotify", "vimeo", "soundcloud", "appleMusic", "tiktok"] },
      playlistSuggestions: true,
    } }),
  }));
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

test("le footer expose les sept plateformes officielles sans Linktree", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  const platforms = [
    ["Parigo sur Instagram", "https://www.instagram.com/parigo_music/"],
    ["Parigo sur YouTube", "https://www.youtube.com/@parigoproductionmusic"],
    ["Parigo sur LinkedIn", "https://www.linkedin.com/company/parigo/"],
    ["Parigo sur Facebook", "https://www.facebook.com/Parigomusic"],
    ["Parigo sur Bandcamp", "https://parigomusic.bandcamp.com/music"],
    ["Les playlists Parigo sur Spotify", "https://open.spotify.com/user/zy4tz4ibp2hi7qvf315g5dv85/playlists"],
    ["Parigo sur TikTok", "https://www.tiktok.com/@parigomusic"],
  ] as const;
  for (const [label, href] of platforms) {
    const link = footer.getByRole("link", { name: label });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link.locator("svg")).toHaveCount(1);
  }
  await expect(footer.getByRole("link", { name: /Linktree/i })).toHaveCount(0);
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

test("les cartes vidéo reprennent la DA des cartes audio sur mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "La carte vidéo inspirée des cartes audio est spécifique au mobile.");
  await page.setViewportSize({ width: 320, height: 740 });
  for (const [path, cardSelector, mediaSelector, captionSelector] of [
    ["/clips", ".parigo-video-card", ".parigo-video-card__frame", ".parigo-video-card__caption"],
    ["/synchronisations", ".sync-gallery-card", ".home-sync-card__frame", ".home-sync-card__caption"],
  ] as const) {
    await page.goto(path);
    const card = page.locator(cardSelector).first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    const footer = card.locator(".editorial-card__mobile-footer");
    const cardLink = card.locator(".editorial-video-card__mobile-link");
    await expect(footer).toBeVisible();
    await expect(cardLink).toBeVisible();
    await expect(card.locator(captionSelector)).toBeHidden();
    await expect(footer).not.toContainText(/Parigo Production Music/i);
    await expect(footer).not.toContainText(/\b\d{4}\b/);
    const [cardBox, cardLinkBox, media, footerBox, playBox, detailBox] = await Promise.all([
      card.boundingBox(),
      cardLink.boundingBox(),
      card.locator(mediaSelector).boundingBox(),
      footer.boundingBox(),
      card.getByRole("button", { name: /^(Lire|Play)/ }).boundingBox(),
      card.locator(mediaSelector).getByRole("link", { name: /^(Voir le détail|View)/ }).boundingBox(),
    ]);
    expect(cardBox, `${path} ne publie pas de carte`).not.toBeNull();
    expect(cardLinkBox, `${path} ne rend pas toute la carte cliquable`).not.toBeNull();
    expect(Math.abs(cardLinkBox!.width - cardBox!.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(cardLinkBox!.height - cardBox!.height)).toBeLessThanOrEqual(2);
    expect(media, `${path} ne publie pas de média`).not.toBeNull();
    expect(footerBox, `${path} ne publie pas de footer`).not.toBeNull();
    expect(footerBox!.y).toBeGreaterThanOrEqual(media!.y + media!.height - 1);
    expect(footerBox!.height).toBeLessThanOrEqual(64);
    expect(playBox!.height).toBeGreaterThanOrEqual(44);
    expect(detailBox!.width).toBeGreaterThanOrEqual(44);
    expect(detailBox!.height).toBeGreaterThanOrEqual(44);
    expect(playBox!.x).toBeGreaterThanOrEqual(media!.x);
    expect(detailBox!.x + detailBox!.width).toBeLessThanOrEqual(media!.x + media!.width + 1);
    expect(playBox!.y).toBeGreaterThanOrEqual(media!.y);
    expect(playBox!.y + playBox!.height).toBeLessThanOrEqual(media!.y + media!.height + 1);
    const mobileCardStyle = () => card.evaluate((node) => {
      const ring = node.querySelector(".parigo-video-card__ring");
      const frame = node.querySelector(".home-sync-card__frame");
      return {
        borderColor: getComputedStyle(node).borderColor,
        borderRadius: getComputedStyle(node).borderRadius,
        boxShadow: getComputedStyle(node).boxShadow,
        padding: getComputedStyle(node).padding,
        transform: getComputedStyle(node).transform,
        cornerDisplay: getComputedStyle(node, "::before").display,
        mediaRingDisplay: ring ? getComputedStyle(ring).display : getComputedStyle(frame!, "::after").display,
      };
    });
    const restingStyle = await mobileCardStyle();
    expect(restingStyle.boxShadow).not.toBe("none");
    expect(restingStyle.cornerDisplay).toBe("none");
    expect(restingStyle.mediaRingDisplay).toBe("none");
    expect(restingStyle.padding).not.toBe("0px");
    await cardLink.focus();
    const interactiveStyle = await mobileCardStyle();
    expect(interactiveStyle.transform).not.toBe(restingStyle.transform);
    expect(interactiveStyle.boxShadow).not.toBe(restingStyle.boxShadow);
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
      const content = page.locator(".page-hero__content");
      const title = content.getByRole("heading", { level: 1 });
      const signature = title.locator(".parigo-title-signature");
      await expect(signature).toBeVisible();
      const [contentBox, titleBox, signatureBox] = await Promise.all([
        content.boundingBox(),
        title.boundingBox(),
        signature.boundingBox(),
      ]);
      expect(contentBox, `contenu absent sur ${path} à ${width}px`).not.toBeNull();
      expect(titleBox, `titre absent sur ${path} à ${width}px`).not.toBeNull();
      expect(signatureBox, `signature absente sur ${path} à ${width}px`).not.toBeNull();
      expect(titleBox!.x + titleBox!.width, `titre débordant sur ${path} à ${width}px`).toBeLessThanOrEqual(contentBox!.x + contentBox!.width + 1);
      expect(signatureBox!.x + signatureBox!.width, `signature débordante sur ${path} à ${width}px`).toBeLessThanOrEqual(contentBox!.x + contentBox!.width + 1);
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
    const hero = page.locator(".page-hero__content");
    const title = hero.getByRole("heading", { level: 1 });
    await expect(hero).toBeVisible();
    await expect(title.locator(".parigo-title-signature")).toHaveCount(1);
    fontSizes.push(await title.evaluate((node) => getComputedStyle(node).fontSize));
  }
  expect(new Set(fontSizes).size).toBe(1);
});

test("les headers commencent sur l’axe réel de leur contenu et respirent sous la navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "L’alignement des grands containers est un contrat desktop.");
  const cases = [
    ["/playlists", '[data-testid="catalog-workspace"]', ".page-hero p", 40],
    ["/clips", ".parigo-video-card", ".page-hero p", 40],
    ["/synchronisations", ".sync-gallery-card", ".page-hero__content > div:last-child", 40],
    ["/licensing", 'button[aria-controls^="licensing-panel-"]', ".page-hero p", 40],
    ["/legal", ".legal-document > div", ".page-hero p", 40],
  ] as const;

  for (const [path, contentSelector, lastHeaderSelector, maximumContentGap] of cases) {
    await page.goto(path);
    const [titleBox, contentBox, navigationBox, lastHeaderBox] = await Promise.all([
      page.locator(".page-hero h1").boundingBox(),
      page.locator(contentSelector).first().boundingBox(),
      page.locator("header nav").first().boundingBox(),
      page.locator(lastHeaderSelector).last().boundingBox(),
    ]);
    expect(titleBox, `titre absent sur ${path}`).not.toBeNull();
    expect(contentBox, `contenu absent sur ${path}`).not.toBeNull();
    expect(navigationBox, `navigation absente sur ${path}`).not.toBeNull();
    expect(lastHeaderBox, `fin du header absente sur ${path}`).not.toBeNull();
    expect(Math.abs(titleBox!.x - contentBox!.x), `axe décalé sur ${path}`).toBeLessThanOrEqual(1);
    expect(titleBox!.y - (navigationBox!.y + navigationBox!.height), `air insuffisant sur ${path}`).toBeGreaterThanOrEqual(40);
    expect(contentBox!.y - (lastHeaderBox!.y + lastHeaderBox!.height), `écart excessif après le header sur ${path}`).toBeLessThanOrEqual(maximumContentGap + 1);
  }
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
    const hero = page.locator(".page-hero");
    await expect(hero.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
    await expect(hero.getByText(intro, { exact: true })).toBeVisible();
  }
});

test("la bordure des synchronisations reste visible au survol sans corners décoratifs", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le survol est vérifié avec un pointeur desktop.");
  await page.goto("/synchronisations");
  const card = page.locator(".sync-gallery-card").first();
  const caption = card.locator(".home-sync-card__caption");
  const image = card.locator(".home-sync-card__image");
  await expect(caption).toHaveCSS("opacity", "0");
  await card.hover();
  await expect(caption).toHaveCSS("opacity", "1");
  await expect(image).toHaveCSS("filter", "blur(5px)");
  expect(await card.evaluate((node) => getComputedStyle(node, "::before").content)).toBe("none");
  expect(await card.evaluate((node) => getComputedStyle(node, "::after").content)).toBe("none");
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
  const searchFrame = page.locator(".search-command").filter({ has: search });
  await expect(searchFrame).toBeVisible();
  await search.focus();
  await expect(searchFrame.locator(".search-command__form")).not.toHaveCSS("box-shadow", "none");
  const card = page.locator(".composer-card").first();
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toHaveAttribute("src", /\/images\/composers\/detail\//);
  await expect(card.locator("img")).toHaveCSS("object-fit", "cover");
  await expect(card.locator(".composer-card__corner")).toHaveCount(0);
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

test("la playlist détail compacte ses actions et ses pistes sur mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "La composition icon-only est réservée au mobile.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/auth/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { session: { user: { id: "member-1", email: "yoann@parigo.test", name: "Yoann" }, session: { expiresAt: "2026-12-01T00:00:00.000Z" } } } }),
  }));
  let copiedPlaylistId = "";
  let copiedTrackIds: string[] = [];
  await page.route("**/api/user/playlists/copy-featured", async (route) => {
    const payload = route.request().postDataJSON() as { playlistId?: string; trackIds?: string[] };
    copiedPlaylistId = payload.playlistId || "";
    copiedTrackIds = payload.trackIds || [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { copied: true, playlist: { id: "copied-playlist-1", title: "Ma copie" } } }) });
  });
  await page.goto("/playlists/22b6c3499f843b2d");
  const actions = [
    page.getByRole("button", { name: "Écouter la sélection" }),
    page.getByRole("button", { name: "Lecture aléatoire" }),
    page.getByRole("button", { name: "Copier dans mes playlists" }),
  ];
  for (const action of actions) {
    await expect(action).toBeVisible({ timeout: 30_000 });
  }
  await expect.poll(async () => {
    const positions = await Promise.all(actions.map(async (action) => Math.round((await action.boundingBox())!.y)));
    return new Set(positions).size;
  }).toBe(1);
  const boxes = await Promise.all(actions.map(async (action) => (await action.boundingBox())!));
  expect(new Set(boxes.map((box) => Math.round(box.y))).size).toBe(1);
  for (const box of boxes) {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const summary = page.getByTestId("playlist-mobile-summary");
  const summaryBox = (await summary.boundingBox())!;
  const firstActionBox = boxes[0];
  expect(firstActionBox.x).toBeGreaterThan(summaryBox.x + summaryBox.width / 3);
  const metadataLines = summary.locator("div").first().locator("span");
  const [tracksMeta, durationMeta] = await Promise.all([metadataLines.nth(0).boundingBox(), metadataLines.nth(1).boundingBox()]);
  expect(durationMeta!.y).toBeGreaterThan(tracksMeta!.y);
  const tracksTitle = page.getByRole("heading", { level: 2, name: "Pistes" });
  const firstTrack = page.locator('.parigo-track-row[data-mobile-layout="dense"]').first();
  await expect(firstTrack).toBeVisible();
  expect((await firstTrack.boundingBox())!.height).toBeLessThanOrEqual(230);
  await expect(tracksTitle).toBeVisible();
  await actions[2].click();
  await expect(page.getByRole("status")).toContainText("toutes ses pistes ont été copiées");
  expect(copiedPlaylistId).toBe("22b6c3499f843b2d");
  expect(copiedTrackIds.length).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: "Ouvrir ma copie" })).toHaveAttribute("href", "/account/playlists/copied-playlist-1");
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

test("les retours des fiches détail partagent le même rythme compact", async ({ page }) => {
  test.setTimeout(120_000);

  const routes = [
    { path: "/talents/minimatic", content: ".composer-detail-hero" },
    { path: "/clips/yt-wrO96WV69aY", content: ".editorial-detail-hero > div:first-child" },
    { path: "/synchronisations/ajvhKSKcas8", content: 'section[aria-label="Lecteur vidéo"]' },
    { path: "/albums/48b4b95fe1f09019", content: ".album-cover-frame" },
    { path: "/playlists/22b6c3499f843b2d", content: ".editorial-detail-hero > div:first-child" },
    { path: "/labels/0f9769346759ee5a", content: ".editorial-detail-hero > .parigo-frame" },
  ];

  for (const route of routes) {
    await page.goto(route.path);
    const backLink = page.locator(".contextual-back-link");
    const content = page.locator(route.content).first();
    await expect(backLink).toBeVisible({ timeout: 30_000 });
    await expect(content).toBeVisible({ timeout: 30_000 });

    const [headerBox, backBox, contentBox, expectedGap] = await Promise.all([
      page.getByRole("navigation", { name: "Navigation principale" }).boundingBox(),
      backLink.boundingBox(),
      content.boundingBox(),
      page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.position = "absolute";
        probe.style.width = "var(--space-contextual-back-gap)";
        document.body.append(probe);
        const pixels = Number.parseFloat(getComputedStyle(probe).width);
        probe.remove();
        return pixels;
      }),
    ]);
    expect(headerBox).not.toBeNull();
    expect(backBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    expect(backBox!.height).toBeGreaterThanOrEqual(44);
    expect(backBox!.y - (headerBox!.y + headerBox!.height), route.path).toBeCloseTo(expectedGap, 0);
    expect(contentBox!.y - (backBox!.y + backBox!.height), route.path).toBeCloseTo(expectedGap, 0);
  }
});

test("la pochette du détail album commence sur le même axe que les pistes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "L’alignement des grands containers est un contrat desktop.");
  await page.goto("/albums/48b4b95fe1f09019");
  const [coverBox, tracksTitleBox] = await Promise.all([
    page.locator(".album-cover-frame").boundingBox(),
    page.getByRole("heading", { level: 2, name: /pistes|tracks/i }).boundingBox(),
  ]);
  expect(coverBox).not.toBeNull();
  expect(tracksTitleBox).not.toBeNull();
  expect(Math.abs(coverBox!.x - tracksTitleBox!.x)).toBeLessThanOrEqual(1);
});

test("les panneaux d’information vidéo gardent une hauteur naturelle", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "La comparaison côte à côte concerne le layout desktop.");
  for (const [path, playerSelector, panelSelector] of [
    ["/clips/yt-wrO96WV69aY", ".editorial-detail-hero > div:first-child", '[data-testid="clip-detail-panel"]'],
    ["/synchronisations/ajvhKSKcas8", 'section[aria-label="Lecteur vidéo"]', '[data-testid="synchronisation-detail-panel"]'],
  ] as const) {
    await page.goto(path);
    const [playerBox, panelBox, ctaBox] = await Promise.all([
      page.locator(playerSelector).boundingBox(),
      page.locator(panelSelector).boundingBox(),
      page.locator(panelSelector).getByRole("link", { name: /YouTube/ }).boundingBox(),
    ]);
    expect(playerBox, `player absent sur ${path}`).not.toBeNull();
    expect(panelBox, `panneau absent sur ${path}`).not.toBeNull();
    expect(ctaBox, `CTA absent sur ${path}`).not.toBeNull();
    expect(Math.abs(playerBox!.y - panelBox!.y)).toBeLessThanOrEqual(1);
    expect(panelBox!.height).toBeLessThan(playerBox!.height - 40);
    expect(panelBox!.y + panelBox!.height - (ctaBox!.y + ctaBox!.height)).toBeLessThanOrEqual(33);
  }
});

test("les pages d’information alignent leurs corners et retirent la signature géographique", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator("main")).not.toContainText("Parigo Music · Paris · France");

  const toc = page.locator(".legal-toc");
  expect(await toc.evaluate((node) => getComputedStyle(node, "::before").content)).toBe("none");
  expect(await toc.evaluate((node) => getComputedStyle(node, "::after").content)).toBe("none");
  await expect(toc).toHaveCSS("scrollbar-gutter", "auto");
});

test("la home conserve le process et le brief sans les deux sections supprimées", async ({ page }) => {
  await page.goto("/");

  const process = page.locator("#process");
  await process.scrollIntoViewIfNeeded();
  await expect(process.getByRole("heading", { name: /Du brief à la sélection/ })).toBeVisible();
  await expect(process.getByText("Notre méthode", { exact: true })).toHaveCount(0);
  await expect(process.getByText(/Un chemin simple/)).toHaveCount(0);
  const processCards = process.getByTestId("process-card");
  await expect(processCards).toHaveCount(3);
  const processShell = process.locator(".process-shell");
  await expect(processShell).toHaveCSS("background-color", "rgb(9, 12, 9)");
  await expect(process.getByTestId("process-progress")).toBeVisible();
  for (const number of ["01", "02", "03"]) await expect(process.getByText(number, { exact: true })).toHaveCount(1);
  await expect(page.locator("#sensations")).toHaveCount(0);
  await expect(page.locator("#editorial-playlists")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Envoyez-nous un brief/ })).toBeVisible();
  await expect(page.getByText("Parlez-nous de votre projet, de votre deadline et de vos références, Nous construisons une sélection pour vous.", { exact: true })).toBeVisible();
  await expect(page.getByText("Sorties, playlists, images et actualités du label - tous nos liens réunis au même endroit.", { exact: true })).toBeVisible();

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

test("Orb reste en pleine qualité sur mobile avec saveData, un renderer logiciel et le mouvement réduit", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-theme", "light");
    const connection = new EventTarget();
    Object.defineProperty(connection, "saveData", { value: true });
    Object.defineProperty(navigator, "connection", { configurable: true, value: connection });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  const backdrop = hero.getByTestId("hero-orb-backdrop");
  await expect(backdrop).toHaveAttribute("data-orb-setup", "original");
  await expect(backdrop).toHaveAttribute("data-motion", "animated");
  await expect(backdrop).toHaveAttribute("data-renderer", "ogl", { timeout: 15_000 });
  await expect(backdrop.locator("canvas")).toHaveCount(1);
  await expect(backdrop).toHaveAttribute("data-renderer-capability", "software");
  await expect(backdrop.locator("[data-orb-center]")).toHaveAttribute("data-orb-quality", "full");
  await expect(backdrop.locator("[data-orb-center]")).toHaveAttribute("data-max-fps", "60");
  await expect(backdrop.locator("[data-orb-center]")).toHaveAttribute("data-animation-mode", "interaction");
  await expect(backdrop.locator("[data-orb-center]")).toHaveAttribute("data-render-scale", "1");
  await expect(backdrop.locator("[data-orb-center]")).toHaveAttribute("data-active-max-fps", "60");
  await expect(backdrop.locator("[data-orb-center]")).toHaveAttribute("data-active-render-scale", "1");
  await expect.poll(() => backdrop.locator("canvas").evaluate((canvas) => {
    const bounds = canvas.getBoundingClientRect();
    const expectedDpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    return bounds.width > 0 ? (canvas as HTMLCanvasElement).width / bounds.width / expectedDpr : Number.POSITIVE_INFINITY;
  })).toBeCloseTo(1, 1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const reducedBackdrop = page.getByTestId("home-hero").getByTestId("hero-orb-backdrop");
  await expect(reducedBackdrop).toHaveAttribute("data-motion", "animated");
  await expect(reducedBackdrop).toHaveAttribute("data-renderer", "ogl", { timeout: 15_000 });
  await expect(reducedBackdrop.locator("canvas")).toHaveCount(1);
});

test("le héros suit les accents Catalogue puis Similarité IA", async ({ page }) => {
  await enableSimilarityForVisualTest(page);
  await page.addInitScript(() => window.localStorage.setItem("parigo-theme", "light"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  const signature = hero.locator(".parigo-title-signature");
  const aiGlow = hero.getByTestId("ai-search-glow");
  const aiGlowBeam = hero.getByTestId("ai-search-glow-beam");
  const searchForm = hero.locator(".search-command__form");
  await expect(hero).toHaveAttribute("data-search-mode", "catalog");
  await expect(aiGlow).toHaveAttribute("data-active", "false");
  await expect(aiGlow).toHaveCSS("opacity", "0");
  await expect(aiGlowBeam).toHaveCSS("animation-name", "none");
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
  await page.getByRole("option", { name: /Similarité IA/ }).click();
  await expect(hero).toHaveAttribute("data-search-mode", "ai");
  await expect(aiGlow).toHaveAttribute("data-active", "true");
  await expect(aiGlow).toHaveCSS("opacity", "1");
  await expect(aiGlowBeam).toHaveCSS("animation-name", "spin");
  await expect(searchForm).toHaveCSS("border-color", "rgba(0, 0, 0, 0)");
  expect(await searchForm.evaluate((node) => getComputedStyle(node, "::before").display)).toBe("none");
  expect(await searchForm.evaluate((node) => getComputedStyle(node, "::after").display)).toBe("none");
  await expect.poll(() => signature.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(catalogColor);
  await expect.poll(() => signature.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(await resolveColorToken("--ai-search"));
  await hero.getByRole("button", { name: "Mode de recherche : Similarité IA" }).click();
  await hero.getByRole("option", { name: /Catalogue/ }).click();
  await expect(aiGlow).toHaveAttribute("data-active", "false");
  await expect(aiGlow).toHaveCSS("opacity", "0");
  await expect(aiGlowBeam).toHaveCSS("animation-name", "none");
  await expect.poll(() => signature.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(catalogColor);
});

test("le switch Catalogue et IA ne déplace ni le titre ni la barre du héros", async ({ page }) => {
  test.setTimeout(60_000);
  await enableSimilarityForVisualTest(page);
  await page.addInitScript(() => window.localStorage.setItem("parigo-theme", "light"));

  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const hero = page.getByTestId("home-hero");
    const content = hero.getByTestId("home-hero-content");
    const title = hero.locator('[data-banner-reveal="title"]');
    const form = hero.locator(".search-command__form");
    await expect(hero.getByTestId("home-hero-search-mask")).toHaveAttribute("data-banner-mask", "open");
    await page.evaluate(() => window.scrollTo(0, 0));
    const [catalogTitle, catalogForm] = await Promise.all([title.boundingBox(), form.boundingBox()]);
    expect(catalogTitle).not.toBeNull();
    expect(catalogForm).not.toBeNull();
    if (viewport.width === 390) {
      const [heroBox, contentBox] = await Promise.all([hero.boundingBox(), content.boundingBox()]);
      expect(heroBox).not.toBeNull();
      expect(contentBox).not.toBeNull();
      const contentOffset = contentBox!.y - heroBox!.y;
      expect(contentOffset).toBeGreaterThanOrEqual(120);
      expect(contentOffset + contentBox!.height).toBeLessThanOrEqual(heroBox!.height);
    }

    await hero.getByRole("button", { name: "Mode de recherche : Catalogue" }).click();
    await hero.getByRole("option", { name: /Similarité IA/ }).click();
    await expect(hero).toHaveAttribute("data-search-mode", "ai");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(650);
    await page.evaluate(() => window.scrollTo(0, 0));
    const [aiTitle, aiForm] = await Promise.all([title.boundingBox(), form.boundingBox()]);
    expect(aiTitle).not.toBeNull();
    expect(aiForm).not.toBeNull();
    expect(Math.abs(aiTitle!.y - catalogTitle!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(aiForm!.x - catalogForm!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(aiForm!.y - catalogForm!.y)).toBeLessThanOrEqual(1);
    if (viewport.width === 390) {
      const firstHintLine = hero.getByText("Décrivez une scène, une émotion ou un usage", { exact: true });
      const secondHintLine = hero.getByText("Collez un lien public", { exact: true });
      const [firstHintBox, secondHintBox] = await Promise.all([firstHintLine.boundingBox(), secondHintLine.boundingBox()]);
      expect(firstHintBox).not.toBeNull();
      expect(secondHintBox).not.toBeNull();
      expect(secondHintBox!.y).toBeGreaterThan(firstHintBox!.y);
    }

    await hero.getByRole("button", { name: "Mode de recherche : Similarité IA" }).click();
    await hero.getByRole("option", { name: /Catalogue/ }).click();
    await expect(hero).toHaveAttribute("data-search-mode", "catalog");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(650);
    await page.evaluate(() => window.scrollTo(0, 0));
    const [restoredTitle, restoredForm] = await Promise.all([title.boundingBox(), form.boundingBox()]);
    expect(restoredTitle).not.toBeNull();
    expect(restoredForm).not.toBeNull();
    expect(Math.abs(restoredTitle!.y - catalogTitle!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(restoredForm!.x - catalogForm!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(restoredForm!.y - catalogForm!.y)).toBeLessThanOrEqual(1);
  }
});

test("la lumière de la Similarité IA reste statique en mouvement réduit", async ({ page }, testInfo) => {
  await enableSimilarityForVisualTest(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  await hero.getByRole("button", { name: "Mode de recherche : Catalogue" }).click();
  await hero.getByRole("option", { name: /Similarité IA/ }).click();
  await expect(hero.getByTestId("ai-search-glow")).toHaveCSS("opacity", "1");
  await expect(hero.getByTestId("ai-search-glow-beam")).toHaveCSS("animation-name", "none");
  await expect(hero.getByTestId("hero-orb-backdrop")).toHaveAttribute(
    "data-motion",
    testInfo.project.name === "mobile" ? "animated" : "static",
  );
});

test("la Similarité IA conserve les mêmes angles arrondis", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le survol est vérifié avec un pointeur desktop aux largeurs mobile et desktop.");
  await enableSimilarityForVisualTest(page);
  await page.addInitScript(() => localStorage.setItem("parigo-theme", "light"));
  for (const [width, corner] of [[390, "8px"], [1024, "14px"]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const hero = page.getByTestId("home-hero");
    await hero.getByRole("button", { name: "Mode de recherche : Catalogue" }).click();
    await hero.getByRole("option", { name: /Similarité IA/ }).click();
    const form = hero.locator(".search-command__form");
    const glow = hero.getByTestId("ai-search-glow");
    await form.getByRole("combobox").evaluate((node) => node.blur());
    await page.waitForTimeout(550);
    await expect(form).toHaveCSS("border-radius", `${corner} 16px`);
    await expect(form).toHaveCSS("background-image", "none");
    await expect(form).toHaveCSS("box-shadow", "none");
    await expect(glow).toHaveCSS("border-radius", `${Number.parseInt(corner, 10) + 3}px 19px`);
  }
});

test("les métriques publiques compactent le contenu après le header", async ({ page }) => {
  for (const [width, expectedGap] of [[390, 20], [1024, 40]] as const) {
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
      ? { gutter: "1rem", divider: "1.5rem", section: "2rem" }
      : { gutter: "2rem", divider: "4rem", section: "6rem" });
  }
});

test("le héros conserve un fallback Orb sur un renderer logiciel", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le fallback desktop est contrôlé dans le viewport desktop.");
  await page.addInitScript(() => window.localStorage.setItem("parigo-theme", "light"));
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  const backdrop = hero.getByTestId("hero-orb-backdrop");

  await expect(backdrop).toBeVisible({ timeout: 10_000 });
  await expect(backdrop).toHaveCSS("pointer-events", "none");
  await expect(backdrop).toHaveAttribute("data-orb-setup", "original");
  await expect(backdrop).toHaveAttribute("data-renderer", "fallback");
  await expect(backdrop.locator("canvas")).toHaveCount(0);
  const gradientLayer = backdrop.locator(".hero-background__fallback");
  await expect(gradientLayer).toHaveCSS("background-image", "none");
  await expect(gradientLayer).toHaveCSS("background-color", "rgb(242, 241, 237)");
});

test("Orb conserve le shader original avec quatre teintes contextuelles", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le changement de contexte est contrôlé dans le viewport desktop.");
  await enableSimilarityForVisualTest(page);
  await page.addInitScript(() => window.localStorage.setItem("parigo-theme", "light"));
  await page.goto("/");
  const hero = page.getByTestId("home-hero");
  const backdrop = hero.getByTestId("hero-orb-backdrop");
  await expect(backdrop).toHaveAttribute("data-orb-setup", "original");
  await expect(backdrop).toHaveAttribute("data-orb-palette", "catalog-light");
  await expect(backdrop).toHaveCSS("background-color", "rgb(242, 241, 237)");
  await hero.getByRole("button", { name: "Mode de recherche : Catalogue" }).click();
  await hero.getByRole("option", { name: /Similarité IA/ }).click();
  await expect(backdrop).toHaveAttribute("data-orb-setup", "original");
  await expect(backdrop).toHaveAttribute("data-orb-palette", "ai-light");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const themeToggle = page.getByRole("button", { name: "Passer au thème sombre" });
  await expect(themeToggle).toBeVisible();
  await themeToggle.click();
  await expect(backdrop).toHaveAttribute("data-orb-setup", "original");
  await expect(backdrop).toHaveAttribute("data-orb-palette", "ai-dark");
  await expect(backdrop).toHaveCSS("background-color", "rgb(11, 17, 13)");
  await hero.getByRole("button", { name: "Mode de recherche : Similarité IA" }).click();
  await hero.getByRole("option", { name: /Catalogue/ }).click();
  await expect(backdrop).toHaveAttribute("data-orb-setup", "original");
  await expect(backdrop).toHaveAttribute("data-orb-palette", "catalog-dark");
});

test("les héros des pages internes restent sobres sans formes géométriques en arrière-plan", async ({ page }) => {
  await page.goto("/albums");
  const hero = page.locator(".page-hero");
  await expect(hero).toBeVisible();
  await expect(hero).toHaveCSS("background-image", "none");
  await expect(hero).toHaveCSS("border-bottom-width", "0px");
  expect(await hero.evaluate((node) => getComputedStyle(node, "::before").content)).toBe("none");
  await expect(hero.locator(".page-hero__frame")).toHaveCount(0);
  const content = hero.locator(".page-hero__content");
  await expect(content).toHaveCSS("border-top-width", "0px");
  await expect(content).toHaveCSS("border-left-width", "0px");
  expect(await content.evaluate((node) => getComputedStyle(node, "::before").content)).toBe("none");

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
  const activeTocLink = page.locator(".legal-toc__link").first();
  expect(await activeTocLink.evaluate((node) => getComputedStyle(node, "::after").content)).toBe("none");

  await page.goto("/licensing");
  const estimateCard = page.getByRole("heading", { name: /Décrivez le projet/ }).locator("xpath=ancestor::div[contains(@class,'parigo-frame')]");
  const [estimateBox, footerBox] = await Promise.all([estimateCard.boundingBox(), page.locator("footer").boundingBox()]);
  expect(Math.abs(footerBox!.y - (estimateBox!.y + estimateBox!.height) - 24)).toBeLessThanOrEqual(1);
  await page.evaluate(() => {
    const dock = document.createElement("aside");
    dock.dataset.testid = "player-dock";
    document.body.append(dock);
  });
  const footerWithPlayer = await page.locator("footer").boundingBox();
  expect(Math.abs(footerWithPlayer!.y - (estimateBox!.y + estimateBox!.height) - 24)).toBeLessThanOrEqual(1);
});

test("About adopte les nouveaux textes et Licensing ouvre sur une grille repliée", async ({ page }) => {
  await page.goto("/licensing");
  await expect(page.getByRole("heading", { level: 1, name: "Une musique trouvée, une licence maîtrisée" })).toBeVisible();
  await expect(page.getByText("Besoin d’un chiffrage", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Grille indicative", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Un cadre lisible, projet par projet" })).toHaveCount(0);
  await expect(page.getByText("À chaque projet, son cadre.", { exact: true })).toHaveCount(0);
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
  await expect(page.getByRole("img", { name: /bureaux Parigo baignés de lumière/ })).toHaveAttribute("loading", "eager");
  await expect(page.locator("main").getByText("À propos", { exact: true })).toHaveCount(0);
  await expect(page.locator("main").getByText("La musique, une affaire humaine", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Fondée en 2004, Parigo est une librairie musicale indépendante", { exact: false })).toBeVisible();
  await expect(page.getByText("Éditer moins", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Indépendante depuis Paris", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Parler d.un projet/i })).toHaveCount(0);
});

test("About présente son paysage en 4/3 puis l’empile sur petit écran", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto("/about");

  const desktopImage = page.getByRole("img", { name: /bureaux Parigo baignés de lumière/ });
  const [desktopImageBox, desktopHeadingBox] = await Promise.all([
    desktopImage.boundingBox(),
    page.getByRole("heading", { level: 1, name: "Une librairie avant tout" }).boundingBox(),
  ]);
  expect(desktopImageBox).not.toBeNull();
  expect(desktopHeadingBox).not.toBeNull();
  expect(desktopImageBox!.y + desktopImageBox!.height).toBeLessThanOrEqual(901);
  expect(desktopHeadingBox!.x).toBeGreaterThan(desktopImageBox!.x + desktopImageBox!.width);
  expect(Math.abs(desktopHeadingBox!.y - desktopImageBox!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs((desktopImageBox!.width / desktopImageBox!.height) - (4 / 3))).toBeLessThan(0.03);
  await expect(desktopImage).toHaveCSS("object-fit", "cover");
  await expect(page.getByText("Fondée en 2004, Parigo est une librairie musicale indépendante", { exact: false })).toHaveCSS("text-align", "justify");

  await page.setViewportSize({ width: 800, height: 900 });
  await page.reload();
  const imageBox = await page.getByRole("img", { name: /bureaux Parigo baignés de lumière/ }).boundingBox();
  const headingBox = await page.getByRole("heading", { level: 1, name: "Une librairie avant tout" }).boundingBox();
  expect(imageBox).not.toBeNull();
  expect(headingBox).not.toBeNull();
  expect(headingBox!.y).toBeGreaterThan(imageBox!.y + imageBox!.height);
  expect(headingBox!.width).toBeGreaterThan(650);
});

test("la page des labels adopte l’intitulé Labels", async ({ page }, testInfo) => {
  await page.goto("/labels");
  await expect(page.getByRole("heading", { level: 1, name: "Labels" })).toBeVisible();
  await expect(page.locator("footer").getByRole("link", { name: "Labels", exact: true })).toBeVisible();
  if (testInfo.project.name === "mobile") {
    const corners = await Promise.all([
      page.locator(".page-hero__content").evaluate((node) => {
        const style = getComputedStyle(node, "::after");
        return style.content;
      }),
      page.locator(".catalog-toolbar").evaluate((node) => {
        const style = getComputedStyle(node, "::after");
        return style.content;
      }),
      page.locator('.parigo-select[data-variant="editorial"]').evaluate((node) => {
        const style = getComputedStyle(node, "::before");
        return style.content;
      }),
    ]);
    for (const corner of corners) {
      expect(corner).toBe("none");
    }
  }
});

test("la page Clips porte l’introduction éditoriale complète", async ({ page }) => {
  await page.goto("/clips");
  await expect(page.locator("main")).toContainText("Le catalogue Parigo en images, entre clips, teasers et performances live.");
});

test("le détail label privilégie le logo et ne renvoie plus vers son site", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/labels/0f9769346759ee5a");
  const hero = page.locator(".editorial-detail-hero").first();
  await expect(hero).toBeVisible();
  await expect(hero.getByRole("link", { name: /Site web|Website/i })).toHaveCount(0);
  const logoPanel = hero.locator("> div").first();
  const logoPanelBox = await logoPanel.boundingBox();
  expect(logoPanelBox).not.toBeNull();
  if (testInfo.project.name === "mobile") {
    expect(logoPanelBox!.height).toBeGreaterThanOrEqual(219);
    expect(logoPanelBox!.height).toBeLessThanOrEqual(221);
  } else {
    expect(logoPanelBox!.height).toBeGreaterThanOrEqual(280);
    expect(logoPanelBox!.height).toBeLessThanOrEqual(361);
    expect(logoPanelBox!.width).toBeGreaterThan(400);
    expect(logoPanelBox!.width).toBeLessThanOrEqual(481);
    const [detailTitleSize, labelsPageTitleSize] = await Promise.all([
      hero.getByRole("heading", { level: 1 }).evaluate((node) => getComputedStyle(node).fontSize),
      page.evaluate(() => {
        const probe = document.createElement("h1");
        probe.className = "type-page";
        document.body.append(probe);
        const size = getComputedStyle(probe).fontSize;
        probe.remove();
        return size;
      }),
    ]);
    expect(detailTitleSize).toBe(labelsPageTitleSize);

    const toolbar = page.getByTestId("catalog-workspace").locator(".catalog-toolbar");
    const toggle = toolbar.getByRole("group", { name: "Contenu du label" });
    const [toolbarBox, toggleBox] = await Promise.all([toolbar.boundingBox(), toggle.boundingBox()]);
    expect(toolbarBox).not.toBeNull();
    expect(toggleBox).not.toBeNull();
    expect(toolbarBox!.y + toolbarBox!.height - (toggleBox!.y + toggleBox!.height)).toBeLessThanOrEqual(12);
  }

  const toolbar = page.getByTestId("catalog-workspace").locator(".catalog-toolbar");
  await expect(toolbar.getByRole("status")).toHaveCount(0);
  await expect(page.getByTestId("catalog-workspace").getByRole("status")).toBeVisible();
});

test("la description Musica.it reste dans les métadonnées mais disparaît du détail", async ({ page }, testInfo) => {
  await page.goto("/labels/9d330c152c37bca0");
  await expect(page.locator(".editorial-detail-hero p")).toHaveCount(0);
  const french = await page.locator('meta[name="description"]').getAttribute("content");
  expect(french?.trim().length).toBeGreaterThan(0);
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  }
  await page.getByRole("link", { name: /English version — English/ }).first().click();
  await expect(page).toHaveURL(/\/en\/labels\/9d330c152c37bca0/);
  await expect(page.locator(".editorial-detail-hero p")).toHaveCount(0);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S+/);
});

test("le détail compositeur place le nom dans la colonne de texte et laisse la biographie entourer le portrait", async ({ page }, testInfo) => {
  await page.goto("/talents/harvest-minimatic-ns-1w2ynwe");
  const hero = page.locator(".editorial-detail-hero");
  await expect(hero).toBeVisible();
  expect(await hero.evaluate((node) => getComputedStyle(node, "::after").content)).toBe("none");
  if (testInfo.project.name === "desktop") {
    const [portraitBox, titleTextBox, biographyStyle] = await Promise.all([
      page.getByTestId("composer-detail-image").locator("..").boundingBox(),
      page.getByRole("heading", { level: 1, name: "Minimatic" }).evaluate((node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const box = range.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      }),
      page.getByTestId("composer-biography").evaluate((node) => ({
        textAlign: getComputedStyle(node).textAlign,
        hyphens: getComputedStyle(node).hyphens,
      })),
    ]);
    expect(portraitBox).not.toBeNull();
    expect(titleTextBox.x).toBeGreaterThanOrEqual(portraitBox!.x + portraitBox!.width - 1);
    expect(titleTextBox.y).toBeLessThan(portraitBox!.y + portraitBox!.height);
    expect(biographyStyle).toEqual({ textAlign: "justify", hyphens: "auto" });
  }
});

test("le changement de langue actualise immédiatement le détail compositeur", async ({ page }, testInfo) => {
  await page.goto("/talents/scherazade-aissahine");
  const biography = page.getByTestId("composer-biography");
  await expect(biography).toHaveAttribute("lang", "fr");
  await expect(biography).toContainText("Schérazade est une autrice-compositrice-interprète française");

  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  }
  await page.getByRole("link", { name: /English version — English/ }).first().click();

  await expect(page).toHaveURL(/\/en\/talents\/scherazade-aissahine$/);
  await expect(biography).toHaveAttribute("lang", "en");
  await expect(biography).toContainText("Schérazade is a French singer-songwriter from Béziers");
  await expect(page.getByRole("link", { name: /Back/ }).first()).toBeVisible();
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
  await expect(page.locator("main h1").first()).toHaveText("Recherche");
  await expect(page.locator("main").first()).not.toContainText("Donnez le ton à vos images");
});

test("Contact ouvre sur une grande image des locaux puis aligne coordonnées et formulaire", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/contact");
  await expect(page.locator(".page-hero")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Parlez-nous de l’image", includeHidden: true })).toHaveClass(/sr-only/);
  await expect(page.getByTestId("contact-title-card")).toHaveCount(0);
  await expect(page.getByText("Racontez-nous votre projet.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Parigo Music", { exact: true }).last()).toBeVisible();
  const companyField = page.locator('input[name="company"]').locator("..");
  const paddingLeft = await companyField.evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingLeft));
  expect(paddingLeft).toBeGreaterThanOrEqual(20);
  await expect(page.getByText("Pièce jointe", { exact: false })).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  const locationImage = page.getByTestId("contact-location-image");
  await expect(locationImage).toHaveAttribute("src", /r03-v1-contact-1672x941/);
  await expect(locationImage).toHaveCSS("object-fit", "cover");
  const [splitBox, imageBox, imageFrameBox, detailsBox, formBox] = await Promise.all([
    page.getByTestId("contact-split").boundingBox(),
    page.getByTestId("contact-location-image").boundingBox(),
    page.getByTestId("contact-image-frame").boundingBox(),
    page.getByTestId("contact-details").boundingBox(),
    page.getByTestId("contact-main").boundingBox(),
  ]);
  expect(splitBox).not.toBeNull();
  expect(imageBox).not.toBeNull();
  expect(imageFrameBox).not.toBeNull();
  expect(detailsBox).not.toBeNull();
  expect(formBox).not.toBeNull();
  expect(Math.abs(imageBox!.width - imageFrameBox!.width)).toBeLessThanOrEqual(2);
  expect(imageFrameBox!.width).toBeGreaterThanOrEqual(splitBox!.width - 1);
  expect(imageFrameBox!.y + imageFrameBox!.height).toBeLessThan(splitBox!.y);
  expect(Math.abs(detailsBox!.y - formBox!.y)).toBeLessThanOrEqual(1);
  expect(formBox!.width).toBeGreaterThan(detailsBox!.width * 1.8);
});

test("la page Contact présente uniquement l’équipe Parigo demandée", async ({ page }) => {
  await page.goto("/contact");
  const team = page.getByTestId("contact-team");
  await expect(team.getByRole("heading", { level: 2, name: "Notre équipe" })).toBeVisible();
  await expect(team.getByRole("heading", { level: 3 })).toHaveText(["Guillaume Albeck", "Caroline Senyk", "Eliott Grellier"]);
  await expect(team.getByText("Responsable copyright et production musicale", { exact: true })).toBeVisible();
  await expect(team.getByText("Responsable catalogue", { exact: true })).toBeVisible();
  await expect(team.getByRole("link", { name: "guillaume.albeck@parigomusic.com" })).toHaveAttribute("href", "mailto:guillaume.albeck@parigomusic.com");
  await expect(team.getByRole("link", { name: "caroline.senyk@parigomusic.com" })).toHaveAttribute("href", "mailto:caroline.senyk@parigomusic.com");
  await expect(team.getByRole("link", { name: "eliott.grellier@parigomusic.com" })).toHaveAttribute("href", "mailto:eliott.grellier@parigomusic.com");
  await expect(team.locator("article .font-mono")).toHaveCount(0);
  await expect(team).not.toContainText("Une question urgente ? Appelez-nous :");
  const details = page.getByTestId("contact-details");
  await expect(details).toContainText("Une question urgente ? Appelez-nous :");
  expect(await details.locator("span").filter({ hasText: "Une question urgente" }).textContent()).toContain("Appelez-nous\u00a0:");
  await expect(details).not.toContainText("Demandes de licence, recherches musicales et accompagnement éditorial.");
  const urgentPhone = details.getByRole("link", { name: "+33 (0)6 49 39 69 22" });
  await expect(urgentPhone).toHaveCSS("white-space", "nowrap");
  await expect(urgentPhone.locator("strong")).toHaveCount(0);
  await expect(urgentPhone).toHaveCSS("font-weight", "400");
  await expect(team).not.toContainText("Mélodie");
  await expect(team).not.toContainText("Melody");

  await page.goto("/en/contact");
  await expect(page.getByTestId("contact-team").getByText("Head of Copyright and Music Production", { exact: true })).toBeVisible();
  await expect(page.getByTestId("contact-team").getByText("Library manager", { exact: true })).toBeVisible();
  await expect(page.getByTestId("contact-team")).not.toContainText("Administration");
});

test("la demande de licence conserve ses guillemets français dans son titre accessible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/contact?track=c09811fbd340c24551e1c542a5591171");
  const title = page.getByRole("heading", { level: 1, name: /Low Baller/, includeHidden: true });
  await expect(title).toContainText("Low Baller", { timeout: 30_000 });
  await expect(title).toHaveClass(/sr-only/);
  expect((await title.textContent()) || "").toContain("« Low Baller »");
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
