"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Music, Users, Disc3, TrendingUp } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { AlbumCard, PlaylistCard, SearchBar, MiniPlayer } from "@/components/features";
import { mockAlbums, mockPlaylists, mockSyncs } from "@/lib/mock-data";

const stats = [
  { icon: Music, value: "350k+", label: "Œuvres" },
  { icon: Users, value: "100+", label: "Labels" },
  { icon: Disc3, value: "7k+", label: "Albums" },
  { icon: TrendingUp, value: "1000+", label: "Sorties/an" },
];

export default function HomePage() {
  const latestAlbums = mockAlbums.slice(0, 6);
  const featuredPlaylists = mockPlaylists.slice(0, 4);

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
                <Link href="/search?genre=Cinematic">
                  <Button variant="outline" size="md">Cinématique</Button>
                </Link>
                <Link href="/search?genre=Electronic">
                  <Button variant="outline" size="md">Électronique</Button>
                </Link>
                <Link href="/search?mood=Uplifting">
                  <Button variant="outline" size="md">Uplifting</Button>
                </Link>
                <Link href="/search?mood=Epic">
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {latestAlbums.map((album, index) => (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <AlbumCard album={album} priority={index < 3} />
                </motion.div>
              ))}
            </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredPlaylists.map((playlist, index) => (
                <motion.div
                  key={playlist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <PlaylistCard playlist={playlist} />
                </motion.div>
              ))}
            </div>
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

            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
              {mockSyncs.map((sync, index) => (
                <motion.div
                  key={sync.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative w-24 h-12 md:w-32 md:h-16 grayscale hover:grayscale-0 transition-all duration-300"
                >
                  <Image
                    src={sync.logo}
                    alt={sync.name}
                    fill
                    sizes="128px"
                    className="object-contain"
                  />
                </motion.div>
              ))}
            </div>
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
