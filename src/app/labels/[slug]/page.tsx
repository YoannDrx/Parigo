"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Building2, ExternalLink, Loader2 } from "lucide-react";
import { AlbumCard } from "@/components/features";
import { Footer, Header } from "@/components/layout";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Album } from "@/types";

interface LabelDetail { id: string; slug: string; name: string; description: string | null; logo: string; website: string | null; albumCount: number; trackCount: number; albums: Album[]; }

export default function LabelDetailPage() {
  const { locale, t } = useI18n();
  const slug = useParams().slug as string;
  const [label, setLabel] = useState<LabelDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/labels/${slug}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        setLabel((await response.json()).data?.label);
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(true);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    if (slug) load();
    return () => controller.abort();
  }, [slug]);

  if (isLoading) return <div className="page-shell flex min-h-screen flex-col"><Header /><main className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-[var(--color-primary)]" /></main><Footer /></div>;
  if (error || !label) return <div className="page-shell flex min-h-screen flex-col"><Header /><main className="flex flex-1 flex-col items-center justify-center p-8 text-center"><Building2 size={42} className="mb-6 opacity-25" /><h1 className="font-[var(--font-editorial)] text-5xl font-normal">{locale === "fr" ? "Label non trouvé" : "Label not found"}</h1><Link href="/labels" className="mt-8"><Button variant="outline"><ArrowLeft size={17} /> {t("common.back")}</Button></Link></main><Footer /></div>;

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-28 pt-[70px]">
        <div className="mx-auto max-w-[1700px] px-4 py-6 lg:px-8"><Link href="/labels" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={17} /> {t("common.labels")}</Link></div>
        <section className="mx-auto grid max-w-[1700px] gap-12 px-4 py-12 lg:px-8 md:grid-cols-12 md:py-24"><div className="flex min-h-72 items-center justify-center border border-[var(--line)] bg-[var(--surface)] p-10 md:col-span-5">{label.logo ? <Image src={label.logo} alt={label.name} width={320} height={160} className="max-h-40 w-auto object-contain grayscale transition duration-700 hover:grayscale-0" /> : <Building2 size={90} className="opacity-20" />}</div><motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} className="self-center md:col-span-6 md:col-start-7"><p className="eyebrow mb-6 text-[var(--color-primary-dark)]">{t("catalog.labelsEyebrow")}</p><h1 className="font-[var(--font-editorial)] text-[clamp(5rem,9vw,10rem)] font-normal leading-[.76] tracking-[-.065em]">{label.name}</h1>{label.description && <p className="mt-10 max-w-2xl text-lg leading-relaxed text-[var(--text-muted)]">{label.description}</p>}<div className="mt-10 flex gap-8 border-t border-[var(--line)] pt-6 font-mono text-[.65rem] uppercase tracking-[.1em] opacity-55"><span>{label.albumCount} {label.albumCount === 1 ? t("catalog.album") : t("catalog.albums")}</span><span>{label.trackCount} {label.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</span></div>{label.website && <a href={label.website} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-sm hover:border-[var(--signal)]">{locale === "fr" ? "Site web" : "Website"}<ExternalLink size={14} /></a>}</motion.div></section>
        <section className="mx-auto max-w-[1700px] px-4 py-16 lg:px-8 md:py-24"><h2 className="mb-12 font-[var(--font-editorial)] text-6xl font-normal tracking-[-.055em]">{locale === "fr" ? "Discographie" : "Discography"}</h2>{label.albums.length ? <div className="grid grid-cols-2 gap-x-5 gap-y-14 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{label.albums.map((album) => <AlbumCard key={album.id} album={album} />)}</div> : <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">{t("catalog.noAlbums")}</p>}</section>
      </main>
      <Footer />
    </div>
  );
}
