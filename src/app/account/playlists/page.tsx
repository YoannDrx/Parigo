"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ListMusic, Plus, Loader2, Lock, Globe } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui";

interface UserPlaylist {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover: string;
  trackCount: number;
  isPublic: boolean;
  createdAt: string;
}

export default function PlaylistsPage() {
  const { data: session } = useSession();
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      loadPlaylists();
    }
  }, [session?.user]);

  const loadPlaylists = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/playlists");
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data.playlists || []);
      }
    } catch (error) {
      console.error("Error loading playlists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[var(--color-secondary-light)] rounded-full flex items-center justify-center">
            <ListMusic size={24} className="text-[var(--color-secondary)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-black)]">
              Mes playlists
            </h1>
            <p className="text-[var(--color-gray-600)]">
              {playlists.length} playlist{playlists.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Button variant="primary" className="gap-2">
          <Plus size={18} />
          <span className="hidden sm:inline">Créer une playlist</span>
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
        </div>
      ) : playlists.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-20 h-20 bg-[var(--color-gray-100)] rounded-full flex items-center justify-center mb-4">
            <ListMusic size={40} className="text-[var(--color-gray-400)]" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--color-black)] mb-2">
            Aucune playlist
          </h3>
          <p className="text-[var(--color-gray-600)] mb-6 max-w-md">
            Créez votre première playlist pour organiser vos pistes préférées
          </p>
          <Button variant="primary" className="gap-2">
            <Plus size={18} />
            Créer ma première playlist
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist, index) => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/playlists/${playlist.slug}`}>
                <div className="bg-white border-2 border-[var(--color-black)] rounded-[var(--radius-md)] shadow-[4px_4px_0px_var(--color-black)] overflow-hidden hover:shadow-[6px_6px_0px_var(--color-black)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                  <div className="aspect-square relative">
                    <img
                      src={playlist.cover || "/images/placeholder-playlist.jpg"}
                      alt={playlist.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      {playlist.isPublic ? (
                        <div className="bg-green-500 text-white p-1.5 rounded-full">
                          <Globe size={14} />
                        </div>
                      ) : (
                        <div className="bg-[var(--color-gray-600)] text-white p-1.5 rounded-full">
                          <Lock size={14} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[var(--color-black)] truncate">
                      {playlist.title}
                    </h3>
                    <p className="text-sm text-[var(--color-gray-600)]">
                      {playlist.trackCount} piste{playlist.trackCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
