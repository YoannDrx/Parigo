"use client";

import { useState } from "react";
import { FileText, X } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

export function CueSheetButton({ title, trackIds, compact = false, className }: { title: string; trackIds: string[]; compact?: boolean; className?: string }) {
  const { data: session } = useSession();
  const { locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  if (!session?.user || !trackIds.length) return null;
  const create = async () => {
    setLoading(true);
    setError("");
    setRequestId("");
    try {
      const response = await fetch("/api/cuesheet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: `${title} - cue sheet`, trackIds }) });
      const payload = await response.json();
      if (!response.ok || !payload.data?.url) {
        setRequestId(payload.error?.requestId || response.headers.get("X-Request-ID") || "");
        throw new Error(payload.error?.message || (locale === "fr" ? "Impossible de générer la cue sheet." : "Unable to generate the cue sheet."));
      }
      window.open(payload.data.url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cue sheet unavailable");
    } finally {
      setLoading(false);
    }
  };
  return <div className="relative">{compact ? <Tooltip label="Cue sheet"><button type="button" onClick={() => void create()} disabled={loading} className={cn("flex h-10 w-10 items-center justify-center transition hover:bg-[var(--surface-soft)]", className)} aria-label={`Cue sheet : ${title}`}>{loading ? <ParigoLoader size="icon" label={locale === "fr" ? "Création de la cue sheet" : "Creating cue sheet"} /> : <FileText size={17} />}</button></Tooltip> : <Button variant="outline" size="lg" onClick={() => void create()} disabled={loading} className={className}>{loading ? <ParigoLoader size="icon" label={locale === "fr" ? "Création de la cue sheet" : "Creating cue sheet"} /> : <FileText size={18} />} Cue sheet</Button>}{error && <div role="alert" className={`${compact ? "absolute right-0 top-11 z-50 w-72 shadow-lg" : "mt-2"} flex items-start gap-2 border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-950`}><div className="min-w-0 flex-1"><p>{error}</p>{requestId && <p className="mt-1 font-mono text-[.62rem] opacity-60">{locale === "fr" ? "Référence" : "Reference"} : {requestId}</p>}</div><button type="button" onClick={() => { setError(""); setRequestId(""); }} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/25" aria-label={locale === "fr" ? "Fermer le message" : "Dismiss message"}><X size={13} /></button></div>}</div>;
}
