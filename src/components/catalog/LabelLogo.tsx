"use client";

import Image from "next/image";
import { useState } from "react";

interface LabelLogoProps {
  src: string | null;
  name: string;
  decorative?: boolean;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  fallbackSize?: number;
  priority?: boolean;
  fallbackVariant?: "mark" | "monogram";
}

export function LabelLogo({
  src,
  name,
  decorative = false,
  className,
  fill = false,
  width = 320,
  height = 160,
  sizes,
  fallbackSize = 44,
  priority = false,
  fallbackVariant = "mark",
}: LabelLogoProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const initials = labelMonogram(name);
    const markSize = Math.max(28, fallbackSize * 0.52);
    return (
      <span
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : name}
        aria-hidden={decorative || undefined}
        data-testid="label-logo-fallback"
        className={`grid place-items-center overflow-hidden text-[var(--foreground)] ${fallbackVariant === "mark" ? "border border-[var(--line-strong)] bg-[var(--surface-soft)]" : ""} ${fill ? "absolute inset-0" : ""} ${className ?? ""}`}
        style={{
          width: fill ? undefined : width,
          height: fill ? undefined : height,
          maxWidth: "100%",
        }}
      >
        <span className="inline-flex items-center justify-center gap-[.35em]">
          {fallbackVariant === "mark" ? <span aria-hidden="true" className="relative grid shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)]" style={{ width: markSize, height: markSize }}><span className="h-[58%] w-[58%] rounded-full border border-[var(--signal-strong)]" /><span className="absolute h-[16%] w-[16%] rounded-full bg-[var(--signal-strong)]" /></span> : null}
          {initials ? (
            <span
              className="font-mono font-semibold tracking-[-.08em]"
              style={{ fontSize: Math.max(18, fallbackSize * 0.42) }}
            >
              {initials}
            </span>
          ) : null}
        </span>
      </span>
    );
  }

  if (fill) {
    return <Image src={src} alt={decorative ? "" : name} fill sizes={sizes} className={className} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} onError={() => setFailed(true)} />;
  }

  return <Image src={src} alt={decorative ? "" : name} width={width} height={height} sizes={sizes} className={className} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} onError={() => setFailed(true)} />;
}

const NON_SIGNIFICANT_WORDS = new Set(["a", "an", "and", "de", "des", "du", "et", "la", "le", "les", "of", "the"]);

export function labelMonogram(name: string): string {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  const significant = words.filter((word) => !NON_SIGNIFICANT_WORDS.has(word.toLocaleLowerCase()));
  const candidates = significant.length > 0 ? significant : words;
  if (candidates.length >= 2) return `${Array.from(candidates[0])[0] ?? ""}${Array.from(candidates[1])[0] ?? ""}`.toLocaleUpperCase();
  return candidates[0] ? Array.from(candidates[0]).slice(0, 2).join("").toLocaleUpperCase() : "";
}
