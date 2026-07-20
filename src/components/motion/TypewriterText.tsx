"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  children: string;
  className?: string;
  delay?: number;
}

export function TypewriterText({ children, className, delay = 0 }: TypewriterTextProps) {
  return (
    <motion.span
      className={cn("inline-flex flex-wrap", className)}
      aria-label={children}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.7 }}
      variants={{
        hidden: {},
        visible: { transition: { delayChildren: delay, staggerChildren: 0.028 } },
      }}
    >
      {Array.from(children).map((character, index) => (
        <motion.span
          key={`${character}-${index}`}
          aria-hidden="true"
          className={character === " " ? "w-[.34em]" : undefined}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { duration: 0.01 } },
          }}
        >
          {character === " " ? "\u00a0" : character}
        </motion.span>
      ))}
      <motion.span
        aria-hidden="true"
        className="ml-1 inline-block w-[.55em] bg-current"
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, times: [0, 0.48, 0.49, 1] }}
      >
        &nbsp;
      </motion.span>
    </motion.span>
  );
}
