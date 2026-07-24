import { describe, expect, it } from "vitest";
import { buildMetadata, hasSearchParams, truncateDescription } from "./seo";

describe("SEO helpers", () => {
  it("détecte uniquement les paramètres de catalogue ayant une valeur", async () => {
    await expect(hasSearchParams(Promise.resolve({}))).resolves.toBe(false);
    await expect(hasSearchParams(Promise.resolve({ q: undefined, labels: [] }))).resolves.toBe(false);
    await expect(hasSearchParams(Promise.resolve({ q: "piano" }))).resolves.toBe(true);
    await expect(hasSearchParams(Promise.resolve({ labels: ["label-1"] }))).resolves.toBe(true);
  });

  it("conserve une canonical sans paramètres et permet noindex,follow", () => {
    const metadata = buildMetadata({
      locale: "fr",
      path: "/albums?q=piano",
      title: "Albums",
      description: "Une description précise du catalogue musical Parigo.",
      index: false,
      follow: true,
    });

    expect(metadata.robots).toMatchObject({ index: false, follow: true });
    expect(metadata.alternates?.canonical?.toString()).toBe("https://parigo-ten.vercel.app/albums");
  });

  it("tronque une description sans couper le dernier mot utile", () => {
    const description = "Une phrase éditoriale ".repeat(20);
    const truncated = truncateDescription(description, 80);
    expect(truncated.length).toBeLessThanOrEqual(81);
    expect(truncated).toMatch(/…$/);
    expect(truncated).not.toMatch(/\s…$/);
  });
});
