"use client";

import { useMemo, useState } from "react";
import { ListMusic } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { PlaylistCard } from "@/components/features/PlaylistCard";
import { CatalogHero } from "@/components/catalog";
import { Select } from "@/components/ui/Select";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Playlist as CatalogPlaylist } from "@/types";

interface ApiPlaylist {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover: string | null;
  trackCount: number;
  category: string | null;
  isFeatured: boolean;
}

export function PlaylistsPageClient({ playlists }: { playlists: ApiPlaylist[] }) {
  const { locale, t } = useI18n();
  const [sort, setSort] = useState<"title-asc" | "title-desc">("title-asc");

  const sortedPlaylists = useMemo(() => [...playlists].sort((left, right) => {
    const comparison = left.title.localeCompare(right.title, locale, { sensitivity: "base" });
    return sort === "title-asc" ? comparison : -comparison;
  }), [locale, playlists, sort]);

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-32">
        <CatalogHero eyebrow={t("catalog.playlistsEyebrow")} title={t("catalog.playlistsTitle")} intro={t("catalog.playlistsIntro")} meta={`${playlists.length} ${t("common.playlists").toLowerCase()}`} />
        <div className="mx-auto max-w-[1700px] px-4 py-12 lg:px-8 md:py-16">
          <div className="mb-12 flex items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
            <p className="text-sm text-[var(--text-muted)]">{locale === "fr" ? "Sélections éditoriales Parigo" : "Parigo editorial selections"}</p>
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[.08em]">
              <span className="hidden sm:inline">{locale === "fr" ? "Trier" : "Sort"}</span>
              <Select value={sort} onValueChange={setSort} ariaLabel={locale === "fr" ? "Trier les playlists" : "Sort playlists"} className="min-w-28 normal-case tracking-normal" options={[{ value: "title-asc", label: "A–Z" }, { value: "title-desc", label: "Z–A" }]} />
            </div>
          </div>

          {sortedPlaylists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center"><ListMusic size={42} className="mb-6 opacity-30" /><h2 className="font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">{t("catalog.noPlaylists")}</h2></div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-14 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-x-7 md:gap-y-20">
              {sortedPlaylists.map((playlist, index) => {
                const category = playlist.category?.toLowerCase() === "curated" ? (locale === "fr" ? "Sélection Parigo" : "Parigo selection") : playlist.category ?? undefined;
                const item: CatalogPlaylist = { id: playlist.slug || playlist.id, slug: playlist.slug, title: playlist.title, description: playlist.description ?? undefined, cover: playlist.cover || "/images/placeholder-album.jpg", trackCount: playlist.trackCount, category, isFeatured: playlist.isFeatured };
                return <div key={playlist.id} style={{ animationDelay: `${(index % 5) * 35}ms` }} className="animate-[fade-in_.4s_ease-out_both]"><PlaylistCard playlist={item} /></div>;
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
