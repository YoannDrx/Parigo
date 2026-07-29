import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/harvest/api";
import {
  confirmMemberImageUpload,
  getMemberImageUpload,
  removeMemberImage,
  uploadMemberImage,
} from "@/lib/harvest/member";
import { assertSameOrigin, requireHarvestSession } from "@/lib/harvest/session";

const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const imageMetadataSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const session = await requireHarvestSession();
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: { code: "VALIDATION_FAILED", message: "Image file is required", retryable: false, requestId: id } },
          { status: 400, headers: { "Cache-Control": "no-store", "X-Request-ID": id } },
        );
      }
      const input = imageMetadataSchema.parse({ fileName: file.name, contentType: file.type });
      if (file.size < 1 || file.size > PROFILE_IMAGE_MAX_BYTES) {
        return NextResponse.json(
          { error: { code: "VALIDATION_FAILED", message: "Image must be between 1 byte and 5 MiB", retryable: false, requestId: id } },
          { status: 413, headers: { "Cache-Control": "no-store", "X-Request-ID": id } },
        );
      }
      const uploaded = await uploadMemberImage(
        session.memberToken,
        input.fileName,
        input.contentType,
        new Uint8Array(await file.arrayBuffer()),
      );
      return NextResponse.json(
        { data: { uploaded: true, resourceUrl: uploaded.resourceUrl }, meta: { requestId: id } },
        { headers: { "Cache-Control": "no-store", "X-Request-ID": id } },
      );
    }
    const input = imageMetadataSchema.parse(await request.json());
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
