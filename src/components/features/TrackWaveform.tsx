"use client";

import { useEffect, useState } from "react";
import { Waveform } from "./Waveform";

export function TrackWaveform({ trackId, initialData, progress = 0, height = 28, interactive = false, onSeek, className }: { trackId: string; initialData?: number[] | null; progress?: number; height?: number; interactive?: boolean; onSeek?: (progress: number) => void; className?: string }) {
  const [remote, setRemote] = useState<{ trackId: string; data: number[] } | null>(null);
  const data = initialData?.length ? initialData : remote?.trackId === trackId ? remote.data : null;

  useEffect(() => {
    if (initialData?.length) return;
    const controller = new AbortController();
    void fetch(`/api/tracks/${encodeURIComponent(trackId)}/waveform`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (Array.isArray(payload?.waveform)) setRemote({ trackId, data: payload.waveform }); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [initialData, trackId]);

  return <Waveform data={data} progress={progress} height={height} waveColor="color-mix(in srgb, var(--foreground) 16%, transparent)" progressColor="var(--signal-strong)" interactive={interactive} onSeek={onSeek} className={className} />;
}
