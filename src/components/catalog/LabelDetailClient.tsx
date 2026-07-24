"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AlbumExplorer } from "@/components/catalog/AlbumExplorer";
import { LabelLogo } from "@/components/catalog/LabelLogo";
import { Footer, Header } from "@/components/layout";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Album, SearchFacets } from "@/types";

export interface LabelDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  albumCount: number;
  trackCount: number;
  albums: {
    albums: Album[];
    facets?: SearchFacets;
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  };
}

export function LabelDetailClient({ label }: { label: LabelDetail }) {
  const { locale, t, localizedPath } = useI18n();

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-28 pt-[70px]">
        <div className="mx-auto max-w-[1700px] px-4 py-6 lg:px-8"><Link href={localizedPath("/labels")} className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={17} /> {t("common.labels")}</Link></div>
        <section className="mx-auto grid max-w-[1700px] gap-12 px-4 py-12 md:grid-cols-12 md:py-24 lg:px-8">
          <div className="flex min-h-72 min-w-0 items-center justify-center border border-[var(--line)] bg-[var(--surface)] p-10 md:col-span-5"><div className="relative aspect-[2/1] w-full max-w-80"><LabelLogo src={label.logo} alt={label.name} fill sizes="(max-width: 768px) 80vw, 320px" fallbackSize={90} priority className="object-contain grayscale transition duration-700 hover:grayscale-0" /></div></div>
          <div className="min-w-0 self-center md:col-span-6 md:col-start-7"><p className="eyebrow mb-6 text-[var(--color-primary-dark)]">{t("catalog.labelsEyebrow")}</p><h1 className="[overflow-wrap:anywhere] font-[var(--font-editorial)] text-[clamp(3rem,9vw,10rem)] font-normal leading-[.76] tracking-[-.065em]">{label.name}</h1>{label.description && <p className="mt-10 max-w-2xl text-lg leading-relaxed text-[var(--text-muted)]">{label.description}</p>}<div className="mt-10 flex flex-wrap gap-8 border-t border-[var(--line)] pt-6 font-mono text-[.65rem] uppercase tracking-[.1em] text-[var(--text-muted)]"><span>{label.albumCount} {label.albumCount === 1 ? t("catalog.album") : t("catalog.albums")}</span><span>{label.trackCount} {label.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</span></div>{label.website && <a href={label.website} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-11 max-w-full items-center gap-2 break-all border border-[var(--line)] px-4 text-sm hover:border-[var(--signal)]">{locale === "fr" ? "Site web" : "Website"}<ExternalLink className="shrink-0" size={14} /></a>}</div>
        </section>
        <section className="mx-auto max-w-[1700px] px-4 py-16 md:py-24 lg:px-8">
          <div className="mb-10 min-w-0"><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Catalogue du label" : "Label catalogue"}</p><h2 className="mt-4 [overflow-wrap:anywhere] font-[var(--font-editorial)] text-[clamp(2.75rem,15vw,3.75rem)] font-normal tracking-[-.055em]">{locale === "fr" ? "Discographie" : "Discography"}</h2></div>
          <AlbumExplorer
            initialData={label.albums}
            fixedLabel={label.id}
            headingLevel={3}
            queryPlaceholder={{
              fr: `Rechercher dans les albums de ${label.name}`,
              en: `Search ${label.name} albums`,
            }}
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}
