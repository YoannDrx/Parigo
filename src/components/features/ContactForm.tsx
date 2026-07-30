"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { AlertCircle, Check, FileText, Paperclip, Send, X } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Track } from "@/types";
import { CONTACT_ACCEPT, CONTACT_MAX_FILE_BYTES, validateContactAttachmentMetadata } from "@/lib/contact-attachment";

export function ContactForm({ track, requestedTrackId }: { track?: Track | null; requestedTrackId?: string }) {
  const { locale, t } = useI18n();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [consentError, setConsentError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consentInputRef = useRef<HTMLInputElement>(null);
  const [startedAt] = useState(() => Date.now());
  const reference = track?.cdCode || requestedTrackId || track?.id;
  const defaultMessage = requestedTrackId
    ? locale === "fr"
      ? `Bonjour,\n\nJe souhaite obtenir des informations de licence pour ce morceau :\n— Titre : ${track?.title || "À confirmer"}\n— Album : ${track?.albumTitle || "À confirmer"}\n— Référence : ${reference}\n\nProjet / format :\nUsage envisagé :\nMédias et territoires :\nDurée d’utilisation :\nCalendrier :\n\nMerci.`
      : `Hello,\n\nI would like licensing information for this track:\n— Title: ${track?.title || "To be confirmed"}\n— Album: ${track?.albumTitle || "To be confirmed"}\n— Reference: ${reference}\n\nProject / format:\nIntended use:\nMedia and territories:\nTerm:\nSchedule:\n\nThank you.`
    : "";
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");
    const data = new FormData(event.currentTarget);
    data.set("trackId", requestedTrackId || "");
    data.set("locale", locale);
    data.set("consent", data.get("consent") === "on" ? "true" : "false");
    data.set("startedAt", String(startedAt));
    if (attachment) data.set("attachment", attachment, attachment.name);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: data,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || (locale === "fr" ? "L’envoi a échoué." : "Sending failed."));
      setStatus("sent");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : (locale === "fr" ? "L’envoi a échoué." : "Sending failed."));
      setStatus("error");
    }
  };

  const chooseAttachment = (file: File | null) => {
    if (!file) {
      setAttachment(null);
      setAttachmentError("");
      return;
    }
    const result = validateContactAttachmentMetadata(file);
    if (!result.valid) {
      setAttachment(null);
      setAttachmentError(result.code === "FILE_TOO_LARGE"
        ? (locale === "fr" ? "Le document doit peser 3 Mo maximum." : "The document must be 3 MB or smaller.")
        : (locale === "fr" ? "Ce format de document n’est pas accepté." : "This document format is not accepted."));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setAttachment(file);
    setAttachmentError("");
  };

  const dropAttachment = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    chooseAttachment(event.dataTransfer.files[0] ?? null);
  };

  if (status === "sent") return <div role="status" className="parigo-frame border border-[var(--line)] bg-[var(--signal-soft)] p-8 text-[var(--foreground)]"><Check className="mb-4" /><h2 className="font-[var(--font-editorial)] text-4xl font-normal">{locale === "fr" ? "Message envoyé" : "Message sent"}</h2><p className="mt-3 text-[var(--text-muted)]">{locale === "fr" ? "Merci. L’équipe Parigo Music vous répondra dès que possible." : "Thank you. The Parigo Music team will reply as soon as possible."}</p></div>;

  return (
    <form onSubmit={submit} className="contact-form min-w-0" aria-label={t("institutional.contactForm")}>
      <div className="grid sm:grid-cols-2">
        <label className="contact-field sm:border-r"><span><b>01</b>{t("institutional.name")}</span><input required name="name" autoComplete="name" /></label>
        <label className="contact-field sm:!pl-5 sm:focus-within:!pl-5"><span><b>02</b>{t("institutional.company")}</span><input name="company" autoComplete="organization" /></label>
      </div>
      <label className="contact-field"><span><b>03</b>{t("auth.email")}</span><input required type="email" name="email" autoComplete="email" /></label>
      <label className="contact-field"><span><b>04</b>{requestedTrackId ? (locale === "fr" ? "Projet & licence" : "Project & licence") : t("institutional.project")}</span><textarea required name="message" rows={requestedTrackId ? 13 : 6} defaultValue={defaultMessage} placeholder={t("institutional.projectPlaceholder")} /></label>
      <div className="contact-field">
        <span><b>05</b>{locale === "fr" ? "Pièce jointe" : "Attachment"} <em className="ml-2 font-normal normal-case tracking-normal text-[var(--text-muted)]">({locale === "fr" ? "facultatif" : "optional"})</em></span>
        <input
          ref={fileInputRef}
          id="contact-attachment"
          type="file"
          name="attachment"
          accept={CONTACT_ACCEPT}
          className="sr-only"
          onChange={(event) => chooseAttachment(event.target.files?.[0] ?? null)}
        />
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={dropAttachment}
          className="mt-4 flex min-h-24 cursor-pointer items-center gap-4 border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] px-4 py-4 transition hover:border-[var(--signal-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/35"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-16 min-w-0 flex-1 items-center gap-4 text-left focus-visible:outline-none"
            aria-label={locale === "fr" ? "Choisir ou déposer une pièce jointe" : "Choose or drop an attachment"}
          >
            {attachment ? <FileText size={24} className="shrink-0 text-[var(--signal-strong)]" /> : <Paperclip size={24} className="shrink-0 text-[var(--signal-strong)]" />}
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm">{attachment?.name || (locale === "fr" ? "Déposez un document ou cliquez pour parcourir" : "Drop a document or click to browse")}</strong>
              <small className="mt-1 block text-[.7rem] leading-5 text-[var(--text-muted)]">
                {attachment
                  ? `${(attachment.size / 1024 / 1024).toFixed(2)} Mo`
                  : `PDF, JPG, PNG, WebP, Word, Excel, PowerPoint, TXT, RTF · ${CONTACT_MAX_FILE_BYTES / 1024 / 1024} Mo max.`}
              </small>
            </span>
          </button>
          {attachment && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                chooseAttachment(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="grid h-11 w-11 shrink-0 place-items-center text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              aria-label={locale === "fr" ? "Retirer la pièce jointe" : "Remove attachment"}
            >
              <X size={17} />
            </button>
          )}
        </div>
        {attachmentError && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{attachmentError}</p>}
      </div>
      <label className="sr-only" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <div className="grid gap-7 border-b border-[var(--line-strong)] py-7 sm:grid-cols-[1fr_auto] sm:items-center">
        <label data-invalid={consentError ? "true" : "false"} className="contact-consent-label group flex cursor-pointer items-start gap-3 text-sm text-[var(--text-muted)]">
          <input
            ref={consentInputRef}
            required
            type="checkbox"
            name="consent"
            className="peer sr-only"
            aria-invalid={consentError ? "true" : undefined}
            aria-describedby={consentError ? "contact-consent-error" : undefined}
            onInvalid={(event) => {
              event.preventDefault();
              setConsentError(locale === "fr"
                ? "Veuillez accepter l’utilisation de vos informations pour envoyer votre demande."
                : "Please agree to the use of your information before sending your request.");
              window.requestAnimationFrame(() => consentInputRef.current?.focus());
            }}
            onChange={(event) => {
              if (event.target.checked) setConsentError("");
            }}
          />
          <span className="contact-consent-box mt-0.5 grid h-7 w-7 shrink-0 place-items-center border border-[var(--line-strong)] bg-transparent text-transparent transition group-hover:border-[var(--color-primary-dark)] peer-checked:rotate-[-4deg] peer-checked:border-[var(--color-primary-dark)] peer-checked:bg-[var(--signal)] peer-checked:text-[#10110e] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-[var(--color-primary-dark)]"><Check size={15} strokeWidth={3} /></span>
          <span>{t("institutional.consent")}</span>
        </label>
        <button type="submit" disabled={status === "sending"} className="contact-submit disabled:cursor-wait disabled:opacity-60">{status === "sending" ? <ParigoLoader size="icon" label={locale === "fr" ? "Envoi en cours" : "Sending"} /> : <Send size={17} />} {status === "sending" ? (locale === "fr" ? "Envoi…" : "Sending…") : t("institutional.send")}</button>
        {consentError && (
          <div id="contact-consent-error" role="alert" className="contact-consent-error sm:col-span-2">
            <AlertCircle size={18} className="shrink-0 text-[var(--danger)]" />
            <p>{consentError}</p>
          </div>
        )}
      </div>
      {status === "error" && <div role="alert" className="mt-5 flex items-start gap-3 border border-red-500/30 bg-red-500/10 p-4 text-sm"><AlertCircle size={18} className="mt-0.5 shrink-0" /><p>{errorMessage} {locale === "fr" ? "Vous pouvez aussi écrire à" : "You can also email"} <a href="mailto:info@parigomusic.com" className="underline">info@parigomusic.com</a>.</p></div>}
    </form>
  );
}
