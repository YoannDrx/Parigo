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
  tracesSampler(context) {
    const name = context.name || "";
    if (/health|robots|sitemap|_next\/image/i.test(name)) return 0;
    if (environment === "preview") return 1;
    if (environment === "production") return 0.1;
    return 0;
  },
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
