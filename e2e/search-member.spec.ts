import { expect, test, type Page } from "@playwright/test";

const sessionPayload = { data: { session: { user: { id: "member-1", email: "yoann@parigo.test", name: "Yoann Andrieux", image: null, role: "USER", createdAt: "2026-01-01T00:00:00.000Z" }, session: { expiresAt: "2026-08-01T00:00:00.000Z" } } } };
const track = { id: "track-1", title: "Piano documentaire", description: "Une pièce documentaire intime qui laisse respirer le récit et les images.", duration: 148, bpm: 92, audioUrl: null, albumId: "album-1", albumTitle: "Parigo Test Pressing", albumCover: "/images/placeholder-album.svg", albumLabel: "Parigo", albumLabelSlug: "parigo", genres: ["Documentary"], moods: ["Intimate"], isVocal: false, waveform: Array.from({ length: 80 }, (_, index) => .25 + (index % 9) / 12) };
const facets = { bpm: { min: 1, max: 300 }, duration: { min: 1, max: 2029 }, labels: [], categories: [] };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({ necessary: true, preferences: false, analytics: false, marketing: false, updatedAt: "2026-07-23T00:00:00.000Z" }));
  });
});

async function mockMemberSearch(page: Page) {
  await page.route("**/api/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionPayload) }));
  await page.route("**/api/search/filters?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { groups: [] } }) }));
  await page.route("**/api/search?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { items: [track], view: "tracks", facets }, meta: { page: 1, pageSize: 30, total: 1, requestId: "request-1", searchHistoryId: "history-1" } }) }));
  await page.route("**/api/user/favorites", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { trackIds: [], albumIds: [] } }) }));
  await page.route("**/api/user/tracks/*/tags", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tags: [] } }) }));
}

async function revealTrackAction(page: Page, actionName: string | RegExp, triggerName: string | RegExp) {
  let action = page.getByRole("button", { name: actionName }).filter({ visible: true }).first();
  try {
    await action.waitFor({ state: "visible", timeout: 5_000 });
  } catch {
    await page.getByRole("button", { name: triggerName }).filter({ visible: true }).first().click();
    action = page.getByRole("button", { name: actionName }).filter({ visible: true }).first();
  }
  await expect(action).toBeVisible();
  return action;
}

test("le player se range sous la shortlist sans perdre sa piste ni ses liens", async ({ page }) => {
  await mockMemberSearch(page);
  await page.goto("/search?q=piano&view=tracks&type=main");

  await page.getByRole("button", { name: /^Ajouter à la shortlist :/ }).click();
  const shortlist = page.getByRole("dialog", { name: "Shortlist" });
  const shortlistDrawer = page.locator(".shortlist-drawer");
  const shortlistBackdrop = page.locator(".parigo-modal-backdrop");
  await expect(shortlist).toBeVisible();
  await shortlist.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(shortlistDrawer).toHaveCount(0);
  await expect(shortlistBackdrop).toHaveCount(0);
  const playButton = page.getByRole("button", { name: /^Écouter Piano documentaire/ });
  await playButton.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await playButton.click();

  const player = page.getByTestId("player-dock");
  await expect(player).toHaveAttribute("data-player-state", "docked");
  await expect(player.getByRole("link", { name: "Ouvrir la piste Piano documentaire" })).toHaveAttribute("href", "/albums/album-1?track=track-1");
  await expect(player.getByRole("link", { name: "Ouvrir le label Parigo" })).toHaveAttribute("href", "/labels/parigo");
  await player.getByTestId("player-waveform").evaluate((node) => { node.dataset.persistenceMarker = "same-waveform"; });

  await player.getByRole("button", { name: "Ranger le lecteur" }).click();
  await expect(player).toHaveAttribute("data-player-state", "stowed");
  await expect(player).toHaveAttribute("data-playing", "true");
  const playerBox = await player.boundingBox();
  expect(playerBox).not.toBeNull();
  expect(playerBox!.width).toBeLessThanOrEqual(65);
  expect(playerBox!.height).toBeLessThanOrEqual(70);
  await expect(player.getByRole("button", { name: /pause/i })).toBeVisible();
  await expect(player.getByRole("button", { name: "Déployer le lecteur" })).toBeVisible();
  await expect(player.getByTestId("player-waveform")).toHaveAttribute("data-persistence-marker", "same-waveform");

  const shortlistTrigger = page.locator("[data-shortlist-trigger]");
  await expect(shortlistTrigger).toBeVisible();
  await expect.poll(async () => {
    const [compactBox, triggerBox] = await Promise.all([player.boundingBox(), shortlistTrigger.boundingBox()]);
    return compactBox && triggerBox ? compactBox.y - (triggerBox.y + triggerBox.height) : -1;
  }).toBeGreaterThanOrEqual(10);

  await player.getByRole("button", { name: "Déployer le lecteur" }).click();
  await expect(player).toHaveAttribute("data-player-state", "docked");
  await expect(player.getByTestId("player-waveform")).toHaveAttribute("data-persistence-marker", "same-waveform");
});

test("les points de partage de piste ouvrent la même modale et réutilisent le lien court", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Les trois points d’entrée sont vérifiés une fois sur la surface desktop complète.");
  await mockMemberSearch(page);
  await page.route("**/api/tracks/track-1", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { track: { ...track, alternateTracks: [] } } }) }));
  let shortUrlRequests = 0;
  await page.route("**/api/share/short-url", (route) => {
    shortUrlRequests += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { url: "https://hrvst.co/p/e2e-share", shortened: true } }) });
  });
  await page.goto("/search?q=piano&view=tracks&type=main");
  const shareDialog = page.getByRole("dialog", { name: "Partagez ce morceau" });

  await page.locator('[data-track-id="track-1"]').getByRole("button", { name: `Partager : ${track.title}` }).click();
  await expect(shareDialog).toBeVisible();
  await expect(shareDialog.getByLabel("Lien public")).toHaveValue("https://hrvst.co/p/e2e-share");
  await shareDialog.getByRole("button", { name: "Fermer le partage" }).click();

  await page.getByRole("button", { name: `Informations sur la piste : ${track.title}` }).first().click();
  const details = page.locator(".track-detail-panel");
  await expect(details).toBeVisible();
  await details.getByRole("button", { name: `Partager : ${track.title}` }).click();
  await expect(shareDialog.getByLabel("Lien public")).toHaveValue("https://hrvst.co/p/e2e-share");
  await shareDialog.getByRole("button", { name: "Fermer le partage" }).click();

  await page.getByRole("button", { name: `Écouter ${track.title}` }).click();
  const player = page.getByTestId("player-dock");
  await player.getByRole("button", { name: `Partager : ${track.title}` }).click();
  await expect(shareDialog.getByLabel("Lien public")).toHaveValue("https://hrvst.co/p/e2e-share");
  expect(shortUrlRequests).toBe(1);
});

test("la waveform d’une piste pilote la position du player à la souris et au clavier", async ({ page }) => {
  await mockMemberSearch(page);
  await page.goto("/search?q=piano&view=tracks&type=main");
  const row = page.locator('.parigo-track-row[data-track-id="track-1"]');
  const waveform = row.getByRole("slider", { name: "Position de lecture : Piano documentaire" });
  await expect(waveform).toBeVisible();

  const bounds = await waveform.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.click(bounds!.x + bounds!.width * .75, bounds!.y + bounds!.height / 2);
  const player = page.getByTestId("player-dock");
  await expect(player).toBeVisible();
  await expect(player.getByTestId("player-time-current")).toHaveText(/1:5[01]/);
  await expect(waveform).toHaveAttribute("aria-valuenow", "75");

  await waveform.focus();
  await waveform.press("ArrowLeft");
  await expect(player.getByTestId("player-time-current")).toHaveText("1:43");
  await expect(waveform).toHaveAttribute("aria-valuenow", "70");
});

test("la recherche connectée se sauvegarde avec le double contour porté par le formulaire", async ({ page }) => {
  await mockMemberSearch(page);
  let savedPayload: Record<string, unknown> | null = null;
  await page.route("**/api/user/searches", async (route) => {
    savedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { search: { id: "history-1", name: "Piano documentaire" } } }) });
  });
  await page.goto("/search?q=piano&view=tracks&type=main");
  const searchCommand = page.getByRole("region", { name: "Recherche dans le catalogue" });
  await expect(searchCommand).toBeVisible();
  const input = searchCommand.getByRole("combobox", { name: "Rechercher dans le catalogue" });
  const searchForm = searchCommand.locator("form");
  await input.blur();
  await expect(input).not.toBeFocused();
  await expect.poll(async () => searchForm.evaluate((node) => getComputedStyle(node).boxShadow)).not.toContain("inset");
  const borderBeforeFocus = await searchForm.evaluate((node) => getComputedStyle(node).borderColor);
  await input.focus();
  await expect(input).toBeFocused();
  await expect.poll(async () => searchForm.evaluate((node) => getComputedStyle(node).boxShadow)).toContain("inset");
  await expect.poll(async () => searchForm.evaluate((node) => getComputedStyle(node).borderColor)).not.toBe(borderBeforeFocus);
  await expect(input).toHaveCSS("outline-style", "none");
  await input.press("Escape");
  await expect(page.getByRole("listbox", { name: "Suggestions de recherche" })).toHaveCount(0);
  await page.getByRole("button", { name: "Sauvegarder" }).click();
  await page.getByLabel("Nom de la recherche").fill("Piano intime pour documentaire");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("button", { name: "Sauvegardée" })).toBeVisible();
  expect(savedPayload).toMatchObject({ name: "Piano intime pour documentaire", searchHistoryId: "history-1", searchUrl: "/search?q=piano&view=tracks&type=main" });
});

test("toutes les versions restent groupées sous la piste principale avec leurs stems", async ({ page }, testInfo) => {
  await mockMemberSearch(page);
  const alternateOne = { ...track, id: "track-1-alt-1", title: "Piano documentaire — 60 sec", version: "60 seconds", isAlternate: true };
  const alternateTwo = { ...track, id: "track-1-alt-2", title: "Piano documentaire — no drums", version: "No drums", isAlternate: true };
  const enrichedTrack = {
    ...track,
    albumCode: "PGO 001",
    alternateTracks: [alternateOne, alternateTwo],
    stems: [{ id: "stem-piano", title: "Piano" }, { id: "stem-strings", title: "Strings" }],
  };
  await page.route("**/api/search?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      data: { items: [enrichedTrack], view: "tracks", facets },
      meta: { page: 1, pageSize: 30, total: 1, requestId: "versions-request" },
    }),
  }));

  await page.goto("/search?q=piano&view=tracks&type=all&density=light");
  await expect(page.locator('[data-search-track-group="track-1"]')).toBeVisible();
  await expect(page.locator('[data-track-kind="alternate"]')).toHaveCount(2);
  await expect(page.getByText("2 versions", { exact: true })).toBeVisible();
  await expect(page.locator(".lucide-git-branch")).toHaveCount(0);
  await expect(page.locator('[data-search-track-group="track-1"] [data-testid="track-display-number"]')).toHaveText(["1", "1.1", "1.2"]);
  const alternateRows = page.locator('[data-track-kind="alternate"]');
  await expect(alternateRows.nth(0)).toContainText("Piano documentaire — 60 sec");
  await expect(alternateRows.nth(0)).toContainText("60 seconds");
  await expect(alternateRows.nth(1)).toContainText("Piano documentaire — no drums");
  await expect(alternateRows.nth(1)).toContainText("No drums");
  await expect(page.getByText("Piano", { exact: true })).toBeVisible();
  await expect(page.getByText("Strings", { exact: true })).toBeVisible();

  const row = page.locator('[data-track-id="track-1"]');
  await expect(row).toContainText("Piano documentaire");
  await expect(row).toContainText("Parigo Test Pressing");
  await expect(row).toContainText("Réf. PGO 001");
  const titleBox = await row.locator(".parigo-track-row__title").boundingBox();
  const albumBox = await row.getByText("Parigo Test Pressing", { exact: true }).boundingBox();
  expect(titleBox).not.toBeNull();
  expect(albumBox).not.toBeNull();
  if (testInfo.project.name === "desktop") {
    expect(Math.abs(titleBox!.y - albumBox!.y)).toBeLessThan(4);
  } else {
    expect(albumBox!.y).toBeGreaterThan(titleBox!.y);
  }
  const moreActions = page.getByRole("button", { name: `Plus d’actions : ${track.title}`, exact: true });
  if (testInfo.project.name === "desktop") {
    await expect(moreActions).toBeHidden();
    await expect(page.getByRole("button", { name: `Ajouter à une playlist : ${track.title}`, exact: true })).toBeVisible();
  } else {
    await expect(moreActions).toBeVisible();
    await expect(moreActions.locator(".lucide-ellipsis")).toHaveCount(1);
    await moreActions.click();
    const actions = page.getByRole("dialog", { name: `Actions de la piste : ${track.title}`, exact: true });
    await expect(actions).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(actions).toHaveCount(0);
    await expect(moreActions).toBeFocused();
  }
});

test("la piste détaillée sépare titre, album et référence sans les tronquer", async ({ page }, testInfo) => {
  await mockMemberSearch(page);
  await page.route("**/api/search?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      data: { items: [{ ...track, albumCode: "PGO 001" }], view: "tracks", facets },
      meta: { page: 1, pageSize: 30, total: 1, requestId: "layout-request" },
    }),
  }));
  await page.goto("/search?q=piano&view=tracks&type=main&density=full");
  const row = page.locator('[data-track-id="track-1"]');
  const titleBox = await row.locator(".parigo-track-row__title").boundingBox();
  const albumBox = await row.getByText(track.albumTitle, { exact: true }).boundingBox();
  expect(titleBox).not.toBeNull();
  expect(albumBox).not.toBeNull();
  expect(albumBox!.y).toBeGreaterThan(titleBox!.y);
  await expect(row).toContainText("Réf. PGO 001");
  const leftLedgerLabel = page.getByText("Titre · album · waveform", { exact: true });
  const rightLedgerLabel = page.getByText("Tags · ambiance · tempo · durée · actions", { exact: true });
  await expect(page.getByTestId("search-workspace")).toBeVisible();
  if (testInfo.project.name === "desktop") {
    await expect(leftLedgerLabel).toBeVisible();
    await expect(rightLedgerLabel).toBeVisible();
    const before = await row.evaluate((element) => getComputedStyle(element).backgroundImage);
    await row.hover();
    const after = await row.evaluate((element) => getComputedStyle(element).backgroundImage);
    expect(after).not.toBe(before);
    expect(after).toContain("0.15");
  } else {
    await expect(leftLedgerLabel).toBeHidden();
    await expect(rightLedgerLabel).toBeHidden();
  }
});

test("les ordinateurs compacts conservent toutes les actions et déploient le contenu sur la largeur", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "La composition à pointeur fin est propre au desktop.");
  await mockMemberSearch(page);
  await page.goto("/search?q=piano&view=tracks&type=main&density=full");
  const row = page.locator('[data-track-id="track-1"]');
  await expect(row).toBeVisible();

  for (const width of [768, 900, 1024, 1152, 1280, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 1100 ? 768 : 900 });
    await expect(row).toBeVisible();
    const layout = await row.evaluate((element) => {
      const visible = (node: Element) => {
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
      };
      const box = (selector: string) => {
        const bounds = element.querySelector(selector)?.getBoundingClientRect();
        return bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, right: bounds.right } : null;
      };
      return {
        row: box(":scope"),
        identity: box(".parigo-track-row__identity"),
        actions: box(".parigo-track-row__actions"),
        waveform: box(".parigo-track-row__waveform"),
        description: box(".parigo-track-row__description"),
        labels: [...element.querySelectorAll(".parigo-track-row__actions :is(button,a)")]
          .filter(visible)
          .map((node) => node.getAttribute("aria-label") ?? ""),
        overflow: element.scrollWidth - element.clientWidth,
      };
    });

    expect(layout.overflow, `débordement de la piste à ${width}px`).toBe(0);
    expect(layout.labels, `actions visibles à ${width}px`).toHaveLength(12);
    for (const label of ["favoris", "Informations", "similaires", "notes privées", "Télécharger", "playlist", "tag", "Cue sheet", "file d’attente", "shortlist", "Partager", "licence"]) {
      expect(layout.labels.some((candidate) => candidate.toLocaleLowerCase("fr").includes(label.toLocaleLowerCase("fr"))), `${label} absente à ${width}px`).toBe(true);
    }
    expect(layout.labels.some((label) => label.includes("Plus d’actions"))).toBe(false);

    if (layout.row && layout.row.width <= 1152) {
      expect(layout.waveform).not.toBeNull();
      expect(layout.description).not.toBeNull();
      expect(layout.identity!.width).toBeGreaterThan(120);
      expect(layout.waveform!.width).toBeGreaterThanOrEqual(layout.row.width - 30);
      expect(Math.abs(layout.waveform!.x - layout.description!.x)).toBeLessThan(2);
      expect(Math.abs(layout.waveform!.right - layout.description!.right)).toBeLessThan(2);
    }
  }
});

test("les téléphones et tablettes tactiles gardent toutes les actions dans un menu contenu", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "La composition tactile est vérifiée avec le contexte mobile Chromium.");
  await mockMemberSearch(page);
  await page.goto("/search?q=piano&view=tracks&type=main&density=full");
  const row = page.locator('[data-track-id="track-1"]');
  const viewports = [
    { width: 320, height: 568 },
    { width: 320, height: 740 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 844, height: 390 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect(row).toBeVisible();
    await page.waitForTimeout(300);
    const trigger = row.getByRole("button", { name: `Plus d’actions : ${track.title}` });
    await expect(trigger).toBeVisible();
    await expect(row.getByRole("button", { name: `Ajouter à une playlist : ${track.title}` })).toBeHidden();
    for (const control of [trigger, row.getByRole("button", { name: `Ajouter à la shortlist : ${track.title}` })]) {
      const bounds = await control.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }

    await trigger.click();
    const actions = page.getByRole("dialog", { name: `Actions de la piste : ${track.title}`, exact: true });
    await expect(actions).toBeVisible();
    await expect(actions.locator(".track-mobile-action")).toHaveCount(11);
    const actionBounds = await actions.boundingBox();
    expect(actionBounds).not.toBeNull();
    expect(actionBounds!.x).toBeGreaterThanOrEqual(0);
    expect(actionBounds!.x + actionBounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(actionBounds!.height).toBeLessThanOrEqual(viewport.height);
    const undersizedControls = await actions.locator(".track-mobile-action__control :is(button,a)").evaluateAll((controls) => controls.map((control) => {
      const bounds = control.getBoundingClientRect();
      return { label: control.getAttribute("aria-label"), width: bounds.width, height: bounds.height };
    }).filter((bounds) => bounds.width < 44 || bounds.height < 44));
    expect(undersizedControls).toEqual([]);
    await actions.getByRole("button", { name: "Fermer les actions", exact: true }).click();
    await expect(actions).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  }

  await page.setViewportSize({ width: 844, height: 390 });
  await row.getByRole("button", { name: `Plus d’actions : ${track.title}` }).click();
  await page.getByRole("dialog", { name: `Actions de la piste : ${track.title}`, exact: true }).getByRole("button", { name: `Informations sur la piste : ${track.title}` }).click();
  const detailSheet = page.locator(".track-detail-sheet");
  await expect(detailSheet).toBeVisible();
  const detailBounds = await detailSheet.boundingBox();
  expect(detailBounds).not.toBeNull();
  expect(detailBounds!.x).toBeGreaterThanOrEqual(0);
  expect(detailBounds!.x + detailBounds!.width).toBeLessThanOrEqual(844);
  expect(detailBounds!.y + detailBounds!.height).toBeLessThanOrEqual(390);
});

test("les actions et tooltips de recherche suivent la langue active", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Le tooltip au survol est vérifié sur un pointeur desktop.");
  await mockMemberSearch(page);
  await page.setViewportSize({ width: 1800, height: 900 });
  await page.goto("/search?q=piano&view=tracks&type=main");
  await page.getByRole("link", { name: /English version/ }).click();
  await expect(page.getByRole("combobox", { name: "Search the catalog" })).toBeVisible();
  const favourite = page.getByRole("button", { name: "Add to favourites" }).first();
  await expect(favourite).toBeVisible();
  await favourite.hover();
  await expect(page.getByRole("tooltip", { name: "Add to favourites" })).toBeVisible();
  await expect(page.getByRole("button", { name: `Track information : ${track.title}` })).toBeVisible();
  await expect(page.getByRole("button", { name: `Add to playlist : ${track.title}` })).toBeVisible();
});

test("les actions playlist et tag utilisent un popover visible sans dialogue natif", async ({ page }, testInfo) => {
  await mockMemberSearch(page);
  await page.route("**/api/user/playlists", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { playlists: [] } }) }));
  await page.route("**/api/user/tags", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tags: [] } }) }));
  let nativeDialog: string | null = null;
  page.on("dialog", async (dialog) => { nativeDialog = dialog.type(); await dialog.dismiss(); });

  await page.goto("/search?q=piano&view=tracks&type=main");
  await (await revealTrackAction(page, `Ajouter à une playlist : ${track.title}`, `Plus d’actions : ${track.title}`)).click();
  const playlistDialog = page.getByRole("dialog", { name: new RegExp(`Ajouter à une playlist — ${track.title}`) });
  await expect(playlistDialog).toBeVisible();
  await expect(playlistDialog.getByText("Aucune playlist pour le moment.", { exact: false })).toBeVisible();
  await expect(playlistDialog.getByRole("link", { name: "Créer une playlist" })).toHaveAttribute("href", "/account/playlists");
  await playlistDialog.getByRole("button", { name: "Fermer" }).click();

  const row = page.locator("article").filter({ hasText: track.title }).first();
  await row.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY));
  if (testInfo.project.name === "mobile" && !(await page.getByRole("button", { name: `Ajouter un tag : ${track.title}` }).isVisible())) {
    await page.getByRole("button", { name: `Plus d’actions : ${track.title}` }).click();
  }
  await page.getByRole("button", { name: `Ajouter un tag : ${track.title}` }).click();
  const tagDialog = page.getByRole("dialog", { name: new RegExp(`Ajouter à un tag — ${track.title}`) });
  await expect(tagDialog).toBeVisible();
  await expect(tagDialog.getByText("Créez d’abord un tag", { exact: false })).toBeVisible();
  const bounds = await tagDialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(8);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(testInfo.project.name === "mobile" ? 836 : 892);
  expect(nativeDialog).toBeNull();
});

test("l’icône de note privée ouvre directement le bon onglet", async ({ page }) => {
  await mockMemberSearch(page);
  await page.route("**/api/tracks/track-1", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { track } }) }));
  await page.route("**/api/user/tracks/track-1/comments", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { comments: [] } }) }));
  await page.goto("/search?q=piano&view=tracks&type=main");
  await (await revealTrackAction(page, `Ouvrir les notes privées : ${track.title}`, `Plus d’actions : ${track.title}`)).click();
  await expect(page.getByRole("tab", { name: "Notes privées" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByPlaceholder("Intention, timecode, retour client…")).toBeVisible();
});

test("une demande de licence conserve la référence et préremplit le brief", async ({ page }) => {
  await page.goto("/contact?track=track-reference-test");
  await expect(page.getByRole("heading", { name: "Demander une licence pour ce morceau" })).toBeVisible();
  const message = await page.getByRole("textbox", { name: /Projet & licence/ }).inputValue();
  expect(message).toContain("Référence : track-reference-test");
  expect(message).toContain("Médias et territoires :");
  expect(message).toContain("Calendrier :");
});

test("un attribut injecté par une extension sur body ne déclenche plus l’overlay d’hydratation", async ({ page }) => {
  await mockMemberSearch(page);
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("A tree hydrated but some attributes")) hydrationErrors.push(message.text());
  });
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.body) return;
      document.body.setAttribute("cz-shortcut-listen", "true");
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto("/search?q=piano&view=tracks&type=main");
  await expect(page.getByText(track.title, { exact: true })).toBeVisible();
  await page.waitForTimeout(300);
  expect(hydrationErrors).toEqual([]);
});
