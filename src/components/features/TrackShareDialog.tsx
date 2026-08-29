"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui/Button";
import { ParigoDialog } from "@/components/ui/ParigoDialog";
import { useTrackShareStore } from "@/stores/track-share-store";

const shortUrlCache = new Map<string, string>();
const shortUrlRequests = new Map<string, Promise<string>>();
const subscribeToNavigator = () => () => undefined;

function resolveShortUrl(path: string) {
  const cached = shortUrlCache.get(path);
  if (cached) return Promise.resolve(cached);
  const pending = shortUrlRequests.get(path);
  if (pending) return pending;
  const request = fetch("/api/share/short-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  }).then(async (response) => {
    if (!response.ok) throw new Error("SHORT_URL_FAILED");
    return response.json() as Promise<{ data: { url: string } }>;
  }).then((payload) => {
    shortUrlCache.set(path, payload.data.url);
    return payload.data.url;
  }).finally(() => shortUrlRequests.delete(path));
  shortUrlRequests.set(path, request);
  return request;
}

async function copyText(value: string, input: HTMLInputElement | null) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  input?.focus();
  input?.select();
  document.execCommand("copy");
}

export function TrackShareDialog() {
  const { locale } = useI18n();
  const target = useTrackShareStore((state) => state.target);
  const close = useTrackShareStore((state) => state.close);
  const inputRef = useRef<HTMLInputElement>(null);
  const path = useMemo(() => target ? `/albums/${encodeURIComponent(target.albumSlug)}?track=${encodeURIComponent(target.trackId)}` : "", [target]);
  const canonicalUrl = typeof window !== "undefined" && path ? `${window.location.origin}${path}` : path;
  const [resolvedUrl, setResolvedUrl] = useState<{ path: string; url: string } | null>(null);
  const [copiedPath, setCopiedPath] = useState("");
  const canNativeShare = useSyncExternalStore(subscribeToNavigator, () => typeof navigator.share === "function", () => false);
  const url = resolvedUrl?.path === path ? resolvedUrl.url : shortUrlCache.get(path) || canonicalUrl;
  const copied = copiedPath === path;

  useEffect(() => {
    if (!target || !path) return;
    let active = true;
    if (shortUrlCache.has(path)) return;
    void resolveShortUrl(path).then((url) => {
      if (active) setResolvedUrl({ path, url });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [path, target]);

  const copy = async () => {
    await copyText(url, inputRef.current).catch(() => undefined);
    setCopiedPath(path);
    window.setTimeout(() => setCopiedPath((current) => current === path ? "" : current), 2_000);
  };
  const nativeShare = async () => {
    if (!target || !canNativeShare) return;
    await navigator.share({ title: target.title, text: target.description, url }).catch(() => undefined);
  };

  return (
    <ParigoDialog
      open={Boolean(target)}
      onClose={close}
      eyebrow="Parigo / Share"
      title={locale === "fr" ? "Partagez ce morceau" : "Share this track"}
      description={locale === "fr" ? "Copiez ce lien ou ouvrez les options de partage de votre appareil." : "Copy this link or use your device sharing options."}
      closeLabel={locale === "fr" ? "Fermer le partage" : "Close sharing"}
      footer={<>
        {canNativeShare ? <Button variant="outline" onClick={() => void nativeShare()}><Share2 size={16} />{locale === "fr" ? "Partager via…" : "Share via…"}</Button> : null}
        <Button onClick={() => void copy()}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? (locale === "fr" ? "Lien copié" : "Link copied") : (locale === "fr" ? "Copier le lien" : "Copy link")}</Button>
      </>}
    >
      <label className="block text-xs font-semibold" htmlFor="track-share-url">{locale === "fr" ? "Lien public" : "Public link"}</label>
      <input ref={inputRef} id="track-share-url" readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="mt-2 h-12 w-full border border-[var(--line-strong)] bg-[var(--background)] px-3 font-mono text-xs outline-none focus:border-[var(--signal-strong)]" />
      <p className="sr-only" role="status" aria-live="polite">{copied ? (locale === "fr" ? "Le lien a été copié dans le presse-papiers." : "The link was copied to the clipboard.") : ""}</p>
    </ParigoDialog>
  );
}
