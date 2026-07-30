import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: true,
      updatedAt: "2026-07-30T00:00:00.000Z",
    }));

    type PlayerEvents = {
      onReady: (event: { data: number; target: FakeYouTubePlayer }) => void;
      onStateChange: (event: { data: number; target: FakeYouTubePlayer }) => void;
      onError: () => void;
      onAutoplayBlocked: () => void;
    };

    class FakeYouTubePlayer {
      private state = -1;
      private readonly events: PlayerEvents;

      constructor(_iframe: HTMLIFrameElement, options: { events: PlayerEvents }) {
        this.events = options.events;
        queueMicrotask(() => this.events.onReady({ data: this.state, target: this }));
      }

      destroy() {}
      getPlayerState() { return this.state; }
      loadVideoById() { this.playVideo(); }
      pauseVideo() {
        this.state = 2;
        this.events.onStateChange({ data: this.state, target: this });
      }
      playVideo() {
        this.state = 1;
        this.events.onStateChange({ data: this.state, target: this });
      }
      seekTo() {}
    }

    Object.defineProperty(window, "YT", {
      configurable: true,
      value: {
        Player: FakeYouTubePlayer,
        PlayerState: {
          BUFFERING: 3,
          CUED: 5,
          ENDED: 0,
          PAUSED: 2,
          PLAYING: 1,
          UNSTARTED: -1,
        },
      },
    });
  });
});

test("un clip se lit dans sa carte, se détache et se réattache au détail sans recréer l’iframe", async ({ page }) => {
  await page.goto("/clips");
  const play = page.getByRole("button", { name: "Lire Garden of Eden" });
  await play.scrollIntoViewIfNeeded();
  await play.locator("..").locator("..").hover();
  await play.click();

  const player = page.getByTestId("persistent-clip-player");
  const iframe = page.getByTestId("persistent-clip-iframe");
  await expect(player).toBeVisible();
  await expect(player).toHaveAttribute("data-attached", "true");
  await expect(player).toHaveAttribute("data-status", "playing");
  await iframe.evaluate((element) => {
    element.dataset.persistenceMarker = "same-clip-iframe";
  });

  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(player).toHaveAttribute("data-attached", "false");
  await expect(iframe).toHaveAttribute("data-persistence-marker", "same-clip-iframe");

  await player.getByRole("link", { name: "Voir le détail de Garden of Eden" }).click();
  await expect(page).toHaveURL(/\/clips\/garden-of-eden$/);
  await expect(player).toHaveAttribute("data-attached", "true");
  await expect(iframe).toHaveAttribute("data-persistence-marker", "same-clip-iframe");
});

test("le refus marketing ouvre les préférences sans charger YouTube", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      updatedAt: "2026-07-30T00:00:00.000Z",
    }));
  });
  await page.goto("/clips");
  const play = page.getByRole("button", { name: "Lire Garden of Eden" });
  await play.scrollIntoViewIfNeeded();
  await play.click();

  await expect(page.getByRole("dialog", { name: "Préférences de cookies" })).toBeVisible();
  await expect(page.getByTestId("persistent-clip-iframe")).toHaveCount(0);
  await expect(page.locator("#parigo-youtube-iframe-api")).toHaveCount(0);
});

test("une track prend la main sur le clip sans perdre son iframe", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le même coordinateur est couvert sur mobile par les autres parcours.");
  test.setTimeout(60_000);
  await page.goto("/clips");
  const playClip = page.getByRole("button", { name: "Lire Garden of Eden" });
  await playClip.scrollIntoViewIfNeeded();
  await playClip.click();
  const clipPlayer = page.getByTestId("persistent-clip-player");
  const clipIframe = page.getByTestId("persistent-clip-iframe");
  await expect(clipPlayer).toHaveAttribute("data-status", "playing");
  await clipIframe.evaluate((element) => {
    element.dataset.persistenceMarker = "paused-not-destroyed";
  });

  await page.getByRole("link", { name: "Recherche", exact: true }).first().click();
  const playTrack = page.getByRole("button", { name: /^Écouter / }).first();
  await expect(playTrack).toBeVisible({ timeout: 30_000 });
  await playTrack.click();

  await expect(page.getByTestId("player-dock")).toBeVisible();
  await expect(clipPlayer).toHaveAttribute("data-status", "paused");
  await expect(clipPlayer).toHaveClass(/opacity-0/);
  await expect(clipIframe).toHaveAttribute("data-persistence-marker", "paused-not-destroyed");
});

test("les actions restent visibles et contenues sur mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Le contrat tactile est vérifié sur le projet mobile.");
  await page.goto("/clips");
  const card = page.locator(".parigo-video-card").filter({ hasText: "Garden of Eden" }).first();
  const actions = card.locator(".parigo-video-card__actions");
  await expect(actions).toHaveCSS("opacity", "1");
  await expect(card.getByRole("button", { name: "Lire Garden of Eden" })).toBeVisible();
  await expect(card.getByRole("link", { name: "Voir le détail de Garden of Eden" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
