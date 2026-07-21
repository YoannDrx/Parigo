"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import type { PointerEvent } from "react";
import { SignalFieldLoader } from "./SignalFieldLoader";

export function OrganicHeroBackdrop() {
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const scenePointerX = useMotionValue(0);
  const scenePointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 32, damping: 18, mass: 1.4 });
  const y = useSpring(pointerY, { stiffness: 32, damping: 18, mass: 1.4 });
  const sceneX = useSpring(scenePointerX, { stiffness: 48, damping: 20, mass: 1.1 });
  const sceneY = useSpring(scenePointerY, { stiffness: 48, damping: 20, mass: 1.1 });
  const farX = useTransform(x, (value) => value * -.45);
  const farY = useTransform(y, (value) => value * -.35);
  const nearX = useTransform(x, (value) => value * .9);
  const nearY = useTransform(y, (value) => value * .72);
  const tiltX = useTransform(sceneY, [-1, 1], [8, -8]);
  const tiltY = useTransform(sceneX, [-1, 1], [-9, 9]);
  const glowX = useTransform(sceneX, [-1, 1], [-190, 190]);
  const glowY = useTransform(sceneY, [-1, 1], [-125, 125]);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const normalizedX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
    const normalizedY = (event.clientY - bounds.top) / bounds.height * 2 - 1;
    pointerX.set(normalizedX * 28);
    pointerY.set(normalizedY * 24);
    scenePointerX.set(normalizedX);
    scenePointerY.set(normalizedY);
  };

  const reset = () => {
    pointerX.set(0);
    pointerY.set(0);
    scenePointerX.set(0);
    scenePointerY.set(0);
  };

  return (
    <div aria-hidden="true" onPointerMove={move} onPointerLeave={reset} className="pointer-events-auto absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(89,190,118,.11),transparent_39%),linear-gradient(180deg,var(--surface)_0%,color-mix(in_srgb,var(--signal-soft)_34%,var(--surface))_55%,var(--surface)_100%)]" />
      <motion.div style={{ x: farX, y: farY }} className="absolute left-[4%] top-[12%] h-[60%] w-[78%] rounded-[42%_58%_62%_38%/54%_38%_62%_46%] bg-[color-mix(in_srgb,var(--signal)_20%,transparent)] blur-[88px]" />
      <motion.div style={{ x: nearX, y: nearY }} className="absolute bottom-[-12%] right-[1%] h-[58%] w-[60%] rotate-[-9deg] rounded-[58%_42%_33%_67%/42%_55%_45%_58%] bg-[color-mix(in_srgb,var(--signal-strong)_15%,transparent)] blur-[74px]" />
      <motion.div
        animate={reducedMotion ? undefined : {
          borderRadius: ["32% 68% 42% 58% / 64% 38% 62% 36%", "39% 61% 28% 72% / 71% 34% 66% 29%", "27% 73% 41% 59% / 62% 43% 57% 38%", "42% 58% 34% 66% / 68% 30% 70% 32%", "32% 68% 42% 58% / 64% 38% 62% 36%"],
          scaleX: [1, .86, 1.08, .92, 1],
          scaleY: [1, 1.12, .91, 1.08, 1],
          rotate: [-2, 4, -4, 2, -2],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{ x, y, rotateX: tiltX, rotateY: tiltY, transformPerspective: 900 }}
        className="absolute left-1/2 top-1/2 aspect-square h-[72%] min-h-[450px] max-h-[700px] w-auto -translate-x-1/2 -translate-y-1/2 overflow-hidden border border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,.5),rgba(80,165,105,.18)_48%,rgba(255,255,255,.34))] shadow-[inset_0_0_130px_rgba(255,255,255,.5),0_42px_120px_rgba(34,106,58,.18)] backdrop-blur-[3px] [transform-style:preserve-3d]"
      >
        <motion.span style={{ x: glowX, y: glowY }} className="absolute left-1/2 top-1/2 h-[66%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color-mix(in_srgb,var(--signal)_28%,transparent)] blur-[65px]" />
        <span className="absolute inset-[7%] rounded-[inherit] border border-white/18 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.5),transparent_36%)]" />
      </motion.div>
      <div className="pointer-events-none absolute -inset-x-[12%] inset-y-[5%] opacity-78 mix-blend-multiply dark:mix-blend-screen"><SignalFieldLoader pointerX={sceneX} pointerY={sceneY} /></div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49.9%,color-mix(in_srgb,var(--foreground)_7%,transparent)_50%,transparent_50.1%)] opacity-30" />
    </div>
  );
}
