import { describe, expect, it } from "vitest";
import { formatParigoDate, formatParigoTime } from "./date-time";

describe("Parigo date formatting", () => {
  it("always formats dates and times in Europe/Paris", () => {
    const instant = "2026-07-28T22:30:00.000Z";
    expect(formatParigoDate(instant, "fr-FR")).toBe("29/07/2026");
    expect(formatParigoTime(instant, "fr-FR")).toBe("00:30");
  });

  it("returns an empty value for an invalid date", () => {
    expect(formatParigoDate("not-a-date", "fr-FR")).toBe("");
  });
});
