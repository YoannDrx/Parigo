import { describe, expect, it } from "vitest";
import { formatRecentSearchDate } from "./RecentSearchesMenu";

describe("formatRecentSearchDate", () => {
  const now = new Date(2026, 7, 31, 20, 0).getTime();

  it("affiche l’heure locale précise pour une recherche du jour", () => {
    const searchedAt = new Date(2026, 7, 31, 14, 32).getTime();
    const frenchTime = new Intl.DateTimeFormat("fr", { hour: "2-digit", minute: "2-digit" }).format(searchedAt);
    const englishTime = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(searchedAt);

    expect(formatRecentSearchDate(searchedAt, "fr", now)).toBe(`Aujourd’hui · ${frenchTime}`);
    expect(formatRecentSearchDate(searchedAt, "en", now)).toBe(`Today · ${englishTime}`);
  });

  it("reste volontairement relatif pour les jours précédents", () => {
    const yesterday = new Date(2026, 7, 30, 23, 55).getTime();
    const twoDaysAgo = new Date(2026, 7, 29, 9, 15).getTime();

    expect(formatRecentSearchDate(yesterday, "fr", now)).toBe("Hier");
    expect(formatRecentSearchDate(twoDaysAgo, "en", now)).toBe("2 days ago");
  });
});
