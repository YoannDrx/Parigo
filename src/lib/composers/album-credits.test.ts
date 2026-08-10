import { describe, expect, it } from "vitest";
import { buildAlbumContributorGroups, buildTrackCreditLinks } from "./album-credits";

describe("album contributor credits", () => {
  it("groups structured writers by their exact Harvest capacity", () => {
    const groups = buildAlbumContributorGroups([{
      composers: ["Composer Raw (SACEM)", "Writer Raw (NS)", "Arranger Raw (BMI)", "Missing Raw (NS)"],
      authors: [],
      rightHolders: [
        { id: "composer", name: "Composer Raw", capacity: "Composer" },
        { id: "author", name: "Writer Raw", capacity: "Author" },
        { id: "both", name: "Both Raw", capacity: "Composer/Author" },
        { id: "arranger", name: "Arranger Raw", capacity: "Arranger" },
        { id: "publisher", name: "Publisher Raw", capacity: "Original Publisher" },
      ],
    }], { linkProfiles: false });

    expect(groups).toEqual([
      {
        role: "composer",
        credits: [
          { credit: "Composer Raw", name: "Composer Raw" },
          { credit: "Missing Raw (NS)", name: "Missing Raw" },
        ],
      },
      { role: "author", credits: [{ credit: "Writer Raw", name: "Writer Raw" }] },
      { role: "composer-author", credits: [{ credit: "Both Raw", name: "Both Raw" }] },
      { role: "arranger", credits: [{ credit: "Arranger Raw", name: "Arranger Raw" }] },
    ]);
  });

  it("cleans society suffixes when structured credits are unavailable", () => {
    const groups = buildAlbumContributorGroups([{
      composers: ["Kokane (NS)"],
      authors: ["An Author (SACEM)"],
      rightHolders: [],
    }], { linkProfiles: false });

    expect(groups).toEqual([
      { role: "composer", credits: [{ credit: "Kokane (NS)", name: "Kokane" }] },
      { role: "author", credits: [{ credit: "An Author (SACEM)", name: "An Author" }] },
    ]);
    expect(buildTrackCreditLinks([{
      composers: ["Kokane (NS)"],
      authors: [],
      rightHolders: [],
    }], { linkProfiles: false })).toEqual([
      { credit: "Kokane (NS)", name: "Kokane" },
    ]);
  });

  it("links Jacques Sahloul to the public Liqid profile", () => {
    const groups = buildAlbumContributorGroups([{
      composers: ["Jacques Sahloul (NS)"],
      authors: [],
      rightHolders: [{
        id: "2e1b4b899c780e8b",
        name: "Jacques Sahloul",
        capacity: "Composer",
      }],
    }], { albumCode: "PGO0007", linkProfiles: true });

    expect(groups).toEqual([{
      role: "composer",
      credits: [{
        credit: "Jacques Sahloul",
        name: "Liqid",
        slug: "liqid",
        href: "/talents/liqid",
      }],
    }]);
  });
});
