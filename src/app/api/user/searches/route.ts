import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { createMemberSavedSearch, getMemberSavedSearches, removeMemberSavedSearch } from "@/lib/harvest/activity";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const createSchema = z.object({
  name: z.string().trim().min(1).max(160),
  searchHistoryId: z.string().min(1).max(256),
  searchUrl: z.string().startsWith("/search").max(2400),
});

export async function GET() {
  const id = requestId();
  try {
    const session = await requireHarvestSession();
    const searches = await getMemberSavedSearches(session.memberToken);
    return NextResponse.json({ data: { searches }, meta: { total: searches.length, requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const search = await createMemberSavedSearch(session.memberToken, createSchema.parse(await request.json()));
    return NextResponse.json({ data: { search }, meta: { requestId: id } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function DELETE(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const searchId = z.string().min(1).max(256).parse(request.nextUrl.searchParams.get("id"));
    await removeMemberSavedSearch(session.memberToken, searchId);
    return NextResponse.json({ data: { removed: true }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
