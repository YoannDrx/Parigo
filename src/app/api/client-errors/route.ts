import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin } from "@/lib/harvest/session";
import { logEvent } from "@/lib/logger";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1_024;
const reportSchema = z.object({
  name: z.string().min(1).max(120),
  message: z.string().min(1).max(500),
  stack: z.string().max(6_000),
  path: z.string().startsWith("/").max(500).refine((value) => !value.includes("?"), "Query strings are forbidden"),
}).strict();

function response(status: number) {
  return new NextResponse(null, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    assertSameOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return response(413);

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return response(413);

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return response(400);
    }
    const parsed = reportSchema.safeParse(json);
    if (!parsed.success) return response(400);

    Sentry.captureMessage(`Browser error: ${parsed.data.name}`, {
      level: "error",
      tags: {
        source: "browser-relay",
        route: parsed.data.path,
      },
      extra: {
        clientMessage: parsed.data.message,
        clientStack: parsed.data.stack,
        requestId,
      },
    });
    logEvent({
      level: "error",
      message: "browser_error_captured",
      route: parsed.data.path,
      requestId,
      status: 202,
      code: parsed.data.name,
    });
    return response(202);
  } catch (error) {
    const status = error instanceof Error && "status" in error
      ? Number((error as Error & { status: number }).status)
      : 500;
    return response(status === 403 ? 403 : 500);
  }
}
