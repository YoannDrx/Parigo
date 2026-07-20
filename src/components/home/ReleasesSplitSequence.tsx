"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

const releases = [
  { title: "EDM From Paris", ref: "PGO 0023", cover: "/media/mock/albums/pgo0023.avif", tone: "#d9ff55", reveal: "left" },
  { title: "Latin Experience", ref: "PGO 0026", cover: "/media/mock/albums/pgo0026.avif", tone: "#ffc547", reveal: "up" },
  { title: "Hollywood Hustlers", ref: "PGO 0028", cover: "/media/mock/albums/pgo0028.avif", tone: "#ff6d45", reveal: "center" },
  { title: "Trap In The Cloud", ref: "PGO 0035", cover: "/media/mock/albums/pgo0035.avif", tone: "#a5bbff", reveal: "down" },
  { title: "Dub Experience", ref: "PGO 0046", cover: "/media/mock/albums/pgo0046.avif", tone: "#d8a876", reveal: "right" },
] as const;

function RevealShutter({ direction, tone }: { direction: (typeof releases)[number]["reveal"]; tone: string }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;

  if (direction === "center") {
    return (
      <>
        <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: [0, 1, 0] }} viewport={{ once: true, amount: 0.28 }} transition={{ duration: 0.92, times: [0, 0.48, 1], ease: [0.22, 1, 0.36, 1] }} className="pointer-events-none absolute inset-y-0 left-0 z-20 w-1/2 origin-left" style={{ backgroundColor: tone }} />
        <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: [0, 1, 0] }} viewport={{ once: true, amount: 0.28 }} transition={{ duration: 0.92, times: [0, 0.48, 1], ease: [0.22, 1, 0.36, 1] }} className="pointer-events-none absolute inset-y-0 right-0 z-20 w-1/2 origin-right" style={{ backgroundColor: tone }} />
      </>
    );
  }

  const initial = direction === "left" ? { x: "-101%", y: 0 } : direction === "right" ? { x: "101%", y: 0 } : direction === "up" ? { x: 0, y: "-101%" } : { x: 0, y: "101%" };
  const sweep = direction === "left" ? { x: ["-101%", "0%", "101%"], y: 0 } : direction === "right" ? { x: ["101%", "0%", "-101%"], y: 0 } : direction === "up" ? { x: 0, y: ["-101%", "0%", "101%"] } : { x: 0, y: ["101%", "0%", "-101%"] };
  return <motion.span initial={initial} whileInView={sweep} viewport={{ once: true, amount: 0.28 }} transition={{ duration: 0.92, times: [0, 0.48, 1], ease: [0.22, 1, 0.36, 1] }} className="pointer-events-none absolute inset-0 z-20" style={{ backgroundColor: tone }} />;
}

export function ReleasesSplitSequence() {
  const { locale } = useI18n();

  return (
    <div className="border-t border-[var(--line)]">
      {releases.map((release, index) => {
        const mediaFirst = index % 2 === 0;
        return (
          <motion.article
            key={release.ref}
            initial={{ opacity: 0.72 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.6 }}
            className="grid min-h-[76svh] border-b border-[var(--line)] md:grid-cols-2"
          >
            <Link href="/albums" className={`group relative min-h-[48svh] overflow-hidden bg-[#151713] md:min-h-full ${mediaFirst ? "md:order-1" : "md:order-2"}`}>
              <Image src={release.cover} alt={release.title} fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover transition duration-[1.2s] ease-out group-hover:scale-[1.035]" />
              <RevealShutter direction={release.reveal} tone={release.tone} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-transparent" />
            </Link>
            <div className={`relative flex min-h-[45svh] flex-col justify-between overflow-hidden p-5 md:min-h-full md:p-10 lg:p-14 ${mediaFirst ? "md:order-2" : "md:order-1"}`} style={{ backgroundColor: index % 2 === 0 ? "var(--surface-soft)" : release.tone }}>
              <div className="flex items-center justify-between font-mono text-[.62rem] uppercase tracking-[.16em] opacity-52">
                <span>{String(index + 1).padStart(2, "0")} / {String(releases.length).padStart(2, "0")}</span>
                <span>{release.ref}</span>
              </div>
              <motion.div initial={{ y: 54, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, amount: 0.36 }} transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}>
                <p className="mb-5 max-w-sm text-sm leading-relaxed opacity-58">
                  {locale === "fr" ? "Une parution Parigo pensée comme un territoire narratif, prête à rencontrer l’image." : "A Parigo release conceived as a narrative territory, ready to meet the moving image."}
                </p>
                <h3 className="max-w-[9ch] font-[var(--font-editorial)] text-[clamp(4rem,7vw,9rem)] font-normal leading-[.76] tracking-[-.06em]">{release.title}</h3>
              </motion.div>
              <Link href="/albums" className="inline-flex min-h-11 w-fit items-center gap-3 border-b border-current/35 text-sm transition hover:gap-5">
                {locale === "fr" ? "Explorer la parution" : "Explore the release"} <ArrowUpRight size={16} />
              </Link>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
