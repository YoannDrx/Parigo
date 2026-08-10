import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createMemberPlaylistCategory,
  getMemberPlaylistCategories,
} from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";
import { isHarvestPlaylistSharingEnabled } from "@/lib/harvest/config";

const createSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  addToTop: z.boolean().optional(),
});

export async function GET() {
  const requestID = requestId();
  try {
    const session = await requireHarvestSession();
    const categories = await getMemberPlaylistCategories(session.memberToken);
    return NextResponse.json(
      { data: { categories, capabilities: { playlistSharing: isHarvestPlaylistSharingEnabled() } }, meta: { total: categories.length, requestId: requestID } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, requestID, { surface: "account" });
  }
}

export async function POST(request: NextRequest) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const category = await createMemberPlaylistCategory(
      session.memberToken,
      createSchema.parse(await request.json()),
    );
    return NextResponse.json(
      { data: { category }, meta: { requestId: requestID } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, requestID, { surface: "account" });
  }
}
