import { describe, expect, it } from "vitest";
import { scrubSensitive } from "./sentry-privacy";

describe("Sentry privacy", () => {
  it("redacts every public Harvest callback token from nested event strings", () => {
    expect(scrubSensitive({
      request: { url: "https://parigo.test/shared-playlistcategory/folder-secret-value" },
      transaction: "/change-password/reset-secret-value",
    })).toEqual({
      request: { url: "https://parigo.test/shared-playlistcategory/[token]" },
      transaction: "/change-password/[token]",
    });
  });
});
