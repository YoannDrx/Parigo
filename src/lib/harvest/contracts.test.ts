import { describe, expect, it } from "vitest";
import searchFixture from "./__fixtures__/cloud-search-track.json";
import memberFixture from "./__fixtures__/member.json";
import tagFixture from "./__fixtures__/member-tags.json";
import { HarvestMemberSchema, HarvestMemberTagSchema, HarvestSearchResponseSchema, HarvestTrackSchema } from "./contracts";

describe("endpoint-specific Harvest contracts", () => {
  it("validates and normalizes the observed Cloud Search payload", () => {
    const payload = HarvestSearchResponseSchema.parse(searchFixture);
    expect(payload.TotalTracks).toBe(28_335);
    expect(payload.Tracks[0]).toMatchObject({ ID: "track-fixture-1", Bpm: 92, IsAlternate: false });
    expect(payload.Tracks[0].Composer).toBe("Composer One, Composer Two");
  });

  it("keeps the complete member account fields typed", () => {
    const member = HarvestMemberSchema.parse(memberFixture.Member);
    expect(member).toMatchObject({
      ID: "member-fixture-1",
      Status: "active",
      Subscribe: false,
      DownloadLimit: 100,
      DownloadsRemaining: 88,
      PositionType: "Music supervisor",
      Freelancer: true,
    });
  });

  it("validates tags independently from catalogue responses", () => {
    const tag = HarvestMemberTagSchema.parse(tagFixture.Tags[0]);
    expect(tag).toMatchObject({ TagID: "tag-fixture-1", TagName: "Documentary shortlist", TrackCount: 3 });
  });

  it("accepts right holders returned as first and last name fields", () => {
    const payload = HarvestSearchResponseSchema.parse({ TotalTracks: 1, Tracks: [{ ID: "track-1", RightHolders: [{ ID: "holder-1", FirstName: "Janet", LastName: "Preston", Capacity: "Composer" }] }] });
    expect(payload.Tracks[0].RightHolders[0]).toMatchObject({ ID: "holder-1", FirstName: "Janet", LastName: "Preston" });
  });

  it("normalizes the BPM ranges returned by featured playlists", () => {
    const track = HarvestTrackSchema.parse({ ID: "track-variable-tempo", Bpm: "116-127" });
    expect(track.Bpm).toBe(122);
  });

  it("rejects a partial response missing a field required by the view", () => {
    expect(() => HarvestMemberTagSchema.parse({ TagID: "tag-fixture-1" })).toThrow();
  });
});
