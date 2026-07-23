"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Heart, Music, Disc3, Loader2, Search, X } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { TrackRow, AlbumCard } from "@/components/features";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button, Input, Select } from "@/components/ui";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import type { Album, Track } from "@/types";

type TabType = "tracks" | "albums";

function albumFromTrack(track: Track): Album | undefined {
  if (!track.albumId) return undefined;
  return { id: track.albumId, slug: track.albumSlug, title: track.albumTitle || "", cover: track.albumCover || "/images/placeholder-album.jpg", label: track.albumLabel || "Parigo", labelSlug: track.albumLabelSlug, genres: track.genres, moods: track.moods, trackCount: 0 };
}

export default function FavoritesPage() {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [activeTab, setActiveTab] = useState<TabType>("tracks");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/user/favorites/tracks", { cache: "no-store", signal: controller.signal }),
      fetch("/api/user/favorites/albums", { cache: "no-store", signal: controller.signal }),
    ])
      .then(async ([tracksRes, albumsRes]) => {
        if (tracksRes.ok) {
          const data = await tracksRes.json();
          setTracks(data.data?.tracks || []);
        }
        if (albumsRes.ok) {
          const data = await albumsRes.json();
          setAlbums(data.data?.albums || []);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) console.error("Error loading favorites:", error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [userId]);

  const tabs = [
    { id: "tracks" as TabType, label: t("catalog.tracks"), icon: Music, count: tracks.length },
    { id: "albums" as TabType, label: t("common.albums"), icon: Disc3, count: albums.length },
  ];

  const categories = useMemo(() => {
    const values = activeTab === "tracks"
      ? tracks.flatMap((track) => [...track.genres, ...track.moods])
      : albums.flatMap((album) => [...album.genres, ...(album.moods || [])]);
    return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, locale));
  }, [activeTab, albums, locale, tracks]);

  const filteredTracks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return tracks.filter((track) => {
      const terms = [track.title, track.albumTitle, track.albumLabel, track.description, ...track.genres, ...track.moods, ...(track.instruments || []), ...(track.composers || []), ...(track.tags || []), ...(track.keywords || [])].filter(Boolean).join(" ").toLocaleLowerCase(locale);
      return (!needle || terms.includes(needle)) && (category === "all" || track.genres.includes(category) || track.moods.includes(category));
    });
  }, [category, locale, query, tracks]);

  const filteredAlbums = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return albums.filter((album) => {
      const terms = [album.title, album.label, album.description, ...album.genres, ...(album.moods || []), ...(album.keywords || [])].filter(Boolean).join(" ").toLocaleLowerCase(locale);
      return (!needle || terms.includes(needle)) && (category === "all" || album.genres.includes(category) || album.moods?.includes(category));
    });
  }, [albums, category, locale, query]);

  const activeTotal = activeTab === "tracks" ? tracks.length : albums.length;
  const activeFilteredTotal = activeTab === "tracks" ? filteredTracks.length : filteredAlbums.length;
  const filtersActive = Boolean(query.trim()) || category !== "all";

  return (
    <div className="account-page space-y-8">
      <AccountPageHeader
        icon={Heart}
        eyebrow={locale === "fr" ? "Votre collection" : "Your collection"}
        title={t("account.favorites")}
        description={locale === "fr" ? `${tracks.length + albums.length} éléments conservés pour les retrouver rapidement.` : `${tracks.length + albums.length} items kept close for quick access.`}
      />

      {/* Tabs */}
      <div className="account-toolbar flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setCategory("all"); }}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 transition-all ${
              activeTab === tab.id
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--line)] hover:border-[var(--line-strong)]"
            }`}
          >
            <tab.icon size={18} />
            <span className="font-medium">{tab.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === tab.id
                  ? "bg-white text-[var(--color-black)]"
                  : "bg-[var(--color-gray-100)] text-[var(--color-gray-600)]"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {!isLoading && activeTotal > 0 && (
        <section aria-label={locale === "fr" ? "Rechercher et filtrer les favoris" : "Search and filter favourites"} className="account-toolbar grid gap-3 md:grid-cols-[minmax(16rem,1fr)_14rem_auto] md:items-center">
          <Input isSearch value={query} onChange={(event) => setQuery(event.target.value)} placeholder={activeTab === "tracks" ? (locale === "fr" ? "Titre, album, humeur, instrument…" : "Title, album, mood, instrument…") : (locale === "fr" ? "Titre, label, genre…" : "Title, label, genre…")} aria-label={locale === "fr" ? "Rechercher dans mes favoris" : "Search my favourites"} />
          <Select value={category} onValueChange={setCategory} ariaLabel={locale === "fr" ? "Filtrer les favoris" : "Filter favourites"} options={[{ value: "all", label: locale === "fr" ? "Tous les genres et humeurs" : "All genres and moods" }, ...categories.map((value) => ({ value, label: value }))]} className="[&_[role=combobox]]:min-h-11" />
          {filtersActive && <Button variant="ghost" className="justify-self-start px-3 md:justify-self-end" onClick={() => { setQuery(""); setCategory("all"); }}><X size={15} />{locale === "fr" ? "Effacer" : "Clear"}</Button>}
          <p className="text-xs text-[var(--text-muted)] md:col-span-3">{activeFilteredTotal} {locale === "fr" ? `sur ${activeTotal} élément${activeTotal > 1 ? "s" : ""}` : `of ${activeTotal} item${activeTotal > 1 ? "s" : ""}`}</p>
        </section>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Tracks Tab */}
            {activeTab === "tracks" && (
              <div className="space-y-2">
                {tracks.length === 0 ? (
                  <EmptyState
                    icon={Music}
                    title={locale === "fr" ? "Aucune piste en favoris" : "No favourite tracks"}
                    description={locale === "fr" ? "Ajoutez des pistes à vos favoris pour les retrouver ici." : "Add tracks to your favourites to find them here."}
                  />
                ) : filteredTracks.length === 0 ? (
                  <EmptyState icon={Search} title={locale === "fr" ? "Aucun favori ne correspond." : "No favourite matches."} description={locale === "fr" ? "Essayez un autre terme ou retirez le filtre." : "Try another term or remove the filter."} />
                ) : (
                  filteredTracks.map((track, index) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      album={albumFromTrack(track)}
                      index={index}
                      showWaveform={false}
                    />
                  ))
                )}
              </div>
            )}

            {/* Albums Tab */}
            {activeTab === "albums" && (
              <div>
                {albums.length === 0 ? (
                  <EmptyState
                    icon={Disc3}
                    title={locale === "fr" ? "Aucun album en favoris" : "No favourite albums"}
                    description={locale === "fr" ? "Ajoutez des albums à vos favoris pour les retrouver facilement." : "Add albums to your favourites to find them easily."}
                  />
                ) : filteredAlbums.length === 0 ? (
                  <EmptyState icon={Search} title={locale === "fr" ? "Aucun album ne correspond." : "No album matches."} description={locale === "fr" ? "Essayez un autre terme ou retirez le filtre." : "Try another term or remove the filter."} />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredAlbums.map((album) => (
                      <AlbumCard
                        key={album.id}
                        album={album}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="account-empty flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="w-16 h-16 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
        <Icon size={32} className="text-[var(--color-gray-400)]" />
      </div>
      <h3 className="mb-1 font-[var(--font-editorial)] text-3xl font-normal">
        {title}
      </h3>
      <p className="text-[var(--color-gray-600)]">{description}</p>
    </div>
  );
}
