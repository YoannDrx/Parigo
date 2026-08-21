"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, LayoutGrid, List, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Footer, Header } from "@/components/layout";
import { SynchronisationCard } from "@/components/editorial/SynchronisationCard";
import { ViewModeControl } from "@/components/ui/ViewModeControl";
import { useI18n } from "@/components/providers/I18nProvider";
import { SYNCHRONISATIONS_PLAYLIST_URL, type Synchronisation } from "@/lib/youtube/synchronisation-types";
import type { ViewMode } from "@/types";
import { PageHero } from "@/components/layout/PageHero";

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
    <main className="overflow-x-clip">
      <PageHero
        title={locale === "fr" ? "Nos Synchros" : "Our synchronisations"}
        intro={locale === "fr" ? "Du cinéma à la publicité, nos musiques trouvent leur place à l’image." : "From cinema to advertising, our music finds its place on screen."}
        meta={`${synchronisations.length} ${locale === "fr" ? "placements" : "placements"}`}
        action={<a href={SYNCHRONISATIONS_PLAYLIST_URL} target="_blank" rel="noreferrer" className="parigo-button group inline-flex min-h-11 max-w-full items-center gap-3 border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--foreground)] transition hover:!border-[var(--signal-strong)] hover:!bg-[color-mix(in_srgb,var(--signal)_7%,var(--surface))] hover:!text-[var(--signal-strong)]"><Youtube size={16} className="shrink-0 text-[var(--signal-strong)]" /><span className="min-w-0">{locale === "fr" ? "Playlist YouTube" : "YouTube playlist"}</span><ArrowUpRight size={15} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>}
      />
      <div className="mx-auto min-w-0 max-w-[1580px] px-[var(--space-page-gutter)] pb-[var(--space-section-y)] pt-[var(--space-divider-content)]">
        <div className="mb-[var(--space-heading-content)] flex justify-end">
          <ViewModeControl
            value={view}
            onValueChange={setView}
            ariaLabel={locale === "fr" ? "Mode d’affichage" : "Display mode"}
            options={[
              { value: "grid", label: locale === "fr" ? "Vue cartes" : "Card view", icon: LayoutGrid },
              { value: "list", label: locale === "fr" ? "Vue liste" : "List view", icon: List },
            ]}
          />
        </div>

        {view === "grid" ? (
          <div className="grid min-w-0 gap-[var(--space-grid-x)] lg:grid-cols-2">
            {synchronisations.map((sync) => (
              <SynchronisationCard
                key={sync.youtubeId}
                slug={sync.slug}
                youtubeId={sync.youtubeId}
                href={localizedPath(`/synchronisations/${sync.slug}`)}
                image={sync.image}
                title={sync.title}
                client={sync.client}
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
