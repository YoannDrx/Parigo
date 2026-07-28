import { describe, expect, it } from "vitest";
import { asBoolean, asIsoDate, asList, asNumber, slugify } from "./values";

describe("Harvest value normalization", () => {
  it("normalizes string encoded scalar values", () => {
    expect(asNumber("94")).toBe(94);
    expect(asBoolean("false", true)).toBe(false);
    expect(asBoolean("true")).toBe(true);
  });

  it("normalizes comma separated metadata", () => {
    expect(asList("Ambient, Piano,  Documentary ")).toEqual(["Ambient", "Piano", "Documentary"]);
  });

  it("normalizes Harvest dates and slugs", () => {
    expect(asIsoDate("2026-07-14 00:00:00")).toBe("2026-07-13T22:00:00.000Z");
    expect(asIsoDate("2026-01-14T00:00:00")).toBe("2026-01-13T23:00:00.000Z");
    expect(asIsoDate("2026-07-29T00:24:11.477", 10)).toBe("2026-07-28T14:24:11.477Z");
    expect(asIsoDate("2026-07-29T00:24:11.477Z")).toBe("2026-07-29T00:24:11.477Z");
    expect(slugify("Électronique française")).toBe("electronique-francaise");
  });
});
