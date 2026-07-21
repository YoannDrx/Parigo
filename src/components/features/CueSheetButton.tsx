"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button, Tooltip } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";

export function CueSheetButton({ title, trackIds, compact = false }: { title: string; trackIds: string[]; compact?: boolean }) {
  const { data: session } = useSession();
  const { locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!session?.user || !trackIds.length) return null;
  const create = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/cuesheet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: `${title} - cue sheet`, trackIds }) });
      const payload = await response.json();
      if (!response.ok || !payload.data?.url) throw new Error(payload.error?.message || "Cue sheet unavailable");
      window.open(payload.data.url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cue sheet unavailable");
    } finally {
      setLoading(false);
    }
  };
  return <div>{compact ? <Tooltip label={error || "Cue sheet"}><button type="button" onClick={() => void create()} disabled={loading} className="flex h-10 w-10 items-center justify-center transition hover:bg-[var(--surface-soft)]" aria-label={`Cue sheet : ${title}`}>{loading ? <Loader2 size={17} className="animate-spin" /> : <FileText size={17} />}</button></Tooltip> : <Button variant="outline" size="lg" onClick={() => void create()} disabled={loading}>{loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} {locale === "fr" ? "Cue sheet" : "Cue sheet"}</Button>}{error && <span className="sr-only" role="alert">{error}</span>}</div>;
}
