"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useI18n } from "@/components/providers/I18nProvider";

const images = [
  {
    src: "/images/synchros/emily.jpg",
    title: "Emily in Paris",
    client: "Netflix",
    className: "relative z-20 col-span-10 aspect-[16/9] md:col-span-8 md:col-start-2",
    sizes: "(max-width: 768px) 92vw, 64vw",
  },
  {
    src: "/images/synchros/tokyo-vice.jpg",
    title: "Tokyo Vice",
    client: "HBO Max",
    className: "relative z-30 col-span-6 -mt-8 aspect-[4/3] md:col-span-4 md:col-start-8 md:-mt-24",
    sizes: "(max-width: 768px) 58vw, 31vw",
  },
  {
    src: "/images/synchros/kleo-original-86.jpg",
    title: "Kleo",
    client: "Netflix",
    className: "relative z-10 col-span-6 -mt-3 aspect-[16/10] md:col-span-4 md:col-start-1 md:-mt-20",
    sizes: "(max-width: 768px) 58vw, 31vw",
  },
] as const;

export function DesireGallery() {
  const { locale } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const mainY = useTransform(scrollYProgress, [0, 1], ["-4%", "7%"]);
  const sideY = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);

  return (
    <div ref={ref} className="relative mt-20 grid grid-cols-10 gap-3 md:mt-32 md:grid-cols-12 md:gap-5">
      {images.map((image, index) => (
        <motion.figure
          key={image.title}
          style={{ y: index === 0 ? mainY : sideY }}
          initial={{ scale: 0.985 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, amount: 0.16 }}
          transition={{ duration: 0.82, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          className={`${image.className} overflow-hidden bg-[#161814]`}
        >
          <Image
            src={image.src}
            alt={`${image.title} — synchronisation Parigo`}
            fill
            priority={index === 0}
            sizes={image.sizes}
            className="object-cover transition duration-[1.1s] ease-out hover:scale-[1.025]"
          />
          <motion.span
            aria-hidden="true"
            initial={{ x: index === 1 ? "101%" : "-101%" }}
            whileInView={{ x: index === 1 ? ["101%", "0%", "-101%"] : ["-101%", "0%", "101%"] }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.86, delay: index * 0.08, times: [0, 0.48, 1], ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-0 z-10 bg-[var(--signal)]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-black/5" />
          <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-3 text-[#f3f0e8] md:p-5">
            <span className="font-[var(--font-editorial)] text-2xl tracking-[-.035em] md:text-4xl">{image.title}</span>
            <span className="font-mono text-[.58rem] uppercase tracking-[.16em] opacity-62">{image.client}</span>
          </figcaption>
        </motion.figure>
      ))}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="col-span-10 mt-6 max-w-xl text-base leading-relaxed text-[var(--text-muted)] md:col-span-4 md:col-start-8 md:mt-10 md:text-lg"
      >
        {locale === "fr"
          ? "Une intention se précise au contact des images : le rythme, la matière et la narration deviennent des critères d’écoute concrets."
          : "An intention becomes clearer through images: rhythm, texture and narrative turn into tangible listening criteria."}
      </motion.p>
    </div>
  );
}
