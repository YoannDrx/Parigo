"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, MessageSquareText, Pencil, RefreshCw, Save, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button, Input, ParigoDialog, Select } from "@/components/ui";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { formatParigoDate } from "@/lib/date-time";
import type { MemberTrackComment, MemberTrackCommentGroup } from "@/types";

type SortMode = "recent" | "title";

export default function CommentsPage() {
  const { locale, localizedPath, t } = useI18n();
  const [groups, setGroups] = useState<MemberTrackCommentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [editing, setEditing] = useState<{ trackId: string; commentId: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<{ trackId: string; trackTitle: string; comment: MemberTrackComment } | null>(null);

  const load = useCallback(async () => {
    setError("");
    const response = await fetch("/api/user/comments", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || (locale === "fr" ? "Impossible de charger vos commentaires." : "Could not load your comments."));
    setGroups(payload.data?.groups || []);
  }, [locale]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/user/comments", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error?.message || (locale === "fr" ? "Impossible de charger vos commentaires." : "Could not load your comments."));
        if (!controller.signal.aborted) setGroups(payload.data?.groups || []);
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : String(loadError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [locale]);

  const totalComments = groups.reduce((total, group) => total + group.comments.length, 0);
  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    const filtered = groups.filter(({ track, comments }) => !needle || [
      track.title,
      track.albumTitle,
      track.albumLabel,
      track.albumCode,
      track.cdCode,
      ...comments.map((comment) => comment.text),
    ].filter(Boolean).join(" ").toLocaleLowerCase(locale).includes(needle));
    return [...filtered].sort((left, right) => sort === "title"
      ? left.track.title.localeCompare(right.track.title, locale)
      : (Date.parse(right.lastActivityAt || "") || 0) - (Date.parse(left.lastActivityAt || "") || 0));
  }, [groups, locale, query, sort]);

  const sync = async () => {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/user/comments", { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || (locale === "fr" ? "La synchronisation a échoué." : "Sync failed."));
      setGroups(payload.data?.groups || []);
      const scanned = payload.data?.sync?.scannedTracks || 0;
      const indexed = payload.data?.sync?.indexedTracks || 0;
      setMessage(locale === "fr"
        ? `Synchronisation terminée : ${scanned} piste${scanned > 1 ? "s" : ""} vérifiée${scanned > 1 ? "s" : ""}, ${indexed} avec des commentaires.`
        : `Sync complete: ${scanned} track${scanned === 1 ? "" : "s"} checked, ${indexed} with comments.`);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : String(syncError));
    } finally {
      setSyncing(false);
    }
  };

  const startEditing = (trackId: string, comment: MemberTrackComment) => {
    setEditing({ trackId, commentId: comment.id });
    setDraft(comment.text);
    setError("");
  };

  const save = async () => {
    if (!editing || !draft.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/user/tracks/${encodeURIComponent(editing.trackId)}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: editing.commentId, text: draft.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || (locale === "fr" ? "Impossible de modifier ce commentaire." : "Could not update this comment."));
      await load();
      setEditing(null);
      setDraft("");
      setMessage(locale === "fr" ? "Commentaire mis à jour." : "Comment updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/user/tracks/${encodeURIComponent(deleting.trackId)}/comments?commentId=${encodeURIComponent(deleting.comment.id)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || (locale === "fr" ? "Impossible de supprimer ce commentaire." : "Could not delete this comment."));
      await load();
      setDeleting(null);
      setMessage(locale === "fr" ? "Commentaire supprimé." : "Comment deleted.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : String(removeError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account-page space-y-8">
      <AccountPageHeader
        icon={MessageSquareText}
        title={t("account.comments")}
        description={locale === "fr" ? "Toutes vos intentions, retours client et repères de montage, regroupés par morceau dans un espace strictement privé." : "Every intent, client note and edit marker, grouped by track in one strictly private space."}
        actions={<Button variant="outline" onClick={() => void sync()} disabled={syncing}><RefreshCw size={16} className={syncing ? "animate-spin" : undefined} />{syncing ? (locale === "fr" ? "Synchronisation…" : "Syncing…") : (locale === "fr" ? "Retrouver les anciennes notes" : "Find older notes")}</Button>}
      />

      {!loading && !error && groups.length > 0 && <section aria-label={locale === "fr" ? "Résumé des commentaires" : "Comments summary"} className="grid gap-px border border-[var(--line-strong)] bg-[var(--line)] sm:grid-cols-3">
        <div className="bg-[var(--surface)] p-5"><span className="font-[var(--font-editorial)] text-4xl font-semibold tracking-[-.05em]">{groups.length}</span><p className="mt-2 font-mono text-[.58rem] uppercase tracking-[.11em] text-[var(--text-muted)]">{locale === "fr" ? "Tracks documentées" : "Documented tracks"}</p></div>
        <div className="bg-[var(--surface)] p-5"><span className="font-[var(--font-editorial)] text-4xl font-semibold tracking-[-.05em]">{totalComments}</span><p className="mt-2 font-mono text-[.58rem] uppercase tracking-[.11em] text-[var(--text-muted)]">{locale === "fr" ? "Commentaires privés" : "Private comments"}</p></div>
        <div className="bg-[var(--surface)] p-5"><span className="flex h-10 items-center text-[var(--signal-strong)]"><ShieldCheck size={30} strokeWidth={1.4} /></span><p className="mt-2 font-mono text-[.58rem] uppercase tracking-[.11em] text-[var(--text-muted)]">{locale === "fr" ? "Visible par vous uniquement" : "Visible only to you"}</p></div>
      </section>}

      {(error || message) && <div aria-live="polite" className={`parigo-frame flex items-start gap-3 border p-4 text-sm leading-6 ${error ? "border-[color-mix(in_srgb,var(--danger)_45%,var(--line))] text-[var(--danger)]" : "border-[var(--line)] text-[var(--signal-strong)]"}`}>{error ? <X size={17} className="mt-0.5 shrink-0" /> : <Check size={17} className="mt-0.5 shrink-0" />}<p>{error || message}</p></div>}

      {!loading && groups.length > 0 && <section className="account-toolbar grid gap-3 md:grid-cols-[minmax(16rem,1fr)_minmax(13rem,17rem)_auto] md:items-center" aria-label={locale === "fr" ? "Rechercher et trier les commentaires" : "Search and sort comments"}>
        <Input isSearch value={query} onChange={(event) => setQuery(event.target.value)} placeholder={locale === "fr" ? "Titre, album ou texte du commentaire…" : "Title, album or comment text…"} aria-label={locale === "fr" ? "Rechercher dans mes commentaires" : "Search my comments"} />
        <Select<SortMode> value={sort} onValueChange={setSort} ariaLabel={locale === "fr" ? "Trier les Tracks commentées" : "Sort commented tracks"} options={[{ value: "recent", label: locale === "fr" ? "Activité récente" : "Recent activity" }, { value: "title", label: locale === "fr" ? "Titre de A à Z" : "Title A to Z" }]} />
        {query && <Button variant="ghost" onClick={() => setQuery("")}><X size={15} />{locale === "fr" ? "Effacer" : "Clear"}</Button>}
        <p className="text-xs text-[var(--text-muted)] md:col-span-3">{visibleGroups.length} {locale === "fr" ? `sur ${groups.length} Track${groups.length > 1 ? "s" : ""}` : `of ${groups.length} track${groups.length === 1 ? "" : "s"}`}</p>
      </section>}

      {loading ? <div className="grid min-h-72 place-items-center"><ParigoLoader size="page" label={locale === "fr" ? "Chargement des commentaires" : "Loading comments"} /></div> : groups.length === 0 ? (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="account-empty parigo-frame grid min-h-80 place-items-center border border-[var(--line)] px-6 py-16 text-center">
          <div className="max-w-xl"><MessageSquareText className="mx-auto text-[var(--signal-strong)] opacity-60" size={38} strokeWidth={1.4} /><h2 className="mt-5 font-[var(--font-editorial)] text-3xl font-semibold tracking-[-.04em]">{locale === "fr" ? "Votre carnet de Tracks commence ici." : "Your track notebook starts here."}</h2><p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{locale === "fr" ? "Ajoutez une note depuis le détail d’un morceau. Si vous aviez déjà des commentaires sur votre compte, lancez une synchronisation pour les retrouver." : "Add a note from any track detail. If your account already contains comments, run a sync to bring them in."}</p><Button className="mt-6" onClick={() => void sync()} disabled={syncing}><RefreshCw size={16} className={syncing ? "animate-spin" : undefined} />{locale === "fr" ? "Synchroniser mon activité" : "Sync my activity"}</Button></div>
        </motion.section>
      ) : visibleGroups.length === 0 ? (
        <div className="account-empty py-16 text-center"><Search className="mx-auto opacity-30" size={34} /><h2 className="mt-4 text-xl font-semibold">{locale === "fr" ? "Aucun commentaire ne correspond." : "No comment matches."}</h2><p className="mt-2 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Essayez un autre titre, album ou mot du commentaire." : "Try another title, album or word from the comment."}</p></div>
      ) : <div className="space-y-5">
        <AnimatePresence initial={false}>
          {visibleGroups.map(({ track, comments, lastActivityAt }, index) => {
            const albumPath = localizedPath(`/albums/${track.albumSlug || track.albumId}`);
            const trackPath = `${albumPath}?track=${encodeURIComponent(track.id)}`;
            return <motion.article key={track.id} layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: Math.min(index * .035, .18) }} className="parigo-frame overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)]">
              <header className="grid gap-5 border-b border-[var(--line)] p-4 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center sm:p-5">
                <Link href={albumPath} className="relative aspect-square w-[5.5rem] overflow-hidden bg-[var(--surface-soft)] outline-none ring-[var(--signal-strong)] focus-visible:ring-2"><Image src={track.albumCover || "/images/placeholder-album.svg"} alt="" fill sizes="88px" className="object-cover transition duration-500 hover:scale-105" /></Link>
                <div className="min-w-0"><p className="font-mono text-[.56rem] uppercase tracking-[.12em] text-[var(--signal-strong)]">{String(index + 1).padStart(2, "0")} · {track.albumCode || track.cdCode || (locale === "fr" ? "Track commentée" : "Commented track")}</p><h2 className="mt-2 truncate font-[var(--font-editorial)] text-2xl font-semibold tracking-[-.035em]"><Link href={trackPath} className="transition-colors hover:text-[var(--signal-strong)]">{track.title}</Link></h2><p className="mt-1 truncate text-xs text-[var(--text-muted)]">{[track.albumTitle, track.albumLabel].filter(Boolean).join(" · ")}</p></div>
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right"><span className="inline-flex min-h-8 items-center border border-[var(--line)] px-3 font-mono text-[.6rem] uppercase tracking-[.08em]">{comments.length} {locale === "fr" ? (comments.length > 1 ? "notes" : "note") : (comments.length === 1 ? "note" : "notes")}</span>{lastActivityAt && <time dateTime={lastActivityAt} className="mt-2 block text-[.62rem] text-[var(--text-muted)]">{formatParigoDate(lastActivityAt, locale, { dateStyle: "medium" })}</time>}</div>
              </header>
              <div className="divide-y divide-[var(--line)]">
                {comments.map((comment) => {
                  const isEditing = editing?.commentId === comment.id && editing.trackId === track.id;
                  return <section key={comment.id} className="group/note grid gap-3 px-4 py-5 sm:grid-cols-[1.25rem_minmax(0,1fr)_auto] sm:px-6">
                    <span aria-hidden="true" className="mt-2 hidden h-2 w-2 rotate-45 bg-[var(--signal-strong)] sm:block" />
                    <div className="min-w-0">{isEditing ? <><textarea autoFocus rows={4} maxLength={1200} value={draft} onChange={(event) => setDraft(event.target.value)} className="w-full resize-y border border-[var(--line-strong)] bg-[var(--surface-soft)] p-4 text-sm leading-6 outline-none focus:border-[var(--signal-strong)]" /><div className="mt-2 flex items-center justify-between"><span className="font-mono text-[.58rem] text-[var(--text-muted)]">{draft.length}/1200</span><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => { setEditing(null); setDraft(""); }} disabled={saving}><X size={14} />{locale === "fr" ? "Annuler" : "Cancel"}</Button><Button size="sm" onClick={() => void save()} disabled={saving || !draft.trim()}>{saving ? <ParigoLoader size="icon" label={locale === "fr" ? "Enregistrement" : "Saving"} /> : <Save size={14} />}{locale === "fr" ? "Enregistrer" : "Save"}</Button></div></div></> : <><p className="whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">{comment.text}</p><p className="mt-3 font-mono text-[.56rem] uppercase tracking-[.08em] text-[var(--text-muted)]">{comment.updatedAt ? (locale === "fr" ? "Modifié le " : "Updated ") : (locale === "fr" ? "Ajouté le " : "Added ")}{comment.updatedAt || comment.createdAt ? formatParigoDate(comment.updatedAt || comment.createdAt!, locale, { dateStyle: "medium", timeStyle: "short" }) : "—"}</p></>}</div>
                    {!isEditing && <div className="flex items-center sm:self-center"><button type="button" onClick={() => startEditing(track.id, comment)} className="grid h-10 w-10 place-items-center text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]" aria-label={locale === "fr" ? `Modifier le commentaire sur ${track.title}` : `Edit comment on ${track.title}`}><Pencil size={15} /></button><button type="button" onClick={() => setDeleting({ trackId: track.id, trackTitle: track.title, comment })} className="grid h-10 w-10 place-items-center text-[var(--text-muted)] transition hover:bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface))] hover:text-[var(--danger)]" aria-label={locale === "fr" ? `Supprimer le commentaire sur ${track.title}` : `Delete comment on ${track.title}`}><Trash2 size={15} /></button></div>}
                  </section>;
                })}
              </div>
              <footer className="flex justify-end border-t border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 sm:px-6"><Link href={trackPath} className="inline-flex min-h-9 items-center gap-2 border-b border-[var(--line-strong)] text-xs font-semibold transition-colors hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]">{locale === "fr" ? "Ouvrir la Track" : "Open track"}<ArrowUpRight size={14} /></Link></footer>
            </motion.article>;
          })}
        </AnimatePresence>
      </div>}

      <ParigoDialog open={Boolean(deleting)} onClose={() => { if (!saving) setDeleting(null); }} title={locale === "fr" ? "Supprimer cette note ?" : "Delete this note?"} eyebrow={locale === "fr" ? "Commentaire privé" : "Private comment"} description={deleting ? (locale === "fr" ? `La note associée à « ${deleting.trackTitle} » sera définitivement retirée de votre compte.` : `The note attached to “${deleting.trackTitle}” will be permanently removed from your account.`) : undefined} closeLabel={locale === "fr" ? "Fermer" : "Close"} tone="danger" footer={<><Button variant="ghost" onClick={() => setDeleting(null)} disabled={saving}>{locale === "fr" ? "Conserver" : "Keep"}</Button><Button onClick={() => void remove()} disabled={saving} className="border-[var(--danger)] bg-[var(--danger)] hover:!border-[var(--foreground)] hover:!bg-[var(--foreground)]">{saving ? <ParigoLoader size="icon" label={locale === "fr" ? "Suppression" : "Deleting"} /> : <Trash2 size={15} />}{locale === "fr" ? "Supprimer" : "Delete"}</Button></>} />
    </div>
  );
}
