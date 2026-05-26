"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Disc3,
  Music,
  ExternalLink,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { AlbumCard } from "@/components/features";
import { Button } from "@/components/ui";
import type { Album } from "@/types";

interface LabelDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string;
  website: string | null;
  albumCount: number;
  trackCount: number;
  albums: Album[];
}

export default function LabelDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [label, setLabel] = useState<LabelDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadLabel();
    }
  }, [slug]);

  const loadLabel = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/labels/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setLabel(data.label);
      } else if (response.status === 404) {
        setError("Label non trouvé");
      } else {
        setError("Erreur lors du chargement");
      }
    } catch (err) {
      console.error("Error loading label:", err);
      setError("Erreur lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 pb-32 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (error || !label) {
    return (
      <div className="min-h-screen pt-24 pb-32">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
              <Building2 size={40} className="text-[var(--color-gray-400)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-black)] mb-2">
              {error || "Label non trouvé"}
            </h3>
            <Link href="/labels">
              <Button variant="outline" className="mt-4 gap-2">
                <ArrowLeft size={18} />
                Retour aux labels
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="container mx-auto px-4 lg:px-6">
        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link
            href="/labels"
            className="inline-flex items-center gap-2 text-[var(--color-gray-600)] hover:text-[var(--color-black)] transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Tous les labels</span>
          </Link>
        </motion.div>

        {/* Label Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="bg-white border-2 border-[var(--color-black)] rounded-[var(--radius-lg)] shadow-[6px_6px_0px_var(--color-black)] overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Logo */}
              <div className="md:w-64 h-48 md:h-auto bg-gradient-to-br from-[var(--color-gray-100)] to-[var(--color-gray-200)] flex items-center justify-center p-8 border-b-2 md:border-b-0 md:border-r-2 border-[var(--color-black)]">
                {label.logo ? (
                  <Image
                    src={label.logo}
                    alt={label.name}
                    width={180}
                    height={90}
                    className="object-contain max-h-24"
                  />
                ) : (
                  <Building2 size={64} className="text-[var(--color-gray-400)]" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 p-6 md:p-8">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-black)] mb-2">
                      {label.name}
                    </h1>
                    {label.description && (
                      <p className="text-[var(--color-gray-600)] max-w-2xl">
                        {label.description}
                      </p>
                    )}
                  </div>
                  {label.website && (
                    <a
                      href={label.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <Button variant="outline" className="gap-2">
                        <ExternalLink size={16} />
                        Site web
                      </Button>
                    </a>
                  )}
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-6 mt-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center">
                      <Disc3 size={20} className="text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[var(--color-black)]">
                        {label.albumCount}
                      </p>
                      <p className="text-xs text-[var(--color-gray-500)]">
                        Album{label.albumCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[var(--color-secondary-light)] rounded-full flex items-center justify-center">
                      <Music size={20} className="text-[var(--color-secondary)]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[var(--color-black)]">
                        {label.trackCount}
                      </p>
                      <p className="text-xs text-[var(--color-gray-500)]">
                        Piste{label.trackCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Albums Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold text-[var(--color-black)] mb-6">
            Discographie
          </h2>

          {label.albums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--color-gray-100)] rounded-[var(--radius-md)]">
              <Disc3 size={48} className="text-[var(--color-gray-400)] mb-4" />
              <p className="text-[var(--color-gray-600)]">
                Aucun album disponible pour ce label.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {label.albums.map((album, index) => (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.03 }}
                >
                  <AlbumCard album={album} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
