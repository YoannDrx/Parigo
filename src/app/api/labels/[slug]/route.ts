import { NextResponse } from "next/server";
import { apiAlbum, apiError, apiLabel, requestId } from "@/lib/harvest/api";
import { getAlbums, getLabel, getLabels } from "@/lib/harvest/catalog";
import { HarvestError } from "@/lib/harvest/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const id = requestId();
  try {
    const { slug } = await params;
    const labels = await getLabels();
    const resolvedId = labels.find((label) => label.id === slug || label.slug === slug)?.id || slug;
    const [label, albums] = await Promise.all([getLabel(resolvedId), getAlbums({ label: resolvedId, limit: 100 })]);
    if (!label) throw new HarvestError("Label not found", "NOT_FOUND", 404);
    return NextResponse.json(
      { data: { label: { ...apiLabel({ ...label, albumCount: albums.total }), albums: albums.items.map(apiAlbum), trackCount: albums.items.reduce((sum, album) => sum + album.trackCount, 0) } }, meta: { requestId: id } },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800", "X-Request-ID": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
