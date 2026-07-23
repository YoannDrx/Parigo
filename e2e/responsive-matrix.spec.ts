import { expect, test } from "@playwright/test";
import { installMemberSession } from "./helpers/member-session";

const viewports = [
  { width: 320, height: 740 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

test.beforeEach(async ({ page, context, baseURL }) => {
  await installMemberSession(context, baseURL!);
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

test("les routes principales ne débordent sur aucun viewport cible", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "La matrice configure explicitement ses six viewports.");
  test.setTimeout(180_000);

  await page.goto("/albums");
  const albumPath = await page.locator('main a[href^="/albums/"]').first().getAttribute("href");
  await page.goto("/playlists");
  const playlistPath = await page.locator('main a[href^="/playlists/"]').first().getAttribute("href");
  expect(albumPath).toBeTruthy();
  expect(playlistPath).toBeTruthy();

  const routes = [
    "/",
    "/search",
    "/albums",
    "/labels",
    albumPath!,
    playlistPath!,
    "/contact",
    "/account",
    "/legal",
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main")).toBeVisible();
      await page.waitForTimeout(100);
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(
        dimensions.scrollWidth,
        `${route} déborde à ${viewport.width}×${viewport.height}`,
      ).toBe(dimensions.clientWidth);
    }
  }
});
