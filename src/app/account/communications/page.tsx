"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { useI18n } from "@/components/providers/I18nProvider";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { formatParigoDate } from "@/lib/date-time";
import type { MemberCommunication } from "@/types";

export default function CommunicationsPage() {
  const { locale } = useI18n();
  const [items, setItems] = useState<MemberCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/user/communications?limit=50", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (response.ok) setItems(payload.data?.items ?? []);
        else setError(payload.error?.message || (locale === "fr"
          ? "L’historique des communications n’est pas disponible."
          : "Communication history is unavailable."));
      })
      .catch((cause) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(locale === "fr"
            ? "L’historique des communications n’est pas disponible."
            : "Communication history is unavailable.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [locale]);

  return <div className="account-page grid gap-[var(--space-account-flow)]">
    <AccountPageHeader
      icon={Mail}
      eyebrow={locale === "fr" ? "Messages transactionnels" : "Transactional messages"}
      title={locale === "fr" ? "Communications" : "Communications"}
      description={locale === "fr"
        ? "Historique privé des communications rattachées à votre compte."
        : "Private history of communications associated with your account."}
    />
    {loading ? <div className="flex min-h-56 items-center justify-center"><ParigoLoader size="page" label={locale === "fr" ? "Chargement des communications" : "Loading communications"} /></div> : error ? <p role="alert" className="parigo-frame border border-[var(--line)] p-5 text-sm text-[var(--danger)]">{error}</p> : items.length ? <div className="parigo-frame overflow-hidden border border-[var(--line)] bg-[var(--surface)]">{items.map((item) => <article key={item.id} className="grid gap-2 border-b border-[var(--line)] px-5 py-4 transition-colors last:border-0 hover:bg-[var(--surface-soft)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center"><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{item.subject || item.type || (locale === "fr" ? "Communication" : "Communication")}</h2><p className="mt-1 truncate text-xs text-[var(--text-muted)]">{[item.type, item.status, item.to].filter(Boolean).join(" · ")}</p></div>{item.sentAt && <time dateTime={item.sentAt} className="font-mono text-[.65rem] text-[var(--text-muted)]">{formatParigoDate(item.sentAt, locale, { dateStyle: "medium", timeStyle: "short" })}</time>}</article>)}</div> : <div className="account-empty px-6 py-16 text-center"><Mail className="mx-auto text-[var(--signal-strong)] opacity-55" size={32} /><h2 className="mt-4 text-xl font-semibold">{locale === "fr" ? "Aucune communication enregistrée" : "No communication recorded"}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--text-muted)]">{locale === "fr" ? "Vos communications apparaîtront ici lorsqu’elles seront disponibles." : "Your communications will appear here when they become available."}</p></div>}
  </div>;
}
