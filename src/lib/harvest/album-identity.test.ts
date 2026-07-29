import { describe, expect, it } from "vitest";
import { albumIdentity } from "./album-identity";

describe("albumIdentity", () => {
  it.each([
    ["PRTM 0212 Between Light and Void", "PRTM 0212", "Between Light and Void"],
    ["NCM115 - Hits and Impacts Vol. 2", "NCM115", "Hits and Impacts Vol. 2"],
    ["MMIT-0104 Vibrant Beats", "MMIT-0104", "Vibrant Beats"],
    ["  prtm-0212 : Between Light and Void  ", "PRTM 0212", "Between Light and Void"],
    ["CS135 | Woodwinds for Christmas 2", "CS135", "Woodwinds for Christmas 2"],
  ])("sépare %s de sa référence", (displayTitle, code, expectedTitle) => {
    expect(albumIdentity(displayTitle, code)).toEqual({ title: expectedTitle, code });
  });

  it("conserve le titre quand la référence manque", () => {
    expect(albumIdentity("Between Light and Void")).toEqual({ title: "Between Light and Void" });
  });

  it("conserve le titre quand la référence n’est pas son préfixe", () => {
    expect(albumIdentity("Between Light and Void", "PRTM 0212")).toEqual({
      title: "Between Light and Void",
      code: "PRTM 0212",
    });
  });

  it("ne produit jamais un titre vide", () => {
    expect(albumIdentity("PRTM 0212", "PRTM 0212")).toEqual({
      title: "PRTM 0212",
      code: "PRTM 0212",
    });
  });
});
