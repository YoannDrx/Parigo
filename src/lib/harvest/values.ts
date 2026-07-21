import { isRecord } from "./errors";

export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}
export function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(asString(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  const normalized = asString(value).toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return fallback;
}

export function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => asString(item)).filter(Boolean);
  return asString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function asIsoDate(value: unknown): string | undefined {
  const source = asString(value);
  if (!source) return undefined;
  const normalized = source.includes(" ") && /^\d{4}-\d{2}-\d{2}/.test(source)
    ? source.replace(" ", "T") + (source.endsWith("Z") ? "" : "Z")
    : source;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

export function recordArray(payload: unknown, ...keys: string[]): Record<string, unknown>[] {
  if (!isRecord(payload)) return [];
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
  }
  return [];
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
