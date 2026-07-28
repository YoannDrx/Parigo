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

const PARIGO_TIME_ZONE = "Europe/Paris";
const NAIVE_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

function timeZoneOffsetMilliseconds(timestamp: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);
  const representedAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return representedAsUtc - timestamp;
}

function naiveDateTimeToUtc(match: RegExpMatchArray, utcOffsetHours?: number): Date {
  const [, year, month, day, hour, minute, second = "0", milliseconds = "0"] = match;
  const wallClockAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const millisecondValue = Number(milliseconds.padEnd(3, "0"));
  if (utcOffsetHours !== undefined && Number.isFinite(utcOffsetHours)) {
    return new Date(wallClockAsUtc - utcOffsetHours * 60 * 60_000 + millisecondValue);
  }

  let offset = timeZoneOffsetMilliseconds(wallClockAsUtc, PARIGO_TIME_ZONE);
  const firstPass = wallClockAsUtc - offset;
  const correctedOffset = timeZoneOffsetMilliseconds(firstPass, PARIGO_TIME_ZONE);
  if (correctedOffset !== offset) offset = correctedOffset;
  return new Date(wallClockAsUtc - offset + millisecondValue);
}

/**
 * Harvest returns several timestamps without an offset. When an endpoint provides
 * UTCOffset, pass it explicitly. Otherwise Parigo treats the value as a
 * Europe/Paris wall-clock time so normalization never depends on the Node runtime.
 */
export function asIsoDate(value: unknown, utcOffsetHours?: number): string | undefined {
  const source = asString(value);
  if (!source) return undefined;
  const naiveMatch = source.match(NAIVE_DATE_TIME);
  const date = naiveMatch
    ? naiveDateTimeToUtc(naiveMatch, utcOffsetHours)
    : new Date(source);
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
