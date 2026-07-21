"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Building2, Disc3, Loader2 } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { MiniPlayer } from "@/components/features";
import { CatalogHero } from "@/components/catalog";
import { useI18n } from "@/components/providers/I18nProvider";

interface Label { id: string; slug: string; name: string; description: string | null; logo: string; website: string | null; albumCount: number; }

export default function LabelsPage() {
  const { t } = useI18n();
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function loadLabels() {
      try {
        const response = await fetch("/api/labels", { signal: controller.signal });
        if (response.ok) setLabels((await response.json()).data?.labels || []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.error("Error loading labels:", error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    loadLabels();
    return () => controller.abort();
  }, []);

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-32">
        <CatalogHero eyebrow={t("catalog.labelsEyebrow")} title={t("catalog.labelsTitle")} intro={t("catalog.labelsIntro")} meta={`${labels.length} ${t("common.labels").toLowerCase()}`} />
        <div className="mx-auto max-w-[1700px] px-4 py-12 lg:px-8 md:py-20">
          {isLoading ? <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[var(--color-primary)]" /></div> : labels.length === 0 ? <div className="py-24 text-center"><Building2 size={42} className="mx-auto mb-6 opacity-25" /><h2 className="font-[var(--font-editorial)] text-5xl font-normal">{t("catalog.noLabels")}</h2></div> : (
            <div className="grid border-l border-t border-[var(--line)] md:grid-cols-2">
              {labels.map((label, index) => <motion.article key={label.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .65, delay: (index % 2) * .06 }} className="border-b border-r border-[var(--line)]"><Link href={`/labels/${label.slug}`} className="group grid min-h-72 p-7 md:grid-cols-[1fr_1.4fr] md:p-10"><div className="flex items-start">{label.logo ? <div className="relative h-20 w-36"><Image src={label.logo} alt={label.name} fill sizes="144px" className="object-contain object-left grayscale transition group-hover:grayscale-0" /></div> : <Building2 size={44} className="opacity-25" />}</div><div className="flex flex-col justify-between"><div><span className="font-mono text-[.62rem] opacity-32">LBL.{String(index + 1).padStart(3, "0")}</span><h2 className="mt-4 font-[var(--font-editorial)] text-4xl font-normal tracking-[-.045em] transition group-hover:italic group-hover:text-[var(--color-primary-dark)] md:text-6xl">{label.name}</h2>{label.description && <p className="mt-5 line-clamp-3 text-sm leading-relaxed text-[var(--text-muted)]">{label.description}</p>}</div><div className="mt-10 flex items-center justify-between text-xs text-[var(--text-muted)]"><span className="flex items-center gap-2"><Disc3 size={14} /> {label.albumCount} {label.albumCount === 1 ? t("catalog.album") : t("catalog.albums")}</span><ArrowUpRight size={18} className="transition group-hover:-translate-y-1 group-hover:translate-x-1" /></div></div></Link></motion.article>)}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MiniPlayer />
    </div>
  );
}
