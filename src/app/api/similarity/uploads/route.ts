import { NextRequest, NextResponse } from "next/server";
import { requestId } from "@/lib/harvest/api";
import { getAimsCapabilities, getAimsUpload } from "@/lib/harvest/aims";
import { sealAimsReference } from "@/lib/harvest/aims-reference";
import { HarvestError } from "@/lib/harvest/errors";
import { assertSameOrigin, readHarvestSession } from "@/lib/harvest/session";
import { aimsAudioExtension, AimsUploadMetadataSchema } from "@/lib/search/aims-contract";
import { readSimilarityJson, similarityApiError } from "@/lib/similarity-route";

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const input = AimsUploadMetadataSchema.parse(await readSimilarityJson(request));
    const extension = aimsAudioExtension(input.contentType);
    const declaredExtension = input.fileName.split(".").pop()?.toLocaleLowerCase("en");
    if (!extension || declaredExtension !== extension) {
      throw new HarvestError("File extension and audio type do not match", "VALIDATION_FAILED", 400, false);
    }
    const capabilities = await getAimsCapabilities();
    if (input.size > capabilities.upload.maxBytes) {
      throw new HarvestError("Audio file exceeds the account limit", "VALIDATION_FAILED", 413, false);
    }
    const session = await readHarvestSession();
    const upload = await getAimsUpload({ contentType: input.contentType }, session?.memberToken);
    const uploadToken = await sealAimsReference({
      kind: "upload-pending",
      resourceUrl: upload.resourceUrl,
      harvestType: upload.harvestType,
      fileName: upload.fileName,
      contentType: upload.contentType,
      nonce: crypto.randomUUID(),
    }, 15 * 60);
    return NextResponse.json(
      { data: { uploadUrl: upload.uploadUrl, uploadToken, contentType: upload.contentType, expiresInSeconds: 15 * 60 }, meta: { requestId: id } },
      { headers: { "Cache-Control": "no-store", "X-Request-ID": id } },
    );
  } catch (error) {
    return similarityApiError(error, id);
  }
}
