"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ListMusic, Plus, Search, X } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button, Input, Select } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { ParigoLoader } from "@/components/ui/ParigoLoader";

interface UserPlaylist {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover: string;
  trackCount: number;
  createdAt?: string;
}

type Sort = "recent" | "title" | "tracks";

async function fetchUserPlaylists(): Promise<UserPlaylist[]> {
  const response = await fetch("/api/user/playlists", { cache: "no-store" });
  if (!response.ok) return [];
  const data = await response.json();
  return data.data?.playlists ?? [];
}

export default function PlaylistsPage() {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  const loadPlaylists = async () => {
    setIsLoading(true);
    try {
      setPlaylists(await fetchUserPlaylists());
    } catch (error) {
      console.error("Error loading playlists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchUserPlaylists()
      .then((nextPlaylists) => {
        if (active) setPlaylists(nextPlaylists);
      })
      .catch((error) => {
        console.error("Error loading playlists:", error);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!createOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isCreating) setCreateOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [createOpen, isCreating]);

  const filteredPlaylists = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return playlists
      .filter((playlist) => !needle || `${playlist.title} ${playlist.description || ""}`.toLocaleLowerCase(locale).includes(needle))
      .sort((left, right) => {
        if (sort === "title") return left.title.localeCompare(right.title, locale);
        if (sort === "tracks") return right.trackCount - left.trackCount;
        return (right.createdAt ? new Date(right.createdAt).getTime() : 0) -
          (left.createdAt ? new Date(left.createdAt).getTime() : 0);
      });
  }, [locale, playlists, query, sort]);

  const openCreate = () => {
    setCreateError("");
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (!isCreating) setCreateOpen(false);
  };

  const createPlaylist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    setIsCreating(true);
    setCreateError("");
    try {
      const response = await fetch("/api/user/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || (locale === "fr" ? "La playlist n’a pas pu être créée." : "The playlist could not be created."));
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      await loadPlaylists();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : (locale === "fr" ? "La playlist n’a pas pu être créée." : "The playlist could not be created."));
    } finally {
      setIsCreating(false);
    }
  };

  const filtersActive = Boolean(query.trim());

  return (
    <div className="account-page space-y-8">
      <AccountPageHeader
        icon={ListMusic}
        eyebrow={locale === "fr" ? "Vos sélections" : "Your selections"}
        title={t("account.playlists")}
        description={locale === "fr" ? `${playlists.length} ${playlists.length === 1 ? "playlist" : "playlists"} pour organiser et partager vos choix.` : `${playlists.length} ${playlists.length === 1 ? "playlist" : "playlists"} to organise and share your choices.`}
        actions={<Button variant="primary" className="gap-2" onClick={openCreate}>
          <Plus size={18} />
          <span>{locale === "fr" ? "Créer une playlist" : "Create a playlist"}</span>
        </Button>}
      />

      {!isLoading && playlists.length > 0 && (
        <section aria-label={locale === "fr" ? "Rechercher et trier les playlists" : "Search and sort playlists"} className="account-toolbar grid gap-3 md:grid-cols-[minmax(15rem,1fr)_12rem]">
          <Input isSearch value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "fr" ? "Rechercher une playlist…" : "Search playlists…"} aria-label={locale === "fr" ? "Rechercher dans mes playlists" : "Search my playlists"} />
          <Select value={sort} onValueChange={setSort} ariaLabel={locale === "fr" ? "Trier les playlists" : "Sort playlists"} options={[
            { value: "recent", label: locale === "fr" ? "Plus récentes" : "Most recent" },
            { value: "title", label: locale === "fr" ? "Titre A–Z" : "Title A–Z" },
            { value: "tracks", label: locale === "fr" ? "Nombre de pistes" : "Track count" },
          ]} className="[&_[role=combobox]]:min-h-11" />
          <p className="text-xs text-[var(--text-muted)] md:col-span-2">{filteredPlaylists.length} {locale === "fr" ? `sur ${playlists.length} playlist${playlists.length > 1 ? "s" : ""}` : `of ${playlists.length} playlist${playlists.length > 1 ? "s" : ""}`}</p>
        </section>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><ParigoLoader size="page" label={locale === "fr" ? "Chargement des playlists" : "Loading playlists"} /></div>
      ) : playlists.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="account-empty flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--surface-soft)]"><ListMusic size={40} className="text-[var(--text-muted)]" /></div>
          <h3 className="mb-2 text-xl font-semibold text-[var(--foreground)]">{locale === "fr" ? "Aucune playlist" : "No playlists"}</h3>
          <p className="mb-6 max-w-md text-[var(--text-muted)]">{locale === "fr" ? "Créez votre première playlist pour organiser vos pistes préférées." : "Create your first playlist to organise your favourite tracks."}</p>
          <Button variant="primary" className="gap-2" onClick={openCreate}><Plus size={18} />{locale === "fr" ? "Créer ma première playlist" : "Create my first playlist"}</Button>
        </motion.div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="account-empty px-6 py-16 text-center">
          <Search className="mx-auto mb-4 text-[var(--text-muted)]" />
          <h2 className="font-[var(--font-editorial)] text-3xl">{locale === "fr" ? "Aucune playlist ne correspond." : "No playlist matches."}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Essayez un autre terme ou retirez un filtre." : "Try another term or remove a filter."}</p>
          {filtersActive && <Button variant="ghost" className="mt-4" onClick={() => setQuery("")}>{locale === "fr" ? "Effacer les filtres" : "Clear filters"}</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlaylists.map((playlist, index) => (
            <motion.div key={playlist.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, .25) }}>
              <Link href={`/account/playlists/${playlist.id}`} className="parigo-frame group block overflow-hidden border border-[var(--line)] bg-[var(--surface)] transition hover:-translate-y-1 hover:border-[var(--line-strong)] hover:shadow-[var(--theme-shadow)]">
                <div className="relative aspect-square overflow-hidden">
                  <Image src={playlist.cover || "/images/placeholder-playlist.svg"} alt={playlist.title} width={640} height={640} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
                </div>
                <div className="p-4"><h3 className="truncate font-semibold text-[var(--foreground)]">{playlist.title}</h3>{playlist.description && <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{playlist.description}</p>}<p className="mt-2 text-sm text-[var(--text-muted)]">{playlist.trackCount} {playlist.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</p></div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {createOpen && (
          <motion.div className="fixed inset-0 z-[180] flex items-center justify-center bg-[#0c110d]/68 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.currentTarget === event.target) closeCreate(); }}>
            <motion.section role="dialog" aria-modal="true" aria-labelledby="create-playlist-title" className="parigo-modal relative w-full max-w-xl overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)]" initial={{ opacity: 0, y: 24, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .98 }} transition={{ duration: .22 }}>
              <span aria-hidden="true" className="absolute left-0 top-0 h-1 w-32 bg-[var(--signal)]" />
              <button type="button" onClick={closeCreate} disabled={isCreating} aria-label={locale === "fr" ? "Fermer" : "Close"} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] transition hover:border-[var(--foreground)]"><X size={17} /></button>
              <form onSubmit={createPlaylist} className="p-6 pt-10 sm:p-9 sm:pt-11">
                <p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Nouvelle sélection" : "New selection"}</p>
                <h2 id="create-playlist-title" className="mt-4 pr-12 font-[var(--font-editorial)] text-4xl tracking-[-.045em] sm:text-5xl">{locale === "fr" ? "Donnez-lui un point de vue." : "Give it a point of view."}</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-muted)]">{locale === "fr" ? "Créez une playlist pour organiser, annoter et partager votre sélection." : "Create a playlist to organise, annotate and share your selection."}</p>
                <label className="mt-8 block text-sm"><span className="mb-2 block font-medium">{locale === "fr" ? "Nom de la playlist" : "Playlist name"}</span><Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} placeholder={locale === "fr" ? "Film, campagne, piste créative…" : "Film, campaign, creative route…"} /></label>
                <label className="mt-5 block text-sm"><span className="mb-2 block font-medium">{locale === "fr" ? "Note d’intention" : "Intent note"} <span className="text-[var(--text-muted)]">({locale === "fr" ? "facultatif" : "optional"})</span></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={4} className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none transition focus:border-[var(--signal-strong)] focus:ring-2 focus:ring-[var(--signal)]/20" /></label>
                {createError && <p role="alert" className="mt-5 border-l-2 border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-4 py-3 text-sm text-[var(--danger)]">{createError}</p>}
                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={closeCreate} disabled={isCreating}>{locale === "fr" ? "Annuler" : "Cancel"}</Button><Button type="submit" disabled={isCreating || !title.trim()}>{isCreating ? <ParigoLoader size="icon" label={locale === "fr" ? "Création de la playlist" : "Creating playlist"} /> : <Plus size={17} />}{locale === "fr" ? "Créer la playlist" : "Create playlist"}</Button></div>
              </form>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
