import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addTracksToPlaylist, getMemberPlaylist, removeTracksFromPlaylist, reorderPlaylistTracks } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { HarvestError } from "@/lib/harvest/errors";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const schema = z.object({ action: z.enum(["add", "remove", "reorder"]), trackIds: z.array(z.string().min(1)).min(1).max(500) });
const VERIFICATION_DELAYS_MS = [0, 250, 1_000, 3_000] as const;

async function verifyPlaylistTracks(
  memberToken: string,
  playlistId: string,
  predicate: (trackIds: string[]) => boolean,
) {
  let remoteTrackIds: string[] = [];
  for (const delay of VERIFICATION_DELAYS_MS) {
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
