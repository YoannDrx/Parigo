"use client";

import { useEffect } from "react";

const MAX_REPORTS_PER_PAGE = 5;
const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 6_000;

function redact(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/\b(?:bearer\s+)?[A-Za-z0-9_-]{24,}\b/gi, "[secret]")
    .replace(/([?&](?:token|code|email|password|share)=[^&#\s]*)/gi, "")
    .replace(/https?:\/\/[^\s)]+/gi, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return "[url]";
      }
    });
}

function normalizePath(pathname: string): string {
  return pathname
    .replace(/\/engage-playlist\/[^/]+/i, "/engage-playlist/[token]")
    .replace(/\/verify-member\/[^/]+/i, "/verify-member/[token]")
    .replace(/\/reset-password\/[^/]+/i, "/reset-password/[token]")
    .slice(0, 500);
}

function errorPayload(value: unknown) {
  const error = value instanceof Error ? value : new Error(typeof value === "string" ? value : "Unknown browser error");
  return {
    name: redact(error.name || "Error").slice(0, 120),
    message: redact(error.message || "Unknown browser error").slice(0, MAX_MESSAGE_LENGTH),
    stack: redact(error.stack || "").slice(0, MAX_STACK_LENGTH),
    path: normalizePath(window.location.pathname),
  };
}

/**
 * Lightweight browser error relay. Client-side Sentry is deliberately not
 * bundled: reports travel same-origin and are captured by the server SDK.
 */
export function ClientErrorMonitor() {
  useEffect(() => {
    let reports = 0;

    const report = (value: unknown) => {
      if (reports >= MAX_REPORTS_PER_PAGE) return;
      reports += 1;
      void fetch("/api/client-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(errorPayload(value)),
        keepalive: true,
      }).catch(() => undefined);
    };
    const onError = (event: ErrorEvent) => report(event.error || event.message);
    const onRejection = (event: PromiseRejectionEvent) => report(event.reason);

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
