"use client";

import { motion } from "framer-motion";
import {
  ShowreelSoundButton,
  type FloatingShowreelSoundControlProps,
} from "./ShowreelAudioProvider";

export function ShowreelFloatingSoundControl({
  bottom,
  origin,
  onAnimationComplete,
}: FloatingShowreelSoundControlProps) {
  return (
    <motion.div
      layout="position"
      data-testid="showreel-sound-position"
      className="fixed right-3 z-[57] sm:right-5"
      style={{ bottom }}
      initial={origin
        ? { opacity: 1, scale: 1, x: origin.x, y: origin.y }
        : { opacity: 0, scale: .94, x: 0, y: 0 }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: .88 }}
      onAnimationComplete={onAnimationComplete}
      transition={{
        layout: { type: "spring", stiffness: 72, damping: 20, mass: 1.15 },
        x: { type: "spring", stiffness: 72, damping: 20, mass: 1.15 },
        y: { type: "spring", stiffness: 72, damping: 20, mass: 1.15 },
        opacity: { duration: .25 },
        scale: { duration: .42, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <ShowreelSoundButton floating />
    </motion.div>
  );
}
