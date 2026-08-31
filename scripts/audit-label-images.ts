import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

type JsonRecord = Record<string, unknown>;

interface LabelImageAuditRow {
  id: string;
  name: string;
  url: string;
  status: number;
  contentType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  hasImage: boolean;
  isSquare: boolean;
  issue: string;
}

const projectRoot = path.resolve(import.meta.dirname, "..");
const markdownPath = path.join(projectRoot, "docs/harvest/label-logo-audit.md");
const csvPath = path.join(projectRoot, "docs/harvest/label-logo-audit.csv");
const healthPath = path.join(projectRoot, "src/content/label-logo-health.ts");

function record(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : undefined;
}

function records(value: unknown, key: string): JsonRecord[] {
  const candidate = record(value)?.[key];
  return Array.isArray(candidate)
    ? candidate.filter((item): item is JsonRecord => Boolean(record(item)))
    : [];
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function findString(value: unknown, keys: string[]): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findString(item, keys);
      if (found) return found;
    }
    return "";
  }
  const source = record(value);
  if (!source) return "";
  for (const [key, nested] of Object.entries(source)) {
    if (keys.some((candidate) => candidate.toLocaleLowerCase("en") === key.toLocaleLowerCase("en"))
      && (typeof nested === "string" || typeof nested === "number")
      && String(nested)) {
      return String(nested);
    }
  }
  for (const nested of Object.values(source)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return "";
}

function authorizationHeader(accessToken: string): string {
  const prefix = process.env.HARVEST_AUTH_HEADER_PREFIX?.trim();
  return prefix ? `${prefix} ${accessToken}` : accessToken;
}

async function jsonRequest(url: string, init: RequestInit, label: string): Promise<unknown> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const text = await response.text();
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}: ${text.slice(0, 180)}`);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${label} returned a non-JSON response`);
  }
}

async function getLibraries(): Promise<JsonRecord[]> {
  const authUrl = process.env.HARVEST_AUTH_URL?.trim() || "https://auth.harvestmedia.net/oauth2/token";
  const serviceUrl = process.env.HARVEST_SERVICE_URL?.trim() || "https://service.harvestmedia.net/HMP-WS.svc";
  const oauth = await jsonRequest(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept-Encoding": "identity" },
    body: new URLSearchParams({
      grant_type: process.env.HARVEST_AUTH_GRANT_TYPE?.trim() || "client_credentials",
      client_id: required("HARVEST_CLIENT_ID"),
      client_secret: required("HARVEST_CLIENT_SECRET"),
    }),
  }, "Harvest OAuth");
  const accessToken = findString(oauth, ["access_token", "token", "value"]);
  if (!accessToken) throw new Error("Harvest OAuth token missing");
  const authorization = authorizationHeader(accessToken);

  const service = await jsonRequest(`${serviceUrl}/getservicetoken`, {
    headers: {
      Accept: "application/json",
      AccessKey: required("HARVEST_ACCESS_KEY"),
      Authorization: authorization,
    },
  }, "Harvest service token");
  const serviceToken = findString(service, ["ServiceToken", "Token", "Value"]);
  if (!serviceToken) throw new Error("Harvest service token missing");

  let regionId = process.env.HARVEST_DEFAULT_REGION_ID?.trim() || process.env.HARVEST_REGION_ID?.trim();
  if (!regionId) {
    const serviceInfo = await jsonRequest(`${serviceUrl}/getserviceinfo/${serviceToken}`, {
      headers: { Accept: "application/json", Authorization: authorization },
    }, "Harvest service info");
    regionId = findString(serviceInfo, ["DefaultRegionID", "OverrideRegionID", "RegionID"]);
  }
  if (!regionId) {
    const regions = await jsonRequest(`${serviceUrl}/getregions/${serviceToken}`, {
      headers: { Accept: "application/json", Authorization: authorization },
    }, "Harvest regions");
    regionId = findString(regions, ["ID", "RegionID"]);
  }
  if (!regionId) throw new Error("Harvest region ID missing");

  const guest = await jsonRequest(`${serviceUrl}/getguestmembertoken/${serviceToken}/${encodeURIComponent(regionId)}`, {
    headers: { Accept: "application/json", Authorization: authorization },
  }, "Harvest guest token");
  const guestToken = findString(guest, ["MemberToken", "Token", "Value"]);
  if (!guestToken) throw new Error("Harvest guest token missing");

  const payload = await jsonRequest(`${serviceUrl}/getlibraries/${guestToken}`, {
    headers: { Accept: "application/json", Authorization: authorization },
  }, "Harvest libraries");
  return records(payload, "Libraries");
}

function issueFor(row: Omit<LabelImageAuditRow, "issue">): string {
  if (!row.url) return "URL absente";
  if (row.status === 0) return "Requête impossible";
  if (row.status < 200 || row.status >= 300) return `HTTP ${row.status}`;
  if (!row.contentType.toLocaleLowerCase("en").startsWith("image/")) return `Type ${row.contentType || "inconnu"}`;
  if (!row.bytes) return "Fichier vide";
  if (!row.width || !row.height) return "Image illisible";
  if (!row.isSquare) return "Image non carrée";
  return "";
}

async function inspectLabelImage(library: JsonRecord): Promise<LabelImageAuditRow> {
  const id = findString(library, ["ID"]);
  const name = findString(library, ["Name"]);
  const url = findString(library, ["LibraryLogoUrl"]);
  let status = 0;
  let contentType = "";
  let bytes = 0;
  let width: number | null = null;
  let height: number | null = null;

  if (url) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "image/*", "Accept-Encoding": "identity" },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });
      status = response.status;
      contentType = response.headers.get("content-type")?.split(";")[0].trim() || "";
      const buffer = Buffer.from(await response.arrayBuffer());
      bytes = buffer.byteLength;
      if (response.ok && contentType.toLocaleLowerCase("en").startsWith("image/") && bytes) {
        const metadata = await sharp(buffer, { failOn: "error" }).metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;
      }
    } catch {
      // The audit row below records the request as unavailable or unreadable.
    }
  }

  const isSquare = Boolean(width && height && Math.abs(width - height) <= Math.max(width, height) * 0.01);
  const hasImage = Boolean(status >= 200 && status < 300 && contentType.startsWith("image/") && bytes && width && height);
  const base = { id, name, url, status, contentType, bytes, width, height, hasImage, isSquare };
  return { ...base, issue: issueFor(base) };
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }));
  return results;
}

function csvValue(value: string | number | boolean | null): string {
  const serialized = value === null ? "" : String(value);
  return /[",\n]/.test(serialized) ? `"${serialized.replaceAll('"', '""')}"` : serialized;
}

function redactedAssetUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (/token|key|secret/i.test(key)) url.searchParams.set(key, "[redacted]");
    }
    return url.href;
  } catch {
    return "";
  }
}

function renderCsv(rows: LabelImageAuditRow[]): string {
  const headers = ["id", "name", "hasImage", "isSquare", "httpStatus", "contentType", "bytes", "width", "height", "issue", "url"];
  const values = rows.map((row) => [
    row.id, row.name, row.hasImage, row.isSquare, row.status || "", row.contentType, row.bytes,
    row.width, row.height, row.issue, redactedAssetUrl(row.url),
  ]);
  return `${[headers, ...values].map((line) => line.map(csvValue).join(",")).join("\n")}\n`;
}

function markdownRow(row: LabelImageAuditRow): string {
  const dimensions = row.width && row.height ? `${row.width} × ${row.height}` : "—";
  return `| ${row.name.replaceAll("|", "\\|")} | \`${row.id}\` | ${dimensions} | ${row.issue || "OK"} |`;
}

function renderMarkdown(
  rows: LabelImageAuditRow[],
  auditedAt: string,
  returnedCount: number,
  duplicateLabels: string[],
): string {
  const available = rows.filter((row) => row.hasImage);
  const missing = rows.filter((row) => !row.hasImage);
  const square = available.filter((row) => row.isSquare);
  const nonSquare = available.filter((row) => !row.isSquare);
  return `# Audit des images de labels Harvest

Audit live effectué le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(auditedAt))} sur ${rows.length} labels uniques (${returnedCount} lignes renvoyées par \`getlibraries\`).

## Résumé

- **${available.length} labels ont une image exploitable** (HTTP 2xx, type MIME image et fichier décodable).
- **${missing.length} labels n’ont pas d’image exploitable**.
- **${square.length} images sont carrées** à 1 % près.
- **${nonSquare.length} images sont exploitables mais non carrées**.
- Harvest peut renseigner \`LibraryLogoUrl\` même lorsque l’asset répond en erreur : l’URL seule n’est pas une preuve de présence.
${duplicateLabels.length ? `- **${duplicateLabels.length} doublon de données Harvest** : ${duplicateLabels.join(", ")}. Il n’est compté qu’une fois dans les listes ci-dessous.` : ""}

L’application conserve uniquement les ressources validées ci-dessous et utilise un monogramme local pour les autres. Pour rafraîchir cet inventaire après une livraison du back-office :

\`\`\`bash
pnpm audit:harvest:label-images
\`\`\`

Le détail complet, y compris les URLs d’assets expurgées de leurs jetons et les statuts HTTP, est disponible dans \`docs/harvest/label-logo-audit.csv\`.

## Labels avec une image (${available.length})

| Label | ID Harvest | Dimensions | État |
|---|---|---:|---|
${available.map(markdownRow).join("\n") || "| — | — | — | Aucun |"}

## Labels sans image exploitable (${missing.length})

| Label | ID Harvest | Dimensions | État |
|---|---|---:|---|
${missing.map(markdownRow).join("\n") || "| — | — | — | Aucun |"}
`;
}

function renderHealthModule(rows: LabelImageAuditRow[], auditedAt: string): string {
  const ids = rows.filter((row) => row.hasImage).map((row) => row.id).sort();
  return `/**
 * Generated by \`pnpm audit:harvest:label-images\` from the live provider audit
 * performed at ${auditedAt}. Harvest returns LibraryLogoUrl values for missing
 * assets too, so only decoded image responses are allowed through.
 */
const VERIFIED_LABEL_LOGO_IDS = new Set([\n${ids.map((id) => `  "${id}",`).join("\n")}\n]);

export function verifiedLabelLogo(id: string, url: string): string | null {
  return id && url && VERIFIED_LABEL_LOGO_IDS.has(id) ? url : null;
}
`;
}

async function main() {
  const libraries = await getLibraries();
  const uniqueLibraries = new Map<string, JsonRecord>();
  const duplicateLabels: string[] = [];
  for (const library of libraries) {
    const id = findString(library, ["ID"]);
    if (uniqueLibraries.has(id)) {
      duplicateLabels.push(`${findString(library, ["Name"])} (\`${id}\`)`);
      continue;
    }
    uniqueLibraries.set(id, library);
  }
  const rows = (await mapWithConcurrency([...uniqueLibraries.values()], 8, inspectLabelImage))
    .sort((left, right) => left.name.localeCompare(right.name, "fr", { sensitivity: "base" }));
  const auditedAt = new Date().toISOString();

  await Promise.all([
    writeFile(markdownPath, renderMarkdown(rows, auditedAt, libraries.length, duplicateLabels)),
    writeFile(csvPath, renderCsv(rows)),
    writeFile(healthPath, renderHealthModule(rows, auditedAt)),
  ]);

  const available = rows.filter((row) => row.hasImage);
  const square = available.filter((row) => row.isSquare);
  process.stdout.write(`${JSON.stringify({
    auditedAt,
    returnedRows: libraries.length,
    uniqueLabels: rows.length,
    duplicateRows: duplicateLabels.length,
    withImage: available.length,
    withoutImage: rows.length - available.length,
    square: square.length,
    nonSquare: available.length - square.length,
    markdownPath,
    csvPath,
    healthPath,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
