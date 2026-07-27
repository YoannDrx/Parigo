import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("parigo-cookie-consent", JSON.stringify({
      necessary: true,
      preferences: false,
      analytics: false,
      marketing: false,
      updatedAt: "2026-07-27T00:00:00.000Z",
    }));
  });
});

test("la recherche expose uniquement les nouveaux filtres, tris et niveaux de détail", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/search");

  await expect(page.getByText("Interprétation", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Les critères compris apparaîtront ici avant la recherche", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("search-detected-criteria")).toHaveCount(0);
  await expect(page.getByText("Résultats", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Type de résultats" })).toBeVisible();
  const displayMode = page.getByRole("group", { name: "Mode d’affichage des résultats" });
  await expect(displayMode).toBeVisible();
  await expect(displayMode.getByRole("button", { name: "Liste" })).toHaveAttribute("aria-pressed", "true");

  await displayMode.getByRole("button", { name: "Grille" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("layout")).toBe("grid");
  await expect(page.getByTestId("search-track-grid")).toBeVisible({ timeout: 30_000 });
  await displayMode.getByRole("button", { name: "Liste" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.has("layout")).toBe(false);

  const filterScope = testInfo.project.name === "mobile"
    ? page.getByRole("dialog", { name: "Filtres" })
    : page.getByRole("complementary", { name: "Filtres de recherche" });
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: /^Filtres$/ }).click();
  await expect(filterScope).toBeVisible();
  await expect(filterScope.getByText("Style", { exact: true })).toHaveCount(0);
  if (testInfo.project.name === "mobile") {
    await filterScope.getByRole("button", { name: "Fermer" }).last().click();
  }

  const density = page.getByRole("combobox", { name: "Niveau de détail des pistes" });
  await density.click();
  await expect(page.getByRole("option", { name: "Piste détaillée" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Piste compacte" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Piste essentielle" })).toBeVisible();
  await page.keyboard.press("Escape");

  const sort = page.getByRole("combobox", { name: "Trier les résultats" });
  await sort.click();
  for (const label of ["Pertinence", "Plus récents", "Plus anciens", "A–Z", "Z–A"]) {
    await expect(page.getByRole("option", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("option", { name: /BPM|Durée/ })).toHaveCount(0);
});

test("l’autocomplétion est catégorisée, fermable et sépare les suggestions du type de résultats", async ({ page }) => {
  await page.route("**/api/autocomplete?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          groups: [
            {
              key: "tracks",
              count: 2,
              items: [
                { id: "track-crime", kind: "track", label: "A Tampered Crime Scene", href: "/albums/album-crime?track=track-crime" },
                { id: "track-boogie", kind: "track", label: "Jukebox Boogie", href: "/albums/album-boogie?track=track-boogie" },
              ],
            },
            {
              key: "albums",
              count: 1,
              items: [{ id: "album-crime", kind: "album", label: "Crime And Investigation", href: "/albums/album-crime" }],
            },
            {
              key: "playlists",
              count: 1,
              items: [{ id: "playlist-crime", kind: "playlist", label: "Investigation — Crime", href: "/playlists/playlist-crime" }],
            },
            {
              key: "words",
              count: 1,
              items: [{ id: "word-crime", kind: "keyword", label: "Crime" }],
            },
          ],
        },
      }),
    });
  });

  await page.goto("/search");
  const input = page.getByRole("combobox", { name: "Décrivez votre intention musicale" });
  await input.fill("crime");
  const suggestions = page.getByRole("region", { name: "Suggestions de recherche" });
  await expect(suggestions).toBeVisible();
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await expect(suggestions.getByRole("tab", { name: /Pistes 2/ })).toHaveAttribute("aria-selected", "true");
  await expect(suggestions.getByRole("option", { name: /A Tampered Crime Scene/ })).toBeVisible();
  await expect(suggestions.getByRole("tab", { name: /Mots-clés 1/ })).toBeVisible();
  await expect(suggestions.getByRole("tab", { name: /Paroles/ })).toHaveCount(0);

  await suggestions.getByRole("tab", { name: /Albums 1/ }).click();
  await expect(page.getByRole("button", { name: "Pistes" })).toHaveAttribute("aria-pressed", "true");
  await expect(suggestions.getByRole("option", { name: /Crime And Investigation/ })).toBeVisible();
  await suggestions.getByRole("button", { name: /Afficher tous les résultats · Albums/ }).click();
  await expect(page.getByRole("button", { name: "Albums" })).toHaveAttribute("aria-pressed", "true");

  await input.fill("crime scene");
  await expect(suggestions).toBeVisible();
  await suggestions.getByRole("button", { name: "Fermer les suggestions" }).click();
  await expect(suggestions).toHaveCount(0);

  await input.fill("boogie");
  await expect(suggestions).toBeVisible();
  await page.getByRole("heading", { name: "Trouver la bonne musique." }).click();
  await expect(suggestions).toHaveCount(0);
});

test("le listing se met à jour automatiquement pendant la saisie", async ({ page }) => {
  const searchedTerms: string[] = [];
  await page.route("**/api/search?**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q");
    if (query) searchedTerms.push(query);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: { items: [], view: url.searchParams.get("view") === "albums" ? "albums" : "tracks", facets: { categories: [], labels: [] } },
        meta: { page: 1, pageSize: 30, total: 0, requestId: "e2e-live-search" },
      }),
    });
  });
  await page.route("**/api/autocomplete?**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { groups: [] } }) });
  });

  await page.goto("/search");
  const input = page.getByRole("combobox", { name: "Décrivez votre intention musicale" });
  await input.fill("wedding");
  await expect.poll(() => searchedTerms.includes("wedding"), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("wedding");
});

test("les anciennes URL sont canonicalisées sans Style ni anciens tris et les guillemets activent le mode exact", async ({ page }) => {
  await page.goto('/search?keyword=%22crime%22&view=tracks&page=1&styles=obsolete&sort=bpm-asc');
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      q: url.searchParams.get("q"),
      match: url.searchParams.get("match"),
      keyword: url.searchParams.has("keyword"),
      styles: url.searchParams.has("styles"),
      sort: url.searchParams.has("sort"),
    };
  }, { timeout: 30_000 }).toEqual({
    q: "crime",
    match: "exact",
    keyword: false,
    styles: false,
    sort: false,
  });
});

test("une URL q normale ne devient pas exacte sans action utilisateur", async ({ page }) => {
  await page.goto("/search?q=crime&view=tracks");
  await page.waitForTimeout(800);
  expect(new URL(page.url()).searchParams.get("match")).toBeNull();
});
