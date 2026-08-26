import { NextRequest, NextResponse } from "next/server";
import { apiTrack, requestId } from "@/lib/harvest/api";
import { searchAims } from "@/lib/harvest/aims";
import { unsealAimsReference } from "@/lib/harvest/aims-reference";
import { assertSameOrigin, readHarvestSession } from "@/lib/harvest/session";
import { AimsSearchRequestSchema } from "@/lib/search/aims-contract";
import { publicSimilarityTrack, readSimilarityJson, similarityApiError } from "@/lib/similarity-route";

export async function POST(request: NextRequest) {
  const id = requestId();
  const startedAt = Date.now();
  try {
    assertSameOrigin(request);
    const input = AimsSearchRequestSchema.parse(await readSimilarityJson(request));
    const session = await readHarvestSession();
    const reference = input.type === "upload" || input.type === "url"
      ? await unsealAimsReference(input.referenceToken, [input.type])
      : undefined;
    const result = await searchAims(input, { memberToken: session?.memberToken, reference });
    return NextResponse.json(
      {
        data: {
          tracks: result.tracks.map(apiTrack).map(publicSimilarityTrack),
          mode: input.type,
          ...(result.indexed !== undefined ? { indexed: result.indexed } : {}),
        },
        meta: { total: result.total, durationMs: Date.now() - startedAt, requestId: id },
      },
      {
        headers: {
          "Cache-Control": input.type === "track" ? "public, s-maxage=600, stale-while-revalidate=300" : "no-store",
          "X-Request-ID": id,
        },
      },
    );
  } catch (error) {
    return similarityApiError(error, id);
  }
}
