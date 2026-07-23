"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Check, Loader2, Send } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Track } from "@/types";

export function ContactForm({ track, requestedTrackId }: { track?: Track | null; requestedTrackId?: string }) {
  const { locale, t } = useI18n();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
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
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") || ""),
          company: String(data.get("company") || ""),
          email: String(data.get("email") || ""),
          message: String(data.get("message") || ""),
          trackId: requestedTrackId || undefined,
          locale,
          consent: data.get("consent") === "on",
          website: String(data.get("website") || ""),
          startedAt,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || (locale === "fr" ? "L’envoi a échoué." : "Sending failed."));
      setStatus("sent");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : (locale === "fr" ? "L’envoi a échoué." : "Sending failed."));
      setStatus("error");
    }
  };

  if (status === "sent") return <div role="status" className="parigo-frame border border-[var(--line)] bg-[var(--signal-soft)] p-8 text-[var(--foreground)]"><Check className="mb-4" /><h2 className="font-[var(--font-editorial)] text-4xl font-normal">{locale === "fr" ? "Message envoyé" : "Message sent"}</h2><p className="mt-3 text-[var(--text-muted)]">{locale === "fr" ? "Merci. L’équipe Parigo Music vous répondra dès que possible." : "Thank you. The Parigo Music team will reply as soon as possible."}</p></div>;

  return (
    <form onSubmit={submit} className="contact-form min-w-0" aria-label={t("institutional.contactForm")}>
      <div className="grid sm:grid-cols-2">
        <label className="contact-field sm:border-r"><span><b>01</b>{t("institutional.name")}</span><input required name="name" autoComplete="name" /></label>
        <label className="contact-field"><span><b>02</b>{t("institutional.company")}</span><input name="company" autoComplete="organization" /></label>
      </div>
      <label className="contact-field"><span><b>03</b>{t("auth.email")}</span><input required type="email" name="email" autoComplete="email" /></label>
      <label className="contact-field"><span><b>04</b>{requestedTrackId ? (locale === "fr" ? "Projet & licence" : "Project & licence") : t("institutional.project")}</span><textarea required name="message" rows={requestedTrackId ? 13 : 6} defaultValue={defaultMessage} placeholder={t("institutional.projectPlaceholder")} /></label>
      <label className="sr-only" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <div className="grid gap-7 border-b border-[var(--line-strong)] py-7 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="group flex cursor-pointer items-start gap-3 text-sm text-[var(--text-muted)]">
          <input required type="checkbox" name="consent" className="peer sr-only" />
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center border border-[var(--line-strong)] bg-transparent text-transparent transition group-hover:border-[var(--color-primary-dark)] peer-checked:rotate-[-4deg] peer-checked:border-[var(--color-primary-dark)] peer-checked:bg-[var(--signal)] peer-checked:text-[#10110e] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-[var(--color-primary-dark)]"><Check size={15} strokeWidth={3} /></span>
          <span>{t("institutional.consent")}</span>
        </label>
        <button type="submit" disabled={status === "sending"} className="contact-submit disabled:cursor-wait disabled:opacity-60">{status === "sending" ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} {status === "sending" ? (locale === "fr" ? "Envoi…" : "Sending…") : t("institutional.send")}</button>
      </div>
      {status === "error" && <div role="alert" className="mt-5 flex items-start gap-3 border border-red-500/30 bg-red-500/10 p-4 text-sm"><AlertCircle size={18} className="mt-0.5 shrink-0" /><p>{errorMessage} {locale === "fr" ? "Vous pouvez aussi écrire à" : "You can also email"} <a href="mailto:info@parigomusic.com" className="underline">info@parigomusic.com</a>.</p></div>}
    </form>
  );
}
