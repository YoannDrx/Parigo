"use client";

import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Folder, FolderInput, FolderOpen, FolderPlus, Folders, Grid3X3, List, ListMusic, Mail, Plus, Search, Share2, Trash2, X } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button, Input, Select } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { ViewModeControl } from "@/components/ui/ViewModeControl";
import { useParigoModalMotion } from "@/hooks/use-parigo-modal-motion";
import { formatParigoDate } from "@/lib/date-time";
import type { MemberPlaylistCategory } from "@/types";
import { CatalogSearchField } from "@/components/search/CatalogSearchField";

interface UserPlaylist {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover: string;
  trackCount: number;
  createdAt?: string;
  categoryId?: string;
}

type Sort = "recent" | "title" | "tracks";
type PlaylistView = "grid" | "list";
type ShareMode = "view" | "collaborate" | "deliver";

function configurePlaylistDrag(event: DragEvent<HTMLElement>, playlist: UserPlaylist) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/x-parigo-playlist", playlist.id);
  event.dataTransfer.setData("text/plain", playlist.title);
  const preview = event.currentTarget.querySelector<HTMLElement>("[data-drag-preview]");
  if (preview) event.dataTransfer.setDragImage(preview, 20, 20);
}

async function fetchUserPlaylists(): Promise<UserPlaylist[]> {
  const response = await fetch("/api/user/playlists", { cache: "no-store" });
  if (!response.ok) return [];
  const data = await response.json();
  return data.data?.playlists ?? [];
}

export default function PlaylistsPage() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [categories, setCategories] = useState<MemberPlaylistCategory[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [view, setView] = useState<PlaylistView>(searchParams.get("view") === "list" ? "list" : "grid");
  const [draggedPlaylistId, setDraggedPlaylistId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [movingPlaylistId, setMovingPlaylistId] = useState<string | null>(null);
  const [folderMessage, setFolderMessage] = useState("");
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [sharedCategory, setSharedCategory] = useState<MemberPlaylistCategory | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareMode, setShareMode] = useState<ShareMode>("view");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const modalMotion = useParigoModalMotion();

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
    if (!userId) return;
    void fetch("/api/user/playlist-categories", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => {
        setCategories(payload?.data?.categories ?? []);
        setSharingEnabled(Boolean(payload?.data?.capabilities?.playlistSharing));
      })
      .catch(() => undefined);
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

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "list") params.set("view", "list");
    else params.delete("view");
    const next = params.toString();
    if (next !== searchParams.toString()) router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [pathname, router, searchParams, view]);

  const filteredPlaylists = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return playlists
      .filter((playlist) =>
        categoryFilter === "all"
        || (categoryFilter === "root" ? !playlist.categoryId : playlist.categoryId === categoryFilter)
      )
      .filter((playlist) => !needle || `${playlist.title} ${playlist.description || ""}`.toLocaleLowerCase(locale).includes(needle))
      .sort((left, right) => {
        if (sort === "title") return left.title.localeCompare(right.title, locale);
        if (sort === "tracks") return right.trackCount - left.trackCount;
        return (right.createdAt ? new Date(right.createdAt).getTime() : 0) -
          (left.createdAt ? new Date(left.createdAt).getTime() : 0);
      });
  }, [categoryFilter, locale, playlists, query, sort]);

  const countInCategory = (categoryId: string) =>
    playlists.filter((playlist) => categoryId === "root" ? !playlist.categoryId : playlist.categoryId === categoryId).length;

  const movePlaylist = async (playlistId: string, categoryId: string) => {
    const playlist = playlists.find((item) => item.id === playlistId);
    const normalizedCategoryId = categoryId === "root" ? "" : categoryId;
    if (!playlist || (playlist.categoryId || "") === normalizedCategoryId) {
      setDraggedPlaylistId(null);
      setDropTarget(null);
      return;
    }
    setMovingPlaylistId(playlistId);
    setFolderMessage("");
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(playlistId)}/placement`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: normalizedCategoryId, orderId: 0 }),
    });
    if (response.ok) {
      setPlaylists((current) => current.map((item) =>
        item.id === playlistId
          ? { ...item, categoryId: normalizedCategoryId || undefined }
          : item
      ));
      const destination = normalizedCategoryId
        ? categories.find((category) => category.id === normalizedCategoryId)?.name
        : (locale === "fr" ? "Sans dossier" : "No folder");
      setFolderMessage(locale === "fr"
        ? `« ${playlist.title} » a été déplacée dans ${destination}.`
        : `“${playlist.title}” was moved to ${destination}.`);
    } else {
      const payload = await response.json().catch(() => null);
      setFolderMessage(payload?.error?.message || (locale === "fr"
        ? "La playlist n’a pas pu être déplacée."
        : "The playlist could not be moved."));
    }
    setMovingPlaylistId(null);
    setDraggedPlaylistId(null);
    setDropTarget(null);
  };

  const createCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryName.trim()) return;
    setCategoryBusy(true);
    const response = await fetch("/api/user/playlist-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: categoryName.trim() }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.data?.category) {
      setCategories((current) => [...current, payload.data.category]);
      setCategoryName("");
    }
    setCategoryBusy(false);
  };

  const removeCategory = async (categoryId: string) => {
    setCategoryBusy(true);
    const response = await fetch(`/api/user/playlist-categories/${encodeURIComponent(categoryId)}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setCategories((current) => current.filter((category) => category.id !== categoryId));
      if (categoryFilter === categoryId) setCategoryFilter("all");
      await loadPlaylists();
    }
    setCategoryBusy(false);
  };

  const shareCategory = async () => {
    if (!sharedCategory || !shareEmail.trim()) return;
    setShareBusy(true);
    setShareUrl("");
    setShareStatus("");
    setShareError("");
    const response = await fetch(`/api/user/playlist-categories/${encodeURIComponent(sharedCategory.id)}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryTitle: sharedCategory.name,
        toEmail: shareEmail.trim(),
        message: shareMessage,
        mode: shareMode,
        allowDownload: false,
        allowFollow: false,
        allowSave: true,
        allowShare: false,
        sendEmail: shareMode !== "deliver",
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setShareUrl(payload?.data?.share?.url || "");
      setShareStatus(payload?.data?.share?.delivered
        ? (locale === "fr" ? "Le dossier a été ajouté directement au compte du destinataire." : "The folder was added directly to the recipient’s account.")
        : (locale === "fr" ? "Le partage du dossier a été créé et envoyé." : "The folder share was created and sent."));
    } else {
      setShareError(payload?.error?.message || (locale === "fr" ? "Le dossier n’a pas pu être partagé." : "The folder could not be shared."));
    }
    setShareBusy(false);
  };

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

  const filtersActive = Boolean(query.trim()) || categoryFilter !== "all";
  const activeFolderName = categoryFilter === "all"
    ? (locale === "fr" ? "Tous les dossiers" : "All folders")
    : categoryFilter === "root"
      ? (locale === "fr" ? "Sans dossier" : "No folder")
      : categories.find((category) => category.id === categoryFilter)?.name || (locale === "fr" ? "Dossier" : "Folder");

  return (
    <div className="account-page grid gap-[var(--space-account-flow)]">
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

      <section className="playlist-folder-browser parigo-frame border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5" aria-labelledby="playlist-folders-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="playlist-folders-title" className="text-lg font-semibold">{locale === "fr" ? "Dossiers de playlists" : "Playlist folders"}</h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--text-muted)]">{locale === "fr" ? "Glissez une playlist sur un dossier, ou utilisez son sélecteur « Déplacer dans »." : "Drag a playlist onto a folder, or use its “Move to” selector."}</p>
          </div>
          <form onSubmit={createCategory} className="flex w-full max-w-lg gap-2">
            <Input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} maxLength={160} placeholder={locale === "fr" ? "Nouveau dossier…" : "New folder…"} aria-label={locale === "fr" ? "Nom du nouveau dossier" : "New folder name"} />
            <Button type="submit" disabled={categoryBusy || !categoryName.trim()} className="shrink-0"><FolderPlus size={16} />{locale === "fr" ? "Créer" : "Create"}</Button>
          </form>
        </div>
        <div className="mt-5 flex min-h-10 flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-2">
          <p className="text-xs text-[var(--text-muted)]">
            {locale === "fr" ? "Affichage" : "Showing"} <strong className="font-semibold text-[var(--foreground)]">{activeFolderName}</strong>
            <span aria-hidden="true"> · </span>{filteredPlaylists.length} {locale === "fr" ? "playlist(s)" : "playlist(s)"}
          </p>
          {categoryFilter !== "all" ? <button type="button" onClick={() => setCategoryFilter("all")} className="inline-flex min-h-9 items-center gap-2 border border-[var(--line)] px-3 text-xs font-semibold transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]"><X size={13} />{locale === "fr" ? "Voir tous les dossiers" : "Show all folders"}</button> : null}
          {draggedPlaylistId && <span className="font-mono text-[.58rem] uppercase tracking-[.08em] text-[var(--signal-strong)]">{locale === "fr" ? "Déposez sur un dossier" : "Drop onto a folder"}</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {[{ id: "all", name: locale === "fr" ? "Tous les dossiers" : "All folders" }, { id: "root", name: locale === "fr" ? "Sans dossier" : "No folder" }, ...categories].map((category) => {
            const active = categoryFilter === category.id;
            const targeted = dropTarget === category.id;
            const acceptsDrop = category.id !== "all";
            const FolderIcon = category.id === "all" ? Folders : active || targeted ? FolderOpen : Folder;
            const categoryCount = category.id === "all" ? playlists.length : countInCategory(category.id);
            return (
              <article
                key={category.id}
                data-folder-id={category.id}
                data-active={active ? "true" : undefined}
                data-drop-target={targeted ? "true" : undefined}
                className="playlist-folder-card group relative min-h-24 border border-[var(--line)] bg-[var(--background)] p-3 transition"
                onDragEnter={(event) => { if (!acceptsDrop) return; event.preventDefault(); setDropTarget(category.id); }}
                onDragOver={(event) => { if (!acceptsDrop) return; event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
                }}
                onDrop={(event) => {
                  if (!acceptsDrop) return;
                  event.preventDefault();
                  const playlistId = event.dataTransfer.getData("application/x-parigo-playlist") || draggedPlaylistId;
                  if (playlistId) void movePlaylist(playlistId, category.id);
                }}
              >
                <button type="button" onClick={() => setCategoryFilter(category.id)} className="flex h-full w-full flex-col items-start text-left" aria-pressed={active}>
                  <FolderIcon size={24} strokeWidth={1.4} className="text-[var(--signal-strong)] transition-transform group-hover:-rotate-3 group-hover:scale-105" />
                  <span className="mt-auto max-w-full truncate pt-3 text-xs font-semibold sm:text-sm">{category.name}</span>
                  <span className="mt-1 font-mono text-[.58rem] uppercase tracking-[.08em] text-[var(--text-muted)]">{categoryCount} {categoryCount === 1 ? "playlist" : "playlists"}</span>
                </button>
                {category.id !== "root" && category.id !== "all" && sharingEnabled ? <button type="button" onClick={() => { setSharedCategory(categories.find((item) => item.id === category.id) || null); setShareUrl(""); setShareStatus(""); setShareError(""); }} className="parigo-soft-action absolute right-10 top-1.5 flex h-8 w-8 items-center justify-center text-[var(--text-muted)]" aria-label={`${locale === "fr" ? "Partager le dossier" : "Share folder"} ${category.name}`}><Share2 size={13} /></button> : null}
                {category.id !== "root" && category.id !== "all" && <button type="button" disabled={categoryBusy} onClick={() => void removeCategory(category.id)} className="parigo-soft-action absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center text-[var(--text-muted)]" aria-label={`${locale === "fr" ? "Supprimer le dossier" : "Delete folder"} ${category.name}`}><Trash2 size={13} /></button>}
              </article>
            );
          })}
        </div>
        {folderMessage && <p role="status" className="mt-4 border-l-2 border-[var(--signal-strong)] pl-3 text-xs text-[var(--text-muted)]">{folderMessage}</p>}
      </section>

      {sharedCategory ? (
        <section className="parigo-frame border border-[var(--line-strong)] bg-[var(--surface)] p-5 md:p-6" aria-labelledby="share-folder-title">
          <div className="flex items-start justify-between gap-4">
            <div><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Dossier synchronisé" : "Synced folder"}</p><h2 id="share-folder-title" className="mt-2 font-[var(--font-editorial)] text-3xl">{locale === "fr" ? `Partager « ${sharedCategory.name} ».` : `Share “${sharedCategory.name}”.`}</h2></div>
            <button type="button" onClick={() => setSharedCategory(null)} className="flex h-10 w-10 items-center justify-center border border-[var(--line)]" aria-label={locale === "fr" ? "Fermer le partage" : "Close sharing"}><X size={16} /></button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold"><span className="mb-2 block">{locale === "fr" ? "E-mail du destinataire" : "Recipient email"}</span><input type="email" value={shareEmail} onChange={(event) => setShareEmail(event.target.value)} className="min-h-11 w-full border border-[var(--line)] bg-[var(--background)] px-3" placeholder="nom@studio.com" /></label>
            <label className="text-xs font-semibold"><span className="mb-2 block">{locale === "fr" ? "Message" : "Message"}</span><input value={shareMessage} onChange={(event) => setShareMessage(event.target.value)} maxLength={1200} className="min-h-11 w-full border border-[var(--line)] bg-[var(--background)] px-3" /></label>
          </div>
          <fieldset className="mt-5 flex flex-wrap gap-3"><legend className="sr-only">{locale === "fr" ? "Mode de partage" : "Sharing mode"}</legend>{([
            ["view", locale === "fr" ? "Lien de consultation" : "Viewing link"],
            ["collaborate", locale === "fr" ? "Inviter à collaborer" : "Invite to collaborate"],
            ["deliver", locale === "fr" ? "Ajouter directement" : "Add directly"],
          ] as const).map(([value, label]) => <label key={value} className="parigo-choice inline-flex min-h-10 cursor-pointer items-center gap-2 border border-[var(--line)] px-3 text-xs"><input type="radio" name="folder-share-mode" checked={shareMode === value} onChange={() => setShareMode(value)} className="accent-[var(--signal-strong)]" />{label}</label>)}</fieldset>
          <div className="mt-6 flex flex-wrap items-center gap-3"><Button onClick={() => void shareCategory()} disabled={shareBusy || !shareEmail.trim()}>{shareBusy ? <ParigoLoader size="icon" label={locale === "fr" ? "Partage en cours" : "Sharing"} /> : <Mail size={16} />}{shareMode === "deliver" ? (locale === "fr" ? "Ajouter au compte" : "Add to account") : (locale === "fr" ? "Partager le dossier" : "Share folder")}</Button>{shareUrl ? <button type="button" onClick={() => { void navigator.clipboard.writeText(shareUrl); setShareCopied(true); window.setTimeout(() => setShareCopied(false), 1500); }} className="inline-flex min-h-11 max-w-full items-center gap-2 border border-[var(--signal-strong)] px-4 text-xs font-semibold text-[var(--signal-strong)]"><span className="max-w-[28rem] truncate">{shareUrl}</span>{shareCopied ? <Check size={15} /> : <Copy size={15} />}</button> : null}</div>
          {shareStatus ? <p role="status" className="mt-4 border-l-2 border-[var(--signal-strong)] pl-3 text-sm text-[var(--text-muted)]">{shareStatus}</p> : null}
          {shareError ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{shareError}</p> : null}
        </section>
      ) : null}

      {!isLoading && playlists.length > 0 && (
        <section aria-label={locale === "fr" ? "Rechercher et trier les playlists" : "Search and sort playlists"} className="account-toolbar grid gap-3 md:grid-cols-[minmax(15rem,1fr)_12rem_auto] md:items-center">
          <CatalogSearchField id="account-playlists-search" value={query} onValueChange={setQuery} placeholder={locale === "fr" ? "Rechercher une playlist…" : "Search playlists…"} ariaLabel={locale === "fr" ? "Rechercher dans mes playlists" : "Search my playlists"} clearLabel={locale === "fr" ? "Effacer la recherche" : "Clear search"} density="compact" />
          <Select value={sort} onValueChange={setSort} ariaLabel={locale === "fr" ? "Trier les playlists" : "Sort playlists"} options={[
            { value: "recent", label: locale === "fr" ? "Plus récentes" : "Most recent" },
            { value: "title", label: locale === "fr" ? "Titre A–Z" : "Title A–Z" },
            { value: "tracks", label: locale === "fr" ? "Nombre de pistes" : "Track count" },
          ]} className="[&_[role=combobox]]:min-h-11" />
          <ViewModeControl
            value={view}
            onValueChange={setView}
            ariaLabel={locale === "fr" ? "Affichage des playlists" : "Playlist display"}
            options={[
              { value: "grid", label: locale === "fr" ? "Vue grille" : "Grid view", icon: Grid3X3 },
              { value: "list", label: locale === "fr" ? "Vue liste" : "List view", icon: List },
            ]}
          />
          <p className="text-xs text-[var(--text-muted)] md:col-span-3">{filteredPlaylists.length} {locale === "fr" ? `sur ${playlists.length} playlist${playlists.length > 1 ? "s" : ""}` : `of ${playlists.length} playlist${playlists.length > 1 ? "s" : ""}`}</p>
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
          {filtersActive && <Button variant="ghost" className="mt-4" onClick={() => { setQuery(""); setCategoryFilter("all"); }}>{locale === "fr" ? "Effacer les filtres" : "Clear filters"}</Button>}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredPlaylists.map((playlist, index) => (
            <motion.article
              key={playlist.id}
              draggable
              data-playlist-id={playlist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: movingPlaylistId === playlist.id ? .55 : 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.04, .25) }}
              onDragStartCapture={(event) => { setDraggedPlaylistId(playlist.id); configurePlaylistDrag(event, playlist); }}
              onDragEndCapture={() => { setDraggedPlaylistId(null); setDropTarget(null); }}
              className="parigo-frame overflow-hidden border border-[var(--line)] bg-[var(--surface)] transition hover:-translate-y-1 hover:border-[var(--line-strong)] hover:shadow-[var(--theme-shadow)]"
            >
              <div data-drag-preview className="playlist-drag-preview" aria-hidden="true"><FolderInput size={17} /><span className="max-w-44 truncate">{playlist.title}</span></div>
              <Link href={`/account/playlists/${playlist.id}`} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image src={playlist.cover || "/images/placeholder-playlist.svg"} alt={playlist.title} width={640} height={640} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 border border-white/65 bg-black/45 px-2 py-1 font-mono text-[.56rem] uppercase tracking-[.08em] text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100"><FolderInput size={12} />{locale === "fr" ? "Glisser" : "Drag"}</span>
                </div>
                <div className="p-4"><h3 className="truncate font-semibold text-[var(--foreground)]">{playlist.title}</h3>{playlist.description && <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{playlist.description}</p>}<p className="mt-2 text-sm text-[var(--text-muted)]">{playlist.trackCount} {playlist.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</p></div>
              </Link>
              <div className="border-t border-[var(--line)] p-2">
                <Select value={playlist.categoryId || "root"} onValueChange={(value) => void movePlaylist(playlist.id, value)} ariaLabel={`${locale === "fr" ? "Déplacer dans" : "Move to"} : ${playlist.title}`} options={[{ value: "root", label: locale === "fr" ? "Sans dossier" : "No folder" }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} className="w-full [&_[role=combobox]]:min-h-9" />
              </div>
            </motion.article>
          ))}
        </div>
      ) : (
        <div className="parigo-frame overflow-hidden border border-[var(--line)] bg-[var(--surface)]" data-testid="account-playlist-list">
          {filteredPlaylists.map((playlist, index) => (
            <motion.div key={playlist.id} draggable data-playlist-id={playlist.id} className="relative border-b border-[var(--line)] last:border-b-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: movingPlaylistId === playlist.id ? .55 : 1, y: 0 }} transition={{ delay: Math.min(index * .025, .18) }} onDragStartCapture={(event) => { setDraggedPlaylistId(playlist.id); configurePlaylistDrag(event, playlist); }} onDragEndCapture={() => { setDraggedPlaylistId(null); setDropTarget(null); }}>
              <div data-drag-preview className="playlist-drag-preview" aria-hidden="true"><FolderInput size={17} /><span className="max-w-44 truncate">{playlist.title}</span></div>
              <div className="account-playlist-list-row grid min-h-20 grid-cols-[3.25rem_minmax(0,1fr)_2rem] items-center gap-2 px-3 py-2 sm:grid-cols-[4rem_minmax(0,1fr)_2.25rem] sm:gap-3 sm:px-4">
                <Link href={`/account/playlists/${playlist.id}`} className="group relative aspect-square overflow-hidden rounded-[var(--parigo-corner-md)] rounded-tr-[var(--parigo-turn-md)] bg-[var(--surface-soft)]" aria-label={playlist.title}>
                  <Image src={playlist.cover || "/images/placeholder-playlist.svg"} alt="" fill sizes="64px" className="object-cover transition duration-500 group-hover:scale-[1.035]" />
                </Link>
                <div className="min-w-0">
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,12rem)] sm:gap-3">
                    <Link href={`/account/playlists/${playlist.id}`} className="group min-w-0">
                      <h3 className="account-playlist-list-row__title truncate font-semibold">{playlist.title}</h3>
                    </Link>
                    <Select value={playlist.categoryId || "root"} onValueChange={(value) => void movePlaylist(playlist.id, value)} ariaLabel={`${locale === "fr" ? "Déplacer dans" : "Move to"} : ${playlist.title}`} options={[{ value: "root", label: locale === "fr" ? "Sans dossier" : "No folder" }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} className="w-full min-w-0 [&_[role=combobox]]:min-h-9 [&_[role=combobox]]:py-1.5" />
                  </div>
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    {playlist.description ? <p className="hidden min-w-0 truncate text-xs text-[var(--text-muted)] md:block">{playlist.description}</p> : null}
                    <p className="shrink-0 font-mono text-[.56rem] uppercase tracking-[.08em] text-[var(--text-muted)]">{playlist.trackCount} {playlist.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}{playlist.createdAt ? ` · ${formatParigoDate(playlist.createdAt, locale)}` : ""}</p>
                  </div>
                </div>
                <Link href={`/account/playlists/${playlist.id}`} className="group flex h-8 w-8 items-center justify-center text-lg text-[var(--text-muted)] transition hover:text-[var(--signal-strong)] sm:h-9 sm:w-9" aria-label={`${locale === "fr" ? "Ouvrir" : "Open"} ${playlist.title}`}>
                  <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {createOpen && (
          <motion.div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
            <motion.div aria-hidden="true" className="parigo-modal-backdrop absolute inset-0 cursor-default" onPointerDown={() => { if (!isCreating) closeCreate(); }} {...modalMotion.backdrop} />
            <motion.section role="dialog" aria-modal="true" aria-labelledby="create-playlist-title" className="parigo-modal relative w-full max-w-xl overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)]" {...modalMotion.dialog}>
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
