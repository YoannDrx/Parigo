"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronDown, Clock } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useSession } from "@/lib/auth-client";
import { TrackRow } from "@/components/features";
import { useI18n } from "@/components/providers/I18nProvider";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { formatParigoDate, formatParigoTime } from "@/lib/date-time";
import type { Album, Track } from "@/types";

interface HistoryEntry {
  id: string;
  playedAt: string;
  track: Track;
}

interface GroupedHistoryEntry extends HistoryEntry {
  playedAts: string[];
}

function albumFromTrack(track: Track): Album | undefined {
  if (!track.albumId) return undefined;
  return { id: track.albumId, slug: track.albumSlug, title: track.albumTitle || "", code: track.albumCode || track.cdCode, cover: track.albumCover || "/images/placeholder-album.svg", label: track.albumLabel || "", labelSlug: track.albumLabelSlug, genres: track.genres, moods: track.moods, trackCount: 0 };
}

export default function HistoryPage() {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { data: history = [], isLoading } = useQuery<HistoryEntry[]>({
    queryKey: ["account", "history", userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/user/history", { cache: "no-store", signal });
      if (!response.ok) throw new Error("history fetch failed");
      const data = await response.json();
      return data.data?.history || [];
    },
  });

  const groupedHistory = useMemo(() => {
    const sortedHistory = [...history].sort((a, b) => {
      const aTime = Date.parse(a.playedAt);
      const bTime = Date.parse(b.playedAt);
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
    return sortedHistory.reduce((acc, entry) => {
      const date = formatParigoDate(entry.playedAt, locale === "fr" ? "fr-FR" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (!acc[date]) acc[date] = [];
      const previousEntry = acc[date].at(-1);
      if (previousEntry?.track.id === entry.track.id) {
        previousEntry.playedAts.push(entry.playedAt);
      } else {
        acc[date].push({ ...entry, playedAts: [entry.playedAt] });
      }
      return acc;
    }, {} as Record<string, GroupedHistoryEntry[]>);
  }, [history, locale]);

  return (
    <div className="account-page grid gap-[var(--space-account-flow)]">
      <AccountPageHeader
        icon={Clock}
        eyebrow={locale === "fr" ? "Le fil de vos écoutes" : "Your listening trail"}
        title={t("account.history")}
        description={locale === "fr" ? `${history.length} écoute${history.length > 1 ? "s" : ""} pour reprendre une piste là où l’intuition est née.` : `${history.length} listen${history.length === 1 ? "" : "s"} to pick up a track where the idea began.`}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <ParigoLoader size="page" label={locale === "fr" ? "Chargement de l’historique" : "Loading history"} />
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
        <div className="grid gap-[var(--space-account-flow)]">
          {Object.entries(groupedHistory).map(([date, entries], groupIndex) => (
            <motion.details
              key={date}
              open
              data-testid="history-day"
              className="history-day-group group/day"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <summary className="history-day-group__summary flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 border-y border-[var(--line)] py-3 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-3">
                  <span aria-hidden="true" className="history-day-group__index font-mono text-[.58rem] text-[var(--signal-strong)]">{String(groupIndex + 1).padStart(2, "0")}</span>
                  <span className="truncate text-sm font-semibold uppercase tracking-[.08em] text-[var(--foreground)]">{date}</span>
                  {(() => {
                    const listenCount = entries.reduce((total, entry) => total + entry.playedAts.length, 0);
                    return <span className="shrink-0 font-mono text-[.56rem] uppercase tracking-[.08em] text-[var(--text-muted)]">{listenCount} {locale === "fr" ? (listenCount === 1 ? "écoute" : "écoutes") : (listenCount === 1 ? "listen" : "listens")}</span>;
                  })()}
                </span>
                <span className="history-day-group__toggle flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--line)] text-[var(--text-muted)]">
                  <ChevronDown size={15} className="transition-transform duration-200 group-open/day:rotate-180" />
                </span>
              </summary>
              <div className="history-day-group__content">
                <div className="history-results-ledger search-results-ledger overflow-visible border border-[var(--line-strong)] bg-[var(--surface)]">
                  <div className="search-results-ledger__header hidden min-h-10 items-center justify-between gap-6 border-b border-[var(--line-strong)] px-4 font-mono text-[.54rem] uppercase tracking-[.12em] text-[var(--text-muted)] xl:flex">
                    <span>{locale === "fr" ? "Heure · titre · album · waveform" : "Time · title · album · waveform"}</span>
                    <span>{locale === "fr" ? "Tempo · durée · actions" : "Tempo · duration · actions"}</span>
                  </div>
                  {entries.map((entry, index) => (
                    <div
                      key={entry.id}
                      data-testid="history-entry"
                      data-listen-count={entry.playedAts.length}
                      className="history-track-row"
                    >
                      <TrackRow
                        track={entry.track}
                        album={albumFromTrack(entry.track)}
                        index={index}
                        density="full"
                        condensedActions
                        showTags={false}
                        mobileLayout="history"
                        leadingMeta={<>
                          <span className="font-mono text-[.5rem] uppercase tracking-[.08em] text-[var(--text-muted)]">
                            {entry.playedAts.length > 1
                              ? `${entry.playedAts.length} ${locale === "fr" ? "écoutes" : "listens"}`
                              : (locale === "fr" ? "Écouté" : "Played")}
                          </span>
                          <span className="flex flex-col gap-0.5">
                            {entry.playedAts.map((playedAt) => (
                              <time
                                key={playedAt}
                                dateTime={playedAt}
                                data-testid="history-played-at"
                                className="font-mono text-[.7rem] font-semibold tracking-[.03em] text-[var(--foreground)]"
                              >
                                {formatParigoTime(playedAt, locale === "fr" ? "fr-FR" : "en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </time>
                            ))}
                          </span>
                        </>}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </motion.details>
          ))}
        </div>
      )}
    </div>
  );
}
