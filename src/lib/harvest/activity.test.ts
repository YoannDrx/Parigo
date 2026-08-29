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
import { acceptSharedMusic, copyFeaturedPlaylist, createMusicShare, getCommentedTracks, getDownloadHistory, getMemberPlaylistCategories, getMemberPlaylists, getMemberTags, getMemberTagsWithTrackCounts, getSharedMusic, isReservedMemberTagName, mapDownloadHistoryResponse } from "./activity";
import { guestRequest, memberRequest, serviceRequest } from "./client";
import { HarvestError } from "./errors";

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

describe("Harvest featured playlist copy", () => {
  beforeEach(() => {
    vi.mocked(memberRequest).mockReset();
    vi.mocked(getAssetTemplates).mockReset();
    vi.mocked(getAssetTemplates).mockResolvedValue(templates);
  });

  it("repairs an empty Harvest copy and verifies every expected track", async () => {
    let copied = false;
    let copiedTrackIds: string[] = [];
    vi.mocked(memberRequest).mockImplementation(async (_memberToken, pathBuilder, init) => {
      const path = pathBuilder("redacted-member-token");
      if (path.startsWith("/getmemberplaylistsnotracks/")) {
        return { Playlists: copied ? [{ ID: "copy-1", Name: "Copie Parigo", TrackCount: copiedTrackIds.length }] : [] };
      }
      if (path.startsWith("/getmemberplaylistcategoriesandplaylists/")) return { PlaylistObjects: [] };
      if (path.startsWith("/copytomemberplaylist/")) {
        copied = true;
        return { Playlists: [{ ID: "copy-1" }] };
      }
      if (path.startsWith("/getmemberplaylist/") && path.includes("copy-1")) {
        return { Playlists: [{
          ID: "copy-1",
          Name: "Copie Parigo",
          Tracks: copiedTrackIds.map((id) => ({ ID: id, DisplayTitle: id })),
        }] };
      }
      if (path.startsWith("/addtomemberplaylists/")) {
        const body = JSON.parse(String(init?.body)) as { ObjectIDs?: string[] };
        copiedTrackIds = body.ObjectIDs || [];
        return {};
      }
      throw new Error(`Unexpected Harvest path: ${path}`);
    });

    await expect(copyFeaturedPlaylist("member-token", "featured-1", ["track-1", "track-2"]))
      .resolves.toMatchObject({ id: "copy-1", tracks: [{ id: "track-1" }, { id: "track-2" }] });

    const addCall = vi.mocked(memberRequest).mock.calls.find(([, pathBuilder]) =>
      pathBuilder("redacted-member-token").startsWith("/addtomemberplaylists/"));
    expect(addCall).toBeDefined();
    expect(JSON.parse(String(addCall?.[2]?.body))).toMatchObject({
      AddToPlaylistIDs: ["copy-1"],
      ObjectIDs: ["track-1", "track-2"],
    });
  });
});

describe("Harvest collaborative sharing", () => {
  beforeEach(() => {
    vi.mocked(guestRequest).mockReset();
    vi.mocked(memberRequest).mockReset();
    vi.mocked(serviceRequest).mockReset();
  });

  it("maps a directly referred playlist as well as a shared folder", async () => {
    vi.mocked(guestRequest)
      .mockResolvedValueOnce({
        ReferredPlaylistObject: {
          ID: "playlist-1",
          Name: "Sélection vide",
          ObjectType: "Playlist",
          Tracks: [],
        },
        ReferredPermission: { AllowCollaboration: true },
      })
      .mockResolvedValueOnce({
        ReferredPlaylistObject: {
          ID: "folder-1",
          Name: "Campagne",
          ObjectType: "PlaylistCategory",
          Playlists: [{ ID: "playlist-2", Name: "Film", Tracks: [] }],
        },
      });

    await expect(getSharedMusic("playlist-share-token")).resolves.toMatchObject({
      playlists: [{ id: "playlist-1", title: "Sélection vide", tracks: [] }],
      allowCollaboration: true,
    });
    await expect(getSharedMusic("folder-share-token")).resolves.toMatchObject({
      playlists: [{ id: "playlist-2", title: "Film", tracks: [] }],
    });
  });

  it("creates a collaboration link with the confirmed contract and global email template", async () => {
    vi.mocked(serviceRequest).mockImplementation(async (pathBuilder) => {
      const path = pathBuilder("service-token");
      if (path.startsWith("/validatememberemail/")) {
        throw new HarvestError("Email already belongs to a member", "VALIDATION_FAILED", 409, false, "17");
      }
      if (path.startsWith("/getsharemusicurl/")) {
        return {
          ShareMusic: [{
            Status: "Success",
            Url: "http://www.parigomusic.com/engage-playlist/share-token",
          }],
        };
      }
      throw new Error(`Unexpected service path: ${path}`);
    });
    vi.mocked(memberRequest).mockResolvedValue({});

    await expect(createMusicShare("member-token", {
      objectIdentifier: "playlist-1",
      objectType: "Playlist",
      contentTitle: "Film été",
      fromEmail: "sender@example.com",
      toEmail: "recipient@example.com",
      message: "À écouter",
      mode: "collaborate",
      allowDownload: false,
      allowFollow: false,
      allowSave: true,
      allowShare: false,
      sendEmail: true,
    })).resolves.toMatchObject({
      url: "https://www.parigomusic.com/engage-playlist/share-token",
      emailed: true,
      delivered: false,
      recipientType: "MemberAccount",
      mode: "collaborate",
      status: "Success",
    });

    const shareInit = vi.mocked(serviceRequest).mock.calls[1][1];
    expect(JSON.parse(String(shareInit?.body))).toMatchObject({
      FromMemberToken: "member-token",
      ObjectIdentifier: "playlist-1",
      ObjectType: "Playlist",
      Users: [{ Username: "recipient@example.com", Type: "MemberAccount", ShareType: "Sync", AllowCollaboration: true, AllowEdit: false }],
    });
    const emailInit = vi.mocked(memberRequest).mock.calls[0][2];
    expect(JSON.parse(String(emailInit?.body))).toMatchObject({
      ContentType: "Playlist",
      ContentTitle: "Film été",
      Link: "https://www.parigomusic.com/engage-playlist/share-token",
      SelectEmailTemplateByMemberRegion: false,
    });
  });

  it("delivers directly to a known member without notification or approval", async () => {
    vi.mocked(serviceRequest).mockRejectedValue(
      new HarvestError("Email already belongs to a member", "VALIDATION_FAILED", 409, false, "17"),
    );
    vi.mocked(memberRequest).mockResolvedValue({ Status: "Delivered" });

    await expect(createMusicShare("member-token", {
      objectIdentifier: "playlist-1",
      objectType: "Playlist",
      contentTitle: "Film été",
      fromEmail: "sender@example.com",
      toEmail: "recipient@example.com",
      message: "À écouter",
      mode: "deliver",
      allowDownload: false,
      allowFollow: false,
      allowSave: true,
      allowShare: false,
      sendEmail: false,
    })).resolves.toMatchObject({ delivered: true, emailed: false, url: null, status: "Delivered" });

    const deliveryPath = vi.mocked(memberRequest).mock.calls[0][1]("member-token");
    const deliveryInit = vi.mocked(memberRequest).mock.calls[0][2];
    expect(deliveryPath).toBe("/deliversharemusic/member-token");
    expect(JSON.parse(String(deliveryInit?.body))).toMatchObject({
      ObjectIdentifier: "playlist-1",
      Users: [{ Username: "recipient@example.com", ShareType: "Sync", AllowCollaboration: true, AllowEdit: false, NotifyUser: false }],
    });
  });

  it("accepts a share explicitly as collaboration or copy", async () => {
    vi.mocked(memberRequest).mockResolvedValue({ Status: "Accepted" });
    await expect(acceptSharedMusic("recipient-token", "share-token", "AsCopy")).resolves.toEqual({
      accepted: true,
      acceptType: "AsCopy",
      status: "Accepted",
    });
    expect(vi.mocked(memberRequest).mock.calls[0][1]("recipient-token"))
      .toBe("/acceptsharemusic/recipient-token/share-token?accepttype=AsCopy");
  });
});
