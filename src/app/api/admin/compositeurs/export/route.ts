import { getParigoComposerAuditCsvRows } from "@/lib/harvest/composer-audit-inventory";

function csvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join(" · ") : String(value ?? "");
  return `"${text.replaceAll('"', '""').replace(/[\r\n]+/g, " ")}"`;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = await getParigoComposerAuditCsvRows({
    q: params.get("q") ?? undefined,
    profile: params.get("profile") ?? undefined,
    album: params.get("album") ?? undefined,
    anomaly: params.get("issue") ?? undefined,
    status: params.get("work") ?? undefined,
  });
  if (params.get("format") === "json") {
    return Response.json({ data: result }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const header = [
    "album_code", "album_id", "album", "track_id", "main_track_id", "work_id", "titre", "version", "type",
    "composer_actuel", "composer_attendu", "artist_distinct", "profils_publics", "ayants_droit_structures", "anomalies", "statut",
  ];
  const rows = result.rows.map((row) => [
    row.albumCode,
    row.albumId,
    row.albumTitle,
    row.trackId,
    row.mainTrackId,
    row.workId,
    row.title,
    row.version,
    row.variantKind,
    row.composerRaw,
    row.expectedComposerNames,
    row.artistRaw,
    row.publicProfileSlugs,
    row.structuredWriterNames,
    row.anomalies,
    row.status,
  ]);
  const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(";")).join("\n")}\n`;
  return new Response(csv, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="parigo-audit-compositeurs-${result.capturedAt.slice(0, 10)}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
