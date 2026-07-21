import { NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { getCategories } from "@/lib/harvest/catalog";

export async function GET() {
  const id = requestId();
  try {
    const roots = await getCategories();
    const root = roots.find((item) => /^moods?$/i.test(item.name));
    return NextResponse.json(
      { moods: (root?.children || []).map((item) => ({ id: item.id, name: item.name, slug: item.id })) },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200", "X-Request-ID": id } },
    );
  } catch (error) { return apiError(error, id); }
}
