"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Loader2, Search, Trash2 } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui";
import type { MemberSavedSearch } from "@/types";

export default function SavedSearchesPage() {
  const { locale } = useI18n();
  const [searches, setSearches] = useState<MemberSavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/user/searches", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Unable to load saved searches");
      setSearches(payload.data?.searches ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load saved searches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remove = async (id: string) => {
    setRemoving(id);
    const response = await fetch(`/api/user/searches?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) setSearches((current) => current.filter((item) => item.id !== id));
    setRemoving(null);
  };

  return <div>
    <div className="mb-9 flex flex-wrap items-end justify-between gap-5 border-b border-[var(--line)] pb-7">
      <div><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Votre méthode de recherche" : "Your search workflow"}</p><h2 className="mt-3 font-[var(--font-editorial)] text-5xl tracking-[-.05em] md:text-6xl">{locale === "fr" ? "Recherches sauvegardées" : "Saved searches"}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">{locale === "fr" ? "Reprenez exactement une combinaison de mots-clés, filtres et formats de résultats." : "Resume an exact combination of keywords, filters and result formats."}</p></div>
      <Link href="/search" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--signal-strong)] bg-[var(--signal-strong)] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)]"><Search size={16} />{locale === "fr" ? "Nouvelle recherche" : "New search"}</Link>
    </div>
    {loading ? <div className="flex min-h-56 items-center justify-center"><Loader2 className="animate-spin" /></div> : error ? <div className="border border-[var(--line)] p-6"><p className="text-sm text-[var(--danger)]">{error}</p><Button variant="outline" className="mt-4" onClick={() => void load()}>{locale === "fr" ? "Réessayer" : "Retry"}</Button></div> : searches.length === 0 ? <div className="border-y border-[var(--line)] py-16 text-center"><Search className="mx-auto opacity-25" size={36} /><h3 className="mt-5 text-2xl">{locale === "fr" ? "Aucune recherche enregistrée" : "No saved search"}</h3><p className="mx-auto mt-3 max-w-md text-sm text-[var(--text-muted)]">{locale === "fr" ? "Lancez une recherche dans le catalogue puis utilisez « Sauvegarder » au-dessus des résultats." : "Run a catalogue search, then use Save above the results."}</p></div> : <div className="border-t border-[var(--line)]">
      {searches.map((search) => <article key={search.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--line)] py-5">
        <div className="min-w-0"><h3 className="truncate text-lg font-semibold">{search.name}</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{search.searchTermsCount ? `${search.searchTermsCount} ${locale === "fr" ? "critère(s)" : "criteria"}` : (locale === "fr" ? "Recherche Parigo" : "Parigo search")}{search.createdAt ? ` · ${new Date(search.createdAt).toLocaleDateString(locale)}` : ""}</p></div>
        <div className="flex items-center gap-1">{search.searchUrl && <Link href={search.searchUrl} className="inline-flex min-h-10 items-center gap-2 border border-[var(--line)] px-3 text-xs font-semibold transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]">{locale === "fr" ? "Relancer" : "Run again"}<ArrowUpRight size={14} /></Link>}<button type="button" disabled={removing === search.id} onClick={() => void remove(search.id)} className="flex h-10 w-10 items-center justify-center text-[var(--text-muted)] transition hover:text-[var(--danger)] disabled:opacity-40" aria-label={`${locale === "fr" ? "Supprimer" : "Delete"} ${search.name}`}>{removing === search.id ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}</button></div>
      </article>)}
    </div>}
  </div>;
}
