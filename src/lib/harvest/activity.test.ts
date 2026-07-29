import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({
  findHarvestToken: vi.fn(),
  getRegionId: vi.fn(),
  guestRequest: vi.fn(),
  memberRequest: vi.fn(),
  serviceRequest: vi.fn(),
}));
vi.mock("./assets", async (importOriginal) => {
  const original = await importOriginal<typeof import("./assets")>();
  return {
    ...original,
    getAssetTemplates: vi.fn(),
  };
});

import { getAssetTemplates, type HarvestAssetTemplates } from "./assets";
import { getDownloadHistory, mapDownloadHistoryResponse } from "./activity";
import { memberRequest } from "./client";

const templates: HarvestAssetTemplates = {
  trackStream: "",
  albumArt: "",
  libraryLogo: "",
  playlistArt: "",
  waveformData: "",
  directDownload: "",
};

const downloadHistoryPayload = {
  History: {
    Tracks: [{
      ID: "track-1",
      DisplayTitle: "In The Open",
      LastUpdated: "2026-07-20 22:24:27",
    }],
    HistoryItems: [{
      TrackID: "track-1",
      DeliveryDate: "2026-07-29T22:17:27.66",
      UTCOffset: 10,
      ItemType: "Download",
    }, {
      TrackID: "track-1",
      DeliveryDate: "2026-07-29T22:18:03.12",
      UTCOffset: 10,
      ItemType: "Download",
    }],
    TotalHistoryItems: 2,
  },
};

describe("Harvest member download history", () => {
  beforeEach(() => {
    vi.mocked(memberRequest).mockReset();
    vi.mocked(getAssetTemplates).mockReset();
    vi.mocked(getAssetTemplates).mockResolvedValue(templates);
  });

  it("joins HistoryItems to Tracks and uses DeliveryDate with UTCOffset", () => {
    const history = mapDownloadHistoryResponse(downloadHistoryPayload, templates);

    expect(history.total).toBe(2);
    expect(history.items).toHaveLength(2);
    expect(history.items[0]).toMatchObject({
      downloadedAt: "2026-07-29T12:17:27.660Z",
      itemType: "Download",
      utcOffsetHours: 10,
      track: {
        id: "track-1",
        title: "In The Open",
      },
    });
    expect(history.items[1].id).not.toBe(history.items[0].id);
  });

  it("uses the documented yyyy-mm-dd date range in the Harvest request", async () => {
    vi.mocked(memberRequest).mockResolvedValue(downloadHistoryPayload);

    await getDownloadHistory("member-token", 5, 10);

    const pathBuilder = vi.mocked(memberRequest).mock.calls[0][1];
    const path = pathBuilder("redacted-member-token");
    expect(path).toMatch(
      /^\/getdownloadhistorybymembertoken\/redacted-member-token\?startdate=\d{4}-\d{2}-\d{2}&enddate=\d{4}-\d{2}-\d{2}&skip=5&limit=10$/,
    );
  });
});
