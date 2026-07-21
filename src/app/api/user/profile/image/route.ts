import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import { confirmMemberImageUpload, getMemberImageUpload, removeMemberImage } from "@/lib/harvest/member";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const input = z.object({ fileName: z.string().min(1).max(200), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]) }).parse(await request.json());
    const upload = await getMemberImageUpload(session.memberToken, input.fileName, input.contentType);
    return NextResponse.json({ data: upload, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store", "X-Request-ID": id } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function PATCH(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    const input = z.object({ fileName: z.string().min(1).max(200) }).parse(await request.json());
    await confirmMemberImageUpload(session.memberToken, input.fileName);
    return NextResponse.json({ data: { uploaded: true }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}

export async function DELETE(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    await removeMemberImage(session.memberToken);
    return NextResponse.json({ data: { removed: true }, meta: { requestId: id } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, id, { surface: "account" }); }
}
