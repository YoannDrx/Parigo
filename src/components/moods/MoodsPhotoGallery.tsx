"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { ParigoGalleryImage, ParigoGalleryUsage } from "@/data/parigo-image-gallery";

const filters: Array<"Tout" | ParigoGalleryUsage> = [
  "Tout",
  "Hero",
  "Espaces",
  "Studio",
  "Pochettes 33 tours",
  "Pochettes & mosaïques",
  "Accès",
  "Modales",
  "Compte",
  "Pages",
  "Social",
];

const aspectClasses: Record<ParigoGalleryImage["aspect"], string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "4:5": "aspect-[4/5]",
  "21:9": "aspect-[21/9]",
  "1.91:1": "aspect-[1.91/1]",
};

function getUsage(image: ParigoGalleryImage): ParigoGalleryUsage {
  if (image.usage) return image.usage;
  return image.category === "Instruments & studio" ? "Studio" : "Espaces";
}

function GalleryCard({ image }: { image: ParigoGalleryImage }) {
  const usage = getUsage(image);

  return (
    <article
      id={`image-${image.id}`}
      className="group overflow-hidden rounded-[18px] border border-[#332b21] bg-[#17140f] shadow-[0_22px_70px_rgba(0,0,0,.24)]"
    >
      <a
        href={image.src}
        target="_blank"
        rel="noreferrer"
        className={`relative block w-full overflow-hidden bg-[#0b0a08] ${aspectClasses[image.aspect]}`}
        aria-label={`Ouvrir l’image ${image.id} en pleine définition`}
      >
        <Image
          src={image.src}
          alt={`${image.id}. ${image.title}`}
          fill
          sizes="(min-width: 1536px) 44vw, (min-width: 900px) 48vw, 100vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.012]"
        />
        <span className="absolute left-4 top-4 flex h-11 min-w-11 items-center justify-center rounded-full border border-white/20 bg-black/65 px-3 font-mono text-sm text-white backdrop-blur-md">
          {String(image.id).padStart(2, "0")}
        </span>
        <span className="absolute bottom-4 right-4 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/85 opacity-0 backdrop-blur-md transition group-hover:opacity-100">
          Ouvrir ↗
        </span>
      </a>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#d3df63]">
              {usage} · {image.aspect}
            </p>
            <h2 className="font-heading text-xl font-medium tracking-[-0.025em] text-[#f4f0e7] sm:text-2xl">
              {image.title}
            </h2>
            {image.subject ? (
              <p className="mt-2 text-sm text-[#aaa294]">Modèle de référence : {image.subject}</p>
            ) : null}
          </div>
          <a
            href={image.src}
            download
            className="rounded-full border border-[#51483a] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d7d0c4] transition hover:border-[#d3df63] hover:text-[#d3df63]"
          >
            Télécharger
          </a>
        </div>

        <details className="group/prompt mt-5 border-t border-[#332b21] pt-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#bdb5a8] marker:hidden transition hover:text-white [&::-webkit-details-marker]:hidden">
            <span>Prompt</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#51483a] text-base transition group-open/prompt:rotate-45">
              +
            </span>
          </summary>
          <pre className="max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-[10px] border border-[#332b21] bg-[#0d0b09] p-4 font-mono text-[11px] leading-6 text-[#bcb3a5] sm:p-5 sm:text-xs">
            {image.prompt}
          </pre>
        </details>
      </div>
    </article>
  );
}

export function MoodsPhotoGallery({ images }: { images: ParigoGalleryImage[] }) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("Tout");
  const visibleImages = useMemo(
    () => images.filter((image) => activeFilter === "Tout" || getUsage(image) === activeFilter),
    [activeFilter, images],
  );

  return (
    <>
      <nav aria-label="Filtrer les photographies" className="mb-9 overflow-x-auto sm:mb-12">
        <div className="flex min-w-max gap-6 border-b border-[#332b21] sm:gap-8">
          {filters.map((filter) => {
            const active = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                aria-pressed={active}
                className={`border-b pb-3 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                  active
                    ? "border-[#d3df63] text-[#f4f0e7]"
                    : "border-transparent text-[#777064] hover:text-[#c8c0b3]"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-2 2xl:gap-8">
        {visibleImages.map((image) => <GalleryCard key={image.id} image={image} />)}
      </div>
    </>
  );
}
