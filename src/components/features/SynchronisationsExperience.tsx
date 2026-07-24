"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Play, Youtube } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Footer, Header } from "@/components/layout";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { useI18n } from "@/components/providers/I18nProvider";
import { SYNCHRONISATIONS_PLAYLIST_URL, type Synchronisation } from "@/content/synchronisations";
import type { ViewMode } from "@/types";

type SyncSort = "playlist" | "recent" | "oldest" | "title";

export function SynchronisationsExperience({ synchronisations }: { synchronisations: Synchronisation[] }) {
  const { locale, localizedPath } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState<SyncSort>(
    ["recent", "oldest", "title"].includes(searchParams.get("sort") ?? "")
      ? searchParams.get("sort") as SyncSort
      : "playlist",
  );
  const [view, setView] = useState<ViewMode>(searchParams.get("view") === "list" ? "list" : "grid");
  const [year, setYear] = useState(searchParams.get("year") ?? "");
  const years = useMemo(() => [...new Set(synchronisations.map((item) => item.year).filter((value): value is number => Boolean(value)))].sort((a, b) => b - a), [synchronisations]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return synchronisations
      .filter((item) => !normalized || `${item.title} ${item.client} ${item.descriptionFr} ${item.descriptionEn}`.toLocaleLowerCase(locale).includes(normalized))
      .filter((item) => !year || item.year === Number(year))
      .sort((left, right) => {
        if (sort === "title") return left.title.localeCompare(right.title, locale, { sensitivity: "base" });
        if (sort === "recent") return (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "");
        if (sort === "oldest") return (left.publishedAt ?? "").localeCompare(right.publishedAt ?? "");
        return (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER);
      });
  }, [locale, query, sort, synchronisations, year]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sort !== "playlist") params.set("sort", sort);
    if (view !== "grid") params.set("view", view);
    if (year) params.set("year", year);
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [pathname, query, router, searchParams, sort, view, year]);

  return <div className="page-shell">
    <Header />
    <main className="overflow-x-clip px-4 pb-24 pt-28 md:px-8 md:pb-36 md:pt-36">
      <div className="mx-auto min-w-0 max-w-[1580px]">
        <div className="grid min-w-0 gap-10 md:grid-cols-12 md:items-end">
          <div className="min-w-0 md:col-span-8">
            <p className="eyebrow text-[var(--signal-strong)]">Music for images</p>
            <h1 className="mt-6 min-w-0 text-[clamp(2.3rem,10vw,6rem)] font-semibold leading-[.88] tracking-[-.07em] md:text-[clamp(4rem,8.5vw,9rem)] md:leading-[.84]"><span className="block">{locale === "fr" ? "Nos" : "Our"}</span><span className="block">synchronisations<span className="text-[var(--signal)]">.</span></span></h1>
          </div>
          <div className="min-w-0 max-w-md md:col-span-3 md:col-start-10">
            <p className="leading-relaxed text-[var(--text-muted)]">{locale === "fr" ? "La page reprend automatiquement toutes les vidéos publiques de la playlist Parigo, sans sélection arbitraire limitée aux sept cas historiques." : "This page automatically mirrors every public video in the Parigo playlist, rather than an arbitrary seven-item selection."}</p>
            <a href={SYNCHRONISATIONS_PLAYLIST_URL} target="_blank" rel="noreferrer" className="group mt-7 inline-flex min-h-12 max-w-full items-center gap-3 border border-[var(--signal-strong)] bg-[var(--signal-soft)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--signal-strong)] hover:text-[var(--background)] sm:px-5"><Youtube size={17} className="shrink-0" /><span className="min-w-0">{locale === "fr" ? "Voir la playlist YouTube" : "View the YouTube playlist"}</span><ArrowUpRight size={16} /></a>
          </div>
        </div>

        <div className="mt-14">
          <CatalogToolbar
            locale={locale}
            query={query}
            onQueryChange={setQuery}
            queryPlaceholder={locale === "fr" ? "Rechercher une synchronisation, une marque ou un diffuseur" : "Search a sync, brand or broadcaster"}
            sort={sort}
            onSortChange={setSort}
            sortOptions={[
              { value: "playlist", label: locale === "fr" ? "Ordre de la playlist" : "Playlist order" },
              { value: "recent", label: locale === "fr" ? "Plus récentes" : "Newest" },
              { value: "oldest", label: locale === "fr" ? "Plus anciennes" : "Oldest" },
              { value: "title", label: "A–Z" },
            ]}
            view={view}
            onViewChange={setView}
            resultCount={visible.length}
          >
            {years.length > 0 && <label className="mt-4 grid max-w-56 gap-1.5 border-t border-[var(--line)] pt-4 text-xs font-semibold"><span>{locale === "fr" ? "Année de publication" : "Publication year"}</span><select value={year} onChange={(event) => setYear(event.target.value)} className="h-11 border border-[var(--line)] bg-[var(--background)] px-3 text-sm font-normal"><option value="">{locale === "fr" ? "Toutes les années" : "All years"}</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
          </CatalogToolbar>
        </div>

        {view === "grid" ? (
          <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-7">{visible.map((sync, index) => <Link key={sync.youtubeId} href={localizedPath(`/synchronisations/${sync.slug}`)} className="home-sync-card group block min-w-0"><div className="home-sync-card__frame relative aspect-video min-w-0 overflow-hidden bg-[#0b0e0b]"><Image src={sync.image} alt={`${sync.title} — ${sync.client}`} fill sizes="(max-width:1024px) 100vw, 50vw" loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} className="object-cover transition duration-700 group-hover:scale-[1.018]" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/5" /><span className="absolute right-4 top-4 font-mono text-[.54rem] text-white/65">SYNC / {String(index + 1).padStart(2, "0")}</span><span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center border border-white/45 bg-black/25 text-white shadow-xl backdrop-blur-md transition duration-500 group-hover:scale-110 group-hover:bg-[var(--signal)]"><Play size={16} fill="currentColor" /></span><div className="absolute inset-x-0 bottom-0 flex min-w-0 items-end justify-between gap-4 p-4 text-white sm:p-6 md:p-8"><div className="min-w-0"><p className="truncate font-mono text-[.54rem] uppercase tracking-[.13em] text-white/65">{sync.client}</p><h2 className="mt-1.5 line-clamp-2 text-2xl font-semibold tracking-[-.045em] sm:text-3xl md:text-4xl">{sync.title}</h2></div></div></div></Link>)}</div>
        ) : (
          <div className="border-t border-[var(--line)]">{visible.map((sync) => <Link key={sync.youtubeId} href={localizedPath(`/synchronisations/${sync.slug}`)} className="grid min-h-24 grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--line)] py-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto]"><div className="relative aspect-video overflow-hidden bg-black"><Image src={sync.image} alt="" fill sizes="160px" className="object-cover" /></div><div className="min-w-0"><h2 className="truncate text-xl font-semibold">{sync.title}</h2><p className="mt-1 truncate text-sm text-[var(--text-muted)]">{sync.client}</p></div><span className="pr-2 font-mono text-xs text-[var(--text-muted)]">{sync.year ?? "—"}</span></Link>)}</div>
        )}
      </div>
    </main>
    <Footer />
  </div>;
}
