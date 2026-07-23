"use client";

import Link from "next/link";
import { ArrowUpRight, Building2, Disc3 } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { CatalogHero } from "@/components/catalog";
import { LabelLogo } from "@/components/catalog/LabelLogo";
import { useI18n } from "@/components/providers/I18nProvider";

interface Label { id: string; slug: string; name: string; description: string | null; logo: string | null; website: string | null; albumCount: number; }

export function LabelsPageClient({ labels }: { labels: Label[] }) {
  const { t, localizedPath } = useI18n();

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-32">
        <CatalogHero eyebrow={t("catalog.labelsEyebrow")} title={t("catalog.labelsTitle")} intro={t("catalog.labelsIntro")} meta={`${labels.length} ${t("common.labels").toLowerCase()}`} />
        <div className="mx-auto max-w-[1700px] px-4 py-12 lg:px-8 md:py-20">
          {labels.length === 0 ? <div className="py-24 text-center"><Building2 size={42} className="mx-auto mb-6 opacity-25" /><h2 className="font-[var(--font-editorial)] text-5xl font-normal">{t("catalog.noLabels")}</h2></div> : (
            <div className="grid border-l border-t border-[var(--line)] lg:grid-cols-2">
              {labels.map((label, index) => <article key={label.id} style={{ animationDelay: `${(index % 2) * 60}ms` }} className="min-w-0 animate-[fade-in_.4s_ease-out_both] border-b border-r border-[var(--line)]"><Link href={localizedPath(`/labels/${label.slug}`)} className="group grid min-h-72 min-w-0 p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:p-10"><div className="flex min-w-0 items-start"><div className="relative flex h-20 w-36 max-w-full items-start"><LabelLogo src={label.logo} alt={label.name} fill sizes="144px" className="object-contain object-left grayscale transition group-hover:grayscale-0" /></div></div><div className="flex min-w-0 flex-col justify-between"><div className="min-w-0"><span className="font-mono text-[.62rem] opacity-50">LBL.{String(index + 1).padStart(3, "0")}</span><h2 className="mt-4 break-words font-[var(--font-editorial)] text-4xl font-normal tracking-[-.045em] transition group-hover:italic group-hover:text-[var(--color-primary-dark)] md:text-6xl">{label.name}</h2>{label.description && <p className="mt-5 line-clamp-3 text-sm leading-relaxed text-[var(--text-muted)]">{label.description}</p>}</div><div className="mt-10 flex items-center justify-between text-xs text-[var(--text-muted)]"><span className="flex items-center gap-2"><Disc3 size={14} /> {label.albumCount} {label.albumCount === 1 ? t("catalog.album") : t("catalog.albums")}</span><ArrowUpRight size={18} className="transition group-hover:-translate-y-1 group-hover:translate-x-1" /></div></div></Link></article>)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
