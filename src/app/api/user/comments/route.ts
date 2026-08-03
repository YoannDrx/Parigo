import { NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { getCommentedTracks, syncTrackCommentIndex } from "@/lib/harvest/activity";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

export async function GET() {
  const id = requestId();
  try {
    const session = await requireHarvestSession();
    const groups = await getCommentedTracks(session.memberToken);
    return NextResponse.json({
      data: { groups },
      meta: {
        totalTracks: groups.length,
        totalComments: groups.reduce((total, group) => total + group.comments.length, 0),
        requestId: id,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function POST(request: Request) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const sync = await syncTrackCommentIndex(session.memberToken, session.memberUtcOffsetHours);
    const groups = await getCommentedTracks(session.memberToken);
    return NextResponse.json({
      data: { groups, sync },
      meta: {
        totalTracks: groups.length,
        totalComments: groups.reduce((total, group) => total + group.comments.length, 0),
        requestId: id,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
