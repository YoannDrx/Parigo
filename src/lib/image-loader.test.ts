import { describe, expect, it } from "vitest";
import parigoImageLoader from "./image-loader";

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

  it("caps Harvest artwork at the catalogue display ceiling", () => {
    const result = new URL(parigoImageLoader({
      src: "https://d3vy0pmxxxelni.cloudfront.net/assets/albumart/cover?width=640&height=640",
      width: 1920,
    }));

    expect(result.searchParams.get("width")).toBe("800");
    expect(result.searchParams.get("height")).toBe("800");
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
