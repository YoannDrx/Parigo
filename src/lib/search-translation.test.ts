import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSearchTranslationCache, translateFrenchSearchQuery } from "./search-translation";

function deeplResponse(source: string, text: string): Response {
  return new Response(JSON.stringify({
    translations: [{ detected_source_language: source, text }],
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("generic French title translation", () => {
  beforeEach(() => clearSearchTranslationCache());

  it.each([
    ["mariage romantique", "romantic wedding"],
    ["forêt sombre", "dark forest"],
    ["course poursuite", "car chase"],
    ["coucher de soleil", "sunset"],
  ])("translates an arbitrary French query: %s", async (query, translation) => {
    const fetchImpl = vi.fn(async () => deeplResponse("FR", translation));

    await expect(translateFrenchSearchQuery(query, {
      authKey: "test:fx",
      apiUrl: "https://translation.test/v2/translate",
      fetchImpl,
    })).resolves.toEqual({
      original: query,
      effective: translation,
      source: "machine-translation",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://translation.test/v2/translate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "DeepL-Auth-Key test:fx" }),
        body: JSON.stringify({ text: [query], target_lang: "EN" }),
      }),
    );
  });

  it("does not translate a query detected outside French", async () => {
    const fetchImpl = vi.fn(async () => deeplResponse("EN", "dark forest"));
    await expect(translateFrenchSearchQuery("dark forest", {
      authKey: "test:fx",
      fetchImpl,
    })).resolves.toBeUndefined();
  });

  it("stays unavailable without a server key", async () => {
    const fetchImpl = vi.fn();
    await expect(translateFrenchSearchQuery("forêt", {
      authKey: "",
      fetchImpl,
    })).resolves.toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(["PAR-001", "12345", "ALBUM_2026"])('does not send catalog identifier "%s" to DeepL', async (query) => {
    const fetchImpl = vi.fn();
    await expect(translateFrenchSearchQuery(query, {
      authKey: "test:fx",
      fetchImpl,
    })).resolves.toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("caches successful translations", async () => {
    const fetchImpl = vi.fn(async () => deeplResponse("FR", "dark forest"));
    const options = { authKey: "test:fx", fetchImpl, now: () => 1_000 };

    await translateFrenchSearchQuery("forêt sombre", options);
    await translateFrenchSearchQuery("Forêt sombre", options);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
