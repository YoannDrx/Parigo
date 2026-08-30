import { expect, test, type Page } from "@playwright/test";
import { installMemberSession } from "./helpers/member-session";

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
  albumCover: "/images/placeholder-album.svg",
  albumLabel: "Parigo",
  genres: ["Documentary"],
  moods: ["Intimate"],
  isVocal: false,
  waveform: null,
};

async function mockSession(page: Page) {
  await page.route("**/api/auth/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sessionPayload) }));
}

test.beforeEach(async ({ page, context, baseURL }) => {
  await installMemberSession(context, baseURL!);
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({ necessary: true, preferences: false, analytics: false, marketing: false, updatedAt: "2026-07-23T00:00:00.000Z" }));
  });
});

test("le menu membre adopte la composition éditoriale et le monogramme Parigo", async ({ page }, testInfo) => {
  await mockSession(page);
  await page.goto("/");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Ouvrir le menu" }).click();

  const scope = testInfo.project.name === "mobile" ? page.locator("#global-menu") : page.getByRole("navigation", { name: "Navigation principale" });
  const accountSurface = testInfo.project.name === "mobile" ? page.getByRole("dialog", { name: "Navigation du compte" }) : scope;
  const trigger = scope.getByTestId("account-trigger");
  if (testInfo.project.name === "mobile") {
    await expect(trigger).toBeVisible();
    await trigger.click();
  } else {
    await expect(trigger).toBeVisible();
    await trigger.hover();
    await expect(page.getByRole("tooltip", { name: "Mon compte" })).toBeVisible();
    await trigger.click();
  }
  const menu = testInfo.project.name === "mobile" ? accountSurface : page.getByTestId("account-menu");
  await expect(menu).toBeVisible();
  const accountMark = menu.getByTestId("account-mark").first();
  await expect(accountMark).toBeVisible();
  await expect(accountMark.locator(".account-mark__corner")).toHaveCount(0);
  await expect(accountMark).toHaveCSS("border-radius", "0px");
  await expect(accountMark).toHaveCSS("width", "64px");
  if (testInfo.project.name === "mobile") {
    await expect(menu.getByText("Yoann Andrieux", { exact: true })).toBeVisible();
    await expect(menu).not.toContainText("Votre catalogue à portée de main");
    const globalMenu = page.locator("#global-menu");
    await expect(globalMenu).toHaveAttribute("inert", "");
    await expect(globalMenu).toHaveCSS("overflow-y", "hidden");
    expect(Number.parseFloat(await globalMenu.evaluate((node) => getComputedStyle(node).filter.match(/blur\(([^p]+)/)?.[1] || "0"))).toBeGreaterThan(0);
    const accountBox = await menu.boundingBox();
    const triggerBox = await trigger.boundingBox();
    expect(accountBox).not.toBeNull();
    expect(triggerBox).not.toBeNull();
    expect(accountBox!.y).toBeGreaterThanOrEqual(0);
    expect(accountBox!.x + accountBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(accountBox!.y + accountBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  await expect(menu.getByText("Espace personnel", { exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Ouvrir mon profil" })).toHaveAttribute("href", "/account");
  await expect(menu.getByText("Vos titres repérés", { exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: /Mes favoris/ })).toHaveAttribute("href", "/account/favorites");
  await expect(menu.getByRole("link", { name: /Recherches sauvegardées/ })).toHaveAttribute("href", "/account/searches");
  await expect(menu.getByRole("link", { name: /Tags personnels/ })).toHaveAttribute("href", "/account/tags");
  await expect(menu.getByRole("link", { name: /Historique/ })).toHaveAttribute("href", "/account/history");
  await expect(menu.getByText(/^0[1-5]$/)).toHaveCount(0);
  await expect(menu.getByRole("button", { name: "Se déconnecter" })).toHaveCSS("text-transform", "none");
  if (testInfo.project.name === "mobile") {
    const logout = menu.getByRole("button", { name: "Se déconnecter" });
    const [logoutBox, parentBox] = await Promise.all([logout.boundingBox(), logout.locator("xpath=..").boundingBox()]);
    expect(logoutBox).not.toBeNull();
    expect(parentBox).not.toBeNull();
    expect(Math.abs(logoutBox!.width - parentBox!.width)).toBeLessThanOrEqual(2);
  }
});

test("naviguer vers le compte depuis le menu global ferme le menu et libère la page", async ({ page }, testInfo) => {
  await mockSession(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const globalMenu = page.getByRole("dialog", { name: "Menu principal" });
  await expect(globalMenu).toBeVisible();

  const accountTrigger = testInfo.project.name === "mobile"
    ? globalMenu.getByTestId("account-trigger")
    : page.getByRole("navigation", { name: "Navigation principale" }).getByTestId("account-trigger");
  await accountTrigger.click();
  const accountMenu = page.locator('[data-testid="account-menu"]:visible');
  await expect(accountMenu).toBeVisible();
  await accountMenu.getByRole("link", { name: "Ouvrir mon profil" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(globalMenu).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("les favoris chargés ne réamorcent pas leur propre requête", async ({ page }, testInfo) => {
  await mockSession(page);
  let trackReads = 0;
  await page.route("**/api/user/favorites/tracks", (route) => {
    if (route.request().method() === "GET") trackReads += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tracks: [track] } }) });
  });
  await page.route("**/api/user/favorites", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { trackIds: [track.id] } }) }));

  await page.goto("/account/favorites");
  await expect(page.getByText(track.title, { exact: true })).toBeVisible();
  const categorySelect = page.getByRole("combobox", { name: "Filtrer les favoris" });
  const selectValue = categorySelect.locator(".parigo-select__value");
  await expect(selectValue).toHaveText("Tous les genres et humeurs");
  expect(await selectValue.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await categorySelect.click();
  const categoryOption = page.getByRole("option", { name: "Documentary" });
  await expect(categoryOption).toBeVisible();
  if (testInfo.project.name !== "mobile") {
    const optionBackground = await categoryOption.evaluate((node) => getComputedStyle(node).backgroundColor);
    await categoryOption.hover();
    await expect.poll(() => categoryOption.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(optionBackground);
  }
  await page.getByRole("option", { name: "Tous les genres et humeurs" }).click();
  const favouritesLedger = page.locator(".favorites-track-ledger");
  await expect(favouritesLedger).toBeVisible();
  const ledgerFrame = await favouritesLedger.evaluate((node) => {
    const style = getComputedStyle(node, "::before");
    return {
      radius: style.borderRadius,
      top: style.top,
      right: style.right,
      bottom: style.bottom,
      left: style.left,
      border: style.borderTopWidth,
    };
  });
  expect(ledgerFrame.radius).not.toBe("0px");
  expect(ledgerFrame).toMatchObject({ top: "0px", right: "0px", bottom: "0px", left: "0px", border: "1px" });
  const favouriteRow = page.locator('[data-track-id="track-1"]');
  const favouriteTitleBox = await favouriteRow.locator(".parigo-track-row__title").boundingBox();
  const favouriteAlbumBox = await favouriteRow.getByText(track.albumTitle, { exact: true }).boundingBox();
  expect(favouriteTitleBox).not.toBeNull();
  expect(favouriteAlbumBox).not.toBeNull();
  expect(favouriteAlbumBox!.y).toBeGreaterThan(favouriteTitleBox!.y);
  if (testInfo.project.name === "mobile") {
    const rowBox = await favouriteRow.boundingBox();
    expect(rowBox).not.toBeNull();
    expect(rowBox!.x + rowBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await expect(favouriteRow).toHaveAttribute("data-mobile-layout", "dense");
    for (const control of await favouriteRow.locator(".parigo-track-row__actions button:visible").all()) {
      const bounds = await control.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
  }
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

test("la création d’une première playlist utilise une modale Parigo et alimente la liste filtrable", async ({ page }, testInfo) => {
  await mockSession(page);
  let playlists: Array<Record<string, unknown>> = [];
  let createdPayload: Record<string, unknown> | null = null;
  await page.route("**/api/user/playlists", async (route) => {
    if (route.request().method() === "POST") {
      createdPayload = route.request().postDataJSON() as Record<string, unknown>;
      playlists = [{ id: "playlist-new", slug: "premier-film", title: createdPayload.title, description: createdPayload.description, cover: "/images/placeholder-playlist.svg", trackCount: 0, createdAt: "2026-07-23T09:00:00.000Z" }];
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { playlist: playlists[0] } }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { playlists } }) });
  });

  let nativeDialog: string | null = null;
  page.on("dialog", async (dialog) => { nativeDialog = dialog.type(); await dialog.dismiss(); });
  await page.goto("/account/playlists");
  const accountMark = page.locator(".account-page__mark");
  await expect(accountMark).toBeVisible();
  expect(await accountMark.evaluate((node) => getComputedStyle(node, "::after").borderTopWidth)).toBe("0px");
  expect(Number.parseFloat(await accountMark.evaluate((node) => getComputedStyle(node, "::after").height))).toBeGreaterThanOrEqual(2);
  await expect(accountMark).not.toHaveCSS("border-radius", "0px");
  await page.getByRole("button", { name: "Créer ma première playlist" }).click();
  const dialog = page.getByRole("dialog", { name: "Donnez-lui un point de vue." });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nom de la playlist").fill("Premier film");
  await dialog.getByLabel(/Note d’intention/).fill("Piano documentaire et texture intime");
  await dialog.getByRole("button", { name: "Créer la playlist" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Premier film" })).toBeVisible();
  expect(createdPayload).toEqual({ title: "Premier film", description: "Piano documentaire et texture intime" });
  expect(nativeDialog).toBeNull();

  await page.getByRole("button", { name: "Vue liste" }).click();
  const playlistList = page.getByTestId("account-playlist-list");
  await expect(playlistList).toBeVisible();
  const playlistRow = playlistList.locator('[data-playlist-id="playlist-new"]');
  const playlistTitleBox = await playlistRow.getByRole("heading", { name: "Premier film" }).boundingBox();
  const folderSelectBox = await playlistRow.getByRole("combobox", { name: "Déplacer dans : Premier film" }).boundingBox();
  expect(playlistTitleBox).not.toBeNull();
  expect(folderSelectBox).not.toBeNull();
  expect(Math.abs((playlistTitleBox!.y + playlistTitleBox!.height / 2) - (folderSelectBox!.y + folderSelectBox!.height / 2))).toBeLessThan(6);
  const playlistRowBox = await playlistRow.boundingBox();
  expect(playlistRowBox).not.toBeNull();
  expect(playlistRowBox!.height).toBeLessThanOrEqual(84);
  if (testInfo.project.name !== "mobile") {
    const playlistTitle = playlistRow.locator(".account-playlist-list-row__title");
    const titleColor = await playlistTitle.evaluate((node) => getComputedStyle(node).color);
    await playlistRow.hover();
    await expect.poll(() => playlistTitle.evaluate((node) => getComputedStyle(node).color)).not.toBe(titleColor);
    await expect.poll(() => playlistTitle.evaluate((node) => {
      const probe = document.createElement("span");
      probe.style.color = "var(--signal-strong)";
      node.append(probe);
      const matches = getComputedStyle(node).color === getComputedStyle(probe).color;
      probe.remove();
      return matches;
    })).toBe(true);
  }
  await expect(page).toHaveURL(/view=list/);

  const search = page.getByRole("textbox", { name: "Rechercher dans mes playlists" });
  await search.fill("absente");
  await expect(page.getByRole("heading", { name: "Aucune playlist ne correspond." })).toBeVisible();
});

test("les dossiers de playlists acceptent un glisser-déposer Harvest et gardent une alternative au clic", async ({ page }, testInfo) => {
  await mockSession(page);
  const playlist = {
    id: "playlist-drag",
    slug: "montage",
    title: "Montage campagne",
    description: "Sélection client",
    cover: "/images/placeholder-playlist.svg",
    trackCount: 4,
    createdAt: "2026-07-29T12:00:00.000Z",
  };
  let persistedCategoryId = "";
  await page.route("**/api/user/playlists", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { playlists: [{ ...playlist, ...(persistedCategoryId ? { categoryId: persistedCategoryId } : {}) }] } }),
  }));
  await page.route("**/api/user/playlist-categories", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { categories: [{ id: "folder-test", name: "Test", playlistCount: persistedCategoryId ? 1 : 0 }], capabilities: { playlistSharing: true } } }),
  }));
  let placement: Record<string, unknown> | null = null;
  await page.route("**/api/user/playlists/playlist-drag/placement", async (route) => {
    placement = route.request().postDataJSON() as Record<string, unknown>;
    persistedCategoryId = String(placement.categoryId || "");
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { updated: true } }) });
  });
  let folderSharePayload: Record<string, unknown> | null = null;
  await page.route("**/api/user/playlist-categories/folder-test/share", async (route) => {
    folderSharePayload = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { share: { url: "https://share.parigo.test/folder", emailed: true } } }) });
  });

  await page.goto("/account/playlists");
  const card = page.locator('[data-playlist-id="playlist-drag"]');
  const folder = page.locator('[data-folder-id="folder-test"]');
  await expect(folder).toContainText("Test");
  await expect(folder).toContainText("0 playlists");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("combobox", { name: "Déplacer dans : Montage campagne" }).click();
    await page.getByRole("option", { name: "Test", exact: true }).click();
  } else {
    await card.dragTo(folder);
  }
  await expect.poll(() => placement).toEqual({ categoryId: "folder-test", orderId: 0 });
  await expect(page.getByRole("status")).toContainText("a été déplacée dans Test");
  await expect(folder).toContainText("1 playlist");
  await page.reload();
  await expect(page.locator('[data-folder-id="folder-test"]')).toContainText("1 playlist");
  await expect(page.locator('[data-playlist-id="playlist-drag"]')).toBeVisible();
  await page.locator('[data-folder-id="folder-test"] button').first().click();
  await expect(page.getByRole("button", { name: "Voir tous les dossiers" })).toBeVisible();
  await page.getByRole("button", { name: "Voir tous les dossiers" }).click();
  await expect(page.locator('[data-folder-id="all"]')).toHaveAttribute("data-active", "true");
  await expect(page.locator('[data-playlist-id="playlist-drag"] [data-drag-preview]')).toContainText("Montage campagne");

  const moveSelector = page.getByRole("combobox", { name: "Déplacer dans : Montage campagne" });
  await expect(moveSelector).toContainText("Test");
  await page.getByRole("button", { name: "Partager le dossier Test" }).click();
  await page.getByLabel("E-mail du destinataire", { exact: true }).fill("client@studio.test");
  await page.getByRole("radio", { name: /Inviter à collaborer/ }).check();
  await page.getByRole("button", { name: "Partager le dossier", exact: true }).click();
  await expect(page.getByText("https://share.parigo.test/folder", { exact: true })).toBeVisible();
  expect(folderSharePayload).toMatchObject({ categoryTitle: "Test", toEmail: "client@studio.test", mode: "collaborate", sendEmail: true });
});

test("les tags personnels ramènent vers la piste précise et vers son album", async ({ page }, testInfo) => {
  await mockSession(page);
  await page.route(/\/api\/user\/tags(?:\?.*)?$/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tags: [{ id: "tag-1", name: "Film", trackCount: 1 }] } }) }));
  await page.route("**/api/user/tags/tag-1/tracks", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tracks: [track] } }) }));

  await page.goto("/account/tags");
  const selectedTag = page.locator('.personal-tag-row[data-selected="true"]');
  await expect(selectedTag).toHaveCSS("background-image", /linear-gradient/);
  await expect(selectedTag.locator(".personal-tag-row__count")).toHaveText("1");
  const taggedTrack = page.getByTestId("tagged-track-list").getByText(track.title, { exact: true });
  await expect(taggedTrack).toHaveAttribute("href", "/albums/album-1?track=track-1");
  await expect(page.getByTestId("tagged-track-list").getByText(track.albumTitle, { exact: true })).toHaveAttribute("href", "/albums/album-1");
  if (testInfo.project.name !== "mobile") {
    const taggedTrackRow = taggedTrack.locator("xpath=ancestor::article");
    const backgroundBeforeHover = await taggedTrackRow.evaluate((node) => getComputedStyle(node).backgroundImage);
    const colorBeforeHover = await taggedTrack.evaluate((node) => getComputedStyle(node).color);
    await taggedTrackRow.hover();
    await expect.poll(() => taggedTrackRow.evaluate((node) => getComputedStyle(node).backgroundImage)).not.toBe(backgroundBeforeHover);
    await expect.poll(() => taggedTrack.evaluate((node) => getComputedStyle(node).color)).not.toBe(colorBeforeHover);
    await expect.poll(() => taggedTrack.evaluate((node) => {
      const probe = document.createElement("span");
      probe.style.color = "var(--signal-strong)";
      node.append(probe);
      const matches = getComputedStyle(node).color === getComputedStyle(probe).color;
      probe.remove();
      return matches;
    })).toBe(true);
  }
});

test("le sélecteur d’une piste distingue les tags déjà attribués et permet leur retrait", async ({ page }, testInfo) => {
  await mockSession(page);
  await page.route("**/api/user/playlists/playlist-1", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { playlist: { id: "playlist-1", title: "Film été", tracks: [track] }, capabilities: { playlistSuggestions: true, playlistSharing: true } } }) }));
  await page.route("**/api/user/playlist-categories", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { categories: [] } }) }));
  await page.route(/\/api\/user\/tags(?:\?.*)?$/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tags: [{ id: "tag-1", name: "Film", trackCount: 1 }, { id: "tag-2", name: "À écouter", trackCount: 0 }] } }) }));
  await page.route("**/api/user/tracks/track-1/tags", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tags: [{ id: "tag-1", name: "Film", trackCount: 1 }] } }) }));
  let mutation: Record<string, unknown> | null = null;
  await page.route("**/api/user/tags/tag-1/tracks", async (route) => {
    mutation = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { updated: true, verified: true, trackCount: 0 } }) });
  });
  await page.route("**/api/user/favorites", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { trackIds: [], albumIds: [] } }) }));

  await page.goto("/account/playlists/playlist-1");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: `Plus d’actions : ${track.title}` }).click();
  }
  await page.getByRole("button", { name: `Ajouter un tag : ${track.title}` }).filter({ visible: true }).first().click();
  const popover = page.getByRole("dialog", { name: `Ajouter à un tag — ${track.title}` });
  const assigned = popover.getByRole("button", { name: /Film/ });
  await expect(assigned).toHaveAttribute("aria-pressed", "true");
  await assigned.click();
  await expect.poll(() => mutation).toEqual({ action: "remove", trackIds: ["track-1"] });
  await expect(assigned).toHaveAttribute("aria-pressed", "false");
});

test("la shortlist rend ses pistes navigables et garde les longues listes de playlists scrollables", async ({ page }, testInfo) => {
  await mockSession(page);
  const playlists = Array.from({ length: 28 }, (_, index) => ({
    id: `playlist-${index + 1}`,
    title: `Playlist ${String(index + 1).padStart(2, "0")}`,
    trackCount: index,
  }));
  await page.addInitScript((shortlistTrack) => {
    window.localStorage.setItem("parigo-shortlist", JSON.stringify({
      state: { items: [{ track: shortlistTrack, addedAt: "2026-07-29T10:00:00.000Z" }] },
      version: 2,
    }));
  }, track);
  await page.route("**/api/user/playlists/playlist-1/tracks", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { updated: true, verified: true } }) }));
  await page.route("**/api/user/playlists", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { playlists } }) }));

  await page.goto("/");
  await page.locator("[data-shortlist-trigger]").click();
  const drawer = page.getByRole("dialog", { name: "Shortlist" });
  await expect(drawer.getByText(track.title, { exact: true })).toHaveAttribute("href", "/albums/album-1?track=track-1");
  await expect(drawer.getByText(track.albumTitle, { exact: true })).toHaveAttribute("href", "/albums/album-1");
  const shortlistRow = drawer.locator(".shortlist-track-row").filter({ hasText: track.title });
  const rowBackground = await shortlistRow.evaluate((node) => getComputedStyle(node).backgroundImage);
  await shortlistRow.hover();
  await expect.poll(() => shortlistRow.evaluate((node) => getComputedStyle(node).backgroundImage)).not.toBe(rowBackground);
  await expect.poll(() => shortlistRow.locator(".shortlist-track-row__title").evaluate((node) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--signal-strong)";
    node.append(probe);
    const matchesSignal = getComputedStyle(node).color === getComputedStyle(probe).color;
    probe.remove();
    return matchesSignal;
  })).toBe(true);
  const saveCard = drawer.locator(".shortlist-save-card");
  await expect(saveCard).toBeVisible();
  await expect(drawer.getByText("Destination", { exact: true })).toHaveCount(0);
  expect(await saveCard.evaluate((node) => getComputedStyle(node).borderRadius)).not.toBe("0px");
  await expect.poll(() => saveCard.evaluate((node) => [
    getComputedStyle(node, "::before").content,
    getComputedStyle(node, "::after").content,
  ])).toEqual(["none", "none"]);
  if (testInfo.project.name !== "mobile") {
    const closeButton = drawer.getByRole("button", { name: "Fermer", exact: true });
    const closeIconTransform = await closeButton.locator("svg").evaluate((node) => getComputedStyle(node).transform);
    await closeButton.hover();
    await expect.poll(() => closeButton.locator("svg").evaluate((node) => getComputedStyle(node).transform)).not.toBe(closeIconTransform);
    await expect.poll(() => closeButton.evaluate((node) => {
      const probe = document.createElement("span");
      probe.style.color = "var(--danger)";
      node.append(probe);
      const matchesDanger = getComputedStyle(node).color === getComputedStyle(probe).color;
      probe.remove();
      return matchesDanger;
    })).toBe(true);

    const createButton = drawer.getByRole("button", { name: "Créer la playlist" });
    const createBackground = await createButton.evaluate((node) => getComputedStyle(node).backgroundColor);
    await createButton.hover();
    await expect.poll(() => createButton.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(createBackground);

    const playButton = drawer.getByRole("button", { name: /Écouter la sélection/i });
    const playTransform = await playButton.evaluate((node) => getComputedStyle(node).transform);
    await playButton.hover();
    await expect.poll(() => playButton.evaluate((node) => getComputedStyle(node).transform)).not.toBe(playTransform);

    const clearButton = drawer.getByRole("button", { name: /Vider la shortlist/i });
    const clearColor = await clearButton.evaluate((node) => getComputedStyle(node).color);
    await clearButton.hover();
    await expect.poll(() => clearButton.evaluate((node) => getComputedStyle(node).color)).not.toBe(clearColor);

    const removeButton = drawer.getByRole("button", { name: new RegExp(track.title) });
    const removeColor = await removeButton.evaluate((node) => getComputedStyle(node).color);
    await removeButton.hover();
    await expect.poll(() => removeButton.evaluate((node) => getComputedStyle(node).color)).not.toBe(removeColor);
  }
  await drawer.getByRole("button", { name: "Playlist existante" }).click();
  await drawer.getByRole("combobox", { name: "Playlist existante" }).click();
  const listbox = drawer.getByRole("listbox", { name: "Playlist existante" });
  await expect(listbox).toBeVisible();
  expect(await listbox.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  const firstPlaylistOption = listbox.getByRole("option", { name: "Playlist 01" });
  await expect(firstPlaylistOption).toContainText("0 pistes");
  const optionBackground = await firstPlaylistOption.evaluate((node) => getComputedStyle(node).backgroundColor);
  await firstPlaylistOption.hover();
  await expect.poll(() => firstPlaylistOption.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(optionBackground);
  await expect.poll(() => firstPlaylistOption.evaluate((node) => getComputedStyle(node).transform)).not.toBe("none");
  await firstPlaylistOption.click();
  await drawer.getByRole("button", { name: "Ajouter à la playlist" }).click();
  const status = drawer.getByRole("status");
  await expect(status).toContainText("Playlist enregistrée.");
  await expect(status).toHaveCSS("text-align", "center");
  await expect(status).toHaveCount(0, { timeout: 5_500 });
});

test("les commandes de photo de profil sont intégrées à l’avatar", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/user/profile", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { profile: { email: "yoann@parigo.test", firstName: "Yoann", lastName: "Andrieux", country: "FR", image: "/images/placeholder-album.svg", status: "active", subscribed: false, fileFormats: [], downloadsUsed: 3, downloadsRemaining: 197, downloadLimit: 200 } } }) }));
  await page.goto("/account");
  const control = page.getByTestId("profile-image-control");
  await expect(control).toBeVisible();
  expect((await control.boundingBox())!.width).toBeGreaterThanOrEqual(160);
  await expect(control.getByText("Changer", { exact: true })).toHaveCount(0);
  await expect(control.getByRole("button", { name: "Supprimer la photo" })).toBeVisible();
  await expect(control.locator('input[type="file"]')).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Enregistrer", exact: true })).toBeVisible();
  const quota = page.getByText("Quota de téléchargement", { exact: true }).locator("xpath=ancestor::article");
  await expect(quota).toContainText("197");
  await expect(quota).toContainText("téléchargements restants");
  await expect(quota).toContainText("Utilisés");
  await expect(quota).toContainText("3");
  await expect(quota).toContainText("Limite");
  await expect(quota).toContainText("200");
  await expect(quota.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "200");
});

test("les téléchargements passés proposent une action claire de re-téléchargement", async ({ page }, testInfo) => {
  await mockSession(page);
  await page.route("**/api/user/downloads", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { downloads: [{
      id: "download-1",
      downloadedAt: "2026-07-29T12:42:00.000Z",
      licenseType: "STANDARD",
      projectName: "Film été",
      track,
    }] } }),
  }));
  await page.goto("/account/downloads");
  await expect(page.getByRole("button", { name: `Re-télécharger : ${track.title}` })).toBeVisible();
  const trackLink = page.getByRole("link", { name: track.title });
  await expect(trackLink).toHaveAttribute("href", "/albums/album-1?track=track-1");
  if (testInfo.project.name !== "mobile") {
    const colorBeforeHover = await trackLink.evaluate((node) => getComputedStyle(node).color);
    await trackLink.hover();
    await expect.poll(() => trackLink.evaluate((node) => getComputedStyle(node).color)).not.toBe(colorBeforeHover);
    await expect.poll(() => trackLink.evaluate((node) => {
      const probe = document.createElement("span");
      probe.style.color = "var(--signal-strong)";
      node.append(probe);
      const matches = getComputedStyle(node).color === getComputedStyle(probe).color;
      probe.remove();
      return matches;
    })).toBe(true);
  }
  await expect(page.getByText(/Harvest répond|re-téléchargement peut compter/i)).toHaveCount(0);
  await expect(page.getByText("Film été", { exact: true })).toBeVisible();
});

test("les communications vides restent formulées pour l’utilisateur", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/user/communications?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { items: [] } }),
  }));
  await page.goto("/account/communications");
  await expect(page.getByRole("heading", { name: "Aucune communication enregistrée" })).toBeVisible();
  await expect(page.getByText(/endpoint|Harvest répond|boîte mail/i)).toHaveCount(0);
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
      { id: "listen-newest-repeat", playedAt: "2026-07-23T19:43:00.000Z", track: newestTrack },
      { id: "listen-middle", playedAt: "2026-07-23T17:43:00.000Z", track: middleTrack },
    ] } }) });
  });
  await page.route("**/api/user/favorites", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { trackIds: [], albumIds: [] } }) }));

  if (testInfo.project.name !== "mobile") {
    await page.setViewportSize({ width: 1720, height: 900 });
  }
  await page.goto("/account/history");
  await expect(page.getByText(newestTrack.title, { exact: true })).toBeVisible();
  const newestRow = page.locator('[data-track-id="track-newest"]');
  await expect(newestRow).toHaveCount(1);
  const newestTitleBox = await newestRow.locator(".parigo-track-row__title").boundingBox();
  const newestAlbumBox = await newestRow.getByText(track.albumTitle, { exact: true }).boundingBox();
  expect(newestTitleBox).not.toBeNull();
  expect(newestAlbumBox).not.toBeNull();
  expect(newestAlbumBox!.y).toBeGreaterThan(newestTitleBox!.y);
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
    await expect(newestEntry).toHaveAttribute("data-listen-count", "2");
    await expect(newestEntry.getByTestId("history-played-at")).toHaveCount(2);
    await expect(newestEntry).toContainText("22:15");
    await expect(newestEntry).toContainText("21:43");
    const playedAtBox = await newestEntry.getByTestId("history-played-at").first().boundingBox();
    const titleBox = await newestEntry.locator(".parigo-track-row__title").boundingBox();
    expect(playedAtBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(playedAtBox!.x + playedAtBox!.width).toBeLessThanOrEqual(titleBox!.x);
    const entryBoxes = await page.getByTestId("history-entry").evaluateAll((entries) => entries.map((entry) => entry.getBoundingClientRect().height));
    expect(Math.max(...entryBoxes) - Math.min(...entryBoxes)).toBeLessThan(1);
    const main = newestEntry.locator(".parigo-track-row__main");
    const paddingBeforeHover = await main.evaluate((element) => getComputedStyle(element).paddingLeft);
    await newestEntry.hover();
    await page.waitForTimeout(420);
    await expect.poll(() => main.evaluate((element) => getComputedStyle(element).paddingLeft)).toBe(paddingBeforeHover);
    const middleEntry = page.getByTestId("history-entry").filter({ hasText: middleTrack.title });
    await expect.poll(() => newestEntry.locator(".parigo-track-row").evaluate((element) => getComputedStyle(element, "::after").height)).not.toBe("0px");
    await expect.poll(() => middleEntry.locator(".parigo-track-row").evaluate((element) => getComputedStyle(element, "::after").height)).toBe("0px");
    await middleEntry.hover();
    await expect.poll(() => newestEntry.locator(".parigo-track-row").evaluate((element) => getComputedStyle(element, "::after").height)).toBe("0px");
    await expect.poll(() => middleEntry.locator(".parigo-track-row").evaluate((element) => getComputedStyle(element, "::after").height)).not.toBe("0px");
  }

  const newestDay = page.getByTestId("history-day").first();
  const newestDaySummary = newestDay.locator("summary");
  await expect(newestDay).toHaveAttribute("open", "");
  await newestDaySummary.click();
  await expect(newestDay).not.toHaveAttribute("open", "");
  await expect(newestDay.getByTestId("history-entry").first()).toBeHidden();
  await newestDaySummary.click();
  await expect(newestDay).toHaveAttribute("open", "");
  await expect(newestDay.getByTestId("history-entry").first()).toBeVisible();
});

test("les notifications utilisent un switch Parigo et enregistrent la préférence", async ({ page }, testInfo) => {
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
  if (testInfo.project.name === "desktop") {
    const navigationShell = page.locator(".account-nav-shell");
    await expect(navigationShell).toHaveCSS("position", "sticky");
    await expect(navigationShell).toHaveCSS("top", "98px");
  }
  const notifications = page.getByRole("switch", { name: "Recevoir les nouvelles sorties Parigo" });
  await expect(notifications).toBeEnabled();
  await expect(notifications).toHaveAttribute("aria-checked", "false");
  await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);
  await expect(notifications.locator(".parigo-switch__state")).toHaveCount(0);
  await expect(notifications.locator(".parigo-switch__track")).toHaveCSS("border-radius", "8px 11px");
  await notifications.click();

  await expect.poll(() => subscriptionPayload).toEqual({ subscribed: true });
  await expect(notifications).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("status")).toContainText("Préférence enregistrée.");
});

test("la suppression du compte utilise une alerte éditoriale progressive", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/user/profile", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { profile: { subscribed: false } } }) }));
  await page.goto("/account/settings");

  await expect(page.getByRole("heading", { name: "Supprimer votre espace Parigo." })).toBeVisible();
  await page.getByRole("button", { name: /Supprimer mon compte/ }).click();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByText(/désactive durablement votre compte/)).toBeVisible();
  await expect(page.getByLabel("Mot de passe actuel")).toBeVisible();
  await expect(page.getByPlaceholder("SUPPRIMER")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmer la suppression" })).toBeDisabled();
  await page.getByLabel("Mot de passe actuel").fill("mot-de-passe-test");
  await page.getByPlaceholder("SUPPRIMER").fill("SUPPRIMER");
  await expect(page.getByRole("button", { name: "Confirmer la suppression" })).toBeEnabled();
});

test("les commentaires du compte sont regroupés par Track et restent modifiables", async ({ page }, testInfo) => {
  await mockSession(page);
  let comments: Array<{ id: string; trackId: string; text: string; createdAt?: string; updatedAt?: string }> = [
    { id: "comment-1", trackId: "track-1", text: "Entrée parfaite à 00:42", createdAt: "2026-08-02T10:00:00.000Z" },
    { id: "comment-2", trackId: "track-1", text: "Valider avec le client", updatedAt: "2026-08-03T12:00:00.000Z" },
  ];
  const responseBody = () => ({ data: { groups: [{ track, comments, lastActivityAt: comments[0]?.updatedAt || comments[0]?.createdAt }] } });
  await page.route("**/api/user/comments", async (route) => {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(responseBody()) });
  });
  await page.route("**/api/user/tracks/track-1/comments**", async (route) => {
    if (route.request().method() === "PATCH") {
      const input = route.request().postDataJSON() as { commentId: string; text: string };
      comments = comments.map((comment) => comment.id === input.commentId ? { ...comment, text: input.text, updatedAt: "2026-08-03T14:00:00.000Z" } : comment);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { comment: comments.find((comment) => comment.id === input.commentId) } }) });
    }
    const url = new URL(route.request().url());
    const commentId = url.searchParams.get("commentId");
    comments = comments.filter((comment) => comment.id !== commentId);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { removed: true } }) });
  });

  await page.goto("/account/comments");
  await expect(page.getByRole("heading", { name: "Commentaires" })).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(track.title, { exact: true })).toBeVisible();
  await expect(page.getByText("Entrée parfaite à 00:42", { exact: true })).toBeVisible();
  const activeLink = page.getByRole("navigation", { name: "Navigation du compte" }).getByRole("link", { name: "Commentaires" });
  await expect(activeLink).toHaveAttribute("aria-current", "page");
  if (testInfo.project.name === "mobile") await expect(activeLink).toBeInViewport();

  const search = page.getByRole("textbox", { name: "Rechercher dans mes commentaires" });
  await search.fill("introuvable");
  await expect(page.getByRole("heading", { name: "Aucun commentaire ne correspond." })).toBeVisible();
  await search.fill("client");
  await expect(page.getByText(track.title, { exact: true })).toBeVisible();
  await search.fill("");

  await page.getByRole("button", { name: `Modifier le commentaire sur ${track.title}` }).first().click();
  const editor = page.locator("textarea");
  await editor.fill("Entrée validée à 00:42");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Entrée validée à 00:42", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Supprimer le commentaire sur ${track.title}` }).last().click();
  const dialog = page.getByRole("dialog", { name: "Supprimer cette note ?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Valider avec le client", { exact: true })).toHaveCount(0);
});

test("les recherches sauvegardées restent relançables et supprimables", async ({ page }, testInfo) => {
  await mockSession(page);
  let renamedSearch = "";
  await page.route("**/api/user/searches", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { searches: [
    { id: "search-1", name: "Piano documentaire", searchUrl: "/search?q=piano&view=tracks", searchTermsCount: 2, createdAt: "2026-07-20T10:00:00.000Z" },
    { id: "search-2", name: "Cordes nocturnes", searchUrl: "/search?q=cordes&view=tracks", searchTermsCount: 1, createdAt: "2026-07-19T19:15:00.000Z" },
  ] } }) }));
  await page.route("**/api/user/searches/search-1", async (route) => {
    renamedSearch = String((route.request().postDataJSON() as { name?: string }).name || "");
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { updated: true, search: { id: "search-1", name: renamedSearch, searchUrl: "/search?q=piano&view=tracks", searchTermsCount: 2, createdAt: "2026-07-20T10:00:00.000Z" } } }) });
  });
  await page.route("**/api/user/searches?id=search-1", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { removed: true } }) }));
  await page.goto("/account/searches");
  await expect(page.getByRole("heading", { level: 1, name: "Votre espace" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Recherches sauvegardées" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const memberNavigation = page.getByRole("navigation", { name: "Navigation du compte" });
  const activeMemberLink = memberNavigation.getByRole("link", { name: "Recherches sauvegardées" });
  await expect(activeMemberLink).toHaveAttribute("aria-current", "page");
  if (testInfo.project.name === "mobile") {
    await expect(activeMemberLink).toBeInViewport();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => document.documentElement.clientWidth));
    expect(await memberNavigation.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  }
  const newSearch = page.getByRole("link", { name: "Nouvelle recherche" });
  if (testInfo.project.name !== "mobile") {
    await newSearch.hover();
    await expect.poll(() => newSearch.evaluate((node) => {
      const probe = document.createElement("span");
      probe.style.color = "var(--background)";
      node.append(probe);
      const hasExpectedColor = getComputedStyle(node).color === getComputedStyle(probe).color;
      probe.remove();
      return hasExpectedColor;
    })).toBe(true);
  }
  const newSearchColors = await newSearch.evaluate((node) => {
    const colors = {
      background: getComputedStyle(node).backgroundColor,
      foreground: getComputedStyle(node).color,
    };
    return colors;
  });
  expect(newSearchColors.background).not.toBe(newSearchColors.foreground);
  const savedSearchTitle = page.getByText("Piano documentaire", { exact: true });
  const savedSearchCard = savedSearchTitle.locator("xpath=ancestor::article");
  const [savedSearchTitleBox, savedSearchCardBox] = await Promise.all([savedSearchTitle.boundingBox(), savedSearchCard.boundingBox()]);
  expect(savedSearchTitleBox).not.toBeNull();
  expect(savedSearchCardBox).not.toBeNull();
  expect(savedSearchTitleBox!.x - savedSearchCardBox!.x).toBeGreaterThanOrEqual(20);
  await expect(page.getByTestId("saved-search-day")).toHaveCount(2);
  await expect(savedSearchCard.getByText("12:00", { exact: true })).toBeVisible();
  const dateFilter = page.getByRole("combobox", { name: "Filtrer par date" });
  await dateFilter.click();
  await page.getByRole("option", { name: /20 juillet 2026/i }).click();
  await expect(page.getByText("Piano documentaire", { exact: true })).toBeVisible();
  await expect(page.getByText("Cordes nocturnes", { exact: true })).toHaveCount(0);
  await dateFilter.click();
  await page.getByRole("option", { name: /Toutes les dates/i }).click();
  await expect(page.getByText("Cordes nocturnes", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Relancer" }).first()).toHaveAttribute("href", "/search?q=piano&view=tracks");
  await page.getByRole("button", { name: "Renommer Piano documentaire" }).click();
  await page.getByLabel("Nouveau nom de la recherche").fill("Piano sensible");
  await page.getByRole("button", { name: "Enregistrer le nom" }).click();
  await expect(page.getByText("Piano sensible", { exact: true })).toBeVisible();
  expect(renamedSearch).toBe("Piano sensible");
  await page.getByRole("button", { name: "Supprimer Piano sensible" }).click();
  await expect(page.getByText("Piano sensible", { exact: true })).toHaveCount(0);
});

test("une playlist expose suggestions et partage avancé", async ({ page }) => {
  await mockSession(page);
  let nativeDialog: string | null = null;
  page.on("dialog", async (dialog) => { nativeDialog = dialog.type(); await dialog.dismiss(); });
  const suggested = { ...track, id: "track-2", title: "Piano parallèle" };
  await page.route("**/api/user/playlists/playlist-1", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { playlist: { id: "playlist-1", title: "Film été", tracks: [track] }, capabilities: { playlistSuggestions: true, playlistSharing: true } } }) }));
  await page.route("**/api/user/playlists/playlist-1/suggestions?limit=12", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tracks: [suggested] } }) }));
  let sharePayload: Record<string, unknown> | null = null;
  await page.route("**/api/user/playlists/playlist-1/share", async (route) => {
    sharePayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { share: { url: "https://share.parigo.test/selection", emailed: true } } }) });
  });
  await page.route("**/api/user/favorites", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { trackIds: [], albumIds: [] } }) }));
  await page.goto("/account/playlists/playlist-1");
  await expect(page.getByRole("navigation", { name: "Navigation du compte" }).getByRole("link", { name: "Playlists" })).toHaveAttribute("aria-current", "page");
  const playlistTrack = page.locator('[data-track-id="track-1"]');
  await expect(playlistTrack).toHaveAttribute("data-mobile-layout", "dense");
  if ((await page.viewportSize())!.width < 1024) {
    const mainBox = await playlistTrack.locator(".parigo-track-row__main").boundingBox();
    const managementBox = await playlistTrack.locator(".parigo-track-row__management").boundingBox();
    expect(mainBox).not.toBeNull();
    expect(managementBox).not.toBeNull();
    expect(managementBox!.y).toBeGreaterThanOrEqual(mainBox!.y + mainBox!.height - 1);
    expect(await playlistTrack.locator(".parigo-track-row__management button").evaluateAll((buttons) => buttons.every((button) => {
      const bounds = button.getBoundingClientRect();
      return bounds.width >= 44 && bounds.height >= 44;
    }))).toBe(true);
  }
  const playlistHeader = page.locator('.account-page__header[data-wide-title="true"]');
  await expect(playlistHeader).toBeVisible();
  const playlistHeading = playlistHeader.getByRole("heading", { name: "Film été" });
  await expect(playlistHeading).toBeVisible();
  const [headingBox, firstActionBox] = await Promise.all([
    playlistHeading.boundingBox(),
    playlistHeader.getByRole("button", { name: "Prolonger la sélection" }).boundingBox(),
  ]);
  expect(headingBox).not.toBeNull();
  expect(firstActionBox).not.toBeNull();
  expect(firstActionBox!.y).toBeGreaterThanOrEqual(headingBox!.y + headingBox!.height);
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
  await page.getByRole("radio", { name: /Lien de consultation/ }).check();
  await page.getByText("Autoriser le téléchargement", { exact: true }).click();
  await page.getByRole("button", { name: "Créer le lien et envoyer" }).click();
  await expect(page.getByText("https://share.parigo.test/selection", { exact: true })).toBeVisible();
  expect(sharePayload).toMatchObject({ toEmail: "client@studio.test", mode: "view", allowDownload: true, sendEmail: true });
  expect(sharePayload).not.toHaveProperty("shareType");
});

test("un partage collaboratif peut être accepté comme collaboration", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/shared-music/share-token-1234", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: {
      playlists: [{ id: "playlist-shared", title: "Sélection partagée", tracks: [track] }],
      allowCollaboration: true,
    } }),
  }));
  let acceptance: Record<string, unknown> | null = null;
  await page.route("**/api/shared-music/share-token-1234/accept", async (route) => {
    acceptance = route.request().postDataJSON() as Record<string, unknown>;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { acceptance: { accepted: true, acceptType: acceptance.acceptType } } }),
    });
  });
  await page.route("**/api/user/favorites", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { trackIds: [], albumIds: [] } }) }));
  await page.route("**/api/shared-music/folder-token-1234", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: {
      playlists: [{ id: "playlist-folder", title: "Sélection du dossier", tracks: [] }],
      allowCollaboration: false,
    } }),
  }));

  await page.goto("/engage-playlist/share-token-1234");
  await expect(page.getByRole("heading", { name: "Sélection partagée" })).toBeVisible();
  await page.getByRole("button", { name: "Accepter la collaboration" }).click();
  await expect(page.getByRole("status")).toContainText("Collaboration acceptée");
  expect(acceptance).toEqual({ acceptType: "AsCollaboration" });
  await expect(page.getByRole("link", { name: "Voir mes playlists" })).toHaveAttribute("href", "/account/playlists");

  await page.goto("/shared-playlistcategory/folder-token-1234");
  await expect(page.getByRole("heading", { name: "Sélection du dossier" })).toBeVisible();
  await expect(page.getByText("Cette playlist ne contient encore aucune piste.")).toBeVisible();

  await page.route("**/api/shared-music/empty-folder-token", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { playlists: [], allowCollaboration: false } }),
  }));
  await page.goto("/shared-playlistcategory/empty-folder-token");
  await expect(page.getByText("Ce dossier ne contient encore aucune playlist.")).toBeVisible();
});

test("les actions non configurées restent absentes", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/user/playlists/playlist-1", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { playlist: { id: "playlist-1", title: "Film été", tracks: [track] }, capabilities: { playlistSuggestions: false, playlistSharing: false } } }) }));
  await page.route("**/api/user/favorites", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { trackIds: [] } }) }));

  await page.goto("/account/playlists/playlist-1");

  await expect(page.getByRole("button", { name: "Prolonger la sélection" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Partager", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dupliquer", exact: true })).toBeVisible();
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
