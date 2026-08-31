import { describe, expect, it } from "vitest";
import { isSoftwareWebGlRenderer } from "./webgl-capability";

describe("home hero WebGL capability", () => {
  it.each([
    "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device), SwiftShader driver)",
    "llvmpipe (LLVM 18.1.8, 256 bits)",
    "Mesa OffScreen",
    "Software Rasterizer",
  ])("falls back for the software renderer %s", (renderer) => {
    expect(isSoftwareWebGlRenderer(renderer)).toBe(true);
  });

  it.each([
    "ANGLE (Apple, ANGLE Metal Renderer: Apple M3)",
    "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070)",
    "AMD Radeon Pro 5500M OpenGL Engine",
  ])("keeps Orb for the accelerated renderer %s", (renderer) => {
    expect(isSoftwareWebGlRenderer(renderer)).toBe(false);
  });
});
