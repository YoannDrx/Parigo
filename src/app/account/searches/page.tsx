"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, ChevronDown, Pencil, Search, Trash2, X } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button, Select } from "@/components/ui";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { formatParigoDate, formatParigoTime } from "@/lib/date-time";
import type { MemberSavedSearch } from "@/types";

async function fetchSavedSearches(): Promise<MemberSavedSearch[]> {
  const response = await fetch("/api/user/searches", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || "Unable to load saved searches");
  return payload.data?.searches ?? [];
}

function savedSearchTimestamp(search: MemberSavedSearch) {
  return search.createdAt || search.updatedAt;
}

function savedSearchDateKey(search: MemberSavedSearch) {
  const timestamp = savedSearchTimestamp(search);
  if (!timestamp) return "undated";
  return formatParigoDate(timestamp, "en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }) || "undated";
}

export default function SavedSearchesPage() {
  const { locale } = useI18n();
  const [searches, setSearches] = useState<MemberSavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");

  const searchGroups = useMemo(() => {
    const sortedSearches = [...searches].sort((left, right) => {
      const leftTime = Date.parse(savedSearchTimestamp(left) || "");
      const rightTime = Date.parse(savedSearchTimestamp(right) || "");
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    });
    const groups = new Map<string, MemberSavedSearch[]>();
    for (const search of sortedSearches) {
      const key = savedSearchDateKey(search);
      groups.set(key, [...(groups.get(key) || []), search]);
    }
    return [...groups.entries()].map(([key, entries]) => {
      const timestamp = savedSearchTimestamp(entries[0]);
      return {
        key,
        entries,
        label: timestamp
          ? formatParigoDate(timestamp, locale === "fr" ? "fr-FR" : "en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : (locale === "fr" ? "Date inconnue" : "Unknown date"),
      };
    });
  }, [locale, searches]);

  const visibleSearchGroups = dateFilter === "all"
    ? searchGroups
    : searchGroups.filter((group) => group.key === dateFilter);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSearches(await fetchSavedSearches());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load saved searches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchSavedSearches()
      .then((nextSearches) => {
        if (active) setSearches(nextSearches);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load saved searches");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const remove = async (id: string) => {
    setRemoving(id);
    const response = await fetch(`/api/user/searches?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) setSearches((current) => current.filter((item) => item.id !== id));
    setRemoving(null);
  };

  const saveName = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    const response = await fetch(`/api/user/searches/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.data?.search) {
      setSearches((current) => current.map((search) =>
        search.id === id ? payload.data.search : search
      ));
      setEditing(null);
    } else {
      setError(payload?.error?.message || (locale === "fr"
        ? "La recherche n’a pas pu être renommée."
        : "The search could not be renamed."));
    }
    setSaving(false);
  };

  return <div className="account-page">
    <AccountPageHeader
      icon={Search}
      eyebrow={locale === "fr" ? "Votre méthode de recherche" : "Your search workflow"}
      title={locale === "fr" ? "Recherches sauvegardées" : "Saved searches"}
      description={locale === "fr" ? "Reprenez exactement une combinaison de mots-clés, filtres et formats de résultats." : "Resume an exact combination of keywords, filters and result formats."}
      actions={<Link href="/search" className="parigo-button inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--signal-strong)] bg-[var(--signal-strong)] px-5 py-2.5 text-sm font-semibold text-white transition hover:!border-[var(--foreground)] hover:!bg-[var(--foreground)] hover:!text-[var(--background)]"><Search size={16} />{locale === "fr" ? "Nouvelle recherche" : "New search"}</Link>}
    />
    <div className="mt-9">
    {loading ? <div className="flex min-h-56 items-center justify-center"><ParigoLoader size="page" label={locale === "fr" ? "Chargement des recherches" : "Loading searches"} /></div> : error ? <div className="parigo-frame border border-[var(--line)] p-6"><p className="text-sm text-[var(--danger)]">{error}</p><Button variant="outline" className="mt-4" onClick={() => void load()}>{locale === "fr" ? "Réessayer" : "Retry"}</Button></div> : searches.length === 0 ? <div className="account-empty py-16 text-center"><Search className="mx-auto opacity-25" size={36} /><h3 className="mt-5 text-2xl">{locale === "fr" ? "Aucune recherche enregistrée" : "No saved search"}</h3><p className="mx-auto mt-3 max-w-md text-sm text-[var(--text-muted)]">{locale === "fr" ? "Lancez une recherche dans le catalogue puis utilisez « Sauvegarder » au-dessus des résultats." : "Run a catalogue search, then use Save above the results."}</p></div> : (
      <div className="space-y-7">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <p className="font-mono text-[.56rem] uppercase tracking-[.12em] text-[var(--text-muted)]">
              {locale === "fr" ? "Chronologie personnelle" : "Personal timeline"}
            </p>
            <p className="mt-1 text-sm text-[var(--foreground)]">
              {searches.length} {locale === "fr" ? (searches.length === 1 ? "recherche conservée" : "recherches conservées") : (searches.length === 1 ? "saved search" : "saved searches")}
            </p>
          </div>
          <Select
            value={dateFilter}
            onValueChange={setDateFilter}
            ariaLabel={locale === "fr" ? "Filtrer par date" : "Filter by date"}
            className="w-full sm:w-72"
            caption={locale === "fr" ? "Date" : "Date"}
            options={[
              {
                value: "all",
                label: locale === "fr" ? "Toutes les dates" : "All dates",
                description: locale === "fr" ? "Afficher toute la chronologie" : "Show the full timeline",
              },
              ...searchGroups.map((group) => ({
                value: group.key,
                label: group.label,
                description: `${group.entries.length} ${locale === "fr" ? (group.entries.length === 1 ? "recherche" : "recherches") : (group.entries.length === 1 ? "search" : "searches")}`,
              })),
            ]}
          />
        </div>

        <div className="space-y-7">
          {visibleSearchGroups.map((group, groupIndex) => (
            <details key={group.key} open data-testid="saved-search-day" className="saved-search-day group/saved-day">
              <summary className="saved-search-day__summary flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 border-y border-[var(--line)] py-3 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                  <span aria-hidden="true" className="saved-search-day__index font-mono text-[.58rem] text-[var(--signal-strong)]">{String(groupIndex + 1).padStart(2, "0")}</span>
                  <span className="truncate text-sm font-semibold uppercase tracking-[.08em]">{group.label}</span>
                  <span className="shrink-0 font-mono text-[.56rem] uppercase tracking-[.08em] text-[var(--text-muted)]">
                    {group.entries.length} {locale === "fr" ? (group.entries.length === 1 ? "recherche" : "recherches") : (group.entries.length === 1 ? "search" : "searches")}
                  </span>
                </span>
                <span className="saved-search-day__toggle flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--line)] text-[var(--text-muted)]">
                  <ChevronDown size={15} className="transition-transform duration-200 group-open/saved-day:rotate-180" />
                </span>
              </summary>

              <div className="saved-search-day__content">
                <div className="parigo-frame overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
                  {group.entries.map((search) => {
                    const timestamp = savedSearchTimestamp(search);
                    return (
                      <article key={search.id} className="saved-search-row group/search">
                        <div className="saved-search-row__time">
                          <span className="font-mono text-[.5rem] uppercase tracking-[.08em] text-[var(--text-muted)]">{locale === "fr" ? "Créée" : "Saved"}</span>
                          {timestamp ? (
                            <time dateTime={timestamp} className="font-mono text-[.7rem] font-semibold text-[var(--foreground)]">
                              {formatParigoTime(timestamp, locale === "fr" ? "fr-FR" : "en-GB")}
                            </time>
                          ) : <span aria-hidden="true" className="font-mono text-xs">—</span>}
                        </div>
                        <div className="min-w-0">
                          {editing === search.id ? (
                            <div className="flex max-w-xl items-center gap-2">
                              <input autoFocus value={editName} maxLength={160} onChange={(event) => setEditName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveName(search.id); if (event.key === "Escape") setEditing(null); }} className="min-h-10 min-w-0 flex-1 border border-[var(--line-strong)] bg-[var(--background)] px-3 text-sm font-semibold outline-none focus:border-[var(--foreground)]" aria-label={locale === "fr" ? "Nouveau nom de la recherche" : "New search name"} />
                              <button type="button" disabled={saving || !editName.trim()} onClick={() => void saveName(search.id)} className="parigo-soft-action flex h-10 w-10 items-center justify-center text-[var(--signal-strong)] disabled:opacity-40" aria-label={locale === "fr" ? "Enregistrer le nom" : "Save name"}>{saving ? <ParigoLoader size="icon" label={locale === "fr" ? "Renommage" : "Renaming"} /> : <Check size={15} />}</button>
                              <button type="button" disabled={saving} onClick={() => setEditing(null)} className="parigo-soft-action flex h-10 w-10 items-center justify-center text-[var(--text-muted)]" aria-label={locale === "fr" ? "Annuler" : "Cancel"}><X size={15} /></button>
                            </div>
                          ) : <h3 className="saved-search-row__title truncate text-base font-semibold sm:text-lg">{search.name}</h3>}
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                            <CalendarDays size={12} aria-hidden="true" />
                            {search.searchTermsCount ? `${search.searchTermsCount} ${locale === "fr" ? "critère(s)" : "criteria"}` : (locale === "fr" ? "Recherche Parigo" : "Parigo search")}
                          </p>
                        </div>
                        <div className="saved-search-row__actions">
                          {search.searchUrl && <Link href={search.searchUrl} className="saved-search-rerun group/run relative inline-flex min-h-10 items-center gap-2 px-3 text-xs font-semibold transition-colors hover:text-[var(--signal-strong)] focus-visible:text-[var(--signal-strong)] focus-visible:outline-none">{locale === "fr" ? "Relancer" : "Run again"}<ArrowUpRight size={14} className="transition-transform group-hover/run:-translate-y-0.5 group-hover/run:translate-x-0.5" /></Link>}
                          <button type="button" onClick={() => { setEditing(search.id); setEditName(search.name); setError(""); }} className="parigo-soft-action flex h-10 w-10 items-center justify-center text-[var(--text-muted)]" aria-label={`${locale === "fr" ? "Renommer" : "Rename"} ${search.name}`}><Pencil size={15} /></button>
                          <button type="button" disabled={removing === search.id} onClick={() => void remove(search.id)} data-tone="danger" className="parigo-soft-action flex h-10 w-10 items-center justify-center text-[var(--text-muted)] disabled:opacity-40" aria-label={`${locale === "fr" ? "Supprimer" : "Delete"} ${search.name}`}>{removing === search.id ? <ParigoLoader size="icon" label={locale === "fr" ? "Suppression" : "Deleting"} /> : <Trash2 size={15} />}</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    )}
    </div>
  </div>;
}
