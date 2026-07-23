"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { TrackRow } from "@/components/features";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Album, Track } from "@/types";

interface HistoryEntry {
  id: string;
  playedAt: string;
  track: Track;
}

function albumFromTrack(track: Track): Album | undefined {
  if (!track.albumId) return undefined;
  return { id: track.albumId, slug: track.albumSlug, title: track.albumTitle || "", cover: track.albumCover || "/images/placeholder-album.jpg", label: track.albumLabel || "Parigo", labelSlug: track.albumLabelSlug, genres: track.genres, moods: track.moods, trackCount: 0 };
}

export default function HistoryPage() {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void fetch("/api/user/history", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        setHistory(data.data?.history || []);
      })
      .catch((error) => {
        if (!controller.signal.aborted) console.error("Error loading history:", error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [userId]);

  const groupedHistory = useMemo(() => [...history]
    .sort((a, b) => {
      const aTime = Date.parse(a.playedAt);
      const bTime = Date.parse(b.playedAt);
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    })
    .reduce((acc, entry) => {
      const date = new Date(entry.playedAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(entry);
      return acc;
    }, {} as Record<string, HistoryEntry[]>), [history, locale]);

  return (
    <div className="account-page space-y-8">
      {/* Page Header */}
      <div className="account-page__header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="account-page__mark">
            <Clock size={24} className="text-blue-500" />
          </div>
          <div>
            <h1 className="font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">
              {t("account.history")}
            </h1>
            <p className="text-[var(--color-gray-600)]">
              {history.length} {locale === "fr" ? `écoute${history.length > 1 ? "s" : ""}` : `listen${history.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        </div>
      ) : history.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="account-empty flex flex-col items-center justify-center px-6 py-20 text-center"
        >
          <div className="w-20 h-20 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
            <Clock size={40} className="text-[var(--color-gray-400)]" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
            {locale === "fr" ? "Aucun historique" : "No listening history"}
          </h3>
          <p className="text-[var(--color-gray-600)] max-w-md">
            {locale === "fr" ? "Votre historique d’écoute apparaîtra ici." : "Your listening history will appear here."}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedHistory).map(([date, entries]) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="text-sm font-semibold text-[var(--color-gray-600)] uppercase tracking-wide mb-3">
                {date}
              </h3>
              <div className="parigo-frame overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
                {entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    data-testid="history-entry"
                    className="grid border-b border-[var(--line)] last:border-b-0 sm:grid-cols-[5.75rem_minmax(0,1fr)]"
                  >
                    <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-2 font-mono text-[.58rem] uppercase tracking-[.1em] text-[var(--text-muted)] sm:flex-col sm:items-start sm:justify-center sm:gap-1 sm:border-b-0 sm:border-r sm:px-4 sm:py-3">
                      <span>{locale === "fr" ? "Écouté à" : "Played at"}</span>
                      <time
                        dateTime={entry.playedAt}
                        data-testid="history-played-at"
                        className="text-[.68rem] font-semibold tracking-[.04em] text-[var(--foreground)]"
                      >
                        {new Date(entry.playedAt).toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <div className="min-w-0 [&>div]:border-b-0">
                      <TrackRow
                        track={entry.track}
                        album={albumFromTrack(entry.track)}
                        index={index}
                        showWaveform={false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
