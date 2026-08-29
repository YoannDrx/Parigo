"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Heart, Music, Search, X } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useSession } from "@/lib/auth-client";
import { TrackRow } from "@/components/features";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button, Select } from "@/components/ui";
import { CatalogSearchField } from "@/components/search/CatalogSearchField";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import type { Album, Track } from "@/types";

function albumFromTrack(track: Track): Album | undefined {
  if (!track.albumId) return undefined;
  return { id: track.albumId, slug: track.albumSlug, title: track.albumTitle || "", code: track.albumCode || track.cdCode, cover: track.albumCover || "/images/placeholder-album.svg", label: track.albumLabel || "", labelSlug: track.albumLabelSlug, genres: track.genres, moods: track.moods, trackCount: 0 };
}

export default function FavoritesPage() {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void fetch("/api/user/favorites/tracks", { cache: "no-store", signal: controller.signal })
      .then(async (tracksRes) => {
        if (tracksRes.ok) {
          const data = await tracksRes.json();
          setTracks(data.data?.tracks || []);
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

  const categories = useMemo(() => {
    const values = tracks.flatMap((track) => [...track.genres, ...track.moods]);
    return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, locale));
  }, [locale, tracks]);

  const filteredTracks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return tracks.filter((track) => {
      const terms = [track.title, track.albumTitle, track.albumLabel, track.description, ...track.genres, ...track.moods, ...(track.instruments || []), ...(track.composers || []), ...(track.tags || []), ...(track.keywords || [])].filter(Boolean).join(" ").toLocaleLowerCase(locale);
      return (!needle || terms.includes(needle)) && (category === "all" || track.genres.includes(category) || track.moods.includes(category));
    });
  }, [category, locale, query, tracks]);

  const activeTotal = tracks.length;
  const activeFilteredTotal = filteredTracks.length;
  const filtersActive = Boolean(query.trim()) || category !== "all";

  return (
    <div className="account-page grid gap-[var(--space-account-flow)]">
      <AccountPageHeader
        icon={Heart}
        eyebrow={locale === "fr" ? "Vos favoris" : "Your favourites"}
        title={t("account.favorites")}
        description={locale === "fr" ? `${tracks.length} piste${tracks.length > 1 ? "s" : ""} conservée${tracks.length > 1 ? "s" : ""} pour les retrouver rapidement.` : `${tracks.length} track${tracks.length === 1 ? "" : "s"} kept close for quick access.`}
      />

      {!isLoading && activeTotal > 0 && (
        <section aria-label={locale === "fr" ? "Rechercher et filtrer les favoris" : "Search and filter favourites"} className="account-toolbar grid gap-3 md:grid-cols-[minmax(16rem,1fr)_minmax(16rem,19rem)_auto] md:items-center">
          <CatalogSearchField id="account-favorites-search" value={query} onValueChange={setQuery} placeholder={locale === "fr" ? "Titre, album, humeur, instrument…" : "Title, album, mood, instrument…"} ariaLabel={locale === "fr" ? "Rechercher dans mes favoris" : "Search my favourites"} clearLabel={locale === "fr" ? "Effacer la recherche" : "Clear search"} density="compact" />
          <Select value={category} onValueChange={setCategory} ariaLabel={locale === "fr" ? "Filtrer les favoris" : "Filter favourites"} options={[{ value: "all", label: locale === "fr" ? "Tous les genres et humeurs" : "All genres and moods" }, ...categories.map((value) => ({ value, label: value }))]} className="[&_[role=combobox]]:min-h-11" />
          {filtersActive && <Button variant="ghost" className="justify-self-start px-3 md:justify-self-end" onClick={() => { setQuery(""); setCategory("all"); }}><X size={15} />{locale === "fr" ? "Effacer" : "Clear"}</Button>}
          <p className="text-xs text-[var(--text-muted)] md:col-span-3">{activeFilteredTotal} {locale === "fr" ? `sur ${activeTotal} élément${activeTotal > 1 ? "s" : ""}` : `of ${activeTotal} item${activeTotal > 1 ? "s" : ""}`}</p>
        </section>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <ParigoLoader size="page" label={locale === "fr" ? "Chargement des favoris" : "Loading favourites"} />
        </div>
      ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
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
                  <div className="favorites-track-ledger search-results-ledger overflow-visible bg-[var(--surface)]">
                    <div className="search-results-ledger__header hidden min-h-10 items-center justify-between gap-6 border-b border-[var(--line-strong)] px-4 font-mono text-[.54rem] uppercase tracking-[.12em] text-[var(--text-muted)] xl:flex">
                      <span>{locale === "fr" ? "Titre · album" : "Title · album"}</span>
                      <span>{locale === "fr" ? "Tags · ambiance · tempo · durée · actions" : "Tags · mood · tempo · duration · actions"}</span>
                    </div>
                    {filteredTracks.map((track, index) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        album={albumFromTrack(track)}
                        index={index}
                        showWaveform={false}
                        density="full"
                        mobileLayout="dense"
                      />
                    ))}
                  </div>
                )}
              </div>
          </motion.div>
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
