import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type CsvRow = Record<string, string>;

function parseCsv(input: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [headers, ...values] = rows;
  return values
    .filter((candidate) => candidate.some(Boolean))
    .map((candidate) => Object.fromEntries(headers.map((header, index) => [header, candidate[index] || ""])));
}

function csv(rows: CsvRow[], headers: string[]): string {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header] || "")).join(",")),
  ].join("\n") + "\n";
}

async function files(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  }))).flat();
}

function endpointName(row: CsvRow): string {
  if (row.name === "Get Authorised") return "oauth2/token";
  const withoutBase = row.url.replace(/^\{[^}]+URL\}/i, "");
  return withoutBase
    .split("/")
    .find((segment) => segment && !segment.startsWith("{"))
    ?.toLowerCase() || row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function routeFromFile(file: string): string {
  return "/" + path.relative("src/app", path.dirname(file))
    .split(path.sep)
    .map((segment) => segment.startsWith("[") ? segment : segment)
    .join("/");
}

function normalizeRoute(value: string): string {
  return value
    .replaceAll("{", "[")
    .replaceAll("}", "]")
    .replace(/\?.*$/, "")
    .trim();
}

async function main() {
  const root = process.cwd();
  const inventoryPath = path.join(root, "docs/harvest/endpoint-inventory.csv");
  const routeMatrixPath = path.join(root, "docs/harvest/runtime-route-matrix.csv");
  const endpointRows = parseCsv(await readFile(inventoryPath, "utf8"))
    .filter((row) => ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(row.method));
  const sourceFiles = (await files(path.join(root, "src")))
    .filter((file) => /\.(?:ts|tsx)$/.test(file));
  const sources = (await Promise.all(sourceFiles.map(async (file) => ({
    file,
    text: (await readFile(file, "utf8")).toLowerCase(),
  }))));
  const combinedSource = sources.map((source) => source.text).join("\n");

  const adjacentLive = new Set([
    "validatepasswordresettoken",
    "validateverifymembertoken",
    "validatememberemail",
    "validateusername",
    "sendpasswordresetemail",
    "sendsharemusiclinkemail",
    "getsharemusicurl",
    "getinvitedmembertoken",
    "validatemusicdownloadrequest",
    "getcuesheet",
    "suggestmemberplaylisttracks",
  ]);
  const endpointClassifications = endpointRows.map((row) => {
    const endpoint = endpointName(row);
    const family = row.section.split(" > ")[0];
    const publicApi = family === "Public API";
    const specializedAdjacent = publicApi && row.section.includes("Search Similar");
    const referencedInCode = endpoint === "oauth2/token"
      ? combinedSource.includes("client_credentials")
      : combinedSource.includes(endpoint);
    const usedInCode = publicApi && !specializedAdjacent && referencedInCode;
    const execution = !publicApi
      ? "Static only — dedicated credentials unavailable"
      : specializedAdjacent
        ? "Static contract + live service capability check"
      : usedInCode
        ? "Live through BFF/direct harness"
        : adjacentLive.has(endpoint)
          ? "Live contract/validation when reversible"
          : "Static only — outside current Parigo product";
    const relevance = !publicApi
      ? "Separate API family"
      : specializedAdjacent || adjacentLive.has(endpoint)
        ? "Adjacent capability"
        : usedInCode
          ? "Implemented"
          : "Not required by current UI";
    return {
      api_family: family,
      section: row.section,
      endpoint_name: row.name,
      method: row.method,
      documented_url: row.url,
      endpoint_key: endpoint,
      parigo_relevance: relevance,
      audit_execution: execution,
      evidence_source: usedInCode
        ? "Code + runtime route matrix"
        : specializedAdjacent
          ? "Harvest documentation + ServiceInfo.SearchSimilarInfo"
          : "Harvest documentation snapshot",
      rationale: !publicApi
        ? "Management/CMS, Import, Export and Agent flows require credentials and product scope distinct from the Public API."
        : specializedAdjacent
          ? "The shared endpoint name exists in Parigo, but this specialised search workflow is not implemented and SearchSimilarInfo is empty on the live service."
        : usedInCode
          ? "Endpoint name is referenced by the Parigo implementation or its audit harnesses."
          : adjacentLive.has(endpoint)
            ? "Needed to diagnose a visible or planned member workflow without inventing a contract."
            : "No current Parigo route or UI dependency found.",
    };
  });

  const runtimeRows = parseCsv(await readFile(routeMatrixPath, "utf8"));
  const routeFiles = sourceFiles.filter((file) => file.endsWith(`${path.sep}route.ts`) && file.includes(`${path.sep}app${path.sep}api${path.sep}`));
  const handlerRows: CsvRow[] = [];
  for (const file of routeFiles.sort()) {
    const source = await readFile(file, "utf8");
    const route = routeFromFile(path.relative(root, file));
    const handlers = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)].map((match) => match[1]);
    const isContact = route === "/api/contact";
    const harvestBacked = /@\/lib\/harvest|harvest/i.test(source);
    for (const method of handlers) {
      const endpointMatches = runtimeRows.filter((row) => {
        const bff = row["Route BFF"] || "";
        const documentedRoute = bff.match(/\/api\/[^\s;,]+/)?.[0] || "";
        return bff.includes(method) &&
          normalizeRoute(documentedRoute) === normalizeRoute(route);
      });
      const mappedEndpoints = [...new Set(endpointMatches.map((row) => row["Endpoint Harvest"]).filter(Boolean))];
      handlerRows.push({
        method,
        route,
        file: path.relative(root, file),
        source_system: isContact
          ? "Resend + Harvest catalogue lookup"
          : harvestBacked
            ? "Harvest Public API / Parigo server session"
            : "Parigo local",
        harvest_mapping: mappedEndpoints.join(" | ") || (harvestBacked ? "Harvest domain service; see runtime route matrix" : "Not applicable"),
        public_contract: "Preserved",
        audit_status: "Mapped statically; live status recorded in runtime-route-matrix.csv",
      });
    }
  }

  await Promise.all([
    writeFile(
      path.join(root, "docs/harvest/endpoint-classification.csv"),
      csv(endpointClassifications, [
        "api_family",
        "section",
        "endpoint_name",
        "method",
        "documented_url",
        "endpoint_key",
        "parigo_relevance",
        "audit_execution",
        "evidence_source",
        "rationale",
      ]),
    ),
    writeFile(
      path.join(root, "docs/harvest/bff-handler-inventory.csv"),
      csv(handlerRows, [
        "method",
        "route",
        "file",
        "source_system",
        "harvest_mapping",
        "public_contract",
        "audit_status",
      ]),
    ),
  ]);

  const counts = {
    documentedHttpEndpoints: endpointClassifications.length,
    byFamily: Object.fromEntries(
      [...new Set(endpointClassifications.map((row) => row.api_family))]
        .map((family) => [family, endpointClassifications.filter((row) => row.api_family === family).length]),
    ),
    routeFiles: routeFiles.length,
    bffHandlers: handlerRows.length,
  };
  process.stdout.write(`${JSON.stringify(counts, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
