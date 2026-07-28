export type HarvestErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "HARVEST_UNAVAILABLE"
  | "HARVEST_INVALID_RESPONSE";

export type PublicApiErrorCode =
  | Exclude<HarvestErrorCode, "HARVEST_UNAVAILABLE" | "HARVEST_INVALID_RESPONSE">
  | "CATALOG_UNAVAILABLE"
  | "ACCOUNT_UNAVAILABLE"
  | "INVALID_UPSTREAM_RESPONSE";

export class HarvestError extends Error {
  constructor(
    message: string,
    public readonly code: HarvestErrorCode = "HARVEST_UNAVAILABLE",
    public readonly status = 502,
    public readonly retryable = false,
    public readonly upstreamCode?: string,
  ) {
    super(message);
    this.name = "HarvestError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function errorEnvelope(payload: unknown): Record<string, unknown> | undefined {
  if (!isRecord(payload)) return undefined;
  for (const [key, value] of Object.entries(payload)) {
    if (key.toLowerCase() === "error" && isRecord(value)) return value;
  }
  return undefined;
}

export function harvestErrorFromPayload(payload: unknown): HarvestError | null {
  const error = errorEnvelope(payload);
  if (!error) return null;
  const rawCode = error.Code ?? error.code;
  const code = rawCode == null ? "" : String(rawCode);
  if (!code || code === "0") return null;

  const description =
    typeof (error.Description ?? error.description ?? error.Message ?? error.message) === "string"
      ? String(error.Description ?? error.description ?? error.Message ?? error.message)
      : "Harvest rejected the request";

  if (["1", "2"].includes(code)) {
    return new HarvestError(description, "VALIDATION_FAILED", 400, false, code);
  }
  if (code === "3") {
    return new HarvestError(description, "FORBIDDEN", 403, false, code);
  }
  if (["5", "6", "21"].includes(code)) {
    return new HarvestError(description, "UNAUTHENTICATED", 401, ["5", "21"].includes(code), code);
  }
  if (["7", "8", "9", "10", "11", "16", "22"].includes(code)) {
    return new HarvestError(description, "NOT_FOUND", 404, false, code);
  }
  if (["12", "13", "14", "18", "19"].includes(code)) {
    return new HarvestError(description, "FORBIDDEN", 403, false, code);
  }
  if (code === "17") {
    return new HarvestError(description, "VALIDATION_FAILED", 409, false, code);
  }
  const transientFailure = code === "4" || /temporar|timeout/i.test(description);
  return new HarvestError(
    description,
    "HARVEST_UNAVAILABLE",
    transientFailure ? 503 : 502,
    transientFailure,
    code,
  );
}

export function assertNoHarvestError(payload: unknown): void {
  const error = harvestErrorFromPayload(payload);
  if (error) throw error;
}
