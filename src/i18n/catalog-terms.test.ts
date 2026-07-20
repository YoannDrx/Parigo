import { describe, expect, it } from "vitest";
import { localizeCatalogTerm } from "./catalog-terms";

describe("localizeCatalogTerm", () => {
  it("traduit les taxonomies du catalogue en français", () => {
    expect(localizeCatalogTerm("Electronic", "fr")).toBe("Électronique");
    expect(localizeCatalogTerm("melancholic", "fr")).toBe("Mélancolique");
    expect(localizeCatalogTerm("woodwinds", "fr")).toBe("Bois");
  });

  it("conserve les libellés source en anglais", () => {
    expect(localizeCatalogTerm("Electronic", "en")).toBe("Electronic");
  });
});
