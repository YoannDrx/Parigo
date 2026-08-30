import { NextResponse } from "next/server";
import { getTrack } from "@/lib/harvest/catalog";
import { assertSameOrigin } from "@/lib/harvest/session";
import { logEvent } from "@/lib/logger";
import { CONTACT_MAX_BODY_BYTES, contactInputSchema } from "@/lib/contact-input";
import { deliverContactMessage } from "@/lib/contact-delivery";

export const runtime = "nodejs";

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
      return responseError(413, "PAYLOAD_TOO_LARGE", "La demande dépasse la taille autorisée.", requestId);
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > CONTACT_MAX_BODY_BYTES) {
      return responseError(413, "PAYLOAD_TOO_LARGE", "La demande dépasse la taille autorisée.", requestId);
    }
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
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

    const track = input.trackId ? await getTrack(input.trackId).catch(() => null) : null;
    const subject = track ? `Demande de licence — ${track.title}` : `Demande Parigo Music — ${input.name}`;
    const context = [
      input.company ? `${input.locale === "fr" ? "Entreprise" : "Company"}: ${input.company}` : "",
      track ? `${input.locale === "fr" ? "Morceau" : "Track"}: ${track.title}` : "",
      track?.albumTitle ? `${input.locale === "fr" ? "Album" : "Album"}: ${track.albumTitle}` : "",
      input.trackId ? `${input.locale === "fr" ? "Référence" : "Reference"}: ${track?.cdCode || input.trackId}` : "",
    ].filter(Boolean);
    const message = context.length ? `${context.join("\n")}\n\n${input.message}` : input.message;
    const delivery = await deliverContactMessage({
      requestId,
      name: input.name,
      company: input.company,
      email: input.email,
      locale: input.locale,
      subject,
      message: input.message,
      harvestMessage: message,
      track: track
        ? { title: track.title, albumTitle: track.albumTitle || null, reference: track.cdCode || track.id, verified: true }
        : input.trackId
          ? { title: input.locale === "fr" ? "Piste demandée" : "Requested track", albumTitle: null, reference: input.trackId, verified: false }
          : null,
    });
    if (delivery.provider === "resend" && !delivery.acknowledgementSent) {
      logEvent({ level: "warn", message: "contact_acknowledgement_failed", route: "/api/contact", requestId, status: 201, durationMs: Math.round(performance.now() - started) });
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
