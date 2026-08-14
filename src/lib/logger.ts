import "server-only";

type LogLevel = "info" | "warn" | "error";

interface LogEvent {
  level: LogLevel;
  message: string;
  route: string;
  requestId: string;
  status?: number;
  durationMs?: number;
  code?: string;
  searchMode?: string;
  provider?: string;
  fieldProfile?: string;
  total?: number;
  titleMatchTotal?: number;
  translationOffered?: boolean;
  translationApplied?: boolean;
  taxonomyGroup?: string;
  canonicalCount?: number;
  localizedCount?: number;
  missingCount?: number;
  emptyCount?: number;
  conflictingCount?: number;
  extraCount?: number;
  hierarchyMismatchCount?: number;
  sampleIds?: string[];
}

export function logEvent(event: LogEvent): void {
  const payload = {
    ...event,
    code: event.code?.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 64),
    sampleIds: event.sampleIds?.slice(0, 10).map((value) => value.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 64)),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  };
  const output = JSON.stringify(payload);
  if (event.level === "error") console.error(output);
  else if (event.level === "warn") console.warn(output);
  else console.info(output);
}
