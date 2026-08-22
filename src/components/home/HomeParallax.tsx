"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useHomeReducedMotion } from "./HomeMotion";

interface HomeParallaxImageProps {
  src: string;
  alt: string;
  sizes: string;
  quality?: number;
  className?: string;
}

export function HomeParallaxImage({
  src,
  alt,
  sizes,
  quality = 75,
  className = "",
}: HomeParallaxImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useHomeReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-14%", "14%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.055, 1, 1.055]);

  return (
    <div
      ref={containerRef}
      data-testid="home-about-parallax"
      data-parallax-static={reduceMotion ? "true" : "false"}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <motion.div
        data-testid="home-about-parallax-layer"
        style={reduceMotion ? { y: 0, scale: 1 } : { y, scale }}
        className="absolute inset-x-0 -inset-y-[22%]"
      >
        <Image
          src={src}
          alt={alt}
          fill
          loading="lazy"
          quality={quality}
          sizes={sizes}
          className={`object-cover ${className}`}
        />
      </motion.div>
    </div>
  );
}
