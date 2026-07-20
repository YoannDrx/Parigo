import { describe, expect, it } from "vitest";
import { intentToSearchParams, parseSearchIntent } from "./search-intent";

describe("parseSearchIntent", () => {
  it("comprend une intention française multi-critères", () => {
    const intent = parseSearchIntent("Une tension électronique lente, sans voix");
    expect(intent.genres).toContain("electronic");
    expect(intent.moods).toContain("tense");
    expect(intent.bpmRange).toEqual([55, 90]);
    expect(intent.isVocal).toBe(false);
  });

  it("comprend une plage BPM explicite et les instruments", () => {
    const intent = parseSearchIntent("Cordes épiques entre 120 à 150 BPM");
    expect(intent.instruments).toContain("strings");
    expect(intent.moods).toContain("epic");
    expect(intent.bpmRange).toEqual([120, 150]);
  });

  it("sérialise une recherche partageable", () => {
    const params = intentToSearchParams(parseSearchIntent("piano calme instrumental"));
    expect(params.getAll("instrument")).toContain("piano");
    expect(params.getAll("mood")).toContain("peaceful");
    expect(params.get("vocal")).toBe("false");
  });

  it("comprend une intention anglaise", () => {
    const intent = parseSearchIntent("Slow cinematic tension with strings, no vocals");
    expect(intent.genres).toContain("cinematic");
    expect(intent.moods).toContain("tense");
    expect(intent.instruments).toContain("strings");
    expect(intent.bpmRange).toEqual([55, 90]);
    expect(intent.isVocal).toBe(false);
  });

  it("comprend les styles de club et la présence vocale", () => {
    const intent = parseSearchIntent("Magnetic techno with vocals");
    expect(intent.genres).toContain("techno");
    expect(intent.isVocal).toBe(true);
  });
});
