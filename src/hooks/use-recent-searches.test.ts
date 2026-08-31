import { beforeEach, describe, expect, it } from "vitest";
import {
  RECENT_SEARCHES_STORAGE_KEY,
  clearRecentSearches,
  parseRecentSearches,
  recordRecentSearch,
} from "./use-recent-searches";

describe("recent searches", () => {
  beforeEach(() => localStorage.clear());

  it("sépare les modes et normalise les requêtes", () => {
    recordRecentSearch("keyword", "  piano   intime  ", 10);
    recordRecentSearch("ai", "Une route de nuit", 20);
    const state = parseRecentSearches(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY));
    expect(state.keyword).toEqual([{ query: "piano intime", updatedAt: 10 }]);
    expect(state.ai).toEqual([{ query: "Une route de nuit", updatedAt: 20 }]);
  });

  it("déduplique sans tenir compte de la casse et replace la requête en tête", () => {
    recordRecentSearch("keyword", "Piano", 10);
    recordRecentSearch("keyword", "Cordes", 20);
    recordRecentSearch("keyword", "piano", 30);
    expect(parseRecentSearches(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY)).keyword).toEqual([
      { query: "piano", updatedAt: 30 },
      { query: "Cordes", updatedAt: 20 },
    ]);
  });

  it("conserve les huit recherches les plus récentes", () => {
    for (let index = 0; index < 10; index += 1) recordRecentSearch("keyword", `Recherche ${index}`, index + 1);
    const entries = parseRecentSearches(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY)).keyword;
    expect(entries).toHaveLength(8);
    expect(entries[0].query).toBe("Recherche 9");
    expect(entries.at(-1)?.query).toBe("Recherche 2");
  });

  it("ignore un stockage invalide et efface les deux modes", () => {
    expect(parseRecentSearches("{invalide")).toEqual({ version: 1, keyword: [], ai: [] });
    recordRecentSearch("keyword", "Piano", 10);
    recordRecentSearch("ai", "Film solaire", 20);
    expect(clearRecentSearches()).toEqual({ version: 1, keyword: [], ai: [] });
    expect(parseRecentSearches(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY))).toEqual({ version: 1, keyword: [], ai: [] });
  });

  it("efface uniquement l’historique du mode demandé", () => {
    recordRecentSearch("keyword", "Piano catalogue", 10);
    recordRecentSearch("ai", "Film solaire", 20);

    expect(clearRecentSearches("keyword")).toEqual({
      version: 1,
      keyword: [],
      ai: [{ query: "Film solaire", updatedAt: 20 }],
    });
    expect(parseRecentSearches(localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY))).toEqual({
      version: 1,
      keyword: [],
      ai: [{ query: "Film solaire", updatedAt: 20 }],
    });
  });
});
