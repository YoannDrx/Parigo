"use client";

import { useEffect, useRef, useState } from "react";
import { Waveform } from "./Waveform";

export function TrackWaveform({ trackId, initialData, progress = 0, height = 28, interactive = false, onSeek, className }: { trackId: string; initialData?: number[] | null; progress?: number; height?: number; interactive?: boolean; onSeek?: (progress: number) => void; className?: string }) {
  const [remote, setRemote] = useState<{ trackId: string; data: number[] } | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const data = initialData?.length ? initialData : remote?.trackId === trackId ? remote.data : null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setNearViewport(true);
      observer.disconnect();
    }, { rootMargin: "320px 0px" });
    observer.observe(container);
    return () => observer.disconnect();
  }, [trackId]);

  useEffect(() => {
    if (!nearViewport || initialData?.length) return;
    const controller = new AbortController();
    void fetch(`/api/tracks/${encodeURIComponent(trackId)}/waveform`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (Array.isArray(payload?.waveform)) setRemote({ trackId, data: payload.waveform }); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [initialData, nearViewport, trackId]);

  return (
    <div ref={containerRef} className={className} style={{ height }}>
      {nearViewport ? (
        <Waveform data={data} progress={progress} height={height} waveColor="color-mix(in srgb, var(--foreground) 16%, transparent)" progressColor="var(--signal-strong)" interactive={interactive} onSeek={onSeek} />
      ) : (
        <div
          aria-hidden="true"
          className="h-full w-full opacity-55"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, color-mix(in srgb, var(--foreground) 18%, transparent) 0 2px, transparent 2px 5px)",
            maskImage: "linear-gradient(180deg, transparent 12%, black 45%, black 55%, transparent 88%)",
          }}
        />
      )}
    </div>
  );
}
