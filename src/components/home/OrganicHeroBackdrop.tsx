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

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const normalizedX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
    const normalizedY = (event.clientY - bounds.top) / bounds.height * 2 - 1;
    pointerX.set(normalizedX * 21);
    pointerY.set(normalizedY * 17);
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(89,190,118,.2),transparent_34%),linear-gradient(180deg,var(--surface)_0%,color-mix(in_srgb,var(--signal-soft)_48%,var(--surface))_55%,var(--surface)_100%)]" />
      <motion.div style={{ x: farX, y: farY }} className="absolute left-[8%] top-[10%] h-[66%] w-[74%] rounded-[42%_58%_62%_38%/54%_38%_62%_46%] bg-[color-mix(in_srgb,var(--signal)_34%,transparent)] blur-[72px]" />
      <motion.div style={{ x: nearX, y: nearY }} className="absolute bottom-[-10%] right-[5%] h-[62%] w-[58%] rotate-[-9deg] rounded-[58%_42%_33%_67%/42%_55%_45%_58%] bg-[color-mix(in_srgb,var(--signal-strong)_26%,transparent)] blur-[58px]" />
      <motion.div
        animate={reducedMotion ? undefined : { borderRadius: ["46% 54% 58% 42% / 54% 42% 58% 46%", "58% 42% 43% 57% / 44% 62% 38% 56%", "46% 54% 58% 42% / 54% 42% 58% 46%"] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        style={{ x, y }}
        className="absolute left-1/2 top-[49%] h-[48vw] max-h-[620px] min-h-[330px] w-[62vw] max-w-[900px] min-w-[470px] -translate-x-1/2 -translate-y-1/2 border border-white/45 bg-[linear-gradient(130deg,rgba(255,255,255,.52),rgba(80,165,105,.12))] shadow-[inset_0_0_90px_rgba(255,255,255,.48),0_42px_120px_rgba(34,106,58,.18)] backdrop-blur-[2px]"
      />
      <div className="pointer-events-none absolute inset-[12%_4%] opacity-45 mix-blend-multiply dark:mix-blend-screen"><SignalFieldLoader pointerX={sceneX} pointerY={sceneY} /></div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49.9%,color-mix(in_srgb,var(--foreground)_7%,transparent)_50%,transparent_50.1%)] opacity-30" />
    </div>
  );
}
