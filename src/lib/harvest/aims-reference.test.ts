// @vitest-environment node

import { beforeAll, describe, expect, it } from "vitest";

describe("AIMS opaque reference tokens", () => {
  beforeAll(() => {
    process.env.AIMS_REFERENCE_TOKEN_SECRET = "a-test-only-aims-secret-with-enough-entropy";
  });

  it("encrypts and restores a typed reference", async () => {
    const { sealAimsReference, unsealAimsReference } = await import("./aims-reference");
    const token = await sealAimsReference({
      kind: "upload",
      resourceUrl: "https://storage.invalid/private-audio.mp3",
      harvestType: "MP3",
      nonce: "nonce-1",
    });
    expect(token.split(".")).toHaveLength(5);
    expect(token).not.toContain("private-audio");
    await expect(unsealAimsReference(token, ["upload"])).resolves.toMatchObject({ kind: "upload", harvestType: "MP3" });
    await expect(unsealAimsReference(token, ["url"])).rejects.toMatchObject({ code: "VALIDATION_FAILED", status: 400 });
  });

  it("rejects a modified token", async () => {
    const { sealAimsReference, unsealAimsReference } = await import("./aims-reference");
    const token = await sealAimsReference({
      kind: "url",
      resourceUrl: "https://storage.invalid/reference",
      harvestType: "YouTube",
      nonce: "nonce-2",
    });
    await expect(unsealAimsReference(`${token.slice(0, -2)}aa`, ["url"]))
      .rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("rejects an expired token", async () => {
    const { sealAimsReference, unsealAimsReference } = await import("./aims-reference");
    const token = await sealAimsReference({
      kind: "upload",
      resourceUrl: "https://storage.invalid/expired.mp3",
      harvestType: "MP3",
      nonce: "nonce-expired",
    }, -1);
    await expect(unsealAimsReference(token, ["upload"]))
      .rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});
