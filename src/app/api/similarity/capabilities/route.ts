import { NextResponse } from "next/server";
import { requestId } from "@/lib/harvest/api";
import { getAimsCapabilities } from "@/lib/harvest/aims";
import { similarityApiError } from "@/lib/similarity-route";
import { publicSimilarityCapabilities } from "@/lib/search/aims-contract";

export async function GET() {
  const id = requestId();
  try {
    const resolved = await getAimsCapabilities();
    const capabilities = publicSimilarityCapabilities(resolved);
    return NextResponse.json(
      { data: capabilities, meta: { requestId: id } },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", "X-Request-ID": id } },
    );
  } catch (error) {
    return similarityApiError(error, id);
  }
}
