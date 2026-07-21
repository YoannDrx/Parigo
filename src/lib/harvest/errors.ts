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

export function assertNoHarvestError(payload: unknown): void {
  if (!isRecord(payload) || !isRecord(payload.Error)) return;
  const rawCode = payload.Error.Code;
  const code = rawCode == null ? "" : String(rawCode);
  if (!code || code === "0") return;

  const description =
    typeof payload.Error.Description === "string"
      ? payload.Error.Description
      : "Harvest rejected the request";
  const authFailure = ["3", "5", "21"].includes(code);
  const transientFailure = /internal|operation|timeout|temporar/i.test(code) || /temporar|timeout/i.test(description);
  throw new HarvestError(
    description,
    authFailure ? "UNAUTHENTICATED" : "HARVEST_UNAVAILABLE",
    authFailure ? 401 : transientFailure ? 503 : 502,
    authFailure || transientFailure,
    code,
  );
}
