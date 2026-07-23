import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getTrack } from "@/lib/harvest/catalog";
import { assertSameOrigin } from "@/lib/harvest/session";
import { logEvent } from "@/lib/logger";
import { CONTACT_MAX_BODY_BYTES, contactInputSchema } from "@/lib/contact-input";
import {
  renderContactAcknowledgementEmail,
  renderContactNotificationEmail,
} from "@/lib/contact-email";

export const runtime = "nodejs";

const CONTACT_EMAIL = "info@parigomusic.com";
const DEFAULT_FROM_EMAIL = "Parigo Music <contact@do-not-reply.app>";

function responseError(status: number, code: string, message: string, requestId: string) {
  return NextResponse.json(
    { error: { code, message, retryable: status >= 500, requestId } },
    { status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } },
  );
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const started = performance.now();

  try {
    assertSameOrigin(request);
    if (Number(request.headers.get("content-length") || 0) > CONTACT_MAX_BODY_BYTES) {
      return responseError(413, "PAYLOAD_TOO_LARGE", "Le message dépasse 16 Kio.", requestId);
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > CONTACT_MAX_BODY_BYTES) {
      return responseError(413, "PAYLOAD_TOO_LARGE", "Le message dépasse 16 Kio.", requestId);
    }
    let json: unknown;
    try { json = JSON.parse(rawBody); } catch {
      return responseError(400, "VALIDATION_FAILED", "Corps JSON invalide.", requestId);
    }
    const parsed = contactInputSchema.safeParse(json);
    if (!parsed.success) {
      return responseError(400, "VALIDATION_FAILED", parsed.error.issues[0]?.message || "Données invalides.", requestId);
    }
    const input = parsed.data;
    if (input.website) {
      return NextResponse.json({ data: { requestId, status: "sent" } }, { status: 201, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
    }
    if (Date.now() - input.startedAt < 2_000) {
      return responseError(400, "SUBMISSION_TOO_FAST", "Veuillez patienter avant l’envoi.", requestId);
    }
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return responseError(503, "CONTACT_PROVIDER_UNAVAILABLE", "Le service de contact est momentanément indisponible.", requestId);
    }

    const track = input.trackId ? await getTrack(input.trackId).catch(() => null) : null;
    const from = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM_EMAIL;
    const to = process.env.CONTACT_TO_EMAIL || CONTACT_EMAIL;
    const normalized = [input.name.toLowerCase(), input.company.toLowerCase(), input.email.toLowerCase(), input.message.replace(/\s+/g, " ").trim(), input.trackId || "", input.locale].join("\n");
    const digest = createHash("sha256").update(normalized).digest("hex");
    const resend = new Resend(apiKey);
    const subject = track ? `Demande de licence — ${track.title}` : `Demande Parigo Music — ${input.name}`;
    const receivedAt = new Intl.DateTimeFormat(input.locale === "fr" ? "fr-FR" : "en-GB", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Paris",
    }).format(new Date());
    const trackSummary = track
      ? {
          title: track.title,
          albumTitle: track.albumTitle || null,
          reference: track.cdCode || track.id,
          verified: true,
        }
      : input.trackId
        ? {
            title: input.locale === "fr" ? "Piste demandée" : "Requested track",
            albumTitle: null,
            reference: input.trackId,
            verified: false,
          }
        : null;
    const internalEmail = await renderContactNotificationEmail({
      requestId,
      receivedAt,
      name: input.name,
      company: input.company,
      email: input.email,
      message: input.message,
      locale: input.locale,
      track: trackSummary,
    });
    const internal = await resend.emails.send(
      { from, to, replyTo: input.email, subject, ...internalEmail },
      { idempotencyKey: `contact-internal-${digest}` },
    );
    if (internal.error) {
      logEvent({ level: "error", message: "contact_internal_send_failed", route: "/api/contact", requestId, status: 503, durationMs: Math.round(performance.now() - started), code: internal.error.name });
      return responseError(503, "CONTACT_PROVIDER_UNAVAILABLE", "Le service de contact est momentanément indisponible.", requestId);
    }

    const acknowledgement = {
      subject: input.locale === "fr"
        ? "Nous avons bien reçu votre message — Parigo Music"
        : "We received your message — Parigo Music",
      ...await renderContactAcknowledgementEmail({
        locale: input.locale,
        name: input.name,
        receivedAt,
        requestId,
      }),
    };
    const acknowledgementResult = await resend.emails.send(
      { from, to: input.email, ...acknowledgement },
      { idempotencyKey: `contact-ack-${digest}` },
    );
    if (acknowledgementResult.error) {
      logEvent({ level: "warn", message: "contact_acknowledgement_failed", route: "/api/contact", requestId, status: 201, durationMs: Math.round(performance.now() - started), code: acknowledgementResult.error.name });
    }
    logEvent({ level: "info", message: "contact_sent", route: "/api/contact", requestId, status: 201, durationMs: Math.round(performance.now() - started) });
    return NextResponse.json({ data: { requestId, status: "sent" } }, { status: 201, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number((error as Error & { status: number }).status) : 500;
    const safeStatus = status === 403 ? 403 : 502;
    logEvent({ level: "error", message: "contact_request_failed", route: "/api/contact", requestId, status: safeStatus, durationMs: Math.round(performance.now() - started), code: error instanceof Error ? error.name : "UNKNOWN" });
    return responseError(safeStatus, safeStatus === 403 ? "FORBIDDEN" : "CONTACT_PROVIDER_ERROR", safeStatus === 403 ? "Origine de requête refusée." : "Le message n’a pas pu être envoyé.", requestId);
  }
}
