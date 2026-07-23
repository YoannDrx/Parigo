const SENSITIVE_KEY = /email|password|token|cookie|authorization|code|share|message|body/i;

export function scrubSensitive(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((item) => scrubSensitive(item, depth + 1));
  if (typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[Filtered]" : scrubSensitive(entry, depth + 1),
    ]),
  );
}
