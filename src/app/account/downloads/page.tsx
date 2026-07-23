"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Download, Loader2, FileAudio, Calendar, Tag } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Track } from "@/types";

interface DownloadEntry {
  id: string;
  downloadedAt: string;
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
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      loadDownloads();
    }
  }, [session?.user]);

  const loadDownloads = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/downloads");
      if (response.ok) {
        const data = await response.json();
        setDownloads(data.data?.downloads || []);
      }
    } catch (error) {
      console.error("Error loading downloads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="account-page space-y-8">
      {/* Page Header */}
      <div className="account-page__header flex items-center gap-3">
        <div className="account-page__mark">
          <Download size={24} className="text-green-500" />
        </div>
        <div>
          <h1 className="font-[var(--font-editorial)] text-5xl font-normal tracking-[-.05em]">
            {t("account.downloads")}
          </h1>
          <p className="text-[var(--color-gray-600)]">
            {downloads.length} {locale === "fr" ? `téléchargement${downloads.length > 1 ? "s" : ""}` : `download${downloads.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
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
            const license = licenseLabels[download.licenseType] || licenseLabels.PREVIEW;
            return (
              <motion.div
                key={download.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="parigo-frame border border-[var(--line)] bg-[var(--surface)] p-4"
              >
                <div className="flex items-center gap-4">
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
                    <h3 className="truncate font-semibold text-[var(--foreground)]">
                      {download.track.title}
                    </h3>
                    {download.track.albumId && (
                      <p className="text-sm text-[var(--color-gray-600)] truncate">
                        {download.track.albumTitle}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-gray-500)]">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(download.downloadedAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB")}
                      </span>
                      {download.projectName && (
                        <span className="flex items-center gap-1">
                          <Tag size={12} />
                          {download.projectName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* License Badge */}
                  <div
                    className={`parigo-tag px-3 py-1.5 text-sm font-medium ${license.color}`}
                  >
                    {license.label}
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
