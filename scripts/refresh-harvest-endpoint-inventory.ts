import { writeFile } from "node:fs/promises";
import path from "node:path";

const DOCUMENTATION_URL =
  "https://developer.harvestmedia.net/api/collections/8325040/SVYouLCf?segregateAuth=true&versionTag=latest";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : undefined;
}

function fieldPaths(value: unknown, prefix = ""): string[] {
  const source = record(value);
  if (!source) return [];
  return Object.entries(source).flatMap(([key, nested]) => {
    const pathName = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(nested)) {
      const first = nested.find((item) => record(item));
      return [pathName, ...(first ? fieldPaths(first, `${pathName}[]`) : [])];
    }
    return [pathName, ...fieldPaths(nested, pathName)];
  });
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function requestBodyFields(request: JsonRecord | undefined, source = "request"): {
  mode: string;
  fields: string[];
  source: string;
  jsonStatus: string;
} {
  const body = record(request?.body);
  const mode = String(body?.mode || "");
  if (!mode) return { mode: "", fields: [], source: "", jsonStatus: "not-applicable" };
  if (mode !== "raw") {
    const entries = body?.[mode];
    return {
      mode,
      fields: Array.isArray(entries)
        ? entries.map((entry) => String(record(entry)?.key || "")).filter(Boolean)
        : [],
      source,
      jsonStatus: "not-applicable",
    };
  }
  const raw = typeof body?.raw === "string" ? body.raw : "";
  if (!raw.trim()) return { mode, fields: [], source: "", jsonStatus: "empty" };
  const rawLanguage = String(record(record(body?.options)?.raw)?.language || "").toLowerCase();
  if (rawLanguage && rawLanguage !== "json") {
    return { mode, fields: [], source, jsonStatus: `non-json:${rawLanguage}` };
  }
  const parsed = parseJson(raw);
  return {
    mode,
    fields: fieldPaths(parsed),
    source,
    jsonStatus: parsed === undefined ? "invalid" : "valid",
  };
}

function csvValue(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

async function main() {
  const response = await fetch(DOCUMENTATION_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Harvest documentation returned HTTP ${response.status}`);
  const collection = record(await response.json());
  if (!collection) throw new Error("Harvest documentation did not return a collection");

  const rows: string[][] = [];
  const visit = (items: unknown, parents: string[] = []) => {
    if (!Array.isArray(items)) return;
    for (const candidate of items) {
      const item = record(candidate);
      if (!item) continue;
      const name = String(item.name || "");
      const request = record(item.request);
      if (request) {
        const responses = Array.isArray(item.response) ? item.response : [];
        const primaryBody = requestBodyFields(request);
        const exampleBodies = responses
          .map((entry) => record(record(entry)?.originalRequest))
          .map((example) => requestBodyFields(example, "response.originalRequest"))
          .filter((body) => body.mode && (body.fields.length || body.jsonStatus === "invalid" || body.jsonStatus.startsWith("non-json:")));
        const bodyContract = primaryBody.fields.length || primaryBody.jsonStatus === "invalid"
          ? primaryBody
          : exampleBodies.find((body) => body.jsonStatus === "valid")
            || exampleBodies[0]
            || primaryBody;
        const jsonResponse = responses
          .map((entry) => record(entry))
          .find((entry) =>
            String(entry?._postman_previewlanguage || "").toLowerCase() === "json" ||
            parseJson(entry?.body) !== undefined);
        const responseFields = fieldPaths(parseJson(jsonResponse?.body));
        const rawUrl = typeof request.url === "string"
          ? request.url
          : String(record(request.url)?.raw || "");

        rows.push([
          parents.join(" > "),
          name,
          String(request.method || ""),
          rawUrl.replaceAll("{{", "{").replaceAll("}}", "}"),
          bodyContract.mode,
          bodyContract.fields.join(", "),
          bodyContract.source,
          bodyContract.jsonStatus,
          responseFields.join(", "),
        ]);
      }
      visit(item.item, [...parents, name]);
    }
  };
  visit(collection.item);

  const headers = [
    "section",
    "name",
    "method",
    "url",
    "body_mode",
    "input_fields",
    "request_example_source",
    "request_json_status",
    "response_top_level_fields",
  ];
  const output = [
    headers.join(","),
    ...rows.map((row) => row.map(csvValue).join(",")),
  ].join("\n") + "\n";
  const target = path.join(process.cwd(), "docs/harvest/endpoint-inventory.csv");
  await writeFile(target, output);

  const httpMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
  process.stdout.write(`${JSON.stringify({
    documentationUrl: DOCUMENTATION_URL,
    inventoryRows: rows.length,
    documentedHttpEndpoints: rows.filter((row) => httpMethods.has(row[2])).length,
    output: path.relative(process.cwd(), target),
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
