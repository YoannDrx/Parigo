import { NextRequest, NextResponse } from "next/server";
import { requestId } from "@/lib/harvest/api";
import { confirmAimsUpload } from "@/lib/harvest/aims";
import { sealAimsReference, unsealAimsReference } from "@/lib/harvest/aims-reference";
import { assertSameOrigin, readHarvestSession } from "@/lib/harvest/session";
import { AimsUploadConfirmationSchema } from "@/lib/search/aims-contract";
import { readSimilarityJson, similarityApiError } from "@/lib/similarity-route";

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const input = AimsUploadConfirmationSchema.parse(await readSimilarityJson(request));
    const pending = await unsealAimsReference(input.uploadToken, ["upload-pending"]);
    const session = await readHarvestSession();
    await confirmAimsUpload(pending, session?.memberToken);
    const referenceToken = await sealAimsReference({ ...pending, kind: "upload", nonce: crypto.randomUUID() }, 30 * 60);
    return NextResponse.json(
      { data: { referenceToken, expiresInSeconds: 30 * 60 }, meta: { requestId: id } },
      { headers: { "Cache-Control": "no-store", "X-Request-ID": id } },
    );
  } catch (error) {
    return similarityApiError(error, id);
  }
}
