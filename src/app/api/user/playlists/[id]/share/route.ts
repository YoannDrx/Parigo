import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { createMusicShare } from "@/lib/harvest/activity";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";
import { isHarvestPlaylistSharingEnabled } from "@/lib/harvest/config";
import { HarvestError } from "@/lib/harvest/errors";

const shareSchema = z.object({
  playlistTitle: z.string().trim().min(1).max(160),
  toEmail: z.email(),
  message: z.string().max(1200).optional(),
  mode: z.enum(["view", "collaborate", "deliver"]).default("view"),
  allowDownload: z.boolean().default(false),
  allowFollow: z.boolean().default(false),
  allowSave: z.boolean().default(true),
  allowShare: z.boolean().default(false),
  sendEmail: z.boolean().default(true),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    if (!isHarvestPlaylistSharingEnabled()) {
      throw new HarvestError(
        "Playlist sharing is not configured for this Harvest account",
        "FORBIDDEN",
        403,
        false,
        "SHARE_ROUTE_NOT_CONFIGURED",
      );
    }
    const session = await requireHarvestSession();
    const playlistId = z.string().min(1).max(256).parse((await context.params).id);
    const input = shareSchema.parse(await request.json());
    const share = await createMusicShare(session.memberToken, {
      ...input,
      objectIdentifier: playlistId,
      objectType: "Playlist",
      contentTitle: input.playlistTitle,
      fromEmail: session.user.email,
    });
    return NextResponse.json({ data: { share }, meta: { requestId: requestID } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}
