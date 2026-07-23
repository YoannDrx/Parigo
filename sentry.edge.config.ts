import * as Sentry from "@sentry/nextjs";
import { scrubSensitive } from "@/lib/sentry-privacy";

const environment = process.env.VERCEL_ENV || process.env.NODE_ENV;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  sendDefaultPii: false,
  enableLogs: true,
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
  tracesSampleRate: environment === "preview" ? 1 : environment === "production" ? 0.1 : 0,
  beforeSend(event) {
    return scrubSensitive(event) as typeof event;
  },
  beforeSendLog(log) {
    return {
      ...log,
      attributes: scrubSensitive(log.attributes) as Record<string, unknown> | undefined,
    };
  },
});
