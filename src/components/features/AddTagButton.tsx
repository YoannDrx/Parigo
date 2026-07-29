"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Tag, X } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/components/providers/I18nProvider";
import type { MemberTag } from "@/types";
import { AnchoredPopover } from "@/components/ui/AnchoredPopover";
import { Tooltip } from "@/components/ui/Tooltip";

export function AddTagButton({ trackId, trackTitle }: { trackId: string; trackTitle: string }) {
  const { data: session } = useSession();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<MemberTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [linkedTagId, setLinkedTagId] = useState("");
  const [assignedTagIds, setAssignedTagIds] = useState<Set<string>>(new Set());
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!session?.user) return null;
  const show = async () => {
    setOpen(true);
    setLoading(true);
    setMessage("");
    setError("");
    setLinkedTagId("");
    try {
      const [tagsResponse, assignedResponse] = await Promise.all([
        fetch("/api/user/tags", { cache: "no-store" }),
        fetch(`/api/user/tracks/${encodeURIComponent(trackId)}/tags`, { cache: "no-store" }),
      ]);
      const [tagsPayload, assignedPayload] = await Promise.all([
        tagsResponse.json(),
        assignedResponse.json(),
      ]);
      setTags(tagsResponse.ok ? tagsPayload.data?.tags ?? [] : []);
      setAssignedTagIds(new Set(
        assignedResponse.ok
          ? (assignedPayload.data?.tags ?? []).map((tag: MemberTag) => tag.id)
          : [],
      ));
      if (!tagsResponse.ok || !assignedResponse.ok) {
        setError(locale === "fr" ? "Vos tags n’ont pas pu être chargés." : "Your tags could not be loaded.");
      }
    } catch {
      setTags([]);
      setError(locale === "fr" ? "Vos tags n’ont pas pu être chargés." : "Your tags could not be loaded.");
    } finally {
      setLoading(false);
    }
  };
  const toggle = async (tag: MemberTag) => {
    const assigned = assignedTagIds.has(tag.id);
    setLoading(true);
    setError("");
    const response = await fetch(`/api/user/tags/${encodeURIComponent(tag.id)}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: assigned ? "remove" : "add", trackIds: [trackId] }),
    });
    const payload = await response.json().catch(() => null);
    setLoading(false);
    if (response.ok && payload?.data?.verified) {
      setTags((current) => current.map((item) => item.id === tag.id
        ? { ...item, trackCount: Number(payload.data.trackCount ?? item.trackCount) }
        : item));
      setAssignedTagIds((current) => {
        const next = new Set(current);
        if (assigned) next.delete(tag.id);
        else next.add(tag.id);
        return next;
      });
      setLinkedTagId(tag.id);
      setMessage(assigned
        ? (locale === "fr" ? `Retiré de « ${tag.name} »` : `Removed from “${tag.name}”`)
        : (locale === "fr" ? `Ajouté à « ${tag.name} »` : `Added to “${tag.name}”`));
    } else {
      setError(payload?.error?.message || (locale === "fr"
        ? "Le tag n’a pas pu être mis à jour pour cette piste."
        : "The tag could not be updated for this track."));
    }
  };
  return (
    <>
      <Tooltip label={locale === "fr" ? "Ajouter un tag" : "Add tag"}><button ref={buttonRef} type="button" onClick={() => open ? setOpen(false) : void show()} aria-expanded={open} className="flex h-10 w-10 items-center justify-center transition hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Ajouter un tag" : "Add tag"} : ${trackTitle}`}><Tag size={16} /></button></Tooltip>
      <AnchoredPopover open={open} onClose={() => setOpen(false)} anchorRef={buttonRef} label={`${locale === "fr" ? "Ajouter à un tag" : "Add to a tag"} — ${trackTitle}`} width={272}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-2 pb-2"><div><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Tag personnel" : "Personal tag"}</p><p className="mt-1 text-sm font-semibold">{locale === "fr" ? "Ajouter à un tag" : "Add to a tag"}</p></div><button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)]" aria-label={locale === "fr" ? "Fermer" : "Close"}><X size={14} /></button></div>
        {loading ? <div className="grid min-h-28 place-items-center"><ParigoLoader size="compact" label={locale === "fr" ? "Chargement des tags" : "Loading tags"} /></div> : tags.length ? <div className="max-h-56 overflow-y-auto py-1">{tags.map((tag) => {
          const assigned = assignedTagIds.has(tag.id);
          return <button key={tag.id} type="button" onClick={() => void toggle(tag)} aria-pressed={assigned} className="flex min-h-11 w-full items-center justify-between border-b border-[var(--line)] px-2 text-left text-xs transition last:border-0 hover:bg-[var(--signal-soft)]"><span className="flex min-w-0 items-center gap-2 font-semibold">{assigned && <Check size={13} className="shrink-0 text-[var(--signal-strong)]" />}<span className="truncate">{tag.name}</span></span><span className="font-mono opacity-45">{tag.trackCount}</span></button>;
        })}</div> : !error && <div className="p-3"><p className="text-xs leading-5 text-[var(--text-muted)]">{locale === "fr" ? "Créez d’abord un tag dans votre compte pour classer cette piste." : "Create a tag in your account first to organise this track."}</p><Link href="/account/tags" className="mt-3 inline-flex min-h-9 items-center border-b border-[var(--signal-strong)] text-xs font-semibold text-[var(--signal-strong)]">{locale === "fr" ? "Créer un tag" : "Create a tag"}</Link></div>}
        {message && <div role="status" className="border-t border-[var(--line)] p-2 text-xs text-[var(--signal-strong)]"><p className="flex items-center gap-1.5"><Check size={13} />{message}</p><Link href={`/account/tags?tag=${encodeURIComponent(linkedTagId)}`} className="mt-2 inline-flex min-h-8 items-center border-b border-current font-semibold" onClick={() => setOpen(false)}>{locale === "fr" ? "Voir dans mes tags" : "View in my tags"}</Link></div>}
        {error && <p role="alert" className="border-t border-[var(--line)] p-3 text-xs leading-5 text-[var(--danger)]">{error}</p>}
      </AnchoredPopover>
    </>
  );
}
