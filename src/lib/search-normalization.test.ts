import { describe, expect, it } from "vitest";
import { consumeSearchExpression, matchedSearchExpression, searchExpressionsCoverQuery, searchLyricsTextSegments, searchTextSegments } from "./search-normalization";

describe("search expression consumption", () => {
  it("returns the exact user-typed expression while matching accents and case", () => {
    expect(matchedSearchExpression("reggae TRÍSTE", "Triste")).toBe("TRÍSTE");
  });

  it("removes only the recognized whole expression", () => {
    expect(consumeSearchExpression("reggae triste", "triste")).toBe("reggae");
    expect(consumeSearchExpression("crime, musique classique; triste", "musique classique")).toBe("crime triste");
  });

  it("removes repeated recognized expressions", () => {
    expect(consumeSearchExpression("triste reggae triste", "triste")).toBe("reggae");
  });

  it("keeps partial matches and unrelated text unchanged", () => {
    expect(consumeSearchExpression("sadness reggae", "sad")).toBe("sadness reggae");
    expect(consumeSearchExpression("reggae triste", "happy")).toBe("reggae triste");
  });

  it("distinguishes a fully resolved filter query from a partial one", () => {
    expect(searchExpressionsCoverQuery("reggae triste", ["reggae", "triste"])).toBe(true);
    expect(searchExpressionsCoverQuery("une forêt sombre", ["sombre"])).toBe(false);
  });
});

describe("search text highlighting", () => {
  it("marks every exact normalized occurrence while preserving the original text", () => {
    const segments = searchTextSegments("Tríste refrain, triste encore.", "triste");
    expect(segments.filter((segment) => segment.matched).map((segment) => segment.text)).toEqual(["Tríste", "triste"]);
    expect(segments.map((segment) => segment.text).join("")).toBe("Tríste refrain, triste encore.");
  });

  it("does not highlight partial word matches", () => {
    expect(searchTextSegments("A sadness song", "sad")).toEqual([{ text: "A sadness song", matched: false }]);
  });

  it("uses a conservative word-prefix fallback for lyrics only", () => {
    const segments = searchLyricsTextSegments("We take a happy balade tonight", "happy balad");
    expect(segments.filter((segment) => segment.matched).map((segment) => segment.text)).toEqual(["happy", "balad"]);
    expect(segments.map((segment) => segment.text).join("")).toBe("We take a happy balade tonight");
    expect(searchLyricsTextSegments("A theory unfolds", "the")).toEqual([{ text: "A theory unfolds", matched: false }]);
  });
});
