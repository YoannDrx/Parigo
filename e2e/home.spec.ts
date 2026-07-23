import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("la homepage rend la recherche principale et navigue vers les résultats", async ({ page }) => {
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
  await expect(page.getByRole("link", { name: "Entrer dans le catalogue" })).toHaveAttribute("href", "/search");
  await expect(hero.getByText("Interprétation", { exact: true })).toHaveCount(0);
  const search = page.getByLabel("Décrivez la musique que vous imaginez");
  await search.fill("Un piano intime pour un documentaire");
  await expect(hero.getByText("Interprétation", { exact: true })).toBeVisible();
  await expect(hero.getByText("Piano", { exact: true })).toBeVisible();
  await search.press("Enter");
  await expect(page).toHaveURL(/\/search\?/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Trouver la bonne musique/i })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("categories"), { timeout: 30_000 }).not.toBeNull();
  const resolvedUrl = new URL(page.url());
  expect(resolvedUrl.searchParams.get("brief")).toBe("Un piano intime pour un documentaire");
  expect(resolvedUrl.searchParams.has("q")).toBe(false);
});

test("le CTA Qui sommes-nous conserve un contraste lisible dans les deux thèmes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le survol est vérifié avec un pointeur desktop.");
  await page.goto("/");
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
  const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await rejectCookies.isVisible()) await rejectCookies.click();
  const cta = page.getByRole("link", { name: "Envoyer un brief" });
  await cta.scrollIntoViewIfNeeded();
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
  const forgot = dialog.getByRole("button", { name: "Mot de passe oublié" });
  await expect(forgot).toHaveCSS("text-transform", "none");
  expect(Number.parseFloat(await forgot.evaluate((node) => getComputedStyle(node).fontSize))).toBeLessThan(12);
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
  await expect(page.getByRole("heading", { level: 1, name: /Find the right music/i })).toBeVisible();
  await controls.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByText(/A curated catalogue built for editors, music supervisors and producers/)).toBeVisible();
  for (const heading of ["Who are we?", "From brief to selection.", "Begin with a feeling."]) {
    const element = page.getByRole("heading", { name: heading });
    const color = await element.evaluate((node) => getComputedStyle(node).color);
    const channels = color.match(/\d+/g)?.slice(0, 3).map(Number) ?? [];
    expect(Math.min(...channels)).toBeGreaterThan(180);
  }
  const instagramTile = page.locator('span[aria-label="Instagram"]');
  await expect(instagramTile).toHaveCSS("background-color", "rgb(255, 255, 255)");
  if (testInfo.project.name === "desktop") {
    const projectCta = page.getByRole("button", { name: "Discuss a project" });
    await projectCta.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await projectCta.hover();
    await expect(projectCta).toHaveCSS("color", "rgb(17, 20, 17)");
  }
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

test("la home expose le catalogue Parigo et un menu modal responsive", async ({ page }, testInfo) => {
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
  const menu = page.getByRole("dialog", { name: "Menu principal" });
  await expect(menu).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await expect(menu.getByText("Compte", { exact: true })).toBeVisible();
    await expect(menu.getByText("Préférences", { exact: true })).toBeVisible();
  } else {
    await expect(menu.getByText("Compte", { exact: true })).not.toBeVisible();
    await expect(menu.getByText("Préférences", { exact: true })).not.toBeVisible();
  }
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Menu principal" })).toHaveCount(0);
});

test("la home et les pistes proposent des interactions tactiles dédiées", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name !== "mobile", "Ce parcours contrôle spécifiquement la composition tactile.");
  await page.goto("/");
  const rejectCookies = page.getByRole("button", { name: "Tout refuser" });
  if (await rejectCookies.isVisible()) await rejectCookies.click();

  await expect(page.locator('#featured a[href^="/playlists/"]').first()).toBeVisible({ timeout: 30_000 });
  const carouselArrows = page.locator('button[aria-label="Précédent"], button[aria-label="Suivant"]');
  expect(await carouselArrows.count()).toBeGreaterThan(0);
  for (let index = 0; index < await carouselArrows.count(); index += 1) await expect(carouselArrows.nth(index)).toBeHidden();

  const manifesto = page.locator("#manifesto");
  const manifestoTitle = manifesto.locator("h2").first();
  await manifestoTitle.scrollIntoViewIfNeeded();
  expect(Number.parseFloat(await manifestoTitle.evaluate((node) => getComputedStyle(node).fontSize))).toBeGreaterThan(60);
  expect(await manifesto.evaluate((node) => node.clientHeight)).toBeGreaterThan((await page.evaluate(() => innerHeight)) * 2);
  await expect(page.getByTestId("manifesto-reveal-edge")).toBeVisible();

  const process = page.locator("#process");
  await process.scrollIntoViewIfNeeded();
  expect((await page.getByTestId("process-progress").boundingBox())!.height).toBeGreaterThanOrEqual(4);

  const editorialRail = page.getByTestId("editorial-mobile-rail");
  await editorialRail.scrollIntoViewIfNeeded();
  expect(await editorialRail.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  const editorialCards = editorialRail.locator('a[href^="/playlists/"]');
  const firstCard = await editorialCards.nth(0).boundingBox();
  const secondCard = await editorialCards.nth(1).boundingBox();
  expect(firstCard).not.toBeNull();
  expect(secondCard).not.toBeNull();
  expect(Math.abs(firstCard!.y - secondCard!.y)).toBeLessThanOrEqual(2);
  expect(secondCard!.x).toBeGreaterThan(firstCard!.x);

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
  await expect(shortlistTrigger).toHaveCSS("bottom", "12px");
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
  await expect(page.locator('#featured a[href^="/playlists/"]').first()).toBeVisible({ timeout: 30_000 });
  const featured = page.locator("#featured");
  const nextButton = featured.locator('button[aria-label="Suivant"]');
  if (testInfo.project.name === "mobile") await expect(nextButton).toBeHidden();
  else {
    await expect(nextButton).toBeEnabled();
    await expect(nextButton).toHaveClass(/home-rail-nav--next/);
    await expect(nextButton).toHaveCSS("border-radius", "0px");
    expect((await nextButton.boundingBox())!.width).toBeGreaterThanOrEqual(76);
    expect((await nextButton.boundingBox())!.height).toBeGreaterThanOrEqual(56);
    await nextButton.hover();
    await expect.poll(() => nextButton.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe("none");
    await expect(page.getByRole("tooltip")).toHaveText("Suivant");
    const inverseButton = page.locator(".home-rail-nav--inverse").last();
    const inverseColors = await inverseButton.evaluate((node) => ({
      control: getComputedStyle(node).color,
      section: getComputedStyle(node.closest("section")!).backgroundColor,
    }));
    expect(inverseColors.control).not.toBe(inverseColors.section);
  }
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

test("le manifesto libère le scroll une fois révélé", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "La libération du sticky est contrôlée en desktop.");
  await page.addInitScript(() => window.sessionStorage.setItem("parigo-manifesto-revealed", "true"));
  await page.goto("/");
  const section = page.locator("#manifesto");
  await expect(section).toHaveAttribute("data-reveal-completed", "false");
  const edge = page.getByTestId("manifesto-reveal-edge");
  await expect(edge).toBeVisible();
  const geometry = await section.evaluate((node) => ({ top: (node as HTMLElement).offsetTop, travel: Math.max(1, node.clientHeight - window.innerHeight) }));
  await page.evaluate(({ top, travel }) => window.scrollTo({ top: top + travel * .5, behavior: "instant" }), geometry);
  await expect.poll(async () => Number.parseFloat(await edge.evaluate((node) => getComputedStyle(node).left))).toBeGreaterThan(100);
  await expect.poll(async () => Number.parseFloat(await edge.evaluate((node) => getComputedStyle(node).left))).toBeLessThan(1340);
  await section.evaluate((node) => window.scrollTo({ top: (node as HTMLElement).offsetTop + node.clientHeight, behavior: "instant" }));
  await expect(section).toHaveAttribute("data-reveal-completed", "true");
  await expect(page.getByTestId("manifesto-reveal-edge")).toHaveCount(0);
  await expect(section.locator(":scope > div")).toHaveCSS("position", "relative");
  const completedHeight = await section.evaluate((node) => node.clientHeight);
  expect(completedHeight).toBeLessThanOrEqual((await page.evaluate(() => window.innerHeight)) + 2);
  await section.evaluate((node) => window.scrollTo({ top: (node as HTMLElement).offsetTop - 120, behavior: "instant" }));
  await page.waitForTimeout(120);
  await section.evaluate((node) => window.scrollTo({ top: (node as HTMLElement).offsetTop + node.clientHeight + 120, behavior: "instant" }));
  await expect(page.getByTestId("manifesto-reveal-edge")).toHaveCount(0);
});

test("le manifesto mobile attend la fin du geste avant de libérer le sticky", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "La temporisation contrôle spécifiquement les navigations mobiles.");
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const section = page.locator("#manifesto");
  await section.evaluate((node) => window.scrollTo({
    top: (node as HTMLElement).offsetTop + node.clientHeight - window.innerHeight,
    behavior: "instant",
  }));
  await page.waitForTimeout(70);
  await expect(section).toHaveAttribute("data-reveal-completed", "false");
  await page.evaluate(() => window.scrollBy({ top: 28, behavior: "instant" }));
  await page.waitForTimeout(70);
  await expect(section).toHaveAttribute("data-reveal-completed", "false");

  const processTopBefore = await page.locator("#process").evaluate((node) => node.getBoundingClientRect().top);
  await expect(section).toHaveAttribute("data-reveal-completed", "true", { timeout: 1_000 });
  const processTopAfter = await page.locator("#process").evaluate((node) => node.getBoundingClientRect().top);
  expect(Math.abs(processTopAfter - processTopBefore)).toBeLessThanOrEqual(2);
  await expect(section.locator(":scope > div")).toHaveCSS("position", "relative");
});

test("la page albums propose une vue liste réellement compacte", async ({ page }) => {
  await page.goto("/albums");
  await expect(page.getByRole("heading", { level: 1, name: "Nos albums" })).toBeVisible();
  await page.getByRole("button", { name: "Vue liste" }).click();
  const firstRow = page.locator('main a[href^="/albums/"]').filter({ has: page.locator("h2") }).first();
  await expect(firstRow).toBeVisible({ timeout: 30_000 });
  const rowBox = await firstRow.boundingBox();
  const coverBox = await firstRow.locator("img").boundingBox();
  expect(rowBox).not.toBeNull();
  expect(coverBox).not.toBeNull();
  expect(rowBox!.height).toBeLessThanOrEqual(150);
  expect(coverBox!.width).toBeLessThanOrEqual(100);
});

test("une playlist Harvest avec une plage de BPM ouvre son détail", async ({ page }) => {
  await page.goto("/playlists/a408d52f57e8de96");
  await expect(page.getByRole("heading", { level: 1, name: "Discovery - Travel" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Lapochka", { exact: true })).toBeVisible();
  expect(await page.getByRole("button", { name: /^Écouter / }).count()).toBeGreaterThan(5);
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

test("les suggestions sont visibles à vide et la shortlist expose son état", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(testInfo.project.name === "mobile", "L’état compact de la shortlist est vérifié en desktop.");
  await page.goto("/search");
  await expect(page.getByRole("heading", { name: "Recherches suggérées" })).toBeVisible();
  await expect(page.getByRole("button", { name: "upbeat", exact: true })).toBeVisible();
  const searchInput = page.locator("#catalog-search");
  await searchInput.focus();
  const focusedForm = searchInput.locator("xpath=ancestor::form");
  expect(await focusedForm.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe("none");
  await expect(searchInput).toHaveCSS("outline-style", "none");
  const suggestionRail = page.locator(".suggestion-rail");
  expect(await suggestionRail.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-shortlist-trigger]")).toHaveCount(0);
  const add = page.getByRole("button", { name: /^Ajouter à la shortlist :/ }).first();
  await add.click();
  await expect(page.getByRole("dialog", { name: "Shortlist" })).toBeVisible();
  await expect(page.locator("[data-shortlist-trigger]")).toHaveCSS("right", "20px");
  await expect(page.locator("[data-shortlist-trigger]")).toHaveCSS("bottom", "20px");
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
  const input = page.getByLabel("Décrivez votre intention musicale");
  await input.fill("Une techno magnétique avec voix");
  const interpretation = page.getByTestId("search-interpretation");
  await expect(interpretation).toContainText("Techno");
  await expect(interpretation).toContainText("Voix détectée · filtre bientôt disponible");

  await input.fill("Une techno qui tabasse.");
  await expect(interpretation).toContainText("Techno");
  await expect(interpretation).toContainText("Énergique");
  const apply = page.getByRole("button", { name: "Interpréter et rechercher" });
  await expect(apply).toBeEnabled({ timeout: 30_000 });
  await apply.click();
  await expect(page).toHaveURL(/categories=ATT_8c1be9ece2483e34/, { timeout: 30_000 });

  const url = new URL(page.url());
  expect(url.searchParams.has("q")).toBe(false);
  expect(url.searchParams.get("brief")).toBe("Une techno qui tabasse.");
  expect(url.searchParams.get("categories")?.split(",")).toEqual(["ATT_8c1be9ece2483e34", "ATT_b242dfd7a2cf175e"]);
  await expect(page.getByText("2 inclus, 0 exclus", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
});

test("la recherche exacte reste accessible depuis le champ unifié", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/search");
  await page.getByRole("button", { name: "Rechercher un titre précis" }).click();
  const input = page.getByLabel("Rechercher un titre, un album ou un compositeur");
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
  await page.goto("/search?q=piano&view=tracks&type=main");
  const rail = page.getByLabel("Faire défiler les recherches suggérées horizontalement");
  const firstSuggestion = rail.locator("button").first();
  await firstSuggestion.hover();
  const railBox = await rail.boundingBox();
  const suggestionBox = await firstSuggestion.boundingBox();
  expect(railBox).not.toBeNull();
  expect(suggestionBox).not.toBeNull();
  expect(suggestionBox!.y).toBeGreaterThanOrEqual(railBox!.y);

  const moreTags = page.getByRole("button", { name: /^Voir tous les tags :/ }).first();
  await expect(moreTags).toBeVisible({ timeout: 30_000 });
  await moreTags.hover();
  await expect(page.getByRole("tooltip")).toContainText("Autres tags");
  await moreTags.click();
  await expect(moreTags.locator("xpath=ancestor::article")).toContainText("Mots clés");
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
  const youtube = page.getByRole("link", { name: "Voir la playlist YouTube" });
  const firstCard = page.locator(".home-sync-card").first();
  await expect(youtube).toBeVisible();
  expect((await youtube.boundingBox())!.y).toBeLessThan((await firstCard.boundingBox())!.y);
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
  await page.getByRole("combobox", { name: "Trier les résultats" }).click();
  await page.getByRole("option", { name: "A–Z" }).click();
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
