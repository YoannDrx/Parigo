"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import { Footer, Header } from "@/components/layout";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Synchronisation } from "@/content/synchronisations";
import { youtubeEmbedUrl } from "@/content/synchronisations";

export function SynchronisationDetailView({ sync }: { sync: Synchronisation }) {
  const { locale, localizedPath } = useI18n();

  return (
    <div className="page-shell">
      <Header />
      <main className="px-4 pb-24 pt-28 md:px-8 md:pb-36 md:pt-32">
        <div className="mx-auto max-w-[1440px]">
          <Link href={localizedPath("/synchronisations")} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--signal-strong)]"><ArrowLeft size={16} />{locale === "fr" ? "Toutes les synchronisations" : "All syncs"}</Link>
          <div className="mt-9 grid gap-7 lg:grid-cols-12 lg:items-start">
            <div className="overflow-hidden rounded-[1.15rem] border border-white/14 bg-[#090c09] p-2 shadow-[0_28px_90px_rgba(0,0,0,.2)] md:p-3 lg:col-span-8">
              <div className="flex items-center justify-between border-b border-white/12 px-3 py-2.5 text-white/46"><span className="font-mono text-[.54rem] uppercase tracking-[.14em]">Parigo screening room</span><span className="font-mono text-[.54rem]">16:9</span></div>
              <div className="relative aspect-video overflow-hidden rounded-b-[.7rem]">
                <iframe src={youtubeEmbedUrl(sync.youtubeId)} title={`${sync.title} — ${locale === "fr" ? "bande-annonce" : "trailer"}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" className="absolute inset-0 h-full w-full border-0" />
              </div>
            </div>
            <aside className="flex min-h-full flex-col rounded-[1.15rem] border border-[var(--line)] bg-[var(--surface)] p-6 lg:col-span-4 lg:p-8">
              <p className="eyebrow text-[var(--signal-strong)]">Parigo / {locale === "fr" ? "Synchronisation" : "Sync"}</p>
              <h1 className="mt-5 text-[clamp(2.8rem,5.2vw,5.3rem)] font-semibold leading-[.88] tracking-[-.06em]">{sync.title}<span className="text-[var(--signal)]">.</span></h1>
              <p className="mt-7 text-base leading-7 text-[var(--text-muted)]">{locale === "fr" ? sync.descriptionFr : sync.descriptionEn}</p>
              <dl className="mt-9 grid gap-5 border-t border-[var(--line)] pt-6 sm:grid-cols-2 lg:grid-cols-1"><div><dt className="font-mono text-[.56rem] uppercase tracking-[.13em] text-[var(--text-muted)]">{locale === "fr" ? "Projet" : "Project"}</dt><dd className="mt-2 font-semibold">{sync.title}</dd></div><div><dt className="font-mono text-[.56rem] uppercase tracking-[.13em] text-[var(--text-muted)]">{locale === "fr" ? "Diffuseur" : "Broadcaster"}</dt><dd className="mt-2 font-semibold">{sync.client}</dd></div></dl>
              <a href={`https://www.youtube.com/watch?v=${sync.youtubeId}`} target="_blank" rel="noreferrer" className="group mt-9 flex min-h-14 items-center justify-between rounded-full border border-[var(--foreground)] px-5 font-semibold transition hover:border-[var(--signal)] hover:bg-[var(--signal)] hover:text-white"><span className="inline-flex items-center gap-3"><Play size={16} fill="currentColor" />YouTube</span><ExternalLink size={16} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
