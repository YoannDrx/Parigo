"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MediaRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}

const initialClip = {
  up: "inset(10% 0 0 0 round 2px)",
  left: "inset(0 10% 0 0 round 2px)",
  right: "inset(0 0 0 10% round 2px)",
};

export function MediaReveal({ children, className, delay = 0, direction = "up" }: MediaRevealProps) {
  return (
    <motion.div
      initial={{ clipPath: initialClip[direction], scale: 0.985, opacity: 0.72 }}
      whileInView={{ clipPath: "inset(0 0 0 0 round 2px)", scale: 1, opacity: 1 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.95, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("overflow-hidden", className)}
    >
      {children}
    </motion.div>
  );
}
