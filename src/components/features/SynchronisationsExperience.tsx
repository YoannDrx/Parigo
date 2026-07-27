"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, LayoutGrid, List, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Footer, Header } from "@/components/layout";
import { ParigoVideoCard } from "@/components/editorial/ParigoVideoCard";
import { useI18n } from "@/components/providers/I18nProvider";
import { SYNCHRONISATIONS_PLAYLIST_URL, type Synchronisation } from "@/content/synchronisations";
import type { ViewMode } from "@/types";

export function SynchronisationsExperience({ synchronisations }: { synchronisations: Synchronisation[] }) {
  const { locale, localizedPath } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewMode>(searchParams.get("view") === "list" ? "list" : "grid");

  useEffect(() => {
    const params = new URLSearchParams();
    if (view !== "grid") params.set("view", view);
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [pathname, router, searchParams, view]);

  return <div className="page-shell">
    <Header />
    <main className="overflow-x-clip px-4 pb-24 pt-28 md:px-8 md:pb-36 md:pt-36">
      <div className="mx-auto min-w-0 max-w-[1580px]">
        <div className="grid min-w-0 gap-10 md:grid-cols-12 md:items-end">
          <div className="min-w-0 md:col-span-8">
            <h1 className="min-w-0 text-[clamp(2.3rem,10vw,6rem)] font-semibold leading-[.88] tracking-[-.07em] md:text-[clamp(4rem,8.5vw,9rem)] md:leading-[.84]"><span className="block">{locale === "fr" ? "Nos" : "Our"}</span><span className="block">synchronisations<span className="text-[var(--signal)]">.</span></span></h1>
          </div>
          <div className="min-w-0 max-w-md md:col-span-3 md:col-start-10">
            <a href={SYNCHRONISATIONS_PLAYLIST_URL} target="_blank" rel="noreferrer" className="parigo-button group inline-flex min-h-12 max-w-full items-center gap-3 border border-[var(--signal-strong)] bg-[var(--signal-strong)] px-5 text-sm font-semibold text-white transition hover:!border-[var(--foreground)] hover:!bg-[var(--foreground)] hover:!text-[var(--background)]"><Youtube size={17} className="shrink-0" /><span className="min-w-0">{locale === "fr" ? "Voir la playlist YouTube" : "View the YouTube playlist"}</span><ArrowUpRight size={16} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>
          </div>
        </div>

        <div className="my-14 flex justify-end">
          <div className="inline-flex border border-[var(--line-strong)] p-1" role="group" aria-label={locale === "fr" ? "Mode d’affichage" : "Display mode"}>
            <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={`inline-flex min-h-10 items-center gap-2 px-3 text-xs font-semibold ${view === "grid" ? "bg-[var(--foreground)] text-[var(--background)]" : ""}`}><LayoutGrid size={15} />{locale === "fr" ? "Cartes" : "Cards"}</button>
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={`inline-flex min-h-10 items-center gap-2 px-3 text-xs font-semibold ${view === "list" ? "bg-[var(--foreground)] text-[var(--background)]" : ""}`}><List size={15} />{locale === "fr" ? "Liste" : "List"}</button>
          </div>
        </div>

        {view === "grid" ? (
          <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-7">
            {synchronisations.map((sync) => (
              <ParigoVideoCard
                key={sync.youtubeId}
                href={localizedPath(`/synchronisations/${sync.slug}`)}
                image={sync.image}
                title={sync.title}
                eyebrow={sync.client}
                detail={sync.year ? String(sync.year) : undefined}
                className="sync-gallery-card"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            ))}
          </div>
        ) : (
          <div className="border-t border-[var(--line)]">{synchronisations.map((sync) => <Link key={sync.youtubeId} href={localizedPath(`/synchronisations/${sync.slug}`)} className="grid min-h-24 grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--line)] py-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto]"><div className="relative aspect-video overflow-hidden bg-black"><Image src={sync.image} alt="" fill sizes="160px" className="object-cover" /></div><div className="min-w-0"><h2 className="truncate text-xl font-semibold">{sync.title}</h2><p className="mt-1 truncate text-sm text-[var(--text-muted)]">{sync.client}</p></div><span className="pr-2 font-mono text-xs text-[var(--text-muted)]">{sync.year ?? "—"}</span></Link>)}</div>
        )}
      </div>
    </main>
    <Footer />
  </div>;
}
