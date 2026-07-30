"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { ClipPlaybackDescriptor } from "@/lib/editorial/video-types";
import { cn } from "@/lib/utils";
import { useClipPlayback } from "@/components/providers/ClipPlaybackProvider";

export function ClipPlaybackAnchor({
  clip,
  children,
  className,
  testId,
}: {
  clip: ClipPlaybackDescriptor;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const { registerClipAnchor } = useClipPlayback();

  useEffect(() => {
    const element = anchorRef.current;
    if (!element) return;
    return registerClipAnchor(clip, element);
  }, [clip, registerClipAnchor]);

  return (
    <div
      ref={anchorRef}
      data-clip-anchor={clip.slug}
      data-testid={testId}
      className={cn("relative", className)}
    >
      {children}
    </div>
  );
}
