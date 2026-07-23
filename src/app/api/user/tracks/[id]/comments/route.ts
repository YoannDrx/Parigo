import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { createTrackComment, getTrackComments, removeTrackComment, updateTrackComment } from "@/lib/harvest/activity";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const idSchema = z.string().min(1).max(256);
const noteSchema = z.object({ text: z.string().trim().min(1).max(1200) });
const updateSchema = noteSchema.extend({ commentId: idSchema });

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    const session = await requireHarvestSession();
    const trackId = idSchema.parse((await context.params).id);
    const comments = await getTrackComments(session.memberToken, trackId);
    return NextResponse.json({ data: { comments }, meta: { total: comments.length, requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const trackId = idSchema.parse((await context.params).id);
    const { text } = noteSchema.parse(await request.json());
    const comment = await createTrackComment(session.memberToken, trackId, text);
    return NextResponse.json({ data: { comment }, meta: { requestId: requestID } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const trackId = idSchema.parse((await context.params).id);
    const { commentId, text } = updateSchema.parse(await request.json());
    const comment = await updateTrackComment(session.memberToken, commentId, trackId, text);
    return NextResponse.json({ data: { comment }, meta: { requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}

export async function DELETE(request: NextRequest) {
  const requestID = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const commentId = idSchema.parse(request.nextUrl.searchParams.get("commentId"));
    await removeTrackComment(session.memberToken, commentId);
    return NextResponse.json({ data: { removed: true }, meta: { requestId: requestID } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, requestID, { surface: "account" }); }
}
