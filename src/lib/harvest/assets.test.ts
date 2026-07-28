import { describe, expect, it } from "vitest";
import { assetUrl } from "./assets";

describe("Harvest asset URL templates", () => {
  it("replaces literal and URL-encoded placeholders", () => {
    expect(assetUrl("https://example.invalid/{id}?token={token}", {
      id: "track/1",
      token: "secret value",
    })).toBe("https://example.invalid/track%2F1?token=secret%20value");
    expect(assetUrl("https://example.invalid/%7Bdownloadtoken%7D", {
      downloadtoken: "download-token",
    })).toBe("https://example.invalid/download-token");
  });

  it("removes unresolved literal and encoded placeholders", () => {
    expect(assetUrl("https://example.invalid/{id}/%7Bwidth%7D", {}))
      .toBe("https://example.invalid//");
  });
});
