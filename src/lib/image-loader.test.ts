import { describe, expect, it } from "vitest";
import parigoImageLoader, { resizeArtworkSource } from "./image-loader";

describe("parigoImageLoader", () => {
  it("requests the responsive size directly from Harvest", () => {
    const result = new URL(parigoImageLoader({
      src: "https://d3vy0pmxxxelni.cloudfront.net/assets/albumart/cover?token=secret&width=800&height=400",
      width: 320,
      quality: 75,
    }));

    expect(result.origin).toBe("https://d3vy0pmxxxelni.cloudfront.net");
    expect(result.searchParams.get("token")).toBe("secret");
    expect(result.searchParams.get("width")).toBe("320");
    expect(result.searchParams.get("height")).toBe("160");
  });

  it("does not upscale Harvest artwork beyond its source dimensions", () => {
    const result = new URL(parigoImageLoader({
      src: "https://d3vy0pmxxxelni.cloudfront.net/assets/albumart/cover?width=640&height=640",
      width: 1920,
    }));

    expect(result.searchParams.get("width")).toBe("640");
    expect(result.searchParams.get("height")).toBe("640");
    expect(result.searchParams.get("parigo-width")).toBe("1920");
  });

  it("makes a capped responsive width visible to Next.js validation", () => {
    const src = "https://d3vy0pmxxxelni.cloudfront.net/assets/albumart/cover?width=320&height=320";
    const result = new URL(parigoImageLoader({ src, width: 400 }));

    expect(result.href).not.toBe(src);
    expect(result.searchParams.get("width")).toBe("320");
    expect(result.searchParams.get("height")).toBe("320");
    expect(result.searchParams.get("parigo-width")).toBe("400");
  });

  it("creates a smaller Harvest source for a known display ceiling", () => {
    const result = new URL(resizeArtworkSource(
      "https://d3vy0pmxxxelni.cloudfront.net/assets/albumart/cover?token=secret&width=800&height=800",
      640,
    ));

    expect(result.searchParams.get("token")).toBe("secret");
    expect(result.searchParams.get("width")).toBe("640");
    expect(result.searchParams.get("height")).toBe("640");
  });

  it("keeps local and third-party images direct", () => {
    expect(parigoImageLoader({ src: "/images/parigo-studio.jpg", width: 1200 }))
      .toBe("/images/parigo-studio.jpg?parigo-width=1200");
    expect(parigoImageLoader({
      src: "https://i.ytimg.com/vi/example/maxresdefault.jpg",
      width: 640,
    })).toBe("https://i.ytimg.com/vi/example/maxresdefault.jpg?parigo-width=640");
  });
});
