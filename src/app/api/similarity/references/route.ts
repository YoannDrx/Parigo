import { NextRequest, NextResponse } from "next/server";
import { requestId } from "@/lib/harvest/api";
import { createAimsExternalReference } from "@/lib/harvest/aims";
import { sealAimsReference } from "@/lib/harvest/aims-reference";
import { HarvestError } from "@/lib/harvest/errors";
import { assertSameOrigin, readHarvestSession } from "@/lib/harvest/session";
import { AimsExternalReferenceSchema, detectAimsExternalPlatform } from "@/lib/search/aims-contract";
import { readSimilarityJson, similarityApiError } from "@/lib/similarity-route";

export async function POST(request: NextRequest) {
  const id = requestId();
  try {
    assertSameOrigin(request);
    const input = AimsExternalReferenceSchema.parse(await readSimilarityJson(request));
    const platform = detectAimsExternalPlatform(input.url);
    if (!platform) {
      throw new HarvestError("Only supported official audio platform URLs are accepted", "VALIDATION_FAILED", 400, false);
    }
    const session = await readHarvestSession();
    const reference = await createAimsExternalReference(input.url, platform, session?.memberToken);
    const referenceToken = await sealAimsReference({
      kind: "url",
      resourceUrl: reference.resourceUrl,
      harvestType: reference.harvestType,
      nonce: crypto.randomUUID(),
    }, 30 * 60);
    return NextResponse.json(
      { data: { referenceToken, platform, expiresInSeconds: 30 * 60 }, meta: { requestId: id } },
      { headers: { "Cache-Control": "no-store", "X-Request-ID": id } },
    );
  } catch (error) {
    return similarityApiError(error, id);
  }
}
