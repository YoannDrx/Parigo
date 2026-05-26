"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Users,
  Disc3,
  Music,
  ArrowLeft,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { AlbumCard, TrackRow } from "@/components/features";
import { Button, Tag } from "@/components/ui";
import type { Album, Track } from "@/types";

// Social platform icons (simplified - you could use react-icons for more)
const socialIcons: Record<string, string> = {
  spotify: "🎵",
  instagram: "📷",
  twitter: "🐦",
  facebook: "📘",
  youtube: "🎬",
  soundcloud: "☁️",
  bandcamp: "🎸",
  website: "🌐",
};

interface ArtistLink {
  id: string;
  platform: string;
  url: string;
  label: string | null;
}

interface ArtistDetail {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  image: string | null;
  links: ArtistLink[];
  albumCount: number;
  trackCount: number;
  albums: Album[];
  featuredTracks: Track[];
}

export default function ArtistDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"albums" | "tracks">("albums");

  useEffect(() => {
    if (slug) {
      loadArtist();
    }
  }, [slug]);

  const loadArtist = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/artists/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setArtist(data.artist);
      } else if (response.status === 404) {
        setError("Artiste non trouvé");
      } else {
        setError("Erreur lors du chargement");
      }
    } catch (err) {
      console.error("Error loading artist:", err);
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

  if (error || !artist) {
    return (
      <div className="min-h-screen pt-24 pb-32">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
              <Users size={40} className="text-[var(--color-gray-400)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-black)] mb-2">
              {error || "Artiste non trouvé"}
            </h3>
            <Link href="/artists">
              <Button variant="outline" className="mt-4 gap-2">
                <ArrowLeft size={18} />
                Retour aux artistes
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
            href="/artists"
            className="inline-flex items-center gap-2 text-[var(--color-gray-600)] hover:text-[var(--color-black)] transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Tous les artistes</span>
          </Link>
        </motion.div>

        {/* Artist Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="bg-white border-2 border-[var(--color-black)] rounded-[var(--radius-lg)] shadow-[6px_6px_0px_var(--color-black)] overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Image */}
              <div className="md:w-72 h-72 md:h-auto relative border-b-2 md:border-b-0 md:border-r-2 border-[var(--color-black)]">
                {artist.image ? (
                  <Image
                    src={artist.image}
                    alt={artist.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 288px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center">
                    <span className="text-white text-8xl font-bold">
                      {artist.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 p-6 md:p-8">
                <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-black)] mb-4">
                  {artist.name}
                </h1>

                {artist.bio && (
                  <p className="text-[var(--color-gray-600)] mb-6 max-w-2xl">
                    {artist.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center">
                      <Disc3 size={20} className="text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[var(--color-black)]">
                        {artist.albumCount}
                      </p>
                      <p className="text-xs text-[var(--color-gray-500)]">
                        Album{artist.albumCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[var(--color-secondary-light)] rounded-full flex items-center justify-center">
                      <Music size={20} className="text-[var(--color-secondary)]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[var(--color-black)]">
                        {artist.trackCount}
                      </p>
                      <p className="text-xs text-[var(--color-gray-500)]">
                        Piste{artist.trackCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                {artist.links.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {artist.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--color-gray-100)] rounded-full text-sm font-medium text-[var(--color-gray-700)] hover:bg-[var(--color-gray-200)] transition-colors"
                      >
                        <span>{socialIcons[link.platform.toLowerCase()] || "🔗"}</span>
                        <span className="capitalize">
                          {link.label || link.platform}
                        </span>
                        <ExternalLink size={12} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("albums")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all ${
                activeTab === "albums"
                  ? "bg-[var(--color-black)] text-white border-[var(--color-black)]"
                  : "bg-white text-[var(--color-black)] border-[var(--color-black)] hover:shadow-[2px_2px_0px_var(--color-black)]"
              }`}
            >
              <Disc3 size={18} />
              <span className="font-medium">Albums</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === "albums"
                    ? "bg-white text-[var(--color-black)]"
                    : "bg-[var(--color-gray-100)] text-[var(--color-gray-600)]"
                }`}
              >
                {artist.albums.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("tracks")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all ${
                activeTab === "tracks"
                  ? "bg-[var(--color-black)] text-white border-[var(--color-black)]"
                  : "bg-white text-[var(--color-black)] border-[var(--color-black)] hover:shadow-[2px_2px_0px_var(--color-black)]"
              }`}
            >
              <Music size={18} />
              <span className="font-medium">Pistes</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === "tracks"
                    ? "bg-white text-[var(--color-black)]"
                    : "bg-[var(--color-gray-100)] text-[var(--color-gray-600)]"
                }`}
              >
                {artist.featuredTracks.length}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {activeTab === "albums" ? (
            artist.albums.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--color-gray-100)] rounded-[var(--radius-md)]">
                <Disc3 size={48} className="text-[var(--color-gray-400)] mb-4" />
                <p className="text-[var(--color-gray-600)]">
                  Aucun album disponible.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {artist.albums.map((album, index) => (
                  <motion.div
                    key={album.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <AlbumCard album={album} />
                  </motion.div>
                ))}
              </div>
            )
          ) : artist.featuredTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-[var(--color-gray-100)] rounded-[var(--radius-md)]">
              <Music size={48} className="text-[var(--color-gray-400)] mb-4" />
              <p className="text-[var(--color-gray-600)]">
                Aucune piste disponible.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {artist.featuredTracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  album={
                    track.albumId
                      ? {
                          id: track.albumId,
                          title: track.albumTitle || "",
                          cover: track.albumCover || "/images/placeholder-album.jpg",
                          label: "",
                          trackCount: 0,
                          genres: [],
                        }
                      : undefined
                  }
                  index={index}
                  showWaveform={true}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
