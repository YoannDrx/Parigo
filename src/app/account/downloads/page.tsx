"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, FileAudio, Calendar, Tag } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui";
import { formatDuration } from "@/lib/utils";

interface DownloadEntry {
  id: string;
  downloadedAt: string;
  licenseType: string;
  projectName: string;
  track: {
    id: string;
    title: string;
    duration: number;
    album?: {
      id: string;
      title: string;
      cover: string;
    };
  };
}

const licenseLabels: Record<string, { label: string; color: string }> = {
  PREVIEW: { label: "Preview", color: "bg-gray-100 text-gray-600" },
  STANDARD: { label: "Standard", color: "bg-blue-100 text-blue-600" },
  EXTENDED: { label: "Extended", color: "bg-purple-100 text-purple-600" },
  EXCLUSIVE: { label: "Exclusive", color: "bg-amber-100 text-amber-600" },
};

export default function DownloadsPage() {
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
        setDownloads(data.downloads || []);
      }
    } catch (error) {
      console.error("Error loading downloads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <Download size={24} className="text-green-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-black)]">
            Téléchargements
          </h1>
          <p className="text-[var(--color-gray-600)]">
            {downloads.length} téléchargement{downloads.length > 1 ? "s" : ""}
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
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
            <Download size={40} className="text-[var(--color-gray-400)]" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--color-black)] mb-2">
            Aucun téléchargement
          </h3>
          <p className="text-[var(--color-gray-600)] max-w-md">
            Vos pistes téléchargées avec licence apparaîtront ici
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
                className="bg-white border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[3px_3px_0px_var(--color-black)] p-4"
              >
                <div className="flex items-center gap-4">
                  {/* Cover */}
                  <div className="w-16 h-16 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-gray-100)] flex-shrink-0">
                    {download.track.album?.cover ? (
                      <img
                        src={download.track.album.cover}
                        alt={download.track.album.title}
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
                    <h3 className="font-semibold text-[var(--color-black)] truncate">
                      {download.track.title}
                    </h3>
                    {download.track.album && (
                      <p className="text-sm text-[var(--color-gray-600)] truncate">
                        {download.track.album.title}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-gray-500)]">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(download.downloadedAt).toLocaleDateString("fr-FR")}
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
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${license.color}`}
                  >
                    {license.label}
                  </div>

                  {/* Re-download Button */}
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download size={16} />
                    <span className="hidden sm:inline">Télécharger</span>
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
