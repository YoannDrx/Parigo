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

test("la home hiérarchise le process, le projet puis les sensations", async ({ page }, testInfo) => {
  await page.goto("/");

  const process = page.locator("#process");
  const sensations = page.locator("#sensations");
  await expect(process.getByTestId("process-progress")).toBeVisible();
  await expect(process.getByText(/Progression du parcours|Parigo · supervision musicale|Chercher · Écouter · Sélectionner/)).toHaveCount(0);
  await expect(process.locator(".process-step")).toHaveCount(3);
  await expect(process.locator(".process-step > span.absolute")).toHaveCount(0);
  await expect(process.locator(".process-step__signal")).toHaveCount(3);
  await expect(process.locator(".process-step__signal > span")).toHaveCount(6);
  await expect(sensations.locator(".sensation-card")).toHaveCount(6);
  const firstSensation = sensations.locator(".sensation-card").first();
  if (testInfo.project.name !== "mobile") {
    await firstSensation.hover();
    await expect(firstSensation).toHaveCSS("background-color", "rgb(11, 15, 12)");
    await expect(firstSensation.locator(".sensation-card__title")).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(firstSensation.locator(".sensation-card__note")).toHaveCSS("color", "rgba(247, 248, 244, 0.74)");
    await firstSensation.focus();
    await expect(firstSensation.locator(".sensation-card__title")).toHaveCSS("color", "rgb(255, 255, 255)");
  }

  const socialSection = page.getByTestId("social-follow-section");
  const socialSpacing = await socialSection.evaluate((node) => {
    const style = getComputedStyle(node);
    return { top: style.paddingTop, bottom: style.paddingBottom };
  });
  expect(socialSpacing.top).toBe(socialSpacing.bottom);

  expect(await page.evaluate(() => {
    const nodes = ["process", "sensations", "editorial-playlists"].map((id) => document.getElementById(id));
    const projectNode = document.querySelector(".project-invitation");
    if (nodes.some((node) => !node) || !projectNode) return false;
    return Boolean(
      nodes[0]!.compareDocumentPosition(projectNode) & Node.DOCUMENT_POSITION_FOLLOWING
      && projectNode.compareDocumentPosition(nodes[1]!) & Node.DOCUMENT_POSITION_FOLLOWING
      && nodes[1]!.compareDocumentPosition(nodes[2]!) & Node.DOCUMENT_POSITION_FOLLOWING
    );
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
  const wave = fallback.locator(".signal-field-fallback__wave--primary");
  const before = await wave.evaluate((node) => getComputedStyle(node).transform);
  await page.waitForTimeout(300);
  const after = await wave.evaluate((node) => getComputedStyle(node).transform);
  expect(after).not.toBe(before);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const reducedFallback = page.getByTestId("home-hero").locator(".signal-field-fallback");
  await expect(reducedFallback).toHaveAttribute("data-static", "true");
  await expect(reducedFallback.locator(".signal-field-fallback__wave--primary")).toHaveCSS("animation-name", "none");
});

test("les six sensations ouvrent une recherche structurée avec des résultats", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  const expected = [
    ["Publicité", "publicité solaire"],
    ["Documentaire", "documentaire cinématique"],
    ["Fiction", "fiction sous tension"],
    ["Sport", "sport énergique"],
    ["Mode", "mode électronique"],
    ["Émotion", "émotion"],
  ] as const;

  for (const [label, brief] of expected) {
    await page.goto("/");
    const card = page.locator("#sensations").getByRole("link", { name: new RegExp(`^${label} —`) });
    const href = await card.getAttribute("href");
    expect(href).not.toBeNull();
    const destination = new URL(href!, "http://parigo.test");
    expect(destination.searchParams.get("brief")).toBe(brief);
    expect(destination.searchParams.get("resolve")).toBe("1");
    expect(destination.searchParams.has("q")).toBe(false);

    await card.click();
    await expect(page).toHaveURL(/\/search\?/);
    await expect(page.getByRole("button", { name: /^Écouter / }).first()).toBeVisible({ timeout: 30_000 });
    const resolved = new URL(page.url());
    expect(resolved.searchParams.get("categories"), `${label} doit appliquer un filtre`).toMatch(/^ATT_/);
    expect(resolved.searchParams.has("q")).toBe(false);
  }
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
