"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Music, Users, Disc3, TrendingUp, Loader2 } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import {
  AlbumCarousel,
  Carousel,
  PlaylistCard,
  SearchBar,
  MiniPlayer,
  SyncCard,
} from "@/components/features";
import type { Sync } from "@/components/features";
import { useFeaturedAlbums, useFeaturedPlaylists } from "@/hooks/use-api";
import type { Album, Playlist } from "@/types";

// Synchronizations data
const syncsData: Sync[] = [
  {
    slug: "cobra-kai",
    title: "COBRA KAI",
    subtitle: "Louis Vie",
    cover: "/images/synchros/cobra-kai.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=OdkAgKz6p8E",
  },
  {
    slug: "tokyo-vice",
    title: "Tokyo Vice",
    subtitle: "HBO Max",
    cover: "/images/synchros/tokyo-vice.jpg",
    youtubeUrl: null,
  },
  {
    slug: "emily",
    title: "Emily in Paris",
    subtitle: "Netflix",
    cover: "/images/synchros/emily.jpg",
    youtubeUrl: null,
  },
  {
    slug: "bad-boys",
    title: "Bad Boys",
    subtitle: "Hey Boy",
    cover: "/images/synchros/bad-boys-hey-boy.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=6xkrqHRGwx0",
  },
  {
    slug: "captain-fall",
    title: "Captain Fall",
    subtitle: "Netflix",
    cover: "/images/synchros/captain-fall-cover.jpg",
    youtubeUrl: "https://www.youtube.com/watch?v=KES5ncRZxBA",
  },
  {
    slug: "monkey-man",
    title: "Monkey Man",
    subtitle: "Universal Pictures",
    cover: "/images/synchros/monkey-man.jpg",
    youtubeUrl: null,
  },
  {
    slug: "control-z",
    title: "Control Z",
    subtitle: "Netflix",
    cover: "/images/synchros/control-z.jpg",
    youtubeUrl: null,
  },
  {
    slug: "le-monde-de-demain",
    title: "Le Monde de Demain",
    subtitle: "Arte",
    cover: "/images/synchros/lemondededemain.jpg",
    youtubeUrl: null,
  },
  {
    slug: "tapie",
    title: "Tapie",
    subtitle: "Netflix",
    cover: "/images/synchros/tapie-photo.jpg",
    youtubeUrl: null,
  },
  {
    slug: "i-am-georgina",
    title: "I Am Georgina",
    subtitle: "Netflix",
    cover: "/images/synchros/i-am-georgina.jpg",
    youtubeUrl: null,
  },
];

const stats = [
  { icon: Music, value: "350k+", label: "Œuvres" },
  { icon: Users, value: "100+", label: "Labels" },
  { icon: Disc3, value: "7k+", label: "Albums" },
  { icon: TrendingUp, value: "1000+", label: "Sorties/an" },
];

// Transform API album to component format
function transformAlbum(apiAlbum: {
  id: string;
  slug?: string;
  title: string;
  cover: string;
  label: string;
  trackCount: number;
  genres: Array<{ name: string; slug: string; color?: string }>;
}): Album {
  return {
    id: apiAlbum.slug || apiAlbum.id,
    slug: apiAlbum.slug,
    title: apiAlbum.title,
    cover: apiAlbum.cover,
    label: apiAlbum.label,
    trackCount: apiAlbum.trackCount,
    genres: apiAlbum.genres.map((g) => g.name),
  };
}

// Transform API playlist to component format
function transformPlaylist(apiPlaylist: {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  cover: string;
  category?: string;
  trackCount: number;
}): Playlist {
  return {
    id: apiPlaylist.slug || apiPlaylist.id,
    slug: apiPlaylist.slug,
    title: apiPlaylist.title,
    description: apiPlaylist.description,
    cover: apiPlaylist.cover,
    category: apiPlaylist.category,
    trackCount: apiPlaylist.trackCount,
  };
}

export default function HomePage() {
  const { data: albumsData, isLoading: albumsLoading } = useFeaturedAlbums(12);
  const { data: playlistsData, isLoading: playlistsLoading } = useFeaturedPlaylists(10);

  const latestAlbums = albumsData?.albums.map(transformAlbum) ?? [];
  const featuredPlaylists = playlistsData?.playlists.map(transformPlaylist) ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                var(--color-black) 0,
                var(--color-black) 1px,
                transparent 0,
                transparent 50%
              )`,
              backgroundSize: "20px 20px"
            }} />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-[var(--color-black)] mb-6">
                Music For
                <span className="block text-[var(--color-primary)]">Images</span>
              </h1>
              <p className="text-lg md:text-xl text-[var(--color-gray-600)] max-w-2xl mx-auto mb-10">
                La bibliothèque de musique de production pour tous vos projets audiovisuels.
                Films, séries, publicités, documentaires.
              </p>

              {/* Search Bar */}
              <div className="max-w-2xl mx-auto mb-12">
                <SearchBar size="lg" placeholder="Rechercher par titre, genre, mood, instrument..." />
              </div>

              {/* Quick Links */}
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/search?genre=cinematic">
                  <Button variant="outline" size="md">Cinématique</Button>
                </Link>
                <Link href="/search?genre=electronic">
                  <Button variant="outline" size="md">Électronique</Button>
                </Link>
                <Link href="/search?mood=uplifting">
                  <Button variant="outline" size="md">Uplifting</Button>
                </Link>
                <Link href="/search?mood=epic">
                  <Button variant="outline" size="md">Épique</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-[var(--color-black)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center"
                >
                  <stat.icon className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-2" />
                  <p className="text-3xl md:text-4xl font-bold text-white mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-white/60">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Latest Releases */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-black)]">
                Dernières Sorties
              </h2>
              <Link href="/albums">
                <Button variant="ghost" size="sm" className="gap-2">
                  Voir tout <ArrowRight size={16} />
                </Button>
              </Link>
            </div>

            {albumsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : (
              <AlbumCarousel
                albums={latestAlbums}
                itemsPerView={{ mobile: 2, tablet: 3, desktop: 5 }}
              />
            )}
          </div>
        </section>

        {/* Featured Playlists */}
        <section className="py-16 md:py-24 bg-[var(--color-gray-100)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-black)]">
                Playlists Populaires
              </h2>
              <Link href="/playlists">
                <Button variant="ghost" size="sm" className="gap-2">
                  Voir tout <ArrowRight size={16} />
                </Button>
              </Link>
            </div>

            {playlistsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : (
              <Carousel
                itemsPerView={{ mobile: 1, tablet: 2, desktop: 4 }}
                gap={24}
              >
                {featuredPlaylists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </Carousel>
            )}
          </div>
        </section>

        {/* Syncs / Clients */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-black)] mb-4">
                Nos Synchronisations
              </h2>
              <p className="text-[var(--color-gray-600)] max-w-2xl mx-auto">
                Chaque année, Parigo met en musique plusieurs centaines d&apos;heures de programmes
                pour la télévision, le cinéma et la publicité.
              </p>
            </div>

            <Carousel
              itemsPerView={{ mobile: 1, tablet: 2, desktop: 4 }}
              gap={24}
            >
              {syncsData.map((sync) => (
                <SyncCard key={sync.slug} sync={sync} />
              ))}
            </Carousel>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-[var(--color-primary)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Card
              hover={false}
              padding="lg"
              className="text-center max-w-3xl mx-auto bg-white"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-black)] mb-4">
                Prêt à trouver la musique parfaite ?
              </h2>
              <p className="text-[var(--color-gray-600)] mb-8 max-w-xl mx-auto">
                Explorez notre catalogue de plus de 350 000 œuvres et trouvez
                la bande sonore idéale pour votre projet.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/search">
                  <Button variant="primary" size="lg">
                    Explorer le catalogue
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" size="lg">
                    Nous contacter
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
      <MiniPlayer />
    </div>
  );
}
