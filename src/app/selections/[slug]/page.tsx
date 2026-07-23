import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumCard } from "@/components/features/AlbumCard";
import { Footer, Header } from "@/components/layout";
import { JsonLd } from "@/components/seo/JsonLd";
import { SEO_SELECTIONS, selectionBySlug } from "@/content/seo-selections";
import { getCachedAlbums, getCachedStyles } from "@/lib/harvest/catalog-cache";
import { getRequestLocale } from "@/lib/locale-server";
import { localizedPath } from "@/lib/locale";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

interface SelectionPageProps { params: Promise<{ slug: string }> }

async function loadSelection(slug: string, locale: "fr" | "en") {
  const selection = selectionBySlug(slug, locale);
  if (!selection) notFound();
  const styles = await getCachedStyles();
  const normalizedAliases = selection.criterion.aliases.map((value) => value.toLocaleLowerCase());
  const style = styles.find((item) => normalizedAliases.some((alias) => item.name.toLocaleLowerCase().includes(alias)));
  let result = await getCachedAlbums(style
    ? { style: style.id, limit: 24, sort: "releaseDate" }
    : { query: selection.criterion.primary, limit: 24, sort: "releaseDate" });
  if (result.items.length < 12 && style) {
    result = await getCachedAlbums({ query: selection.criterion.primary, limit: 24, sort: "releaseDate" });
  }
  return { selection, albums: result.items };
}

export async function generateMetadata({ params }: SelectionPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const { selection } = await loadSelection(slug, locale);
  const content = selection.content[locale];
  return buildMetadata({
    locale,
    path: `/selections/${content.slug}`,
    alternatePaths: {
      fr: `/selections/${selection.content.fr.slug}`,
      en: `/en/selections/${selection.content.en.slug}`,
    },
    title: content.title,
    description: content.description,
  });
}

export default async function SelectionPage({ params }: SelectionPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const { selection, albums } = await loadSelection(slug, locale);
  const content = selection.content[locale];
  const related = selection.related
    .map((key) => SEO_SELECTIONS.find((item) => item.key === key))
    .filter(Boolean);
  const pagePath = localizedPath(locale, `/selections/${content.slug}`);
  return (
    <div className="page-shell min-h-screen">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: content.title,
        description: content.description,
        url: absoluteUrl(pagePath),
        mainEntity: {
          "@type": "ItemList",
          itemListElement: albums.map((album, position) => ({ "@type": "ListItem", position: position + 1, name: album.title, url: absoluteUrl(localizedPath(locale, `/albums/${album.id}`)) })),
        },
      }} />
      <Header />
      <main className="pb-28 pt-[74px]">
        <header className="border-b border-[var(--line)] px-4 py-20 md:px-8 md:py-32">
          <div className="mx-auto max-w-[1500px]">
            <p className="eyebrow text-[var(--signal-strong)]">Parigo / {locale === "fr" ? "Sélection" : "Selection"}</p>
            <h1 className="mt-6 max-w-[13ch] font-[var(--font-editorial)] text-[clamp(4rem,9vw,9rem)] font-normal leading-[.83] tracking-[-.06em]">{content.title}</h1>
            <p className="mt-8 max-w-3xl text-lg leading-8 text-[var(--text-muted)] md:text-xl">{content.introduction}</p>
          </div>
        </header>
        <section className="mx-auto max-w-[1500px] px-4 py-16 md:px-8 md:py-24" aria-labelledby="selection-results">
          <div className="mb-10 flex items-end justify-between gap-6"><h2 id="selection-results" className="font-[var(--font-editorial)] text-5xl font-normal">{locale === "fr" ? "Albums sélectionnés" : "Selected albums"}</h2><span className="font-mono text-xs text-[var(--text-muted)]">{albums.length} albums</span></div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">{albums.map((album) => <AlbumCard key={album.id} album={album} headingLevel={3} />)}</div>
        </section>
        <section className="border-y border-[var(--line)] bg-[var(--surface-soft)] px-4 py-16 md:px-8"><div className="mx-auto grid max-w-[1500px] gap-12 md:grid-cols-2"><article><h2 className="text-2xl font-semibold">{locale === "fr" ? "Usages à l’image" : "Uses on screen"}</h2><p className="mt-4 leading-7 text-[var(--text-muted)]">{content.uses}</p></article><article><h2 className="text-2xl font-semibold">{locale === "fr" ? "Conseil de sélection" : "Selection advice"}</h2><p className="mt-4 leading-7 text-[var(--text-muted)]">{content.advice}</p></article></div></section>
        <section className="mx-auto max-w-[1500px] px-4 py-16 md:px-8"><h2 className="text-3xl font-semibold">{locale === "fr" ? "Sélections connexes" : "Related selections"}</h2><div className="mt-6 flex flex-wrap gap-3">{related.map((item) => item && <Link key={item.key} href={localizedPath(locale, `/selections/${item.content[locale].slug}`)} className="min-h-11 rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold hover:border-[var(--signal-strong)]">{item.content[locale].title}</Link>)}</div><Link href={localizedPath(locale, "/contact")} className="mt-12 inline-flex min-h-12 items-center rounded-full bg-[var(--foreground)] px-6 font-semibold text-[var(--background)]">{locale === "fr" ? "Parler de votre licence" : "Discuss your licence"}</Link></section>
      </main>
      <Footer />
    </div>
  );
}
