"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { RevealText } from "@/components/motion";

const syncs = [
  { title: "Tokyo Vice", client: "HBO Max", image: "/images/synchros/tokyo-vice.jpg", url: "https://www.youtube.com/watch?v=Ke41rOP9Nm8" },
  { title: "Cobra Kai", client: "Netflix", image: "/images/synchros/cobra-kai.jpg", url: "https://www.youtube.com/watch?v=OdkAgKz6p8E" },
  { title: "Bad Boys", client: "Hey Boy", image: "/images/synchros/bad-boys-hey-boy.jpg", url: "https://www.youtube.com/watch?v=6xkrqHRGwx0" },
  { title: "Monkey Man", client: "Universal", image: "/images/synchros/monkey-man.jpg", url: null },
];

export function SyncShowcase() {
  const { t } = useI18n();
  return (
    <section className="grain relative bg-[#10110e] px-3 py-28 text-[#f1efe7] md:px-8 md:py-40">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-20 grid gap-10 md:grid-cols-12"><div className="md:col-span-8"><p className="eyebrow mb-6 text-[var(--signal)]">{t("home.syncEyebrow")}</p><RevealText as="h2" mode="lines" className="section-title-serif">{t("home.syncTitle")}</RevealText></div><p className="self-end text-lg leading-relaxed opacity-52 md:col-span-3 md:col-start-10">{t("home.syncCopy")}</p></div>
        <div className="space-y-5 md:space-y-8">
          {syncs.map((sync, index) => <motion.a key={sync.title} href={sync.url ?? "/contact"} target={sync.url ? "_blank" : undefined} rel={sync.url ? "noreferrer" : undefined} initial={{ y: 44 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: .08 }} transition={{ duration: .72, ease: [0.22, 1, 0.36, 1] }} className="group sticky block h-[62svh] min-h-[480px] overflow-hidden border border-white/14 bg-[#171914] md:h-[76svh]" style={{ top: `${88 + index * 12}px`, zIndex: index + 1 }}>
            <Image src={sync.image} alt={`${sync.title} — ${sync.client}`} fill priority={index < 2} sizes="100vw" className="object-cover saturate-[.88] transition duration-[1.2s] ease-out group-hover:scale-[1.025] group-hover:saturate-100" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20" />
            <div className="absolute inset-x-0 top-0 flex justify-between p-5 md:p-8"><span className="font-mono text-[.62rem] opacity-55">0{index + 1} / 04</span><span className="eyebrow opacity-55">{sync.client}</span></div>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 md:p-10"><h3 className="font-[var(--font-editorial)] text-[clamp(4rem,10vw,10rem)] font-normal leading-[.72] tracking-[-.06em]">{sync.title}</h3>{sync.url && <ExternalLink className="mb-1 shrink-0" size={24} />}</div>
          </motion.a>)}
        </div>
        <Link href="/search" className="mt-20 inline-flex items-center gap-3 border-b border-current/30 pb-2 text-sm transition hover:border-[var(--signal)] hover:text-[var(--signal)]">{t("home.projects")} <ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}
