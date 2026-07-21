"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Tag, X } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/components/providers/I18nProvider";
import type { MemberTag } from "@/types";

export function AddTagButton({ trackId, trackTitle }: { trackId: string; trackTitle: string }) {
  const { data: session } = useSession();
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<MemberTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!session?.user) return null;
  const show = async () => {
    setOpen(true);
    setLoading(true);
    const response = await fetch("/api/user/tags", { cache: "no-store" });
    const payload = await response.json();
    setTags(response.ok ? payload.data?.tags ?? [] : []);
    setLoading(false);
  };
  const add = async (tag: MemberTag) => {
    setLoading(true);
    const response = await fetch(`/api/user/tags/${encodeURIComponent(tag.id)}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", trackIds: [trackId] }),
    });
    setLoading(false);
    if (response.ok) { setMessage(locale === "fr" ? `Ajouté à « ${tag.name} »` : `Added to “${tag.name}”`); window.setTimeout(() => setOpen(false), 700); }
    else setMessage(locale === "fr" ? "Le tag n’a pas pu être ajouté." : "The tag could not be added.");
  };
  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => open ? setOpen(false) : void show()} className="flex h-10 w-10 items-center justify-center transition hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Ajouter un tag" : "Add tag"} : ${trackTitle}`}><Tag size={16} /></button>
      {open && <div className="absolute bottom-full right-0 z-40 mb-2 w-64 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow-md)]"><div className="flex items-center justify-between px-2 py-1"><p className="text-xs font-semibold">{locale === "fr" ? "Ajouter à un tag" : "Add to a tag"}</p><button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center" aria-label={locale === "fr" ? "Fermer" : "Close"}><X size={14} /></button></div>{loading ? <Loader2 className="mx-auto my-5 animate-spin" size={17} /> : tags.length ? <div className="max-h-52 overflow-y-auto">{tags.map((tag) => <button key={tag.id} type="button" onClick={() => void add(tag)} className="flex min-h-10 w-full items-center justify-between rounded px-2 text-left text-xs hover:bg-[var(--surface-soft)]"><span>{tag.name}</span><span className="font-mono opacity-45">{tag.trackCount}</span></button>)}</div> : <p className="p-3 text-xs text-[var(--text-muted)]">{locale === "fr" ? "Créez d’abord un tag dans votre compte." : "Create a tag in your account first."}</p>}{message && <p role="status" className="flex items-center gap-1.5 p-2 text-xs text-[var(--signal-strong)]"><Check size={13} />{message}</p>}</div>}
    </div>
  );
}
