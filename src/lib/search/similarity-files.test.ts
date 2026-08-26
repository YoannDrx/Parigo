import { describe, expect, it } from "vitest";
import {
  similarityAudioContentType,
  validateSimilarityAudioDuration,
  validateSimilarityFileBasics,
} from "@/lib/search/similarity-files";

function file(name: string, type: string, size = 16) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validation des références audio de similarité", () => {
  it.each([
    ["image.jpg", "image/jpeg"],
    ["image.png", "image/png"],
    ["reference.mp3", "audio/wav"],
    ["reference.wav", "audio/mpeg"],
    ["reference.txt", "audio/mpeg"],
  ])("refuse le fichier %s de type %s", (name, type) => {
    expect(validateSimilarityFileBasics([file(name, type)])).toEqual({ ok: false, code: "FILE_TYPE" });
  });

  it("refuse une sélection multiple", () => {
    expect(validateSimilarityFileBasics([
      file("one.mp3", "audio/mpeg"),
      file("two.wav", "audio/wav"),
    ])).toEqual({ ok: false, code: "FILE_COUNT" });
  });

  it("refuse un fichier dépassant la taille annoncée", () => {
    expect(validateSimilarityFileBasics([file("large.mp3", "audio/mpeg", 17)], 16)).toEqual({ ok: false, code: "FILE_SIZE" });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])("traite une durée %s comme un audio illisible", (duration) => {
    expect(validateSimilarityAudioDuration(duration)).toBe("FILE_UNREADABLE");
  });

  it("refuse un audio de plus de quinze minutes", () => {
    expect(validateSimilarityAudioDuration(901)).toBe("FILE_DURATION");
  });

  it.each([
    ["reference.mp3", "audio/mpeg", "audio/mpeg"],
    ["reference.wav", "audio/wav", "audio/wav"],
    ["reference.wav", "audio/x-wav", "audio/wav"],
  ] as const)("accepte %s avec le MIME %s", (name, type, expectedType) => {
    const candidate = file(name, type);
    expect(similarityAudioContentType(candidate)).toBe(expectedType);
    expect(validateSimilarityFileBasics([candidate])).toEqual({ ok: true, file: candidate, contentType: expectedType });
    expect(validateSimilarityAudioDuration(900)).toBeNull();
  });
});
