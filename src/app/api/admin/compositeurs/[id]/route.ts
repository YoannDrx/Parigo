import { NextResponse } from "next/server";
import { getParigoComposerAuditAlbum } from "@/lib/harvest/composer-audit-inventory";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const albumId = new URL(request.url).searchParams.get("album");
  if (!albumId) {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Identifiant d’album manquant." } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const { album, capturedAt } = await getParigoComposerAuditAlbum(id, albumId);
  if (!album) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Album compositeur introuvable." } },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json({ data: { album }, meta: { capturedAt } }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
