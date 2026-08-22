"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Download, FileAudio, Tag } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/components/providers/I18nProvider";
import { formatParigoDate, formatParigoTime } from "@/lib/date-time";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import type { Track } from "@/types";
import { DownloadButton } from "@/components/features/DownloadButton";

interface DownloadEntry {
  id: string;
  downloadedAt: string;
  itemType?: string;
  utcOffsetHours?: number;
  licenseType: string;
  projectName: string;
  track: Track;
}

const licenseLabels: Record<string, { label: string; color: string }> = {
  PREVIEW: { label: "Preview", color: "bg-gray-100 text-gray-600" },
  STANDARD: { label: "Standard", color: "bg-blue-100 text-blue-600" },
  EXTENDED: { label: "Extended", color: "bg-purple-100 text-purple-600" },
  EXCLUSIVE: { label: "Exclusive", color: "bg-amber-100 text-amber-600" },
};

export default function DownloadsPage() {
  const { locale, t, localizedPath } = useI18n();
  const { data: session } = useSession();
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    let active = true;

    void fetch("/api/user/downloads")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active) setDownloads(data?.data?.downloads ?? []);
      })
      .catch((error) => {
        console.error("Error loading downloads:", error);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session?.user]);

  return (
    <div className="account-page grid gap-[var(--space-account-flow)]">
      <AccountPageHeader
        icon={Download}
        eyebrow={locale === "fr" ? "Vos fichiers autorisés" : "Your authorised files"}
        title={t("account.downloads")}
        description={locale === "fr" ? `${downloads.length} téléchargement${downloads.length > 1 ? "s" : ""} associé${downloads.length > 1 ? "s" : ""} à vos projets.` : `${downloads.length} download${downloads.length === 1 ? "" : "s"} associated with your projects.`}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <ParigoLoader size="page" label={locale === "fr" ? "Chargement des téléchargements" : "Loading downloads"} />
        </div>
      ) : downloads.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="account-empty flex flex-col items-center justify-center px-6 py-20 text-center"
        >
          <div className="w-20 h-20 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
            <Download size={40} className="text-[var(--color-gray-400)]" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
            {locale === "fr" ? "Aucun téléchargement" : "No downloads"}
          </h3>
          <p className="text-[var(--color-gray-600)] max-w-md">
            {locale === "fr" ? "Vos pistes téléchargées avec licence apparaîtront ici." : "Your licensed downloads will appear here."}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {downloads.map((download, index) => {
            const license = licenseLabels[download.licenseType];
            const albumId = download.track.albumSlug || download.track.albumId;
            const trackTarget = albumId
              ? `${localizedPath(`/albums/${albumId}`)}?track=${encodeURIComponent(download.track.id)}`
              : null;
            return (
              <motion.div
                key={download.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="parigo-frame border border-[var(--line)] bg-[var(--surface)] p-4"
              >
                <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-4 md:grid-cols-[4rem_minmax(0,1fr)_auto]">
                  {/* Cover */}
                  <div className="media-frame h-16 w-16 flex-shrink-0 overflow-hidden border border-[var(--color-gray-100)]">
                    {download.track.albumCover ? (
                      <Image
                        src={download.track.albumCover}
                        alt={download.track.albumTitle || ""}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--color-gray-100)] flex items-center justify-center">
                        <FileAudio size={24} className="text-[var(--color-gray-400)]" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {trackTarget ? (
                      <h3 className="min-w-0">
                        <Link href={trackTarget} className="download-track-title block truncate font-semibold text-[var(--foreground)] transition-colors hover:text-[var(--signal-strong)] focus-visible:text-[var(--signal-strong)] focus-visible:outline-none focus-visible:underline focus-visible:decoration-[var(--signal-strong)] focus-visible:underline-offset-4">
                          {download.track.title}
                        </Link>
                      </h3>
                    ) : (
                      <h3 className="truncate font-semibold text-[var(--foreground)]">{download.track.title}</h3>
                    )}
                    {download.track.albumId && (
                      <p className="text-sm text-[var(--color-gray-600)] truncate">
                        {download.track.albumTitle}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-gray-500)]">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatParigoDate(download.downloadedAt, locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium" })}
                        <span aria-hidden="true">·</span>
                        {formatParigoTime(download.downloadedAt, locale === "fr" ? "fr-FR" : "en-GB")}
                      </span>
                      {download.projectName && (
                        <span className="flex items-center gap-1">
                          <Tag size={12} />
                          {download.projectName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end">
                    <DownloadButton
                      trackId={download.track.id}
                      trackTitle={download.track.title}
                      label={locale === "fr" ? "Re-télécharger" : "Download again"}
                      className="bg-[color-mix(in_srgb,var(--signal)_7%,var(--surface))]"
                    />
                    {license ? (
                      <span className={`parigo-tag px-3 py-1.5 text-xs font-medium ${license.color}`}>{license.label}</span>
                    ) : null}
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
