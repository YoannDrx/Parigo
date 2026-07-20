"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useRef, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { TypewriterText } from "@/components/motion";

const artists = [
  { name: "Arandel", image: "/media/mock/artists/arandel.jpg", role: "Composition · Electronic" },
  { name: "Forever Pavot", image: "/media/mock/artists/forever-pavot.jpg", role: "Composition · Psychedelic pop" },
  { name: "Charlotte Savary", image: "/media/mock/artists/charlotte-savary.jpg", role: "Voice · Songwriting" },
  { name: "Flore", image: "/media/mock/artists/flore.jpg", role: "Production · Bass music" },
  { name: "Drixxxé", image: "/media/mock/artists/drixxxe.jpg", role: "Production · Hip-hop" },
  { name: "Frédéric Hanak", image: "/media/mock/artists/frederic-hanak.jpg", role: "Composition · Sound design" },
  { name: "2080", image: "/media/mock/artists/2080.jpg", role: "Live · Electronic" },
  { name: "Les Cavaliers", image: "/media/mock/artists/les-cavaliers.jpg", role: "Band · Alternative" },
];

function ArtistPortrait({ artist, index, onActivate }: { artist: (typeof artists)[number]; index: number; onActivate: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <motion.article
      ref={ref}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      initial={{ clipPath: "inset(9% 5% 9% 5%)", opacity: 0.42 }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
      viewport={{ once: true, amount: 0.26 }}
      transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
      className="group relative min-h-[68svh] overflow-hidden border-b border-black/20 focus-within:outline-none md:min-h-[76svh]"
    >
      <motion.div style={{ y: imageY }} className="absolute -inset-y-[10%] inset-x-0">
        <Image src={artist.image} alt="" fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover grayscale transition duration-700 group-hover:scale-[1.025] group-hover:grayscale-0 group-focus-within:grayscale-0" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/10 to-black/10" />
      <Link href="/artists" className="absolute inset-0 flex items-end p-5 text-white outline-none md:p-8" aria-label={`${artist.name} — ${artist.role}`}>
        <span className="w-full">
          <span className="mb-3 flex items-center justify-between font-mono text-[.62rem] uppercase tracking-[.16em] text-white/58">
            <span>0{index + 1} / 08</span><ArrowUpRight size={17} />
          </span>
          <span className="block font-[var(--font-editorial)] text-[clamp(3rem,6.2vw,7.5rem)] leading-[.82] tracking-[-.055em]">{artist.name}</span>
          <span className="mt-4 block text-sm text-white/62">{artist.role}</span>
        </span>
      </Link>
    </motion.article>
  );
}

export function ArtistSignalSection() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const sectionInView = useInView(sectionRef, { once: true, amount: 0.04 });
  const [activeIndex, setActiveIndex] = useState(0);
  const active = artists[activeIndex];
  const previous = artists[(activeIndex - 1 + artists.length) % artists.length];
  const next = artists[(activeIndex + 1) % artists.length];

  return (
    <section ref={sectionRef} className="relative bg-[#11120f] text-[#f1efe7]" aria-labelledby="artists-title">
      <div className="grid md:grid-cols-2">
        <div className="relative min-h-[82svh] overflow-hidden border-b border-white/14 md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
          <div className="signal-grid absolute inset-0 opacity-20" />
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={`main-${active.image}`} initial={{ opacity: 0, scale: .72, rotate: -7 }} animate={{ opacity: 1, scale: 1, rotate: -2 }} exit={{ opacity: 0, scale: 1.12, rotate: 4 }} transition={{ duration: .58, ease: [0.22, 1, 0.36, 1] }} className="absolute left-[16%] top-[22%] aspect-[4/5] w-[56%] overflow-hidden shadow-[0_35px_100px_rgba(0,0,0,.55)]">
                <Image src={active.image} alt="" fill sizes="28vw" className="object-cover" />
              </motion.div>
              <motion.div key={`prev-${previous.image}`} initial={{ opacity: 0, x: -90, y: 40, rotate: -18 }} animate={{ opacity: .72, x: 0, y: 0, rotate: 7 }} exit={{ opacity: 0, x: -80, rotate: -12 }} transition={{ type: "spring", stiffness: 95, damping: 18 }} className="absolute -left-[4%] top-[11%] aspect-square w-[29%] overflow-hidden border border-white/25">
                <Image src={previous.image} alt="" fill sizes="15vw" className="object-cover grayscale" />
              </motion.div>
              <motion.div key={`next-${next.image}`} initial={{ opacity: 0, x: 100, y: -30, rotate: 17 }} animate={{ opacity: .82, x: 0, y: 0, rotate: -6 }} exit={{ opacity: 0, x: 80, rotate: 13 }} transition={{ type: "spring", stiffness: 105, damping: 17 }} className="absolute -right-[3%] bottom-[12%] aspect-[4/5] w-[31%] overflow-hidden border border-white/25">
                <Image src={next.image} alt="" fill sizes="16vw" className="object-cover grayscale" />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="grain absolute inset-0 bg-gradient-to-t from-black/78 via-transparent to-black/22" />
          <div className="relative z-10 flex h-full min-h-[82svh] flex-col justify-between p-5 md:min-h-0 md:p-8 lg:p-12">
            <TypewriterText className="eyebrow text-[var(--signal)]">{t("home.artistsEyebrow")}</TypewriterText>
            <div>
              <div className="overflow-hidden">
                <motion.h2 id="artists-title" initial={{ y: "105%", opacity: 0, rotate: 2 }} animate={sectionInView ? { y: "0%", opacity: 1, rotate: 0 } : undefined} transition={{ duration: .78, ease: [0.22, 1, 0.36, 1] }} className="section-title-serif max-w-[11ch]">{t("home.artistsTitle")}</motion.h2>
              </div>
              <p className="mt-7 max-w-md text-base leading-relaxed text-white/58 md:text-lg">{t("home.artistsCopy")}</p>
              <Link href="/artists" className="mt-8 inline-flex min-h-11 items-center gap-3 border-b border-white/35 text-sm transition hover:border-[var(--signal)] hover:text-[var(--signal)]">{t("home.artistsCta")} <ArrowUpRight size={16} /></Link>
            </div>
          </div>
        </div>

        <div className="bg-[#e6ffad] text-[#11120f]">
          {artists.map((artist, index) => <ArtistPortrait key={artist.name} artist={artist} index={index} onActivate={() => setActiveIndex(index)} />)}
        </div>
      </div>
    </section>
  );
}
