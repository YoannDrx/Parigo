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
  descriptions?: Partial<Record<"fr" | "en", string>>;
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
      <main className="flex-1 pb-[var(--space-page-end)] pt-[var(--space-contextual-back-page-top)]">
        <div className="mx-auto max-w-[1700px] px-[var(--space-page-gutter)]"><ContextualBackLink href={localizedPath("/labels")}><ArrowLeft size={17} /> {t("common.back")}</ContextualBackLink></div>
        <section className="editorial-detail-hero relative mx-auto grid max-w-[1700px] gap-[var(--space-block-gap)] overflow-hidden px-[var(--space-page-gutter)] pb-0 pt-[var(--space-contextual-back-gap)] md:grid-cols-12">
          <div className="parigo-frame relative h-[220px] min-w-0 overflow-hidden border border-[var(--line)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--signal)_8%,var(--surface)),var(--surface)_62%)] p-5 shadow-[7px_8px_0_color-mix(in_srgb,var(--signal)_11%,transparent)] sm:p-7 md:col-span-4 md:h-[clamp(280px,22vw,360px)] md:max-w-[480px]"><div className="relative h-full w-full"><LabelLogo src={label.logo} name={label.name} fill sizes="(max-width: 768px) 92vw, 480px" fallbackSize={144} priority className="object-contain" /></div></div>
          <div className="min-w-0 self-center md:col-span-7 md:col-start-6"><SignedTitle variant="page" className="[overflow-wrap:anywhere] font-[var(--font-editorial)] font-semibold">{label.name}</SignedTitle><div className="mt-[var(--space-block-gap)] flex flex-wrap gap-8 border-y border-[var(--line)] py-5 font-mono text-[.65rem] uppercase tracking-[.1em] text-[var(--text-muted)]"><span>{label.albumCount} {label.albumCount === 1 ? t("catalog.album") : t("catalog.albums")}</span><span>{label.trackCount} {label.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</span></div></div>
        </section>
        <section className="mx-auto max-w-[1920px] px-[var(--space-page-gutter)] pb-0 pt-[var(--space-section-y)]">
          <div className="mb-[var(--space-heading-content)] min-w-0"><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Catalogue du label" : "Label catalogue"}</p><SignedTitle as="h2" className="mt-4 [overflow-wrap:anywhere] font-[var(--font-editorial)] text-[clamp(2.75rem,15vw,3.75rem)] font-normal tracking-[-.055em]">{locale === "fr" ? "Discographie" : "Discography"}</SignedTitle></div>
          <AlbumExplorer
            initialData={label.albums}
            fixedLabel={label.id}
            headingLevel={3}
            enableTrackView
            compactToolbarBottom
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
