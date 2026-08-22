"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, FolderOpen, LogIn, Share2, Users } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { TrackRow } from "@/components/features/TrackRow";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui/Button";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { useSession } from "@/lib/auth-client";
import type { Album, Track } from "@/types";

interface SharedPlaylist {
  id: string;
  title: string;
  description?: string;
  tracks: Track[];
}

function albumForTrack(track: Track): Album {
  return {
    id: track.albumId,
    slug: track.albumSlug,
    title: track.albumTitle || "",
    code: track.albumCode || track.cdCode,
    cover: track.albumCover || "/images/placeholder-album.svg",
    label: track.albumLabel || "",
    genres: track.genres,
    moods: track.moods,
    trackCount: 0,
  };
}

export function SharedMusicExperience({ token, kind }: { token: string; kind: "playlist" | "folder" }) {
  const { locale, localizedPath } = useI18n();
  const { data: session, isPending: sessionPending } = useSession();
  const [playlists, setPlaylists] = useState<SharedPlaylist[]>([]);
  const [allowCollaboration, setAllowCollaboration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState<"AsCollaboration" | "AsCopy" | null>(null);
  const [accepted, setAccepted] = useState<"AsCollaboration" | "AsCopy" | null>(null);
  const [acceptError, setAcceptError] = useState("");
  const publicPath = kind === "folder"
    ? `/shared-playlistcategory/${encodeURIComponent(token)}`
    : `/engage-playlist/${encodeURIComponent(token)}`;

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/shared-music/${encodeURIComponent(token)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message || "Shared music unavailable");
        setPlaylists(payload.data?.playlists || []);
        setAllowCollaboration(payload.data?.allowCollaboration === true);
      })
      .catch((cause) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Shared music unavailable");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token]);

  const accept = async (acceptType: "AsCollaboration" | "AsCopy") => {
    setAccepting(acceptType);
    setAcceptError("");
    const response = await fetch(`/api/shared-music/${encodeURIComponent(token)}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptType }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) setAccepted(acceptType);
    else setAcceptError(payload?.error?.message || (locale === "fr"
      ? "La sélection n’a pas pu être ajoutée à votre compte."
      : "The selection could not be added to your account."));
    setAccepting(null);
  };

  const sharedLabel = kind === "folder"
    ? (locale === "fr" ? "Dossier de playlists partagé" : "Shared playlist folder")
    : (locale === "fr" ? "Playlist partagée" : "Shared playlist");

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-[var(--space-page-gutter)] pb-[var(--space-section-y-large)] pt-[var(--space-page-top)]">
        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <ParigoLoader size="page" label={locale === "fr" ? "Chargement du partage" : "Loading shared music"} />
          </div>
        ) : error || (kind === "playlist" && !playlists.length) ? (
          <div className="py-24 text-center">
            {kind === "folder" ? <FolderOpen className="mx-auto mb-6 opacity-30" size={44} /> : <Share2 className="mx-auto mb-6 opacity-30" size={44} />}
            <SignedTitle className="font-[var(--font-editorial)] text-5xl">
              {locale === "fr" ? "Partage indisponible" : "Share unavailable"}
            </SignedTitle>
            <p className="mt-4 text-[var(--text-muted)]">{error}</p>
          </div>
        ) : (
          <>
            <section className="parigo-frame mb-[var(--space-block-gap)] border border-[var(--line-strong)] bg-[var(--surface)] p-5 md:p-7" aria-labelledby="shared-music-actions">
              <p className="eyebrow text-[var(--signal-strong)]">{sharedLabel}</p>
              <h1 id="shared-music-actions" className="mt-3 font-[var(--font-editorial)] text-4xl tracking-[-.04em] md:text-5xl">
                {locale === "fr" ? "Ajoutez cette sélection à votre espace." : "Add this selection to your workspace."}
              </h1>
              {accepted ? (
                <div role="status" className="mt-6 border-l-2 border-[var(--signal-strong)] pl-4 text-sm text-[var(--text-muted)]">
                  <p>{accepted === "AsCollaboration"
                    ? (locale === "fr" ? "Collaboration acceptée : les prochaines modifications resteront synchronisées." : "Collaboration accepted: future changes will stay in sync.")
                    : (locale === "fr" ? "Une copie indépendante a été ajoutée à vos playlists." : "An independent copy was added to your playlists.")}</p>
                  <Link href={localizedPath("/account/playlists")} className="mt-3 inline-block font-semibold text-[var(--signal-strong)] underline underline-offset-4">
                    {locale === "fr" ? "Voir mes playlists" : "View my playlists"}
                  </Link>
                </div>
              ) : sessionPending ? (
                <div className="mt-6"><ParigoLoader size="compact" label={locale === "fr" ? "Vérification du compte" : "Checking account"} /></div>
              ) : !session ? (
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <p className="max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                    {locale === "fr" ? "Connectez-vous pour accepter le partage en collaboration ou en créer une copie dans votre compte." : "Sign in to accept the collaboration or create a copy in your account."}
                  </p>
                  <Link href={`${localizedPath("/login")}?next=${encodeURIComponent(publicPath)}`} className="parigo-button inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--signal-strong)] bg-[var(--signal-strong)] px-5 py-2.5 text-sm font-semibold text-[var(--signal-contrast)] transition hover:border-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)]">
                    <LogIn size={16} />{locale === "fr" ? "Se connecter" : "Sign in"}
                  </Link>
                </div>
              ) : (
                <div className="mt-6 flex flex-wrap gap-3">
                  {allowCollaboration ? (
                    <Button onClick={() => void accept("AsCollaboration")} disabled={accepting !== null}>
                      {accepting === "AsCollaboration" ? <ParigoLoader size="icon" label={locale === "fr" ? "Acceptation" : "Accepting"} /> : <Users size={16} />}
                      {locale === "fr" ? "Accepter la collaboration" : "Accept collaboration"}
                    </Button>
                  ) : null}
                  <Button variant={allowCollaboration ? "outline" : "primary"} onClick={() => void accept("AsCopy")} disabled={accepting !== null}>
                    {accepting === "AsCopy" ? <ParigoLoader size="icon" label={locale === "fr" ? "Création de la copie" : "Creating copy"} /> : <Copy size={16} />}
                    {locale === "fr" ? "Ajouter comme copie" : "Add as a copy"}
                  </Button>
                </div>
              )}
              {acceptError ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{acceptError}</p> : null}
            </section>

            {kind === "folder" && !playlists.length ? (
              <section className="mb-20 border-y border-[var(--line)] py-12">
                <p className="text-sm text-[var(--text-muted)]">
                  {locale === "fr" ? "Ce dossier ne contient encore aucune playlist." : "This folder does not contain any playlists yet."}
                </p>
              </section>
            ) : null}
            {playlists.map((playlist) => (
              <section key={playlist.id} className="mb-20">
                <p className="eyebrow text-[var(--signal-strong)]">{sharedLabel}</p>
                <SignedTitle className="mt-5 font-[var(--font-editorial)] text-6xl tracking-[-.05em] md:text-8xl">{playlist.title}</SignedTitle>
                {playlist.description ? <p className="mt-6 max-w-2xl text-[var(--text-muted)]">{playlist.description}</p> : null}
                {playlist.tracks.length ? (
                  <div className="mt-12 border-y border-[var(--line)]">
                    {playlist.tracks.map((track, index) => <TrackRow key={track.id} track={track} album={albumForTrack(track)} index={index} queue={playlist.tracks} mobileLayout="dense" />)}
                  </div>
                ) : (
                  <p className="mt-12 border-y border-[var(--line)] py-8 text-sm text-[var(--text-muted)]">
                    {locale === "fr" ? "Cette playlist ne contient encore aucune piste." : "This playlist does not contain any tracks yet."}
                  </p>
                )}
              </section>
            ))}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
