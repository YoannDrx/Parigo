"use client";

import Image from "next/image";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent } from "react";

const MAX_VISIBLE_COVERS = 24;
const COVER_LIFETIME_MS = 4_200;

interface ManifestoCover {
  src: string;
  title: string;
}

interface ActiveCover extends ManifestoCover {
  key: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  size: number;
  entryX: number;
  entryY: number;
}

export function ManifestoScrollSection({
  locale,
  albumCovers,
}: {
  locale: "fr" | "en";
  albumCovers: ManifestoCover[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastEmissionRef = useRef(0);
  const coverKeyRef = useRef(0);
  const expiryTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const reduceMotion = useReducedMotion();
  const inView = useInView(sectionRef, { once: true, amount: .12 });
  const [revealComplete, setRevealComplete] = useState(false);
  const [activeCovers, setActiveCovers] = useState<ActiveCover[]>([]);
  const interactionReady = revealComplete || Boolean(reduceMotion);
  const titleLines = locale === "fr"
    ? ["Une musique juste.", "Au bon moment.", "Pour la bonne image."]
    : ["The right music.", "At the right moment.", "For the right image."];

  useEffect(() => () => {
    expiryTimersRef.current.forEach((timer) => globalThis.clearTimeout(timer));
    expiryTimersRef.current.clear();
  }, []);

  const scheduleExpiry = (key: number) => {
    const timer = globalThis.setTimeout(() => {
      expiryTimersRef.current.delete(key);
      setActiveCovers((current) => current.filter((cover) => cover.key !== key));
    }, COVER_LIFETIME_MS + (key % 5) * 180);
    expiryTimersRef.current.set(key, timer);
  };

  const showCover = (event: PointerEvent<HTMLElement>) => {
    if (reduceMotion || !interactionReady || event.pointerType !== "mouse" || albumCovers.length === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const currentPoint = { x: event.clientX, y: event.clientY };
    const previousPoint = lastPointRef.current;
    const distance = previousPoint
      ? Math.hypot(currentPoint.x - previousPoint.x, currentPoint.y - previousPoint.y)
      : Number.POSITIVE_INFINITY;
    if (distance < 48 || event.timeStamp - lastEmissionRef.current < 34) return;

    const steps = previousPoint ? Math.min(3, Math.max(1, Math.floor(distance / 72))) : 1;
    const directionX = previousPoint ? Math.max(-1, Math.min(1, (currentPoint.x - previousPoint.x) / 90)) : 0;
    const directionY = previousPoint ? Math.max(-1, Math.min(1, (currentPoint.y - previousPoint.y) / 90)) : 0;
    const emitted: ActiveCover[] = [];

    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      const pointX = previousPoint ? previousPoint.x + (currentPoint.x - previousPoint.x) * progress : currentPoint.x;
      const pointY = previousPoint ? previousPoint.y + (currentPoint.y - previousPoint.y) * progress : currentPoint.y;
      const relativeX = Math.min(.999, Math.max(0, (pointX - bounds.left) / bounds.width));
      const relativeY = Math.min(.999, Math.max(0, (pointY - bounds.top) / bounds.height));
      coverKeyRef.current += 1;
      const key = coverKeyRef.current;
      const cover = albumCovers[(key - 1) % albumCovers.length];
      const xJitter = ((key * 17) % 11) - 5;
      const yJitter = ((key * 23) % 9) - 4;
      emitted.push({
        ...cover,
        key,
        x: Math.min(93, Math.max(7, relativeX * 100 + xJitter)),
        y: Math.min(88, Math.max(12, relativeY * 100 + yJitter)),
        rotation: ((key * 29) % 61) - 30,
        scale: .82 + (key % 9) * .045,
        size: 7.2 + (key % 10) * .92,
        entryX: -directionX * (48 + (key % 4) * 14) + (((key * 7) % 25) - 12),
        entryY: -directionY * (38 + (key % 5) * 11) + (((key * 11) % 21) - 10),
      });
    }

    lastPointRef.current = currentPoint;
    lastEmissionRef.current = event.timeStamp;
    emitted.forEach((cover) => scheduleExpiry(cover.key));
    setActiveCovers((current) => {
      const next = [...current, ...emitted].slice(-MAX_VISIBLE_COVERS);
      const visibleKeys = new Set(next.map((cover) => cover.key));
      expiryTimersRef.current.forEach((timer, key) => {
        if (visibleKeys.has(key)) return;
        globalThis.clearTimeout(timer);
        expiryTimersRef.current.delete(key);
      });
      return next;
    });
  };

  const hideCover = () => {
    lastPointRef.current = null;
    lastEmissionRef.current = 0;
    expiryTimersRef.current.forEach((timer) => globalThis.clearTimeout(timer));
    expiryTimersRef.current.clear();
    setActiveCovers([]);
  };

  return (
    <section
      id="manifesto"
      ref={sectionRef}
      data-reveal-complete={interactionReady}
      data-cover-pool-size={albumCovers.length}
      onPointerMove={showCover}
      onPointerLeave={hideCover}
      className="relative min-h-[100svh] overflow-clip bg-[var(--background)] md:min-h-screen"
    >
      <div className="relative flex min-h-[100svh] w-full items-center overflow-hidden py-10 md:min-h-screen md:py-16">
        <AnimatePresence>
          {activeCovers.map((cover, coverIndex) => (
            <motion.figure
              key={cover.key}
              data-testid="manifesto-album-cover"
              aria-hidden="true"
              initial={reduceMotion ? false : {
                opacity: 1,
                scale: .24,
                rotate: cover.rotation - 24,
                x: `calc(-50% + ${cover.entryX}px)`,
                y: `calc(-50% + ${cover.entryY}px)`,
              }}
              animate={{
                opacity: 1,
                scale: cover.scale,
                rotate: cover.rotation,
                x: "-50%",
                y: "-50%",
              }}
              exit={reduceMotion ? { opacity: 0 } : {
                opacity: 0,
                scale: .32,
                rotate: cover.rotation + (coverIndex % 2 ? 24 : -24),
                x: `calc(-50% + ${coverIndex % 2 ? 46 : -46}px)`,
                y: "calc(-50% + 46px)",
              }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 205, damping: 15, mass: .9 }}
              className="pointer-events-none absolute z-20 aspect-square max-w-[42vw] overflow-hidden border border-white/24 bg-black shadow-[0_28px_80px_rgba(0,0,0,.48)]"
              style={{ left: `${cover.x}%`, top: `${cover.y}%`, width: `${cover.size}rem`, zIndex: 20 + coverIndex }}
            >
              <Image src={cover.src} alt="" fill sizes="240px" className="object-cover" />
            </motion.figure>
          ))}
        </AnimatePresence>

        <div className="relative z-10 w-full px-3 md:px-8">
          <div className="mx-auto max-w-[1580px] text-left lg:text-center">
            <h2 className="relative text-[clamp(4rem,17vw,5.8rem)] font-semibold uppercase leading-[.8] tracking-[-.075em] lg:text-[clamp(2.25rem,6.3vw,7rem)] lg:leading-[.9] lg:tracking-[-.06em]">
              <span className="block text-[var(--foreground)]">
                {titleLines.map((line) => <span key={line} className="block md:whitespace-nowrap">{line}</span>)}
              </span>
              {!reduceMotion ? (
                <motion.span
                  data-testid="manifesto-reveal-edge"
                  data-reveal-overlay="true"
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-[.3em] -top-[.3em] right-0 z-10 border-l-[3px] border-[var(--signal)] bg-[var(--background)]"
                  initial={{ width: "100%" }}
                  animate={inView ? { width: "0%" } : undefined}
                  transition={{ duration: 4.2, ease: [0.45, 0, 0.2, 1] }}
                  onAnimationComplete={() => setRevealComplete(true)}
                />
              ) : null}
            </h2>
            <motion.div
              initial={reduceMotion ? false : { y: 24, opacity: 0 }}
              animate={reduceMotion || inView ? { y: 0, opacity: 1 } : undefined}
              transition={{ duration: reduceMotion ? 0 : .72, delay: reduceMotion ? 0 : 3.45, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 max-w-2xl border-t border-[var(--signal)] pt-5 lg:mx-auto lg:mt-10 lg:pt-6"
            >
              <p className="text-sm leading-7 text-[var(--text-muted)] md:text-base">
                {locale === "fr"
                  ? "Parigo accompagne chaque année plusieurs centaines d’heures de programmes audiovisuels, du cinéma à la publicité, avec une même exigence éditoriale."
                  : "Every year, Parigo supports hundreds of hours of audiovisual programmes, from cinema to advertising, with the same editorial standards."}
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
