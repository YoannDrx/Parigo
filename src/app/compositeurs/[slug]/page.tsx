import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { AlbumCard } from "@/components/features/AlbumCard";
import { Footer, Header } from "@/components/layout";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { getCachedAlbum } from "@/lib/harvest/catalog-cache";
import { getParigoHarvestComposerCredit } from "@/lib/harvest/composer-inventory";
import { localizedPath } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata } from "@/lib/seo";

interface ComposerPageProps {
  params: Promise<{ slug: string }>;
}

async function loadCredit(id: string) {
  const credit = await getParigoHarvestComposerCredit(id);
  if (!credit) notFound();
  return credit;
}

export async function generateMetadata({ params }: ComposerPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const credit = await loadCredit(slug);
  return buildMetadata({
    locale,
    path: `/compositeurs/${slug}`,
    title: credit.name,
    description: locale === "fr"
      ? `Crédit Harvest exact et albums Parigo associés à ${credit.name}.`
      : `Exact Harvest credit and Parigo albums associated with ${credit.name}.`,
  });
}

export default async function ComposerPage({ params }: ComposerPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const credit = await loadCredit(slug);
  const albumResults = await Promise.allSettled(credit.albumIds.map((albumId) => getCachedAlbum(albumId)));
  const albums = albumResults.flatMap((result) => result.status === "fulfilled" ? [result.value.album] : []);
  const hasUnavailableAlbums = albumResults.some((result) => result.status === "rejected");

  return (
    <div className="page-shell min-h-screen">
      <Header />
      <main className="pt-[70px]">
        <section className="editorial-detail-hero relative mx-auto max-w-[1500px] overflow-hidden px-4 pb-16 pt-8 sm:px-6 lg:px-8 md:pb-24">
          <Link href={localizedPath(locale, "/compositeurs")} className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]">
            <ArrowLeft size={16} />
            {locale === "fr" ? "Tous les crédits" : "All credits"}
          </Link>
          <div className="max-w-5xl border-y border-[var(--line-strong)] py-10 md:py-16">
            <p className="font-mono text-[.62rem] uppercase tracking-[.14em] text-[var(--signal-strong)]">
              {locale === "fr" ? "Crédit piste · Source Harvest" : "Track credit · Harvest source"}
            </p>
            <SignedTitle className="mt-5 break-words font-[var(--font-editorial)] text-6xl leading-[.9] tracking-[-.055em] md:text-8xl">{credit.name}</SignedTitle>
            <dl className="mt-10 grid gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-[var(--text-muted)]">{locale === "fr" ? "Pistes" : "Tracks"}</dt><dd className="mt-1 text-2xl font-semibold">{credit.trackCount}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Albums</dt><dd className="mt-1 text-2xl font-semibold">{credit.albumIds.length}</dd></div>
              <div><dt className="text-[var(--text-muted)]">{locale === "fr" ? "Références" : "References"}</dt><dd className="mt-2 font-mono text-xs">{credit.albumCodes.join(" · ") || "—"}</dd></div>
            </dl>
            <p className="mt-8 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
              {locale === "fr"
                ? "Ce libellé est affiché exactement comme Harvest le renvoie. Les variantes, suffixes de société et éventuelles erreurs doivent être corrigés dans le CMS Harvest."
                : "This label is displayed exactly as returned by Harvest. Variants, society suffixes and potential errors must be corrected in the Harvest CMS."}
            </p>
          </div>
        </section>
        <section className="border-t border-[var(--line)]">
          <div className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8 md:py-24">
            <SignedTitle as="h2" className="mb-10 font-[var(--font-editorial)] text-5xl tracking-[-.05em]">Albums Parigo</SignedTitle>
            {albums.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
              </div>
            ) : (
              <p className="border-y border-[var(--line)] py-14 text-[var(--text-muted)]">
                {locale === "fr" ? "Aucun album Harvest disponible pour ce crédit." : "No Harvest album is available for this credit."}
              </p>
            )}
            {hasUnavailableAlbums && <p role="alert" className="mt-6 border-l-2 border-[var(--danger)] pl-4 text-sm text-[var(--danger)]">
              {locale === "fr" ? "Certains albums Harvest sont momentanément indisponibles." : "Some Harvest albums are temporarily unavailable."}
            </p>}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
