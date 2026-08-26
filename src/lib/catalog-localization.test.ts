import { describe, expect, it } from "vitest";
import { localizeLabel, resolveLocalizedValue } from "./catalog-localization";

describe("catalog localization fallbacks", () => {
  it("uses requested locale, then English, then the compatibility field", () => {
    expect(resolveLocalizedValue({ fr: "Français", en: "English" }, "Legacy", "fr")).toBe("Français");
    expect(resolveLocalizedValue({ en: "English" }, "Legacy", "fr")).toBe("English");
    expect(resolveLocalizedValue(undefined, "Legacy", "fr")).toBe("Legacy");
  });

  it("keeps the Parigo label English description when French content is empty", () => {
    const label = localizeLabel({
      id: "parigo",
      name: "Parigo",
      logo: null,
      description: "English description",
      descriptions: { en: "English description" },
      albumCount: 1,
    }, "fr");
    expect(label.description).toBe("English description");
  });
});
