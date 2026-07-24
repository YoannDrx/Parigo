"use client";

import Image from "next/image";
import { useState } from "react";

interface LabelLogoProps {
  src: string | null;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  fallbackSize?: number;
  priority?: boolean;
}

export function LabelLogo({
  src,
  alt,
  className,
  fill = false,
  width = 320,
  height = 160,
  sizes,
  fallbackSize = 44,
  priority = false,
}: LabelLogoProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const initials = alt
      .split(/[\s_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toLocaleUpperCase())
      .join("") || "PM";
    const hue = [...alt].reduce((total, character) => total + character.charCodeAt(0), 0) % 360;
    return (
      <span
        role="img"
        aria-label={alt}
        className={`grid place-items-center border border-[var(--line-strong)] font-mono font-semibold tracking-[-.08em] ${fill ? "absolute inset-0" : ""} ${className ?? ""}`}
        style={{
          width: fill ? undefined : width,
          height: fill ? undefined : height,
          maxWidth: "100%",
          fontSize: Math.max(18, fallbackSize * 0.52),
          color: `hsl(${hue} 42% 28%)`,
          background: `linear-gradient(135deg, hsl(${hue} 48% 91%), hsl(${(hue + 35) % 360} 38% 82%))`,
        }}
      >
        {initials}
      </span>
    );
  }

  if (fill) {
    return <Image src={src} alt={alt} fill sizes={sizes} className={className} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} onError={() => setFailed(true)} />;
  }

  return <Image src={src} alt={alt} width={width} height={height} sizes={sizes} className={className} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} onError={() => setFailed(true)} />;
}
