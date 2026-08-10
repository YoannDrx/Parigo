const SENSITIVE_KEY = /email|password|token|cookie|authorization|code|share|message|body/i;

function scrubString(value: string): string {
  return value
    .replace(/\/(engage-playlist|shared-playlistcategory|verify-member|change-password|reset-password)\/[^/?#\s]+/gi, "/$1/[token]")
    .replace(/([?&](?:token|code|email|password|share)=)[^&#\s]*/gi, "$1[Filtered]")
    .replace(/\b(?:bearer\s+)?[A-Za-z0-9_-]{32,}\b/gi, "[Filtered]");
}

export function scrubSensitive(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((item) => scrubSensitive(item, depth + 1));
  if (typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[Filtered]" : scrubSensitive(entry, depth + 1),
    ]),
  );
}
