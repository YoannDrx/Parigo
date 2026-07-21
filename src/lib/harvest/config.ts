import "server-only";

export interface HarvestApiConfig {
  authUrl: string;
  serviceUrl: string;
  accessKey: string;
  clientId: string;
  clientSecret: string;
  grantType: string;
  defaultRegionId?: string;
}

export interface ParigoSessionConfig {
  sessionSecret: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  throw new Error(`Missing required server environment variable: ${name}`);
}

let cachedApiConfig: HarvestApiConfig | undefined;
let cachedSessionConfig: ParigoSessionConfig | undefined;

export function getHarvestApiConfig(): HarvestApiConfig {
  if (cachedApiConfig) return cachedApiConfig;

  const clientSecret = required("HARVEST_CLIENT_SECRET");
  cachedApiConfig = {
    authUrl: process.env.HARVEST_AUTH_URL?.trim() || "https://auth.harvestmedia.net/oauth2/token",
    serviceUrl:
      process.env.HARVEST_SERVICE_URL?.trim() || "https://service.harvestmedia.net/HMP-WS.svc",
    accessKey: required("HARVEST_ACCESS_KEY"),
    clientId: required("HARVEST_CLIENT_ID"),
    clientSecret,
    grantType:
      process.env.HARVEST_AUTH_GRANT_TYPE?.trim() || "client_credentials",
    defaultRegionId:
      process.env.HARVEST_DEFAULT_REGION_ID?.trim() || process.env.HARVEST_REGION_ID?.trim() || undefined,
  };

  return cachedApiConfig;
}

export function getParigoSessionConfig(): ParigoSessionConfig {
  if (cachedSessionConfig) return cachedSessionConfig;
  cachedSessionConfig = { sessionSecret: required("HARVEST_SESSION_SECRET") };
  return cachedSessionConfig;
}

export function isParigoSessionConfigured(): boolean {
  return Boolean(process.env.HARVEST_SESSION_SECRET?.trim());
}
