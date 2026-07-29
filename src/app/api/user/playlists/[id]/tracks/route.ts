import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addTracksToPlaylist,
  getMemberPlaylist,
  removeTracksFromPlaylist,
  reorderPlaylistTracks,
  searchMemberPlaylistTracks,
} from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { HarvestError } from "@/lib/harvest/errors";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";
import { WRITE_VERIFICATION_OFFSETS_MS } from "@/lib/harvest/write-verification";

const schema = z.object({ action: z.enum(["add", "remove", "reorder"]), trackIds: z.array(z.string().min(1)).min(1).max(500) });

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    const session = await requireHarvestSession();
    const id = z.string().min(1).max(256).parse((await context.params).id);
    const query = z.object({
      q: z.string().max(300).default(""),
      skip: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      orderBy: z.enum([
        "Created_Asc",
        "Created_Desc",
        "Custom_Asc",
        "Custom_ASC",
        "Custom_Desc",
        "Title_Asc",
        "Title_Desc",
        "ReleaseDate_Asc",
        "ReleaseDate_Desc",
        "DateAdded_Asc",
        "DateAdded_Desc",
        "Duration_Asc",
        "Duration_Desc",
      ]).default("Custom_ASC"),
    }).parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await searchMemberPlaylistTracks(session.memberToken, id, {
      keyword: query.q,
      skip: query.skip,
      limit: query.limit,
      orderBy: query.orderBy,
    });
    return NextResponse.json(
      { data: result, meta: { total: result.total, requestId: requestID } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, requestID, { surface: "account" });
  }
}
async function verifyPlaylistTracks(
  memberToken: string,
  playlistId: string,
  predicate: (trackIds: string[]) => boolean,
) {
  let remoteTrackIds: string[] = [];
  for (let index = 0; index < WRITE_VERIFICATION_OFFSETS_MS.length; index += 1) {
    const previous = index === 0 ? 0 : WRITE_VERIFICATION_OFFSETS_MS[index - 1];
    const delay = WRITE_VERIFICATION_OFFSETS_MS[index] - previous;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const playlist = await getMemberPlaylist(memberToken, playlistId);
    if (!playlist) throw new HarvestError("Member playlist not found", "NOT_FOUND", 404);
    remoteTrackIds = playlist.tracks?.map((track) => track.id) || [];
    if (predicate(remoteTrackIds)) return remoteTrackIds;
  }
  throw new HarvestError(
    "Harvest acknowledged the playlist track operation but the resulting state could not be verified",
    "HARVEST_INVALID_RESPONSE",
    502,
    false,
  );
}

async function mutateAndVerify(
  mutation: () => Promise<void>,
  verification: () => Promise<unknown>,
) {
  let mutationError: unknown;
  try {
    await mutation();
  } catch (error) {
    mutationError = error;
  }
  try {
    await verification();
  } catch (verificationError) {
    throw mutationError || verificationError;
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const id = z.string().min(1).parse((await context.params).id);
    const input = schema.parse(await request.json());
    if (input.action === "add") {
      await mutateAndVerify(
        () => addTracksToPlaylist(session.memberToken, id, input.trackIds),
        () => verifyPlaylistTracks(session.memberToken, id, (remoteTrackIds) => {
          const remoteIds = new Set(remoteTrackIds);
          return input.trackIds.every((trackId) => remoteIds.has(trackId));
        }),
      );
    } else if (input.action === "remove") {
      await mutateAndVerify(
        () => removeTracksFromPlaylist(session.memberToken, id, input.trackIds),
        () => verifyPlaylistTracks(session.memberToken, id, (remoteTrackIds) => {
          const remoteIds = new Set(remoteTrackIds);
          return input.trackIds.every((trackId) => !remoteIds.has(trackId));
        }),
      );
    } else {
      await mutateAndVerify(
        () => reorderPlaylistTracks(session.memberToken, id, input.trackIds),
        () => verifyPlaylistTracks(
          session.memberToken,
          id,
          (remoteTrackIds) =>
            remoteTrackIds.length === input.trackIds.length &&
            remoteTrackIds.every((trackId, index) => trackId === input.trackIds[index]),
        ),
      );
    }
    return NextResponse.json({ data: { updated: true, verified: true, playlistId: id }, meta: { requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}
