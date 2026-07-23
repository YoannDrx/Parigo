"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { Button, Input, ParigoDialog } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import type { MemberTag, Track } from "@/types";

export default function TagsPage() {
  const { locale } = useI18n();
  const [tags, setTags] = useState<MemberTag[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [renaming, setRenaming] = useState<MemberTag | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleting, setDeleting] = useState<MemberTag | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const loadTags = useCallback(async () => {
    const response = await fetch("/api/user/tags", { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setTags(payload.data.tags);
    setLoading(false);
  }, []);

  const loadTracks = useCallback(async (tagId: string) => {
    const response = await fetch(`/api/user/tags/${encodeURIComponent(tagId)}/tracks`, { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setTracks(payload.data.tracks);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/user/tags", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => { if (ok) setTags(payload.data.tags); setLoading(false); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    void fetch(`/api/user/tags/${encodeURIComponent(selected)}/tracks`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => { if (ok) setTracks(payload.data.tracks); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [selected]);

  const create = async (event: FormEvent) => {
    event.preventDefault(); if (!name.trim()) return;
    const response = await fetch("/api/user/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const payload = await response.json();
    if (response.ok) { setName(""); setSelected(payload.data.tag.id); await loadTags(); }
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
      if (selected === deleting.id) { setSelected(null); setTracks([]); }
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
    {loading ? <Loader2 className="animate-spin" /> : <div className="grid gap-6 lg:grid-cols-[minmax(260px,360px)_1fr]">
      <section className="parigo-frame border border-[var(--line)] bg-[var(--surface)]">
        {tags.length === 0 ? <p className="p-6 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Aucun tag pour le moment." : "No tags yet."}</p> : tags.map((tag) => <div key={tag.id} data-selected={selected === tag.id} className={`parigo-choice flex items-center gap-3 border-b border-[var(--line)] p-3 last:border-b-0 ${selected === tag.id ? "bg-[var(--foreground)] text-[var(--background)]" : ""}`}><button type="button" onClick={() => setSelected(tag.id)} className="flex min-h-10 flex-1 items-center gap-3 text-left"><Tag size={16} /><span className="flex-1 text-sm">{tag.name}</span><span className="font-mono text-[.62rem] opacity-55">{tag.trackCount}</span></button><button type="button" onClick={() => openRename(tag)} aria-label={locale === "fr" ? "Renommer" : "Rename"} className="flex h-10 w-10 items-center justify-center"><Pencil size={15} /></button><button type="button" onClick={() => setDeleting(tag)} aria-label={locale === "fr" ? "Supprimer" : "Delete"} className="flex h-10 w-10 items-center justify-center"><Trash2 size={15} /></button></div>)}
      </section>
      <section className="parigo-frame min-h-72 border border-[var(--line)] bg-[var(--surface)] p-5">
        {!selected ? <p className="text-sm text-[var(--text-muted)]">{locale === "fr" ? "Sélectionnez un tag pour voir ses pistes." : "Select a tag to view its tracks."}</p> : <><p className="mb-5 rounded-md bg-[var(--surface-soft)] p-3 text-xs leading-5 text-[var(--text-muted)]">{locale === "fr" ? "Ajoutez un tag depuis le menu d’une piste, une playlist, vos favoris ou une sélection. Aucun identifiant technique n’est nécessaire." : "Add a tag from a track, playlist, favourites or selection menu. No technical identifier is needed."}</p>{tracks.length === 0 ? <p className="text-sm text-[var(--text-muted)]">{locale === "fr" ? "Ce tag ne contient aucune piste." : "This tag has no tracks."}</p> : <div className="border-t border-[var(--line)]">{tracks.map((track) => <div key={track.id} className="flex min-h-14 items-center gap-3 border-b border-[var(--line)] py-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{track.title}</p><p className="truncate text-xs text-[var(--text-muted)]">{track.albumTitle}</p></div><button type="button" onClick={() => void removeTrack([track.id])} className="flex h-10 w-10 items-center justify-center" aria-label={locale === "fr" ? "Retirer la piste" : "Remove track"}><X size={16} /></button></div>)}</div>}</>}
      </section>
    </div>}
    <ParigoDialog open={Boolean(renaming)} onClose={() => { if (!dialogBusy) setRenaming(null); }} title={locale === "fr" ? "Renommer ce tag." : "Rename this tag."} eyebrow={locale === "fr" ? "Organisation personnelle" : "Personal organisation"} description={locale === "fr" ? "Le nouveau nom sera appliqué à toutes les pistes déjà classées avec ce tag." : "The new name will apply to every track already filed under this tag."} closeLabel={locale === "fr" ? "Fermer" : "Close"}>
      <form onSubmit={(event) => void rename(event)}>
        <label className="text-sm font-semibold"><span className="mb-2 block">{locale === "fr" ? "Nom du tag" : "Tag name"}</span><Input autoFocus value={renameName} onChange={(event) => setRenameName(event.target.value)} maxLength={160} /></label>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={() => setRenaming(null)} disabled={dialogBusy}>{locale === "fr" ? "Annuler" : "Cancel"}</Button><Button type="submit" disabled={dialogBusy || !renameName.trim()}>{dialogBusy ? <Loader2 className="animate-spin" size={16} /> : <Pencil size={16} />}{locale === "fr" ? "Renommer" : "Rename"}</Button></div>
      </form>
    </ParigoDialog>
    <ParigoDialog open={Boolean(deleting)} onClose={() => { if (!dialogBusy) setDeleting(null); }} title={locale === "fr" ? "Supprimer ce tag ?" : "Delete this tag?"} eyebrow={locale === "fr" ? "Action définitive" : "Permanent action"} description={deleting ? (locale === "fr" ? `Le tag « ${deleting.name} » sera retiré de toutes les pistes. Les pistes elles-mêmes resteront intactes.` : `The “${deleting.name}” tag will be removed from every track. The tracks themselves will stay intact.`) : undefined} closeLabel={locale === "fr" ? "Fermer" : "Close"} tone="danger">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={() => setDeleting(null)} disabled={dialogBusy}>{locale === "fr" ? "Conserver" : "Keep"}</Button><Button type="button" onClick={() => void remove()} disabled={dialogBusy} className="border-[var(--danger)] bg-[var(--danger)] hover:!border-[var(--foreground)] hover:!bg-[var(--foreground)]">{dialogBusy ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}{locale === "fr" ? "Supprimer le tag" : "Delete tag"}</Button></div>
    </ParigoDialog>
  </div>;
}
