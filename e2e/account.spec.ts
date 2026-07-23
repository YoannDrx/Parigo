import { expect, test, type Page } from "@playwright/test";

const sessionPayload = {
  data: {
    session: {
      user: {
        id: "member-1",
        email: "yoann@parigo.test",
        name: "Yoann Andrieux",
        image: null,
        role: "USER",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      session: { expiresAt: "2026-08-01T00:00:00.000Z" },
    },
  },
};

const track = {
  id: "track-1",
  title: "Une écoute stable",
  duration: 148,
  bpm: 92,
  audioUrl: null,
  albumId: "album-1",
  albumTitle: "Parigo Test Pressing",
  albumCover: "/images/placeholder-album.jpg",
  albumLabel: "Parigo",
  genres: ["Documentary"],
  moods: ["Intimate"],
  isVocal: false,
  waveform: null,
};

async function mockSession(page: Page) {
  await page.route("**/api/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionPayload) }));
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({ necessary: true, preferences: false, analytics: false, marketing: false, updatedAt: "2026-07-23T00:00:00.000Z" }));
  });
});

test("le menu membre adopte la composition éditoriale et le monogramme Parigo", async ({ page }, testInfo) => {
  await mockSession(page);
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Ouvrir le menu" }).click();

  const scope = testInfo.project.name === "mobile" ? page.locator("#global-menu") : page.getByRole("navigation", { name: "Navigation principale" });
  const accountSurface = testInfo.project.name === "mobile" ? scope.getByTestId("account-menu") : scope;
  const trigger = scope.getByTestId("account-trigger");
  if (testInfo.project.name === "desktop") {
    await expect(trigger).toBeVisible();
    await trigger.hover();
    await expect(page.getByRole("tooltip", { name: "Mon compte" })).toBeVisible();
    await trigger.click();
  }
  const menu = testInfo.project.name === "mobile" ? accountSurface : page.getByTestId("account-menu");
  await expect(menu).toBeVisible();
  const accountMark = menu.getByTestId("account-mark").first();
  await expect(accountMark).toBeVisible();
  await expect(accountMark.locator(".account-mark__corner")).toHaveCount(2);
  await expect(accountMark).toHaveCSS("border-radius", "0px");
  await expect(accountMark).toHaveCSS("width", "64px");
  if (testInfo.project.name === "mobile") {
    await expect(menu.getByText("Yoann Andrieux", { exact: true })).toBeVisible();
    const accountBox = await menu.boundingBox();
    const firstGeneralLinkBox = await scope.getByRole("link", { name: "Recherche", exact: true }).boundingBox();
    expect(accountBox).not.toBeNull();
    expect(firstGeneralLinkBox).not.toBeNull();
    expect(firstGeneralLinkBox!.y).toBeGreaterThanOrEqual(accountBox!.y + accountBox!.height);
  }
  await expect(menu.getByText("Espace personnel", { exact: true })).toBeVisible();
  await expect(menu.getByText("Vos titres repérés", { exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: /Mes favoris/ })).toHaveAttribute("href", "/account/favorites");
  await expect(menu.getByRole("link", { name: /Recherches sauvegardées/ })).toHaveAttribute("href", "/account/searches");
  await expect(menu.getByRole("link", { name: /Tags personnels/ })).toHaveAttribute("href", "/account/tags");
  await expect(menu.getByRole("link", { name: /Historique/ })).toHaveAttribute("href", "/account/history");
  await expect(menu.getByText(/^0[1-5]$/)).toHaveCount(0);
  await expect(menu.getByRole("button", { name: "Se déconnecter" })).toHaveCSS("text-transform", "none");
});

test("les favoris chargés ne réamorcent pas leur propre requête", async ({ page }) => {
  await mockSession(page);
  let trackReads = 0;
  await page.route("**/api/user/favorites/tracks", (route) => {
    if (route.request().method() === "GET") trackReads += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tracks: [track] } }) });
  });
  await page.route("**/api/user/favorites/albums", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { albums: [] } }) }));
  await page.route("**/api/user/favorites", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { trackIds: [track.id], albumIds: [] } }) }));

  await page.goto("/account/favorites");
  await expect(page.getByText(track.title, { exact: true })).toBeVisible();
  const favouritesSearch = page.getByRole("textbox", { name: "Rechercher dans mes favoris" });
  await favouritesSearch.fill("introuvable");
  await expect(page.getByRole("heading", { name: "Aucun favori ne correspond." })).toBeVisible();
  await favouritesSearch.fill("documentary");
  await expect(page.getByText(track.title, { exact: true })).toBeVisible();
  await page.waitForTimeout(250);
  const settledTrackReads = trackReads;
  await page.waitForTimeout(600);
  expect(settledTrackReads).toBeLessThanOrEqual(2);
  expect(trackReads).toBe(settledTrackReads);
});

test("la création d’une première playlist utilise une modale Parigo et alimente la liste filtrable", async ({ page }) => {
  await mockSession(page);
  let playlists: Array<Record<string, unknown>> = [];
  let createdPayload: Record<string, unknown> | null = null;
  await page.route("**/api/user/playlists", async (route) => {
    if (route.request().method() === "POST") {
      createdPayload = route.request().postDataJSON() as Record<string, unknown>;
      playlists = [{ id: "playlist-new", slug: "premier-film", title: createdPayload.title, description: createdPayload.description, cover: "/images/placeholder-playlist.jpg", trackCount: 0, isPublic: createdPayload.isPublic, createdAt: "2026-07-23T09:00:00.000Z" }];
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { playlist: playlists[0] } }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { playlists } }) });
  });

  let nativeDialog: string | null = null;
  page.on("dialog", async (dialog) => { nativeDialog = dialog.type(); await dialog.dismiss(); });
  await page.goto("/account/playlists");
  await page.getByRole("button", { name: "Créer ma première playlist" }).click();
  const dialog = page.getByRole("dialog", { name: "Donnez-lui un point de vue." });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nom de la playlist").fill("Premier film");
  await dialog.getByLabel(/Note d’intention/).fill("Piano documentaire et texture intime");
  await dialog.getByRole("button", { name: "Créer la playlist" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Premier film", { exact: true })).toBeVisible();
  expect(createdPayload).toMatchObject({ title: "Premier film", description: "Piano documentaire et texture intime", isPublic: false });
  expect(nativeDialog).toBeNull();

  const search = page.getByRole("textbox", { name: "Rechercher dans mes playlists" });
  await search.fill("absente");
  await expect(page.getByRole("heading", { name: "Aucune playlist ne correspond." })).toBeVisible();
});

test("les commandes de photo de profil sont intégrées à l’avatar", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/user/profile", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { profile: { email: "yoann@parigo.test", firstName: "Yoann", lastName: "Andrieux", country: "FR", image: "/images/placeholder-album.jpg", status: "active", subscribed: false, fileFormats: [] } } }) }));
  await page.goto("/account");
  const control = page.getByTestId("profile-image-control");
  await expect(control).toBeVisible();
  expect((await control.boundingBox())!.width).toBeGreaterThanOrEqual(160);
  await expect(control.getByText("Changer", { exact: true })).toHaveCount(0);
  await expect(control.getByRole("button", { name: "Supprimer la photo" })).toBeVisible();
  await expect(control.locator('input[type="file"]')).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Enregistrer", exact: true })).toBeVisible();
});

test("l’historique chargé reste stable et réserve la place des actions", async ({ page }, testInfo) => {
  await mockSession(page);
  let historyReads = 0;
  const oldestTrack = { ...track, id: "track-oldest", title: "Écoute ancienne" };
  const middleTrack = { ...track, id: "track-middle", title: "Écoute intermédiaire" };
  const newestTrack = { ...track, id: "track-newest", title: "Écoute récente" };
  await page.route("**/api/user/history", (route) => {
    historyReads += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { history: [
      { id: "listen-oldest", playedAt: "2026-07-20T08:00:00.000Z", track: oldestTrack },
      { id: "listen-newest", playedAt: "2026-07-23T20:15:00.000Z", track: newestTrack },
      { id: "listen-middle", playedAt: "2026-07-22T12:30:00.000Z", track: middleTrack },
    ] } }) });
  });
  await page.route("**/api/user/favorites", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { trackIds: [], albumIds: [] } }) }));

  if (testInfo.project.name !== "mobile") {
    await page.setViewportSize({ width: 1720, height: 900 });
  }
  await page.goto("/account/history");
  await expect(page.getByText(newestTrack.title, { exact: true })).toBeVisible();
  const historyText = await page.locator("main").innerText();
  expect(historyText.indexOf(newestTrack.title)).toBeLessThan(historyText.indexOf(middleTrack.title));
  expect(historyText.indexOf(middleTrack.title)).toBeLessThan(historyText.indexOf(oldestTrack.title));
  await page.waitForTimeout(250);
  const settledHistoryReads = historyReads;
  await page.waitForTimeout(600);
  expect(settledHistoryReads).toBeLessThanOrEqual(2);
  expect(historyReads).toBe(settledHistoryReads);

  if (testInfo.project.name !== "mobile") {
    const newestEntry = page.getByTestId("history-entry").filter({ hasText: newestTrack.title });
    const playedAtBox = await newestEntry.getByTestId("history-played-at").boundingBox();
    const licenceBox = await newestEntry.getByRole("link", { name: `Demander une licence : ${newestTrack.title}` }).boundingBox();
    expect(playedAtBox).not.toBeNull();
    expect(licenceBox).not.toBeNull();
    expect(playedAtBox!.x + playedAtBox!.width).toBeLessThanOrEqual(licenceBox!.x);
  }
});

test("les notifications utilisent un switch Parigo et enregistrent la préférence", async ({ page }) => {
  await mockSession(page);
  let subscriptionPayload: Record<string, unknown> | null = null;
  await page.route("**/api/user/profile", async (route) => {
    if (route.request().method() === "PUT") {
      subscriptionPayload = route.request().postDataJSON() as Record<string, unknown>;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { profile: { subscribed: true } } }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { profile: { subscribed: false } } }) });
  });

  await page.goto("/account/settings");
  const notifications = page.getByRole("switch", { name: "Recevoir les nouvelles sorties Parigo" });
  await expect(notifications).toBeEnabled();
  await expect(notifications).toHaveAttribute("aria-checked", "false");
  await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);
  await expect(notifications.locator(".parigo-switch__state")).toHaveCount(0);
  await expect(notifications.locator(".parigo-switch__track")).toHaveCSS("border-radius", "8px 11px");
  await notifications.click();

  await expect.poll(() => subscriptionPayload).toEqual({ subscribed: true });
  await expect(notifications).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("status")).toHaveText("Préférence enregistrée.");
});

test("la suppression du compte utilise une alerte éditoriale progressive", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/user/profile", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { profile: { subscribed: false } } }) }));
  await page.goto("/account/settings");

  await expect(page.getByRole("heading", { name: "Supprimer votre espace Parigo." })).toBeVisible();
  await page.getByRole("button", { name: /Supprimer mon compte/ }).click();
  await expect(page.getByPlaceholder("SUPPRIMER")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmer la suppression" })).toBeDisabled();
});

test("les recherches sauvegardées restent relançables et supprimables", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/user/searches", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { searches: [{ id: "search-1", name: "Piano documentaire", searchUrl: "/search?q=piano&view=tracks", searchTermsCount: 2, createdAt: "2026-07-20T10:00:00.000Z" }] } }) }));
  await page.route("**/api/user/searches?id=search-1", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { removed: true } }) }));
  await page.goto("/account/searches");
  await expect(page.getByRole("heading", { name: "Recherches sauvegardées" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Relancer" })).toHaveAttribute("href", "/search?q=piano&view=tracks");
  await page.getByRole("button", { name: "Supprimer Piano documentaire" }).click();
  await expect(page.getByText("Piano documentaire", { exact: true })).toHaveCount(0);
});

test("une playlist expose suggestions et partage avancé", async ({ page }) => {
  await mockSession(page);
  let nativeDialog: string | null = null;
  page.on("dialog", async (dialog) => { nativeDialog = dialog.type(); await dialog.dismiss(); });
  const suggested = { ...track, id: "track-2", title: "Piano parallèle" };
  await page.route("**/api/user/playlists/playlist-1", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { playlist: { id: "playlist-1", title: "Film été", tracks: [track] } } }) }));
  await page.route("**/api/user/playlists/playlist-1/suggestions?limit=12", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tracks: [suggested] } }) }));
  let sharePayload: Record<string, unknown> | null = null;
  await page.route("**/api/user/playlists/playlist-1/share", async (route) => {
    sharePayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { share: { url: "https://share.parigo.test/selection", emailed: true } } }) });
  });
  await page.route("**/api/user/favorites", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { trackIds: [], albumIds: [] } }) }));
  await page.goto("/account/playlists/playlist-1");
  await page.getByRole("button", { name: "Renommer", exact: true }).click();
  const renameDialog = page.getByRole("dialog", { name: "Renommer la playlist." });
  await expect(renameDialog).toBeVisible();
  await renameDialog.getByRole("textbox", { name: "Nouveau nom" }).fill("Film automne");
  await renameDialog.getByRole("button", { name: "Renommer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Film automne" })).toBeVisible();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Supprimer cette playlist ?" });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Conserver" }).click();
  await expect(deleteDialog).toHaveCount(0);
  expect(nativeDialog).toBeNull();
  await page.getByRole("button", { name: "Prolonger la sélection" }).click();
  await expect(page.getByText("Piano parallèle", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Partager", exact: true }).click();
  await page.getByPlaceholder("nom@studio.com").fill("client@studio.test");
  await page.getByText("Autoriser le téléchargement", { exact: true }).click();
  await page.getByRole("button", { name: "Créer le lien et envoyer" }).click();
  await expect(page.getByText("https://share.parigo.test/selection", { exact: true })).toBeVisible();
  expect(sharePayload).toMatchObject({ toEmail: "client@studio.test", allowDownload: true, shareType: "Sync", sendEmail: true });
});

test("un membre peut ajouter une note privée à une piste", async ({ page }, testInfo) => {
  await mockSession(page);
  await page.route("**/api/user/playlists/playlist-1", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { playlist: { id: "playlist-1", title: "Film été", tracks: [track] } } }) }));
  await page.route("**/api/tracks/track-1", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { track } }) }));
  await page.route("**/api/user/favorites", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { trackIds: [], albumIds: [] } }) }));
  await page.route("**/api/user/tracks/track-1/comments", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { comments: [] } }) });
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { comment: { id: "note-1", trackId: "track-1", text: "Entrée parfaite à 00:42" } } }) });
  });
  await page.goto("/account/playlists/playlist-1");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: `Plus d’actions : ${track.title}` }).click();
  }
  await page.getByRole("button", { name: `Informations sur la piste : ${track.title}` }).click();
  await page.getByRole("tab", { name: "Notes privées" }).click();
  await page.getByPlaceholder("Intention, timecode, retour client…").fill("Entrée parfaite à 00:42");
  await page.getByRole("button", { name: "Ajouter la note" }).click();
  await expect(page.getByText("Entrée parfaite à 00:42", { exact: true })).toBeVisible();
});
