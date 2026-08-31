import { describe, expect, it } from "vitest";
import { verifiedLabelLogo } from "./label-logo-health";

describe("verifiedLabelLogo", () => {
  it("conserve uniquement une ressource catalogue vérifiée", () => {
    expect(verifiedLabelLogo("b9d701733704e2d7", "https://cdn.example/parigo")).toBe("https://cdn.example/parigo");
    expect(verifiedLabelLogo("74230761212afd35", "https://cdn.example/broken")).toBeNull();
    expect(verifiedLabelLogo("", "https://cdn.example/unknown")).toBeNull();
  });
});
