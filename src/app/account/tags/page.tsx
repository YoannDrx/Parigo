"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { Button, Input, ParigoDialog } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import type { MemberTag, Track } from "@/types";
import { ParigoLoader } from "@/components/ui/ParigoLoader";

export default function TagsPage() {
  const { locale, localizedPath } = useI18n();
  const [tags, setTags] = useState<MemberTag[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [renaming, setRenaming] = useState<MemberTag | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleting, setDeleting] = useState<MemberTag | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const selectTag = useCallback((tagId: string | null) => {
    setSelected(tagId);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (tagId) url.searchParams.set("tag", tagId);
    else url.searchParams.delete("tag");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const loadTags = useCallback(async () => {
    const response = await fetch("/api/user/tags?withCounts=1", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) {
      const nextTags = payload.data.tags as MemberTag[];
      setTags(nextTags);
      setSelected((current) => {
        const requested = current || new URLSearchParams(window.location.search).get("tag");
        const next = nextTags.some((tag) => tag.id === requested) ? requested : nextTags[0]?.id || null;
        const url = new URL(window.location.href);
        if (next) url.searchParams.set("tag", next);
        else url.searchParams.delete("tag");
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
        return next;
      });
    }
    setLoading(false);
  }, []);

  const loadTracks = useCallback(async (tagId: string) => {
    setTracksLoading(true);
    setTracks([]);
    const response = await fetch(`/api/user/tags/${encodeURIComponent(tagId)}/tracks`, { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setTracks(payload.data.tracks);
    setTracksLoading(false);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadTags(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadTags]);

  useEffect(() => {
    if (!selected) return;
    const timeout = window.setTimeout(() => void loadTracks(selected), 0);
    return () => window.clearTimeout(timeout);
  }, [loadTracks, selected]);

  const create = async (event: FormEvent) => {
    event.preventDefault(); if (!name.trim()) return;
    const response = await fetch("/api/user/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const payload = await response.json();
    if (response.ok) { setName(""); selectTag(payload.data.tag.id); await loadTags(); }
    else setMessage(payload?.error?.message || "Parigo error");
  };

  const openRename = (tag: MemberTag) => {
    setRenaming(tag);
    setRenameName(tag.name);
    setMessage("");
  };

  const rename = async (event: FormEvent) => {
    event.preventDefault();
    const next = renameName.trim();
    if (!renaming || !next) return;
    setDialogBusy(true);
    const response = await fetch(`/api/user/tags/${encodeURIComponent(renaming.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: next }) });
    if (response.ok) {
      await loadTags();
      setRenaming(null);
    } else {
      const payload = await response.json().catch(() => null);
      setMessage(payload?.error?.message || "Parigo error");
    }
    setDialogBusy(false);
  };

  const remove = async () => {
    if (!deleting) return;
    setDialogBusy(true);
    const response = await fetch(`/api/user/tags/${encodeURIComponent(deleting.id)}`, { method: "DELETE" });
    if (response.ok) {
      if (selected === deleting.id) { selectTag(null); setTracks([]); }
      await loadTags();
      setDeleting(null);
    } else {
      const payload = await response.json().catch(() => null);
      setMessage(payload?.error?.message || "Parigo error");
    }
    setDialogBusy(false);
  };

  const removeTrack = async (ids: string[]) => {
    if (!selected) return;
    const response = await fetch(`/api/user/tags/${encodeURIComponent(selected)}/tracks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", trackIds: ids }) });
    const payload = await response.json();
    if (response.ok) { await loadTracks(selected); await loadTags(); }
    else setMessage(payload?.error?.message || "Parigo error");
  };

  return <div className="account-page space-y-8">
    <AccountPageHeader icon={Tag} eyebrow={locale === "fr" ? "Votre classement" : "Your filing system"} title={locale === "fr" ? "Tags personnels" : "Personal tags"} description={locale === "fr" ? "Classez les pistes avec vos tags personnels Parigo. Ils restent liés à votre compte." : "Organise tracks with your personal Parigo tags. They stay attached to your account."} />
    {message && <p role="alert" className="parigo-frame border border-red-300 bg-[var(--surface)] p-3 text-sm text-red-700">{message}</p>}
    <form onSubmit={create} className="account-toolbar flex max-w-xl gap-2"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder={locale === "fr" ? "Nom du nouveau tag" : "New tag name"} /><Button type="submit"><Plus size={17} />{locale === "fr" ? "Créer" : "Create"}</Button></form>
    {loading ? <div className="grid min-h-64 place-items-center"><ParigoLoader size="page" label={locale === "fr" ? "Chargement des tags" : "Loading tags"} /></div> : <div className="grid gap-6 lg:grid-cols-[minmax(260px,360px)_1fr]">
      <section className="parigo-frame border border-[var(--line)] bg-[var(--surface)]">
        {tags.length === 0 ? <p className="p-6 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Aucun tag pour le moment." : "No tags yet."}</p> : tags.map((tag) => <div key={tag.id} data-selected={selected === tag.id} className="personal-tag-row parigo-choice group flex items-center gap-3 border-b border-[var(--line)] p-3 transition-colors last:border-b-0"><button type="button" onClick={() => selectTag(tag.id)} className="flex min-h-10 flex-1 items-center gap-3 text-left"><Tag size={16} className="transition-transform group-hover:-rotate-6 group-hover:scale-110" /><span className="flex-1 text-sm font-medium">{tag.name}</span><span className="personal-tag-row__count min-w-8 border px-2 py-1 text-center font-mono text-[.65rem] font-semibold">{tag.trackCount}</span></button><button type="button" onClick={() => openRename(tag)} aria-label={`${locale === "fr" ? "Renommer" : "Rename"} ${tag.name}`} className="parigo-soft-action flex h-10 w-10 items-center justify-center"><Pencil size={15} /></button><button type="button" onClick={() => setDeleting(tag)} data-tone="danger" aria-label={`${locale === "fr" ? "Supprimer" : "Delete"} ${tag.name}`} className="parigo-soft-action flex h-10 w-10 items-center justify-center"><Trash2 size={15} /></button></div>)}
      </section>
      <section className="parigo-frame min-h-72 border border-[var(--line)] bg-[var(--surface)] p-5">
        {!selected ? <p className="text-sm text-[var(--text-muted)]">{locale === "fr" ? "Sélectionnez un tag pour voir ses pistes." : "Select a tag to view its tracks."}</p> : <><p className="mb-5 bg-[var(--surface-soft)] p-3 text-xs leading-5 text-[var(--text-muted)]">{locale === "fr" ? "Ajoutez un tag depuis le menu d’une piste, une playlist, vos favoris ou une sélection. Retrouvez ensuite directement la piste ou son album depuis cette liste." : "Add a tag from a track, playlist, favourites or selection menu. Then jump straight back to the track or its album from this list."}</p>{tracksLoading ? <div className="grid min-h-32 place-items-center"><ParigoLoader size="compact" label={locale === "fr" ? "Chargement des pistes du tag" : "Loading tagged tracks"} /></div> : tracks.length === 0 ? <p className="text-sm text-[var(--text-muted)]">{locale === "fr" ? "Ce tag ne contient aucune piste." : "This tag has no tracks."}</p> : <div className="border-t border-[var(--line)]" data-testid="tagged-track-list">{tracks.map((track) => {
          const albumTarget = localizedPath(`/albums/${track.albumSlug || track.albumId}`);
          const trackTarget = `${albumTarget}?track=${encodeURIComponent(track.id)}`;
          return (
            <article key={track.id} data-track-id={track.id} className="personal-tag-track-row group grid min-h-[4.5rem] grid-cols-[3.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 border-b border-[var(--line)] px-2 py-2 last:border-b-0">
              <Link href={albumTarget} aria-label={`${locale === "fr" ? "Voir l’album" : "View album"} ${track.albumTitle || ""}`} className="relative h-12 w-12 overflow-hidden bg-[var(--surface-soft)] outline-none ring-[var(--signal-strong)] focus-visible:ring-2">
                <Image src={track.albumCover || "/images/placeholder-album.svg"} alt="" fill sizes="48px" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
              </Link>
              <div className="min-w-0">
                <Link href={trackTarget} className="personal-tag-track-row__title block truncate text-sm font-semibold transition-colors hover:text-[var(--signal-strong)] focus-visible:text-[var(--signal-strong)] focus-visible:outline-none">{track.title}</Link>
                {track.albumTitle && <Link href={albumTarget} className="mt-1 block truncate text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)] focus-visible:text-[var(--foreground)] focus-visible:outline-none">{track.albumTitle}</Link>}
                {(track.albumCode || track.cdCode) && <span className="mt-1 inline-block font-mono text-[.56rem] uppercase tracking-[.08em] text-[var(--signal-strong)]">{locale === "fr" ? "Réf." : "Ref."} {track.albumCode || track.cdCode}</span>}
              </div>
              <button type="button" onClick={() => void removeTrack([track.id])} className="flex h-10 w-10 items-center justify-center text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--danger)]" aria-label={`${locale === "fr" ? "Retirer la piste" : "Remove track"} : ${track.title}`}><X size={16} /></button>
            </article>
          );
        })}</div>}</>}
      </section>
    </div>}
    <ParigoDialog open={Boolean(renaming)} onClose={() => { if (!dialogBusy) setRenaming(null); }} title={locale === "fr" ? "Renommer ce tag." : "Rename this tag."} eyebrow={locale === "fr" ? "Organisation personnelle" : "Personal organisation"} description={locale === "fr" ? "Le nouveau nom sera appliqué à toutes les pistes déjà classées avec ce tag." : "The new name will apply to every track already filed under this tag."} closeLabel={locale === "fr" ? "Fermer" : "Close"}>
      <form onSubmit={(event) => void rename(event)}>
        <label className="text-sm font-semibold"><span className="mb-2 block">{locale === "fr" ? "Nom du tag" : "Tag name"}</span><Input autoFocus value={renameName} onChange={(event) => setRenameName(event.target.value)} maxLength={160} /></label>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={() => setRenaming(null)} disabled={dialogBusy}>{locale === "fr" ? "Annuler" : "Cancel"}</Button><Button type="submit" disabled={dialogBusy || !renameName.trim()}>{dialogBusy ? <ParigoLoader size="icon" label={locale === "fr" ? "Renommage du tag" : "Renaming tag"} /> : <Pencil size={16} />}{locale === "fr" ? "Renommer" : "Rename"}</Button></div>
      </form>
    </ParigoDialog>
    <ParigoDialog open={Boolean(deleting)} onClose={() => { if (!dialogBusy) setDeleting(null); }} title={locale === "fr" ? "Supprimer ce tag ?" : "Delete this tag?"} eyebrow={locale === "fr" ? "Action définitive" : "Permanent action"} description={deleting ? (locale === "fr" ? `Le tag « ${deleting.name} » sera retiré de toutes les pistes. Les pistes elles-mêmes resteront intactes.` : `The “${deleting.name}” tag will be removed from every track. The tracks themselves will stay intact.`) : undefined} closeLabel={locale === "fr" ? "Fermer" : "Close"} tone="danger">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={() => setDeleting(null)} disabled={dialogBusy}>{locale === "fr" ? "Conserver" : "Keep"}</Button><Button type="button" onClick={() => void remove()} disabled={dialogBusy} className="border-[var(--danger)] bg-[var(--danger)] hover:!border-[var(--foreground)] hover:!bg-[var(--foreground)]">{dialogBusy ? <ParigoLoader size="icon" label={locale === "fr" ? "Suppression du tag" : "Deleting tag"} /> : <Trash2 size={16} />}{locale === "fr" ? "Supprimer le tag" : "Delete tag"}</Button></div>
    </ParigoDialog>
  </div>;
}
