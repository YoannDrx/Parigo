import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getTrack } from "@/lib/harvest/catalog";
import { assertSameOrigin } from "@/lib/harvest/session";
import { logEvent } from "@/lib/logger";
import {
  CONTACT_MAX_BODY_BYTES,
  contactInputSchema,
  sanitizeContactAttachmentName,
  validateContactAttachmentBytes,
  validateContactAttachmentMetadata,
} from "@/lib/contact-input";
import {
  renderContactAcknowledgementEmail,
  renderContactNotificationEmail,
} from "@/lib/contact-email";
import { getEmailSiteUrl } from "@/emails/_components/ParigoEmailShell";

export const runtime = "nodejs";

const CONTACT_EMAIL = "info@parigomusic.com";
const CONTACT_REPLY_EMAIL = "info@parigomusic.com";
const DEFAULT_FROM_EMAIL = "Parigo Music <parigo@yodev.fr>";
const EMAIL_LOGO_CONTENT_ID = "parigo-logo";

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
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return responseError(400, "VALIDATION_FAILED", "Formulaire multipart invalide.", requestId);
    }
    const parsed = contactInputSchema.safeParse({
      name: String(formData.get("name") || ""),
      company: String(formData.get("company") || ""),
      email: String(formData.get("email") || ""),
      message: String(formData.get("message") || ""),
      trackId: String(formData.get("trackId") || "") || undefined,
      locale: String(formData.get("locale") || ""),
      consent: String(formData.get("consent") || "") === "true",
      website: String(formData.get("website") || ""),
      startedAt: Number(formData.get("startedAt")),
    });
    if (!parsed.success) {
      return responseError(400, "VALIDATION_FAILED", parsed.error.issues[0]?.message || "Données invalides.", requestId);
    }
    const input = parsed.data;
    const attachmentEntry = formData.get("attachment");
    let attachment: { filename: string; contentType: string; content: Buffer; size: number } | null = null;
    if (attachmentEntry && typeof attachmentEntry !== "string" && attachmentEntry.size > 0) {
      const metadata = validateContactAttachmentMetadata(attachmentEntry);
      if (!metadata.valid) {
        const status = metadata.code === "FILE_TOO_LARGE" ? 413 : 400;
        return responseError(status, metadata.code, status === 413 ? "La pièce jointe dépasse 3 Mo." : "La pièce jointe n’est pas acceptée.", requestId);
      }
      const bytes = new Uint8Array(await attachmentEntry.arrayBuffer());
      if (!validateContactAttachmentBytes(metadata.extension, bytes)) {
        return responseError(400, "FILE_SIGNATURE_MISMATCH", "Le contenu du fichier ne correspond pas à son format.", requestId);
      }
      attachment = {
        filename: sanitizeContactAttachmentName(attachmentEntry.name),
        contentType: metadata.contentType,
        content: Buffer.from(bytes),
        size: bytes.byteLength,
      };
    }
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
    const replyEmail = process.env.CONTACT_REPLY_EMAIL?.trim() || CONTACT_REPLY_EMAIL;
    const logoAttachment = {
      filename: "parigo-logo.png",
      path: `${getEmailSiteUrl()}/images/parigo-logo-email.png`,
      contentType: "image/png",
      contentId: EMAIL_LOGO_CONTENT_ID,
    };
    const normalized = [input.name.toLowerCase(), input.company.toLowerCase(), input.email.toLowerCase(), input.message.replace(/\s+/g, " ").trim(), input.trackId || "", input.locale].join("\n");
    const digestHash = createHash("sha256").update(normalized);
    if (attachment) digestHash.update(attachment.content).update(String(attachment.size));
    const digest = digestHash.digest("hex");
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
      attachment: attachment ? { name: attachment.filename, size: attachment.size } : null,
      logoSrc: `cid:${EMAIL_LOGO_CONTENT_ID}`,
    });
    const attachmentForEmail = attachment
      ? { filename: attachment.filename, contentType: attachment.contentType, content: attachment.content }
      : null;
    const internal = await resend.emails.send(
      { from, to, replyTo: input.email, subject, attachments: [logoAttachment, ...(attachmentForEmail ? [attachmentForEmail] : [])], ...internalEmail },
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
        attachmentName: attachment?.filename,
        logoSrc: `cid:${EMAIL_LOGO_CONTENT_ID}`,
      }),
    };
    const acknowledgementResult = await resend.emails.send(
      { from, to: input.email, replyTo: replyEmail, attachments: [logoAttachment], ...acknowledgement },
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
