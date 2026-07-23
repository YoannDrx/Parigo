"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AlbumCard } from "@/components/features/AlbumCard";
import { LabelLogo } from "@/components/catalog/LabelLogo";
import { Footer, Header } from "@/components/layout";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Album } from "@/types";

export interface LabelDetail { id: string; slug: string; name: string; description: string | null; logo: string | null; website: string | null; albumCount: number; trackCount: number; albums: Album[]; }

export function LabelDetailClient({ label }: { label: LabelDetail }) {
  const { locale, t, localizedPath } = useI18n();

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-28 pt-[70px]">
        <div className="mx-auto max-w-[1700px] px-4 py-6 lg:px-8"><Link href={localizedPath("/labels")} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={17} /> {t("common.labels")}</Link></div>
        <section className="mx-auto grid max-w-[1700px] gap-12 px-4 py-12 lg:px-8 md:grid-cols-12 md:py-24"><div className="flex min-h-72 items-center justify-center border border-[var(--line)] bg-[var(--surface)] p-10 md:col-span-5"><LabelLogo src={label.logo} alt={label.name} width={320} height={160} fallbackSize={90} className="max-h-40 w-auto object-contain grayscale transition duration-700 hover:grayscale-0" /></div><div className="animate-[fade-in_.3s_ease-out_both] self-center md:col-span-6 md:col-start-7"><p className="eyebrow mb-6 text-[var(--color-primary-dark)]">{t("catalog.labelsEyebrow")}</p><h1 className="font-[var(--font-editorial)] text-[clamp(5rem,9vw,10rem)] font-normal leading-[.76] tracking-[-.065em]">{label.name}</h1>{label.description && <p className="mt-10 max-w-2xl text-lg leading-relaxed text-[var(--text-muted)]">{label.description}</p>}<div className="mt-10 flex gap-8 border-t border-[var(--line)] pt-6 font-mono text-[.65rem] uppercase tracking-[.1em] opacity-55"><span>{label.albumCount} {label.albumCount === 1 ? t("catalog.album") : t("catalog.albums")}</span><span>{label.trackCount} {label.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</span></div>{label.website && <a href={label.website} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-sm hover:border-[var(--signal)]">{locale === "fr" ? "Site web" : "Website"}<ExternalLink size={14} /></a>}</div></section>
        <section className="mx-auto max-w-[1700px] px-4 py-16 lg:px-8 md:py-24"><h2 className="mb-12 font-[var(--font-editorial)] text-6xl font-normal tracking-[-.055em]">{locale === "fr" ? "Discographie" : "Discography"}</h2>{label.albums.length ? <div className="grid grid-cols-2 gap-x-5 gap-y-14 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{label.albums.map((album) => <AlbumCard key={album.id} album={album} />)}</div> : <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">{t("catalog.noAlbums")}</p>}</section>
      </main>
      <Footer />
    </div>
  );
}
