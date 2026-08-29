import "server-only";

import { createHash } from "node:crypto";
import { Resend } from "resend";
import { renderContactAcknowledgementEmail, renderContactNotificationEmail } from "./contact-email";
import { sendHarvestContactEmail } from "./harvest/contact";

const DEFAULT_FROM_EMAIL = "Parigo Music <parigo@yodev.fr>";
const DEFAULT_TO_EMAIL = "info@parigomusic.com";

export interface ContactDeliveryInput {
  requestId: string;
  name: string;
  company: string;
  email: string;
  locale: "fr" | "en";
  message: string;
  subject: string;
  harvestMessage: string;
  track: { title: string; albumTitle: string | null; reference: string; verified: boolean } | null;
}

export class ContactProviderError extends Error {
  status = 503;

  constructor(message: string) {
    super(message);
    this.name = "ContactProviderError";
  }
}

export function contactDeliveryDigest(input: Pick<ContactDeliveryInput, "name" | "company" | "email" | "locale" | "message" | "track">): string {
  const normalized = [
    input.name.toLocaleLowerCase("en"),
    input.company.toLocaleLowerCase("en"),
    input.email.toLocaleLowerCase("en"),
    input.message.replace(/\s+/g, " ").trim(),
    input.track?.reference ?? "",
    input.locale,
  ].join("\n");
  return createHash("sha256").update(normalized).digest("hex");
}

export async function deliverContactMessage(input: ContactDeliveryInput): Promise<{ provider: "resend" | "harvest"; acknowledgementSent: boolean }> {
  const provider = process.env.CONTACT_EMAIL_PROVIDER?.trim().toLocaleLowerCase("en") || "resend";
  if (provider === "harvest") {
    await sendHarvestContactEmail({ name: input.name, email: input.email, subject: input.subject, message: input.harvestMessage });
    return { provider: "harvest", acknowledgementSent: false };
  }
  if (provider !== "resend") throw new ContactProviderError("Unsupported contact email provider");

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new ContactProviderError("Resend is not configured");

  const from = process.env.CONTACT_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL?.trim() || DEFAULT_TO_EMAIL;
  const replyEmail = process.env.CONTACT_REPLY_EMAIL?.trim() || DEFAULT_TO_EMAIL;
  const receivedAt = new Intl.DateTimeFormat(input.locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date());
  const digest = contactDeliveryDigest(input);
  const resend = new Resend(apiKey);
  const internalEmail = await renderContactNotificationEmail({
    requestId: input.requestId,
    receivedAt,
    name: input.name,
    company: input.company,
    email: input.email,
    message: input.message,
    locale: input.locale,
    track: input.track,
  });
  const internal = await resend.emails.send({
    from,
    to,
    replyTo: input.email,
    subject: input.subject,
    ...internalEmail,
  }, { idempotencyKey: `contact-internal-${digest}` });
  if (internal.error) throw new ContactProviderError(internal.error.name || "Resend notification failed");

  const acknowledgementEmail = await renderContactAcknowledgementEmail({
    locale: input.locale,
    name: input.name,
    receivedAt,
    requestId: input.requestId,
  });
  const acknowledgement = await resend.emails.send({
    from,
    to: input.email,
    replyTo: replyEmail,
    subject: input.locale === "fr"
      ? "Nous avons bien reçu votre message — Parigo Music"
      : "We received your message — Parigo Music",
    ...acknowledgementEmail,
  }, { idempotencyKey: `contact-ack-${digest}` });

  return { provider: "resend", acknowledgementSent: !acknowledgement.error };
}
