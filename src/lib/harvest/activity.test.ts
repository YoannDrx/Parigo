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
import { getCommentedTracks, getDownloadHistory, getMemberPlaylistCategories, getMemberPlaylists, getMemberTags, getMemberTagsWithTrackCounts, isReservedMemberTagName, mapDownloadHistoryResponse } from "./activity";
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

describe("Harvest member tag counts", () => {
  beforeEach(() => {
    vi.mocked(memberRequest).mockReset();
    vi.mocked(getAssetTemplates).mockReset();
    vi.mocked(getAssetTemplates).mockResolvedValue(templates);
  });

  it("uses the persisted tag-track relation when Harvest returns a stale zero", async () => {
    vi.mocked(memberRequest).mockImplementation(async (_memberToken, pathBuilder) => {
      const path = pathBuilder("redacted-member-token");
      if (path.startsWith("/getmembertags/")) {
        return { Tags: [{ TagID: "tag-1", TagName: "Test", TrackCount: 0 }] };
      }
      if (path.startsWith("/getmembertagtracks/")) {
        return {
          Tags: [{
            TagID: "tag-1",
            TagName: "Test",
            Tracks: [
              { ID: "track-1", DisplayTitle: "One" },
              { ID: "track-2", DisplayTitle: "Two" },
              { ID: "track-3", DisplayTitle: "Three" },
            ],
          }],
        };
      }
      throw new Error(`Unexpected Harvest path: ${path}`);
    });

    await expect(getMemberTagsWithTrackCounts("member-token")).resolves.toEqual([
      expect.objectContaining({ id: "tag-1", name: "Test", trackCount: 3 }),
    ]);
  });

  it("keeps the private-comment index out of personal tags while hydrating its tracks", async () => {
    vi.mocked(memberRequest).mockImplementation(async (_memberToken, pathBuilder) => {
      const path = pathBuilder("redacted-member-token");
      if (path.startsWith("/getmembertags/")) {
        return { Tags: [
          { TagID: "tag-personal", TagName: "Montage", TrackCount: 1 },
          { TagID: "tag-system", TagName: "PARIGO_INTERNAL_TRACK_COMMENTS_V1", TrackCount: 1 },
        ] };
      }
      if (path.startsWith("/getmembertagtracks/") && path.includes("tag-system")) {
        return { Tags: [{
          TagID: "tag-system",
          TagName: "PARIGO_INTERNAL_TRACK_COMMENTS_V1",
          Tracks: [{ ID: "track-1", DisplayTitle: "In The Open", AlbumID: "album-1", AlbumName: "Open Fields" }],
        }] };
      }
      if (path.startsWith("/gettrackmembercomments/")) {
        return { Tags: [{ TagID: "comment-1", TagName: "Garder pour le montage", CreateDate: "2026-08-03T10:00:00Z" }] };
      }
      throw new Error(`Unexpected Harvest path: ${path}`);
    });

    expect(isReservedMemberTagName("parigo_internal_track_comments_v1")).toBe(true);
    await expect(getMemberTags("member-token")).resolves.toEqual([
      expect.objectContaining({ id: "tag-personal", name: "Montage" }),
    ]);
    await expect(getCommentedTracks("member-token")).resolves.toEqual([
      expect.objectContaining({
        track: expect.objectContaining({ id: "track-1", title: "In The Open" }),
        comments: [expect.objectContaining({ id: "comment-1", trackId: "track-1", text: "Garder pour le montage" })],
      }),
    ]);
  });
});

describe("Harvest member playlist hierarchy", () => {
  beforeEach(() => {
    vi.mocked(memberRequest).mockReset();
    vi.mocked(getAssetTemplates).mockReset();
    vi.mocked(getAssetTemplates).mockResolvedValue(templates);
  });

  it("keeps playlists inside their physical folder after a reload", async () => {
    vi.mocked(memberRequest).mockImplementation(async (_memberToken, pathBuilder) => {
      const path = pathBuilder("redacted-member-token");
      if (path.startsWith("/getmemberplaylistsnotracks/")) {
        return { Playlists: [{ ID: "playlist-root", Name: "Sans dossier", TrackCount: 1 }] };
      }
      if (path.startsWith("/getmemberplaylistcategoriesandplaylists/")) {
        return {
          PlaylistObjects: [{
            ID: "folder-test",
            Name: "Test",
            ObjectType: "PlaylistCategory",
            PlaylistsCount: 1,
            Playlists: [{
              ID: "playlist-drag",
              Name: "Montage campagne",
              TrackCount: 4,
            }],
          }],
        };
      }
      throw new Error(`Unexpected Harvest path: ${path}`);
    });

    await expect(getMemberPlaylists("member-token", 0, 500)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "playlist-root", categoryId: undefined }),
        expect.objectContaining({ id: "playlist-drag", categoryId: "folder-test" }),
      ]),
    );
  });

  it("reads the documented PlaylistsCount field used by folder cards", async () => {
    vi.mocked(memberRequest).mockResolvedValue({
      PlaylistCategories: [{
        ID: "folder-test",
        Name: "Test",
        PlaylistsCount: 3,
      }],
    });

    await expect(getMemberPlaylistCategories("member-token")).resolves.toEqual([
      expect.objectContaining({ id: "folder-test", name: "Test", playlistCount: 3 }),
    ]);
  });
});
