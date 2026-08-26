import { NextResponse } from "next/server";
import { requestId } from "@/lib/harvest/api";
import { getAimsCapabilities } from "@/lib/harvest/aims";
import { similarityApiError } from "@/lib/similarity-route";

export async function GET() {
  const id = requestId();
  try {
    const resolved = await getAimsCapabilities();
    const capabilities = {
      track: resolved.track,
      prompt: resolved.prompt,
      upload: resolved.upload,
      externalUrl: resolved.externalUrl,
      playlistSuggestions: resolved.playlistSuggestions,
    };
    return NextResponse.json(
      { data: capabilities, meta: { requestId: id } },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", "X-Request-ID": id } },
    );
  } catch (error) {
    return similarityApiError(error, id);
  }
}
