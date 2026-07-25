import type { Metadata } from "next";
import Link from "next/link";
import { CatalogHero } from "@/components/catalog/CatalogHero";
import { ParigoSearchForm } from "@/components/catalog/ParigoSearchForm";
import { ClipCard } from "@/components/editorial/ClipCard";
import { Footer, Header } from "@/components/layout";
import { getComposerProfile } from "@/lib/editorial/contracts";
import { getEditorialVideos } from "@/lib/editorial/videos";
import { videoTypeLabels, type EditorialVideo } from "@/lib/editorial/video-types";
import { localizedPath } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata, hasSearchParams, type PageSearchParams } from "@/lib/seo";

interface ClipsPageProps {
  searchParams: PageSearchParams;
}

export async function generateMetadata({ searchParams }: ClipsPageProps): Promise<Metadata> {
  const [locale, filtered] = await Promise.all([getRequestLocale(), hasSearchParams(searchParams)]);
  return buildMetadata({
    locale,
    path: "/clips",
    title: "Clips",
    description: locale === "fr"
      ? "Découvrez les clips, making-of, performances et archives vidéo de Parigo."
      : "Discover Parigo music videos, behind-the-scenes films, performances and archives.",
    index: !filtered,
  });
}

export default async function ClipsPage({ searchParams }: ClipsPageProps) {
  const [locale, params, videos] = await Promise.all([
    getRequestLocale(),
    searchParams,
    getEditorialVideos(),
  ]);
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().toLocaleLowerCase(locale) ?? "";
  const requestedType = Array.isArray(params.type) ? params.type[0] : params.type;
  const activeType = requestedType && requestedType in videoTypeLabels ? requestedType : "all";
  const visibleClips = videos.filter((clip) => {
    const composers = clip.composerSlugs.map(getComposerProfile).filter(Boolean);
    const matchesQuery = !query || [
      clip.title[locale],
      clip.subtitle?.[locale],
      clip.channelTitle,
      ...composers.map((profile) => profile?.name),
    ].filter(Boolean).some((value) => value!.toLocaleLowerCase(locale).includes(query));
    return matchesQuery && (activeType === "all" || clip.videoType === activeType);
  });
  const availableTypes = [...new Set(videos.map((video) => video.videoType))];

  return (
    <div className="page-shell min-h-screen">
      <Header />
      <main>
        <CatalogHero
          eyebrow={locale === "fr" ? "Images en musique" : "Music in motion"}
          title="Clips"
          intro={locale === "fr"
            ? "Clips officiels, making-of, performances et archives : la vidéothèque Parigo reliée aux talents et aux albums lorsque les crédits sont vérifiés."
            : "Official videos, behind-the-scenes films, performances and archives, linked to Parigo talent and albums whenever credits are verified."}
          meta={`${videos.length} ${locale === "fr" ? "vidéos publiques" : "public videos"}`}
        />
        <section className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8 md:py-20">
          <ParigoSearchForm
            action={localizedPath(locale, "/clips")}
            defaultValue={query}
            placeholder={locale === "fr" ? "Titre, type ou compositeur…" : "Title, type or composer…"}
            label={locale === "fr" ? "Rechercher une vidéo" : "Search videos"}
            locale={locale}
            hiddenFields={{ type: activeType === "all" ? undefined : activeType }}
          />
          <nav aria-label={locale === "fr" ? "Types de vidéos" : "Video types"} className="mb-10 flex flex-wrap gap-2">
            {(["all", ...availableTypes] as const).map((type) => {
              const href = new URLSearchParams();
              if (type !== "all") href.set("type", type);
              if (query) href.set("q", query);
              const active = activeType === type;
              return (
                <Link
                  key={type}
                  href={`${localizedPath(locale, "/clips")}${href.size ? `?${href}` : ""}`}
                  aria-current={active ? "page" : undefined}
                  className={`min-h-10 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[.08em] transition ${active ? "border-[var(--signal-strong)] bg-[var(--signal-soft)] text-[var(--signal-strong)]" : "border-[var(--line)] hover:border-[var(--signal)]"}`}
                >
                  {type === "all"
                    ? (locale === "fr" ? "Toutes" : "All")
                    : videoTypeLabels[type][locale]}
                </Link>
              );
            })}
          </nav>
          {visibleClips.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {visibleClips.map((clip: EditorialVideo, index) => (
                <ClipCard
                  key={clip.slug}
                  clip={clip}
                  composers={clip.composerSlugs.map(getComposerProfile).filter((profile): profile is NonNullable<typeof profile> => Boolean(profile))}
                  locale={locale}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">
              {locale === "fr" ? "Aucune vidéo ne correspond à cette recherche." : "No video matches this search."}
            </p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
