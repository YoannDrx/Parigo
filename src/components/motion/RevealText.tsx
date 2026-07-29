"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { stripTerminalTitleMark } from "@/components/ui/SignedTitle";

interface RevealTextProps {
  children: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  delay?: number;
  mode?: "words" | "lines";
  signature?: boolean;
}

export function RevealText({ children, className, as = "p", delay = 0, mode = "words", signature = false }: RevealTextProps) {
  const MotionTag = motion[as];
  const text = signature ? stripTerminalTitleMark(children) : children;
  const segments = mode === "lines" ? text.split("\n") : text.split(" ");

  return (
    <MotionTag className={cn("reveal-text", signature && "parigo-signed-title", className)}>
      <span className="sr-only">{text.replaceAll("\n", " ")}</span>
      {segments.map((segment, index) => (
        <span key={`${segment}-${index}`} className={cn("reveal-segment", mode === "lines" && "block")} aria-hidden="true">
          <motion.span
            initial={{ y: "8%", rotate: 0.35, opacity: 0.82 }}
            animate={as === "h1" ? { y: "0%", rotate: 0, opacity: 1 } : undefined}
            whileInView={as === "h1" ? undefined : { y: "0%", rotate: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.72, delay: delay + index * (mode === "lines" ? 0.1 : 0.025), ease: [0.22, 1, 0.36, 1] }}
            className="inline-block"
          >
            {segment}{mode === "words" && index < segments.length - 1 ? "\u00a0" : ""}
          </motion.span>
        </span>
      ))}
      {signature && <span className="parigo-title-signature" aria-hidden="true" />}
    </MotionTag>
  );
}
