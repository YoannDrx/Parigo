"use client";

import { AlertCircle, Check, Copy, RefreshCw, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui/Button";
import { ParigoDialog } from "@/components/ui/ParigoDialog";
import { useTrackShareStore } from "@/stores/track-share-store";
import { toast } from "@/stores/toast-store";

interface ShortUrlResult {
  url: string;
  shortened: boolean;
}

const shortUrlCache = new Map<string, string>();
const shortUrlRequests = new Map<string, Promise<ShortUrlResult>>();
const subscribeToNavigator = () => () => undefined;

function resolveShortUrl(path: string): Promise<ShortUrlResult> {
  const cached = shortUrlCache.get(path);
  if (cached) return Promise.resolve({ url: cached, shortened: true });
  const pending = shortUrlRequests.get(path);
  if (pending) return pending;
  const request = fetch("/api/share/short-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  }).then(async (response) => {
    if (!response.ok) throw new Error("SHORT_URL_FAILED");
    return response.json() as Promise<{ data: ShortUrlResult }>;
  }).then((payload) => {
    if (payload.data.shortened) shortUrlCache.set(path, payload.data.url);
    return payload.data;
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
  const [resolvedUrl, setResolvedUrl] = useState<{ path: string; result: ShortUrlResult } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [copiedPath, setCopiedPath] = useState("");
  const canNativeShare = useSyncExternalStore(subscribeToNavigator, () => typeof navigator.share === "function", () => false);
  const cachedUrl = shortUrlCache.get(path);
  const currentResult = resolvedUrl?.path === path ? resolvedUrl.result : cachedUrl ? { url: cachedUrl, shortened: true } : null;
  const url = currentResult?.url || "";
  const resolutionState = !target || !path ? "idle" : !currentResult ? "loading" : currentResult.shortened ? "ready" : "fallback";
  const resolving = resolutionState === "loading";
  const copied = copiedPath === path;

  useEffect(() => {
    if (!target || !path) return;
    let active = true;
    const cached = shortUrlCache.get(path);
    if (cached) return;
    void resolveShortUrl(path).then((result) => {
      if (!active) return;
      setResolvedUrl({ path, result });
    }).catch(() => {
      if (!active) return;
      setResolvedUrl({ path, result: { url: canonicalUrl, shortened: false } });
    });
    return () => { active = false; };
  }, [canonicalUrl, path, retryCount, target]);

  const copy = async () => {
    if (!url || resolving) return;
    await copyText(url, inputRef.current).catch(() => undefined);
    setCopiedPath(path);
    toast.success(locale === "fr" ? "Lien copié." : "Link copied.");
    window.setTimeout(() => setCopiedPath((current) => current === path ? "" : current), 2_000);
  };
  const nativeShare = async () => {
    if (!target || !canNativeShare || !url || resolving) return;
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
        {canNativeShare ? <Button variant="outline" disabled={resolving || !url} onClick={() => void nativeShare()}><Share2 size={16} />{locale === "fr" ? "Partager via…" : "Share via…"}</Button> : null}
        <Button disabled={resolving || !url} onClick={() => void copy()}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? (locale === "fr" ? "Lien copié" : "Link copied") : resolving ? (locale === "fr" ? "Création du lien…" : "Creating link…") : (locale === "fr" ? "Copier le lien" : "Copy link")}</Button>
      </>}
    >
      <label className="block text-xs font-semibold" htmlFor="track-share-url">{locale === "fr" ? "Lien public" : "Public link"}</label>
      <div className="relative mt-2">
        <input ref={inputRef} id="track-share-url" readOnly value={url} placeholder={resolving ? (locale === "fr" ? "Création du lien court…" : "Creating short link…") : undefined} aria-busy={resolving} onFocus={(event) => event.currentTarget.select()} className="h-12 w-full border border-[var(--line-strong)] bg-[var(--background)] px-3 pr-12 font-mono text-xs outline-none focus:border-[var(--signal-strong)]" />
        <button type="button" disabled={resolving || !url} onClick={() => void copy()} className="absolute inset-y-1 right-1 grid aspect-square place-items-center border-l border-[var(--line)] text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--signal-strong)] disabled:opacity-40" aria-label={locale === "fr" ? "Copier le lien court" : "Copy short link"}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
      </div>
      {resolutionState === "fallback" ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]" role="status"><span className="inline-flex items-center gap-2"><AlertCircle size={14} />{locale === "fr" ? "Lien court indisponible — le lien Parigo complet reste utilisable." : "Short link unavailable — the full Parigo link remains usable."}</span><button type="button" onClick={() => { shortUrlRequests.delete(path); setResolvedUrl(null); setRetryCount((value) => value + 1); }} className="inline-flex min-h-9 items-center gap-2 border border-[var(--line)] px-3 font-semibold text-[var(--foreground)]"><RefreshCw size={13} />{locale === "fr" ? "Réessayer" : "Retry"}</button></div> : null}
      {resolutionState === "ready" ? <p className="mt-3 text-xs text-[var(--text-muted)]" role="status">{locale === "fr" ? "Lien court sécurisé prêt à être partagé." : "Secure short link ready to share."}</p> : null}
      <p className="sr-only" role="status" aria-live="polite">{copied ? (locale === "fr" ? "Le lien a été copié dans le presse-papiers." : "The link was copied to the clipboard.") : ""}</p>
    </ParigoDialog>
  );
}
