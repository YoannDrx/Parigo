"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import type { Playlist } from "@/types";

function EditorialCard({ playlist, index, progress, total, locale }: { playlist: Playlist; index: number; progress: MotionValue<number>; total: number; locale: "fr" | "en" }) {
  const focus = total <= 1 ? 0 : index / (total - 1);
  const y = useTransform(progress, [focus - .24, focus, focus + .24], [54, 0, -34]);
  const rotate = useTransform(progress, [focus - .24, focus, focus + .24], [index % 2 ? 3.5 : -3.5, 0, index % 2 ? -1.5 : 1.5]);
  const scale = useTransform(progress, [focus - .24, focus, focus + .24], [.94, 1, .97]);

  return (
    <motion.div style={{ y, rotate, scale }} className="w-full shrink-0 md:w-[min(31vw,460px)]">
      <Link href={`/playlists/${playlist.id}`} className="group block overflow-hidden rounded-[1.4rem] bg-[#f1efe7] p-3 shadow-[0_32px_90px_rgba(0,0,0,.28)] transition-shadow hover:shadow-[0_40px_110px_rgba(0,0,0,.42)] md:p-4">
        <div className="relative aspect-square overflow-hidden rounded-[1rem] bg-[#e3e3dc]">
          <Image src={playlist.cover} alt={playlist.title} fill sizes="(max-width:768px) 100vw, 30vw" className="object-contain transition duration-700 group-hover:scale-[1.018]" />
          <span className="absolute left-4 top-4 rounded-full border border-white/25 bg-[#111510]/94 px-3 py-1.5 font-mono text-[.58rem] tracking-[.13em] text-white shadow-sm backdrop-blur-md">PARIGO / {String(index + 1).padStart(2, "0")}</span>
        </div>
        <div className="flex min-h-28 items-end justify-between gap-5 px-2 pb-2 pt-5 text-[#111510]">
          <div className="min-w-0"><p className="font-mono text-[.58rem] uppercase tracking-[.13em] text-[#58705d]">{locale === "fr" ? "Sélection éditoriale" : "Editorial selection"}</p><h3 className="mt-2 line-clamp-2 text-2xl font-semibold leading-[.98] tracking-[-.045em] md:text-3xl">{playlist.title}</h3></div>
          <span className="mb-1 shrink-0 rounded-full border border-[#111510]/18 px-3 py-2 font-mono text-[.58rem]">{playlist.trackCount ?? 0} {locale === "fr" ? "pistes" : "tracks"}</span>
        </div>
      </Link>
    </motion.div>
  );
}

export function EditorialScrollStory({ playlists, locale }: { playlists: Playlist[]; locale: "fr" | "en" }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const visiblePlaylists = playlists.slice(0, 6);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", visiblePlaylists.length > 2 ? "-63%" : "0%"]);

  return (
    <section ref={sectionRef} className="relative min-h-[100svh] overflow-clip bg-[#101511] px-4 py-20 text-[#f3f0e8] md:min-h-[245svh] md:px-8 md:py-0">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(80,181,105,.19),transparent_27%),linear-gradient(115deg,transparent_38%,rgba(255,255,255,.035)_38.2%,transparent_38.4%)]" />
      <div className="mx-auto grid max-w-[1740px] gap-12 md:sticky md:top-[74px] md:h-[calc(100svh-74px)] md:grid-cols-[minmax(280px,32%)_1fr] md:items-center">
        <div className="relative z-10 md:pr-10">
          <p className="eyebrow text-[var(--signal)]">Parigo / Playlists</p>
          <h2 className="mt-5 text-[clamp(2.8rem,5vw,5.5rem)] leading-[.92]">{locale === "fr" ? "Une sélection, plusieurs récits." : "One selection, many stories."}</h2>
          <p className="mt-6 max-w-sm leading-relaxed text-white/76">{locale === "fr" ? "Chaque pochette ouvre un angle narratif. Faites défiler la collection, puis entrez dans l’univers qui répond à votre brief." : "Each cover opens a narrative angle. Scroll through the collection, then enter the world that answers your brief."}</p>
          <Link href="/playlists" className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold hover:text-[var(--signal)]">{locale === "fr" ? "Toutes les playlists" : "All playlists"}<ArrowRight size={16} /></Link>
          <div className="mt-12 hidden h-px bg-white/14 md:block"><motion.div style={{ scaleX: scrollYProgress, transformOrigin: "left" }} className="h-full bg-[var(--signal)]" /></div>
        </div>
        <div className="min-w-0 overflow-hidden py-12 md:-my-20 md:py-20">
          <motion.div style={reduceMotion ? undefined : { x }} className="flex flex-col gap-5 md:w-max md:flex-row md:pl-4 md:pr-28">
            {visiblePlaylists.map((playlist, index) => <EditorialCard key={playlist.id} playlist={playlist} index={index} progress={scrollYProgress} total={visiblePlaylists.length} locale={locale} />)}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
