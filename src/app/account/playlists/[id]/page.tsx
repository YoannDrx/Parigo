"use client";

import { use, useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Lightbulb, ListMusic, Mail, Pencil, Plus, Share2, Trash2, X } from "lucide-react";
import { TrackRow } from "@/components/features";
import { Button, Input, ParigoDialog, Select } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import type { Album, MemberPlaylistCategory, Track } from "@/types";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useContextualBack } from "@/components/navigation/ContextualBackLink";
import { CatalogSearchField } from "@/components/search/CatalogSearchField";

interface MemberPlaylist { id: string; title: string; description?: string; categoryId?: string; tracks: Track[]; }
type ShareMode = "view" | "collaborate" | "deliver";

function albumFor(track: Track): Album {
  return { id: track.albumId, slug: track.albumSlug, title: track.albumTitle || "", code: track.albumCode || track.cdCode, cover: track.albumCover || "/images/placeholder-album.svg", label: track.albumLabel || "", genres: track.genres, moods: track.moods, trackCount: 0 };
}

export default function MemberPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const backToPlaylists = useContextualBack("/account/playlists");
  const { locale } = useI18n();
  const [playlist, setPlaylist] = useState<MemberPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareMode, setShareMode] = useState<ShareMode>("view");
  const [allowDownload, setAllowDownload] = useState(false);
  const [allowSave, setAllowSave] = useState(true);
  const [allowShare, setAllowShare] = useState(false);
  const [shareSending, setShareSending] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [categories, setCategories] = useState<MemberPlaylistCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [playlistQuery, setPlaylistQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [operationError, setOperationError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(id)}`, { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) {
      setPlaylist(payload.data?.playlist);
      setSuggestionsEnabled(Boolean(payload.data?.capabilities?.playlistSuggestions));
      setShareEnabled(Boolean(payload.data?.capabilities?.playlistSharing));
      setCategoryId(payload.data?.playlist?.categoryId || "");
      setError("");
    }
    else setError(payload.error?.message || "Playlist unavailable");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void fetch("/api/user/playlist-categories", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => setCategories(payload?.data?.categories ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/user/playlists/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (response.ok) {
          setPlaylist(payload.data?.playlist);
          setSuggestionsEnabled(Boolean(payload.data?.capabilities?.playlistSuggestions));
          setShareEnabled(Boolean(payload.data?.capabilities?.playlistSharing));
          setCategoryId(payload.data?.playlist?.categoryId || "");
        } else {
          setError(payload.error?.message || "Playlist unavailable");
        }
      })
      .catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError("Playlist unavailable"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  const openRename = () => {
    if (!playlist) return;
    setRenameTitle(playlist.title);
    setRenameOpen(true);
  };

  const rename = async (event: FormEvent) => {
    event.preventDefault();
    if (!playlist || !renameTitle.trim()) return;
    setDialogBusy(true);
    const title = renameTitle.trim();
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description: playlist.description || "" }) });
    if (response.ok) {
      setPlaylist({ ...playlist, title });
      setRenameOpen(false);
    }
    setDialogBusy(false);
  };

  const removePlaylist = async () => {
    setDialogBusy(true);
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) router.push("/account/playlists");
    else setDialogBusy(false);
  };

  const duplicatePlaylist = async () => {
    if (!playlist) return;
    setDialogBusy(true);
    setOperationError("");
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(id)}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${playlist.title} — copie` }),
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.data?.playlist?.id) {
      router.push(`/account/playlists/${payload.data.playlist.id}`);
    } else {
      setOperationError(payload?.error?.message || (locale === "fr"
        ? "La playlist n’a pas pu être dupliquée."
        : "The playlist could not be duplicated."));
      setDialogBusy(false);
    }
  };

  const moveToCategory = async (nextCategoryId: string) => {
    setCategoryId(nextCategoryId);
    setOperationError("");
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(id)}/placement`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: nextCategoryId, orderId: 0 }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setOperationError(payload?.error?.message || (locale === "fr"
        ? "Le dossier n’a pas pu être modifié."
        : "The folder could not be changed."));
      setCategoryId(playlist?.categoryId || "");
    } else {
      await load();
    }
  };

  const searchPlaylist = async (value: string) => {
    setPlaylistQuery(value);
    setSearchLoading(true);
    const response = await fetch(
      `/api/user/playlists/${encodeURIComponent(id)}/tracks?q=${encodeURIComponent(value)}&limit=50&orderBy=Custom_ASC`,
      { cache: "no-store" },
    );
    const payload = await response.json().catch(() => null);
    if (response.ok) {
      setSearchResults(payload?.data?.tracks ?? []);
      setSearchTotal(Number(payload?.data?.total ?? 0));
    } else {
      setOperationError(payload?.error?.message || (locale === "fr"
        ? "La recherche dans la playlist a échoué."
        : "Playlist search failed."));
    }
    setSearchLoading(false);
  };

  const mutateTracks = async (action: "add" | "remove" | "reorder", trackIds: string[]) => {
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(id)}/tracks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, trackIds }) });
    if (response.ok) await load();
    return response.ok;
  };

  const move = (index: number, direction: -1 | 1) => {
    if (!playlist) return;
    const target = index + direction;
    if (target < 0 || target >= playlist.tracks.length) return;
    const tracks = [...playlist.tracks];
    [tracks[index], tracks[target]] = [tracks[target], tracks[index]];
    setPlaylist({ ...playlist, tracks });
    void mutateTracks("reorder", tracks.map((track) => track.id));
  };

  const loadSuggestions = async () => {
    setSuggestionsOpen(true);
    setSuggestionsLoading(true);
    setSuggestionsError("");
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(id)}/suggestions?limit=12`, { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setSuggestions(payload.data?.tracks ?? []);
    else setSuggestionsError(payload.error?.message || (locale === "fr" ? "Les suggestions ne sont pas disponibles pour ce compte." : "Suggestions are not available for this account."));
    setSuggestionsLoading(false);
  };

  const addSuggestion = async (track: Track) => {
    if (await mutateTracks("add", [track.id])) setSuggestions((current) => current.filter((item) => item.id !== track.id));
  };

  const createShare = async () => {
    if (!playlist || !shareEmail.trim()) return;
    setShareSending(true);
    setShareError("");
    setShareSuccess("");
    setShareUrl("");
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(id)}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistTitle: playlist.title, toEmail: shareEmail.trim(), message: shareMessage, mode: shareMode, allowDownload, allowFollow: false, allowSave, allowShare, sendEmail: shareMode !== "deliver" }),
    });
    const payload = await response.json();
    if (response.ok) {
      setShareUrl(payload.data?.share?.url || "");
      setShareSuccess(payload.data?.share?.delivered
        ? (locale === "fr" ? "La playlist a été ajoutée directement au compte du destinataire." : "The playlist was added directly to the recipient’s account.")
        : (shareMode === "collaborate"
          ? (locale === "fr" ? "L’invitation à collaborer a été créée et envoyée." : "The collaboration invitation was created and sent.")
          : (locale === "fr" ? "Le lien de consultation a été créé et envoyé." : "The viewing link was created and sent.")));
    }
    else setShareError(payload.error?.message || (locale === "fr" ? "Le partage n’a pas pu être créé." : "The share could not be created."));
    setShareSending(false);
  };

  const copyShare = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (loading) return <div className="flex min-h-80 items-center justify-center"><ParigoLoader size="page" label={locale === "fr" ? "Chargement de la playlist" : "Loading playlist"} /></div>;
  if (!playlist) return <div className="py-20 text-center"><p>{error}</p><Button variant="outline" className="mt-6" onClick={backToPlaylists}><ArrowLeft size={16} /> {locale === "fr" ? "Retour" : "Back"}</Button></div>;

  return <div className="account-page grid gap-[var(--space-account-flow)]">
    <button type="button" onClick={backToPlaylists} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={16} /> {locale === "fr" ? "Mes playlists" : "My playlists"}</button>
    <AccountPageHeader
      icon={ListMusic}
      eyebrow={`Parigo · ${playlist.tracks.length} ${locale === "fr" ? "pistes" : "tracks"}`}
      title={playlist.title}
      description={playlist.description}
      wideTitle
      actions={<>{suggestionsEnabled && <Button variant="outline" onClick={() => void loadSuggestions()}><Lightbulb size={16} />{locale === "fr" ? "Prolonger la sélection" : "Extend selection"}</Button>}{shareEnabled && <Button variant="outline" onClick={() => setShareOpen((value) => !value)}><Share2 size={16} />{locale === "fr" ? "Partager" : "Share"}</Button>}<Button variant="outline" onClick={() => void duplicatePlaylist()} disabled={dialogBusy}><Copy size={16} />{locale === "fr" ? "Dupliquer" : "Duplicate"}</Button><Button variant="outline" onClick={openRename}><Pencil size={16} /> {locale === "fr" ? "Renommer" : "Rename"}</Button><Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-[var(--danger)]"><Trash2 size={16} /> {locale === "fr" ? "Supprimer" : "Delete"}</Button></>}
    />

    <section className="account-toolbar grid gap-3 md:grid-cols-[minmax(14rem,1fr)_minmax(14rem,1fr)_auto] md:items-end">
      <label className="text-xs font-semibold"><span className="mb-2 block">{locale === "fr" ? "Dossier" : "Folder"}</span><Select value={categoryId || "root"} onValueChange={(value) => void moveToCategory(value === "root" ? "" : value)} ariaLabel={locale === "fr" ? "Dossier de la playlist" : "Playlist folder"} options={[{ value: "root", label: locale === "fr" ? "Sans dossier" : "No folder" }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} className="w-full" /></label>
      <div><span className="mb-2 block text-xs font-semibold">{locale === "fr" ? "Rechercher dans les pistes" : "Search playlist tracks"}</span><CatalogSearchField id="account-playlist-tracks-search" value={playlistQuery} onValueChange={(value) => void searchPlaylist(value)} placeholder={locale === "fr" ? "Titre, description, mot-clé…" : "Title, description, keyword…"} ariaLabel={locale === "fr" ? "Rechercher dans les pistes" : "Search playlist tracks"} clearLabel={locale === "fr" ? "Effacer la recherche" : "Clear search"} density="compact" /></div>
      <p className="pb-3 font-mono text-[.62rem] text-[var(--text-muted)]">{searchResults ? `${searchTotal} ${locale === "fr" ? "résultat(s)" : "result(s)"}` : `${playlist.tracks.length} ${locale === "fr" ? "piste(s)" : "track(s)"}`}</p>
    </section>
    {operationError && <p role="alert" className="border-l-2 border-[var(--danger)] px-4 py-3 text-sm text-[var(--danger)]">{operationError}</p>}

    {shareEnabled && shareOpen && (
      <section className="parigo-frame border border-[var(--line-strong)] bg-[var(--surface)] p-5 md:p-6" aria-labelledby="share-playlist-title">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Lien Parigo sécurisé" : "Secure Parigo link"}</p>
            <h2 id="share-playlist-title" className="mt-2 font-[var(--font-editorial)] text-3xl">{locale === "fr" ? "Partager cette sélection." : "Share this selection."}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{locale === "fr" ? "Le destinataire reçoit un accès synchronisé : le lien suit les modifications de la playlist. Les permissions restent attachées au partage." : "The recipient receives synced access: the link follows playlist changes. Permissions remain attached to the share."}</p>
          </div>
          <button type="button" onClick={() => setShareOpen(false)} className="flex h-10 w-10 items-center justify-center border border-[var(--line)]" aria-label={locale === "fr" ? "Fermer le partage" : "Close sharing"}><X size={16} /></button>
        </div>
        <div className="mt-6 grid gap-4">
          <label className="text-xs font-semibold"><span className="mb-2 block">{locale === "fr" ? "E-mail du destinataire" : "Recipient email"}</span><input type="email" value={shareEmail} onChange={(event) => setShareEmail(event.target.value)} className="min-h-11 w-full border border-[var(--line)] bg-[var(--background)] px-3 outline-none focus:border-[var(--foreground)]" placeholder="nom@studio.com" /></label>
          <label className="text-xs font-semibold"><span className="mb-2 block">{locale === "fr" ? "Message" : "Message"}</span><textarea value={shareMessage} onChange={(event) => setShareMessage(event.target.value)} rows={3} maxLength={1200} className="w-full resize-y border border-[var(--line)] bg-[var(--background)] p-3 outline-none focus:border-[var(--foreground)]" placeholder={locale === "fr" ? "Quelques mots sur cette sélection…" : "A few words about this selection…"} /></label>
        </div>
        <fieldset className="mt-5 grid gap-3 md:grid-cols-3">
          <legend className="mb-3 text-xs font-semibold">{locale === "fr" ? "Mode de partage" : "Sharing mode"}</legend>
          {([
            ["view", locale === "fr" ? "Lien de consultation" : "Viewing link", locale === "fr" ? "Le destinataire consulte une sélection synchronisée." : "The recipient views a synced selection."],
            ["collaborate", locale === "fr" ? "Inviter à collaborer" : "Invite to collaborate", locale === "fr" ? "Un membre Parigo choisit ensuite collaboration ou copie." : "A Parigo member then chooses collaboration or copy."],
            ["deliver", locale === "fr" ? "Ajouter directement" : "Add directly", locale === "fr" ? "Ajout immédiat dans un compte membre, sans approbation ni e-mail." : "Immediate member-account delivery, without approval or email."],
          ] as const).map(([value, label, description]) => (
            <label key={value} className="parigo-choice cursor-pointer border border-[var(--line)] p-3 text-xs" data-active={shareMode === value ? "true" : undefined}>
              <span className="flex items-center gap-2 font-semibold"><input type="radio" name="share-mode" value={value} checked={shareMode === value} onChange={() => setShareMode(value)} className="accent-[var(--signal-strong)]" />{label}</span>
              <span className="mt-2 block leading-5 text-[var(--text-muted)]">{description}</span>
            </label>
          ))}
        </fieldset>
        {shareMode !== "deliver" ? <div className="mt-5 flex flex-wrap gap-3">{[[allowDownload, setAllowDownload, locale === "fr" ? "Autoriser le téléchargement" : "Allow downloads"], [allowSave, setAllowSave, locale === "fr" ? "Autoriser l’enregistrement" : "Allow saving"], [allowShare, setAllowShare, locale === "fr" ? "Autoriser le repartage" : "Allow resharing"]].map(([checked, setter, label]) => <label key={String(label)} className="parigo-choice inline-flex min-h-10 cursor-pointer items-center gap-2 border border-[var(--line)] px-3 text-xs"><input type="checkbox" checked={checked as boolean} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} className="accent-[var(--signal-strong)]" />{String(label)}</label>)}</div> : null}
        <div className="mt-6 flex flex-wrap items-center gap-3"><Button onClick={() => void createShare()} disabled={shareSending || !shareEmail.trim()}>{shareSending ? <ParigoLoader size="icon" label={locale === "fr" ? "Partage en cours" : "Sharing"} /> : <Mail size={16} />}{shareMode === "deliver" ? (locale === "fr" ? "Ajouter au compte" : "Add to account") : shareMode === "collaborate" ? (locale === "fr" ? "Envoyer l’invitation" : "Send invitation") : (locale === "fr" ? "Créer le lien et envoyer" : "Create link and send")}</Button>{shareUrl && <button type="button" onClick={() => void copyShare()} className="inline-flex min-h-11 max-w-full items-center gap-2 border border-[var(--signal-strong)] px-4 text-xs font-semibold text-[var(--signal-strong)]"><span className="max-w-[28rem] truncate">{shareUrl}</span>{copied ? <Check size={15} /> : <Copy size={15} />}</button>}</div>
        {shareSuccess && <p role="status" className="mt-4 border-l-2 border-[var(--signal-strong)] pl-3 text-sm text-[var(--text-muted)]">{shareSuccess}</p>}
        {shareError && <p className="mt-4 text-sm text-[var(--danger)]">{shareError}</p>}
      </section>
    )}

    {suggestionsEnabled && suggestionsOpen && <section className="parigo-frame border border-[var(--line-strong)] bg-[var(--surface)] p-6" aria-labelledby="suggestions-title"><div className="mb-5 flex items-start justify-between gap-5"><div><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "À partir de votre playlist" : "Based on your playlist"}</p><h2 id="suggestions-title" className="mt-2 font-[var(--font-editorial)] text-3xl">{locale === "fr" ? "Prolonger le récit." : "Extend the story."}</h2></div><button type="button" onClick={() => setSuggestionsOpen(false)} className="flex h-10 w-10 items-center justify-center border border-[var(--line)]" aria-label={locale === "fr" ? "Fermer les suggestions" : "Close suggestions"}><X size={16} /></button></div>{suggestionsLoading ? <div className="flex min-h-36 items-center justify-center"><ParigoLoader size="compact" label={locale === "fr" ? "Chargement des suggestions" : "Loading suggestions"} /></div> : suggestionsError ? <div className="parigo-choice border border-[var(--line)] p-5"><p className="text-sm text-[var(--text-muted)]">{suggestionsError}</p><p className="mt-2 text-xs text-[var(--text-muted)]">{locale === "fr" ? "Cette fonction nécessite que la recommandation musicale soit activée sur votre compte." : "This feature requires music recommendations to be enabled on your account."}</p></div> : suggestions.length ? <div className="border-t border-[var(--line)]">{suggestions.map((track, index) => <div key={track.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center"><TrackRow track={track} album={albumFor(track)} index={index} queue={suggestions} density="mid" /><button type="button" onClick={() => void addSuggestion(track)} className="mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--signal-strong)] text-[var(--signal-strong)] transition hover:bg-[var(--signal-strong)] hover:text-white" aria-label={`${locale === "fr" ? "Ajouter à la playlist" : "Add to playlist"} : ${track.title}`}><Plus size={16} /></button></div>)}</div> : <p className="py-8 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Aucune suggestion supplémentaire." : "No additional suggestion."}</p>}</section>}

    {searchLoading ? <div className="flex min-h-40 items-center justify-center"><ParigoLoader size="compact" label={locale === "fr" ? "Recherche dans la playlist" : "Searching playlist"} /></div> : (searchResults ?? playlist.tracks).length ? <div className="parigo-frame border border-[var(--line)] bg-[var(--surface)]">{(searchResults ?? playlist.tracks).map((track, index) => <div key={track.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center"><TrackRow track={track} album={albumFor(track)} index={index} queue={searchResults ?? playlist.tracks} density="mid" />{!searchResults && <div className="flex"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="h-10 w-10 disabled:opacity-25" aria-label={locale === "fr" ? "Monter" : "Move up"}><ArrowUp size={16} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === playlist.tracks.length - 1} className="h-10 w-10 disabled:opacity-25" aria-label={locale === "fr" ? "Descendre" : "Move down"}><ArrowDown size={16} /></button><button type="button" onClick={() => void mutateTracks("remove", [track.id])} className="h-10 w-10 text-[var(--danger)]" aria-label={locale === "fr" ? "Retirer" : "Remove"}><X size={16} /></button></div>}</div>)}</div> : <p className="account-empty py-20 text-center text-[var(--text-muted)]">{searchResults ? (locale === "fr" ? "Aucune piste ne correspond à cette recherche." : "No track matches this search.") : (locale === "fr" ? "Cette playlist est vide. Ajoutez quelques titres avant de demander des suggestions." : "This playlist is empty. Add a few tracks before requesting suggestions.")}</p>}
    <ParigoDialog open={renameOpen} onClose={() => { if (!dialogBusy) setRenameOpen(false); }} title={locale === "fr" ? "Renommer la playlist." : "Rename the playlist."} eyebrow={locale === "fr" ? "Titre de sélection" : "Selection title"} description={locale === "fr" ? "Le lien et les pistes restent inchangés ; seul le titre visible est mis à jour." : "The link and tracks stay unchanged; only the visible title is updated."} closeLabel={locale === "fr" ? "Fermer" : "Close"}>
      <form onSubmit={(event) => void rename(event)}>
        <label className="text-sm font-semibold"><span className="mb-2 block">{locale === "fr" ? "Nouveau nom" : "New name"}</span><Input autoFocus value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} maxLength={160} /></label>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={() => setRenameOpen(false)} disabled={dialogBusy}>{locale === "fr" ? "Annuler" : "Cancel"}</Button><Button type="submit" disabled={dialogBusy || !renameTitle.trim()}>{dialogBusy ? <ParigoLoader size="icon" label={locale === "fr" ? "Renommage de la playlist" : "Renaming playlist"} /> : <Pencil size={16} />}{locale === "fr" ? "Renommer" : "Rename"}</Button></div>
      </form>
    </ParigoDialog>
    <ParigoDialog open={deleteOpen} onClose={() => { if (!dialogBusy) setDeleteOpen(false); }} title={locale === "fr" ? "Supprimer cette playlist ?" : "Delete this playlist?"} eyebrow={locale === "fr" ? "Action définitive" : "Permanent action"} description={locale === "fr" ? "La sélection et son ordre seront supprimés de votre compte. Cette action ne supprime pas les pistes du catalogue." : "The selection and its order will be removed from your account. This does not delete tracks from the catalogue."} closeLabel={locale === "fr" ? "Fermer" : "Close"} tone="danger">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} disabled={dialogBusy}>{locale === "fr" ? "Conserver" : "Keep"}</Button><Button type="button" onClick={() => void removePlaylist()} disabled={dialogBusy} className="border-[var(--danger)] bg-[var(--danger)] hover:!border-[var(--foreground)] hover:!bg-[var(--foreground)]">{dialogBusy ? <ParigoLoader size="icon" label={locale === "fr" ? "Suppression de la playlist" : "Deleting playlist"} /> : <Trash2 size={16} />}{locale === "fr" ? "Supprimer la playlist" : "Delete playlist"}</Button></div>
    </ParigoDialog>
  </div>;
}
