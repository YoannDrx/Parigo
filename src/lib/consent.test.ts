import { describe, expect, it } from "vitest";
import { CONSENT_UNSET, normalizeConsentSnapshot } from "./consent";

const preferences = {
  necessary: true,
  preferences: false,
  analytics: true,
  marketing: false,
  updatedAt: "2026-07-24T22:00:00.000Z",
};

describe("normalizeConsentSnapshot", () => {
  it("normalizes local-storage JSON and encoded cookie values identically", () => {
    const expected = JSON.stringify(preferences);
    expect(normalizeConsentSnapshot(expected)).toBe(expected);
    expect(normalizeConsentSnapshot(encodeURIComponent(expected))).toBe(expected);
  });

  it("rejects absent, malformed or incomplete choices", () => {
    expect(normalizeConsentSnapshot(null)).toBe(CONSENT_UNSET);
    expect(normalizeConsentSnapshot("%not-json")).toBe(CONSENT_UNSET);
    expect(normalizeConsentSnapshot(JSON.stringify({ necessary: true }))).toBe(CONSENT_UNSET);
  });
});
