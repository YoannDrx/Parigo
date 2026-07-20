"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Loader2, Trash2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { TrackRow } from "@/components/features";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

interface HistoryEntry {
  id: string;
  playedAt: string;
  track: {
    id: string;
    title: string;
    duration: number;
    bpm: number;
    waveform: number[];
    genres: { name: string }[];
    moods: { name: string }[];
    album?: {
      id: string;
      title: string;
      cover: string;
    };
  };
}

export default function HistoryPage() {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      loadHistory();
    }
  }, [session?.user]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/history");
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm(locale === "fr" ? "Êtes-vous sûr de vouloir effacer votre historique ?" : "Are you sure you want to clear your history?")) return;

    try {
      const response = await fetch("/api/user/history", {
        method: "DELETE",
      });
      if (response.ok) {
        setHistory([]);
      }
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  // Group history by date
  const groupedHistory = history.reduce(
    (acc, entry) => {
      const date = new Date(entry.playedAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    },
    {} as Record<string, HistoryEntry[]>
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
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

        {history.length > 0 && (
          <Button
            variant="outline"
            onClick={clearHistory}
            className="gap-2 text-red-500 border-red-500 hover:bg-red-50"
          >
            <Trash2 size={18} />
            <span className="hidden sm:inline">{locale === "fr" ? "Effacer" : "Clear"}</span>
          </Button>
        )}
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
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
            <Clock size={40} className="text-[var(--color-gray-400)]" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--color-black)] mb-2">
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
              <div className="space-y-2">
                {entries.map((entry, index) => (
                  <div key={entry.id} className="relative">
                    <TrackRow
                      track={{
                        id: entry.track.id,
                        title: entry.track.title,
                        duration: entry.track.duration,
                        bpm: entry.track.bpm,
                        waveform: entry.track.waveform,
                        genres: entry.track.genres.map((g) => g.name),
                        moods: entry.track.moods.map((m) => m.name),
                        instruments: [],
                        isVocal: false,
                        audioUrl: null,
                        albumId: entry.track.album?.id || "",
                      }}
                      album={
                        entry.track.album
                          ? {
                              id: entry.track.album.id,
                              title: entry.track.album.title,
                              cover: entry.track.album.cover,
                              label: "",
                              trackCount: 0,
                              genres: [],
                              releaseDate: "",
                              tracks: [],
                            }
                          : undefined
                      }
                      index={index}
                      showWaveform={false}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--color-gray-400)]">
                      {new Date(entry.playedAt).toLocaleTimeString(locale === "fr" ? "fr-FR" : "en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
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
