import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createMemberTag, getMemberTags, getMemberTagsWithTrackCounts, isReservedMemberTagName } from "@/lib/harvest/activity";
import { apiError, requestId } from "@/lib/harvest/api";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

export async function GET(request: NextRequest) {
  const id = requestId();
  try {
    const session = await requireHarvestSession();
    const tags = request.nextUrl.searchParams.get("withCounts") === "1"
      ? await getMemberTagsWithTrackCounts(session.memberToken)
      : await getMemberTags(session.memberToken);
    return NextResponse.json({ data: { tags }, meta: { total: tags.length, requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const { name } = z.object({ name: z.string().trim().min(1).max(120).refine((value) => !isReservedMemberTagName(value), "This tag name is reserved by Parigo") }).parse(await request.json());
    const tag = await createMemberTag(session.memberToken, name);
    return NextResponse.json({ data: { tag }, meta: { requestId: id } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
