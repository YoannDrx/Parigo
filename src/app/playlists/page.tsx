"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ListMusic, Loader2 } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { MiniPlayer, PlaylistCard } from "@/components/features";
import { CatalogHero } from "@/components/catalog";
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

export default function PlaylistsPage() {
  const { locale, t } = useI18n();
  const [playlists, setPlaylists] = useState<ApiPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadPlaylists() {
      try {
        const response = await fetch("/api/playlists", { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          setPlaylists(data.playlists || []);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.error("Error loading playlists:", error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    loadPlaylists();
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => Array.from(new Set(playlists.flatMap((playlist) => playlist.category ? [playlist.category] : []))), [playlists]);
  const filtered = useMemo(() => activeCategory ? playlists.filter((playlist) => playlist.category === activeCategory) : playlists, [activeCategory, playlists]);
  const categoryLabel = (category: string) => {
    const labels: Record<string, [string, string]> = { featured: ["En vedette", "Featured"], trending: ["Tendances", "Trending"], mood: ["Ambiances", "Moods"], energy: ["Énergie", "Energy"] };
    return labels[category]?.[locale === "fr" ? 0 : 1] ?? category;
  };

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-32">
        <CatalogHero eyebrow={t("catalog.playlistsEyebrow")} title={t("catalog.playlistsTitle")} intro={t("catalog.playlistsIntro")} meta={`${playlists.length} ${t("common.playlists").toLowerCase()}`} />
        <div className="mx-auto max-w-[1700px] px-4 py-12 lg:px-8 md:py-16">
          {categories.length > 0 && (
            <div className="mb-14 flex flex-wrap gap-2 border-b border-[var(--line)] pb-8">
              <button onClick={() => setActiveCategory(null)} className={`min-h-11 rounded-full border px-4 text-sm transition ${activeCategory === null ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"}`}>{locale === "fr" ? "Toutes" : "All"}</button>
              {categories.map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`min-h-11 rounded-full border px-4 text-sm capitalize transition ${activeCategory === category ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"}`}>{categoryLabel(category)}</button>)}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-[var(--color-primary)]" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center"><ListMusic size={42} className="mb-6 opacity-30" /><h2 className="font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">{t("catalog.noPlaylists")}</h2></div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-14 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-x-7 md:gap-y-20">
              {filtered.map((playlist, index) => {
                const item: CatalogPlaylist = { id: playlist.slug || playlist.id, slug: playlist.slug, title: playlist.title, description: playlist.description ?? undefined, cover: playlist.cover || "/media/mock/albums/pgo0025.avif", trackCount: playlist.trackCount, category: playlist.category ?? undefined, isFeatured: playlist.isFeatured };
                return <motion.div key={playlist.id} initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .16 }} transition={{ duration: .65, delay: (index % 5) * .035 }}><PlaylistCard playlist={item} /></motion.div>;
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MiniPlayer />
    </div>
  );
}
