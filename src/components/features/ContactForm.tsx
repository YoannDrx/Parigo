"use client";

import { useState, type FormEvent } from "react";
import { Check, Send } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

export function ContactForm() {
  const { t } = useI18n();
  const [opened, setOpened] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "");
    const company = String(data.get("company") || "");
    const email = String(data.get("email") || "");
    const message = String(data.get("message") || "");
    const subject = encodeURIComponent(`Demande Parigo Music — ${name || company || email}`);
    const body = encodeURIComponent(`${message}\n\n${name}${company ? ` — ${company}` : ""}\n${email}`);
    window.location.href = `mailto:contact@parigomusic.com?subject=${subject}&body=${body}`;
    setOpened(true);
  };

  if (opened) return <div className="border border-[var(--line)] bg-[var(--signal-soft)] p-8 text-[var(--foreground)]"><Check className="mb-4" /><h2 className="font-[var(--font-editorial)] text-4xl font-normal">Votre messagerie a été ouverte</h2><p className="mt-3 text-[var(--text-muted)]">Vérifiez puis envoyez votre message depuis votre application e-mail. Si elle ne s’est pas ouverte, écrivez à <a className="underline" href="mailto:contact@parigomusic.com">contact@parigomusic.com</a>.</p></div>;

  return (
    <form onSubmit={submit} className="contact-form border-t border-[var(--line-strong)]" aria-label={t("institutional.contactForm")}>
      <div className="grid sm:grid-cols-2">
        <label className="contact-field sm:border-r"><span><b>01</b>{t("institutional.name")}</span><input required name="name" autoComplete="name" /></label>
        <label className="contact-field"><span><b>02</b>{t("institutional.company")}</span><input name="company" autoComplete="organization" /></label>
      </div>
      <label className="contact-field"><span><b>03</b>{t("auth.email")}</span><input required type="email" name="email" autoComplete="email" /></label>
      <label className="contact-field"><span><b>04</b>{t("institutional.project")}</span><textarea required name="message" rows={6} placeholder={t("institutional.projectPlaceholder")} /></label>
      <div className="grid gap-7 border-b border-[var(--line-strong)] py-7 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="group flex cursor-pointer items-start gap-3 text-sm text-[var(--text-muted)]">
          <input required type="checkbox" className="peer sr-only" />
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center border border-[var(--line-strong)] bg-transparent text-transparent transition group-hover:border-[var(--color-primary-dark)] peer-checked:rotate-[-4deg] peer-checked:border-[var(--color-primary-dark)] peer-checked:bg-[var(--signal)] peer-checked:text-[#10110e] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-[var(--color-primary-dark)]"><Check size={15} strokeWidth={3} /></span>
          <span>{t("institutional.consent")}</span>
        </label>
        <button type="submit" className="contact-submit"><Send size={17} /> {t("institutional.send")}</button>
      </div>
    </form>
  );
}
