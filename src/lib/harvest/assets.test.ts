import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({
  getServiceInfo: vi.fn(),
  memberRequest: vi.fn(),
}));

import { getServiceInfo, memberRequest } from "./client";
import { getAssetTemplates } from "./assets";

describe("Harvest asset templates", () => {
  beforeEach(() => {
    vi.mocked(getServiceInfo).mockReset();
    vi.mocked(memberRequest).mockReset();
    vi.mocked(getServiceInfo).mockResolvedValue({
      ServiceInfoURLs: {
        TrackStreamURL: "https://media.invalid/track/{id}?token=service&source={source}",
        AlbumArtURL: "https://media.invalid/album/{id}",
      },
    });
  });

  it("uses the member stream template for authenticated catalogue responses", async () => {
    vi.mocked(memberRequest).mockResolvedValue({
      MemberAccount: {
        ServiceInfoURLs: {
          TrackStreamURL: "https://media.invalid/track/{id}?token=member&source={source}",
        },
      },
    });

    const templates = await getAssetTemplates("member-token-for-test");

    expect(templates.trackStream).toContain("token=member");
    expect(templates.albumArt).toBe("https://media.invalid/album/{id}");
  });

  it("keeps service templates for anonymous catalogue responses", async () => {
    const templates = await getAssetTemplates();

    expect(templates.trackStream).toContain("token=service");
    expect(memberRequest).not.toHaveBeenCalled();
  });
});
