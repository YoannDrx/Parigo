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
}

export function logEvent(event: LogEvent): void {
  const payload = {
    ...event,
    code: event.code?.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 64),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  };
  const output = JSON.stringify(payload);
  if (event.level === "error") console.error(output);
  else if (event.level === "warn") console.warn(output);
  else console.info(output);
}
