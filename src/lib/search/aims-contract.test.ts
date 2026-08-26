import { describe, expect, it } from "vitest";
import {
  AIMS_PLATFORM_SEARCH_TYPES,
  AimsSearchRequestSchema,
  buildAimsCloudSearch,
  detectAimsExternalPlatform,
  parseAimsCapabilities,
} from "./aims-contract";

const serviceInfo = {
  SearchSimilarInfo: [{
    Name: "Jukebox PMFM AIMS",
    Type: "AIMS",
    Settings: {
      SimiliarByTrackID: { Allow: true, AllowPrioritizeBPM: true },
      SimiliarByPrompt: { Allow: false },
      SimiliarByUpload: { Allow: true, MaximumSize: 120, MaximumDuration: 900 },
      SimiliarByUrl: { Allow: true, Types: ["YouTube", "Spotify", "SoundCloud"] },
      AllowMultiSeedSearching: true,
    },
  }],
};

const enabledFlags = {
  track: true,
  prompt: true,
  upload: true,
  url: true,
  contractVerified: true,
  promptCapabilityOverride: true,
  referenceTokensConfigured: true,
};

describe("Harvest-mediated AIMS contract", () => {
  it("parses each provider mode instead of treating the provider as one boolean", () => {
    const capabilities = parseAimsCapabilities(serviceInfo, enabledFlags);
    expect(capabilities.track).toMatchObject({ advertised: true, enabled: true, multiSeed: true, prioritizeBpm: true });
    expect(capabilities.prompt).toEqual({ advertised: false, enabled: true });
    expect(capabilities.upload).toMatchObject({ advertised: true, enabled: true, maxBytes: 120 * 1024 * 1024 });
    expect(capabilities.externalUrl.platforms).toEqual(["youtube", "spotify", "soundcloud"]);
  });

  it("keeps all modes closed until the live contract is explicitly verified", () => {
    const capabilities = parseAimsCapabilities(serviceInfo, { ...enabledFlags, contractVerified: false });
    expect(capabilities.track.enabled).toBe(false);
    expect(capabilities.prompt.enabled).toBe(false);
    expect(capabilities.upload.enabled).toBe(false);
    expect(capabilities.externalUrl.enabled).toBe(false);
    expect(capabilities.playlistSuggestions).toBe(true);
  });

  it("builds EvokeRanking payloads without keyword filters or paging", () => {
    const input = AimsSearchRequestSchema.parse({
      type: "track",
      seedTrackIds: ["track-2", "track-1", "track-2"],
      prioritizeBpm: true,
    });
    const payload = buildAimsCloudSearch(input, { regionId: "region-1" });
    expect(payload).toMatchObject({
      RegionID: "region-1",
      SearchFilters: {
        SearchTermBundle: { St_Audio: { Audio: [{ TrackID: "track-2" }, { TrackID: "track-1" }] } },
        ResultView: { Sort_Predefined: "EvokeRanking", Skip: "0", Limit: "30", Evoke_PrioritizeBPM: true },
      },
    });
  });

  it("accepts only exact HTTPS hosts from supported platforms", () => {
    expect(detectAimsExternalPlatform("https://youtu.be/abc")).toBe("youtube");
    expect(detectAimsExternalPlatform("https://open.spotify.com/track/abc")).toBe("spotify");
    expect(detectAimsExternalPlatform("https://youtube.com.evil.example/watch?v=x")).toBeNull();
    expect(detectAimsExternalPlatform("http://youtube.com/watch?v=x")).toBeNull();
    expect(detectAimsExternalPlatform("https://user:credential@youtube.com/watch?v=x")).toBeNull();
  });

  it("uses Harvest's CloudSearch spelling for external references", () => {
    expect(AIMS_PLATFORM_SEARCH_TYPES.youtube).toBe("Youtube");
    expect(AIMS_PLATFORM_SEARCH_TYPES.appleMusic).toBe("AppleMusic");
  });
});
