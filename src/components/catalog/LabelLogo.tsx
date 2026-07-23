"use client";

import Image from "next/image";
import { Building2 } from "lucide-react";
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
}: LabelLogoProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <Building2 aria-hidden="true" size={fallbackSize} className="opacity-25" />;
  }

  if (fill) {
    return <Image src={src} alt={alt} fill sizes={sizes} className={className} onError={() => setFailed(true)} />;
  }

  return <Image src={src} alt={alt} width={width} height={height} sizes={sizes} className={className} onError={() => setFailed(true)} />;
}
