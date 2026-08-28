"use client";

import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { Footer, Header } from "@/components/layout";
import { ConsentAwareYouTubeEmbed } from "@/components/media/ConsentAwareYouTubeEmbed";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Synchronisation } from "@/lib/youtube/synchronisation-types";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { ContextualBackLink } from "@/components/navigation/ContextualBackLink";

export function SynchronisationDetailView({ sync }: { sync: Synchronisation }) {
  const { locale, localizedPath } = useI18n();
  const clip = useMemo(() => ({
    slug: `synchronisation-${sync.slug}`,
    youtubeId: sync.youtubeId,
    title: { fr: sync.title, en: sync.title },
    cover: sync.image,
    href: localizedPath(`/synchronisations/${sync.slug}`),
  }), [localizedPath, sync.image, sync.slug, sync.title, sync.youtubeId]);
  const titleSize = sync.title.length > 105
    ? "text-[clamp(1.5rem,8.5cqi,2.85rem)] leading-[.98] tracking-[-.04em]"
    : sync.title.length > 68
      ? "text-[clamp(1.75rem,9.5cqi,3.7rem)] leading-[.94] tracking-[-.05em]"
      : "text-[clamp(2.1rem,11cqi,4.8rem)] leading-[.9] tracking-[-.06em]";

  return (
    <div className="page-shell min-h-screen">
      <Header />
      <main className="px-[var(--space-page-gutter)] pb-[var(--space-page-end)] pt-[var(--space-contextual-back-page-top)] md:pt-[var(--space-page-top)]">
        <div className="mx-auto max-w-[1440px]">
          <ContextualBackLink href={localizedPath("/synchronisations")} className="font-semibold hover:text-[var(--signal-strong)]">
            <ArrowLeft size={16} />
            {locale === "fr" ? "Retour" : "Back"}
          </ContextualBackLink>

          <div className="mt-[var(--space-contextual-back-gap)] grid gap-[var(--space-grid-x)] md:mt-[var(--space-block-gap)] lg:grid-cols-12 lg:items-start">
            <section className="overflow-hidden rounded-[1.15rem] border border-white/14 bg-[#090c09] p-2 shadow-[0_28px_90px_rgba(0,0,0,.2)] md:p-3 lg:col-span-8" aria-label={locale === "fr" ? "Lecteur vidéo" : "Video player"}>
              <div className="overflow-hidden rounded-[.7rem]">
                <ConsentAwareYouTubeEmbed clip={clip} />
              </div>
            </section>

            <aside className="flex min-h-full min-w-0 flex-col overflow-hidden rounded-[1.15rem] border border-[var(--line)] bg-[var(--surface)] p-6 [container-type:inline-size] lg:col-span-4 lg:p-8">
              <SignedTitle lang={locale} className={`max-w-full min-w-0 break-words font-semibold hyphens-auto text-wrap-balance [overflow-wrap:anywhere] ${titleSize}`}>
                {sync.title}
              </SignedTitle>

              <dl className="mt-7 grid min-w-0 grid-cols-2 gap-5 border-t border-[var(--line)] pt-6">
                <div className="min-w-0">
                  <dt className="font-mono text-[.55rem] uppercase tracking-[.13em] text-[var(--text-muted)]">{locale === "fr" ? "Diffuseur" : "Broadcaster"}</dt>
                  <dd className="mt-2 break-words text-sm font-semibold">{sync.client}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[.55rem] uppercase tracking-[.13em] text-[var(--text-muted)]">{locale === "fr" ? "Année" : "Year"}</dt>
                  <dd className="mt-2 text-sm font-semibold">{sync.year ?? "—"}</dd>
                </div>
              </dl>

              <div className="mt-auto grid gap-3 pt-8">
                <a href={`https://www.youtube.com/watch?v=${sync.youtubeId}`} target="_blank" rel="noreferrer" className="parigo-button group flex min-h-12 items-center justify-between border border-[var(--line-strong)] bg-transparent px-4 text-sm font-semibold transition hover:border-[var(--signal-strong)] hover:bg-[color-mix(in_srgb,var(--signal)_7%,var(--surface))] hover:text-[var(--signal-strong)] focus-visible:border-[var(--signal-strong)]">
                  <span>{locale === "fr" ? "Voir sur YouTube" : "Watch on YouTube"}</span>
                  <ArrowUpRight size={15} />
                </a>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
