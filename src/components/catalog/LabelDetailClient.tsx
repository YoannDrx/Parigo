"use client";

import { ArrowLeft } from "lucide-react";
import { AlbumExplorer } from "@/components/catalog/AlbumExplorer";
import { LabelLogo } from "@/components/catalog/LabelLogo";
import { Footer, Header } from "@/components/layout";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Album, SearchFacets } from "@/types";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { ContextualBackLink } from "@/components/navigation/ContextualBackLink";

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
      <main className="flex-1 pb-[var(--space-section-y-large)] pt-[70px]">
        <div className="mx-auto max-w-[1700px] px-[var(--space-page-gutter)] pt-[var(--space-divider-content)]"><ContextualBackLink href={localizedPath("/labels")} className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={17} /> {t("common.back")}</ContextualBackLink></div>
        <section className="editorial-detail-hero relative mx-auto grid max-w-[1700px] gap-[var(--space-block-gap)] overflow-hidden px-[var(--space-page-gutter)] py-[var(--space-section-y)] md:grid-cols-12">
          <div className="flex min-h-[22rem] min-w-0 items-stretch justify-stretch border border-[var(--line)] bg-[var(--surface)] p-5 sm:min-h-[28rem] sm:p-8 md:col-span-5 md:min-h-[34rem] lg:p-10"><div className="relative min-h-full w-full"><LabelLogo src={label.logo} name={label.name} fill sizes="(max-width: 768px) 92vw, 42vw" fallbackSize={144} priority className="object-contain" /></div></div>
          <div className="min-w-0 self-center md:col-span-6 md:col-start-7"><SignedTitle className="[overflow-wrap:anywhere] font-[var(--font-editorial)] text-[clamp(3rem,9vw,10rem)] font-normal leading-[.76] tracking-[-.065em]">{label.name}</SignedTitle>{label.description && <p className="mt-[var(--space-block-gap)] max-w-2xl text-lg leading-relaxed text-[var(--text-muted)]">{label.description}</p>}<div className="mt-[var(--space-block-gap)] flex flex-wrap gap-8 border-t border-[var(--line)] pt-6 font-mono text-[.65rem] uppercase tracking-[.1em] text-[var(--text-muted)]"><span>{label.albumCount} {label.albumCount === 1 ? t("catalog.album") : t("catalog.albums")}</span><span>{label.trackCount} {label.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</span></div></div>
        </section>
        <section className="mx-auto max-w-[1920px] px-[var(--space-page-gutter)] py-[var(--space-section-y)]">
          <div className="mb-[var(--space-heading-content)] min-w-0"><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Catalogue du label" : "Label catalogue"}</p><SignedTitle as="h2" className="mt-4 [overflow-wrap:anywhere] font-[var(--font-editorial)] text-[clamp(2.75rem,15vw,3.75rem)] font-normal tracking-[-.055em]">{locale === "fr" ? "Discographie" : "Discography"}</SignedTitle></div>
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
