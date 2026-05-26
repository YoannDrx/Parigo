"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Building2, Disc3, ExternalLink, Loader2 } from "lucide-react";

interface Label {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string;
  website: string | null;
  albumCount: number;
}

export default function LabelsPage() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLabels();
  }, []);

  const loadLabels = async () => {
    try {
      const response = await fetch("/api/labels");
      if (response.ok) {
        const data = await response.json();
        setLabels(data.labels || []);
      }
    } catch (error) {
      console.error("Error loading labels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="container mx-auto px-4 lg:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-[var(--color-accent)] rounded-[var(--radius-md)] border-2 border-[var(--color-black)] shadow-[3px_3px_0px_var(--color-black)] flex items-center justify-center">
              <Building2 size={28} className="text-[var(--color-black)]" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[var(--color-black)]">
                Labels
              </h1>
              <p className="text-[var(--color-gray-600)]">
                {labels.length} label{labels.length > 1 ? "s" : ""} partenaires
              </p>
            </div>
          </div>
          <p className="text-lg text-[var(--color-gray-600)] max-w-2xl">
            Découvrez nos labels partenaires et explorez leurs catalogues musicaux.
          </p>
        </motion.div>

        {/* Labels Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
          </div>
        ) : labels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
              <Building2 size={40} className="text-[var(--color-gray-400)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-black)] mb-2">
              Aucun label
            </h3>
            <p className="text-[var(--color-gray-600)]">
              Les labels seront bientôt disponibles.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {labels.map((label, index) => (
              <motion.div
                key={label.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/labels/${label.slug}`}>
                  <div className="group bg-white border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[4px_4px_0px_var(--color-black)] overflow-hidden hover:shadow-[6px_6px_0px_var(--color-black)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                    {/* Logo Header */}
                    <div className="relative h-32 bg-gradient-to-br from-[var(--color-gray-100)] to-[var(--color-gray-200)] flex items-center justify-center">
                      {label.logo ? (
                        <Image
                          src={label.logo}
                          alt={label.name}
                          width={120}
                          height={60}
                          className="object-contain max-h-16"
                        />
                      ) : (
                        <Building2 size={48} className="text-[var(--color-gray-400)]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h2 className="text-xl font-bold text-[var(--color-black)] group-hover:text-[var(--color-primary)] transition-colors">
                          {label.name}
                        </h2>
                        {label.website && (
                          <a
                            href={label.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-full hover:bg-[var(--color-gray-100)] transition-colors"
                          >
                            <ExternalLink size={16} className="text-[var(--color-gray-400)]" />
                          </a>
                        )}
                      </div>

                      {label.description && (
                        <p className="text-sm text-[var(--color-gray-600)] mb-4 line-clamp-2">
                          {label.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-sm text-[var(--color-gray-500)]">
                        <Disc3 size={16} />
                        <span>{label.albumCount} album{label.albumCount > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
