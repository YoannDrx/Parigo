"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { ParigoGalleryImage, ParigoGalleryUsage } from "@/data/parigo-image-gallery";

type GalleryCollection = "concept" | "real";

const filters: Array<"Tout" | ParigoGalleryUsage> = [
  "Tout", "Hero", "Espaces", "Studio", "Pochettes 33 tours", "Pochettes & mosaïques",
  "Accès", "Modales", "Compte", "Pages", "Social",
];

const aspectClasses: Record<ParigoGalleryImage["aspect"], string> = {
  "16:9": "aspect-video", "4:3": "aspect-[4/3]", "4:5": "aspect-[4/5]",
  "21:9": "aspect-[21/9]", "1.91:1": "aspect-[1.91/1]",
};

const statusLabels = { calibration: "Étalon", approved: "Validé", review: "À revoir" } as const;

function getUsage(image: ParigoGalleryImage): ParigoGalleryUsage {
  if (image.usage) return image.usage;
  return image.category === "Instruments & studio" ? "Studio" : "Espaces";
}

function getCollection(image: ParigoGalleryImage): GalleryCollection {
  return image.collection ?? "concept";
}

function getDisplayId(image: ParigoGalleryImage) {
  return image.code ?? String(image.id).padStart(2, "0");
}

function GalleryCard({ image }: { image: ParigoGalleryImage }) {
  const usage = getUsage(image);
  const displayId = getDisplayId(image);
  const isReal = getCollection(image) === "real";

  return (
    <article
      id={`image-${displayId.toLowerCase()}`}
      className="group overflow-hidden rounded-[18px] border border-[#332b21] bg-[#17140f] shadow-[0_22px_70px_rgba(0,0,0,.24)]"
    >
      <a
        href={image.src}
        target="_blank"
        rel="noreferrer"
        className={`relative block w-full overflow-hidden bg-[#0b0a08] ${aspectClasses[image.aspect]}`}
        aria-label={`Ouvrir l’image ${displayId} en pleine définition`}
      >
        <Image
          src={image.src}
          alt={`${displayId}. ${image.title}`}
          fill
          sizes="(min-width: 1536px) 44vw, (min-width: 900px) 48vw, 100vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.012]"
        />
        <span className="absolute left-4 top-4 flex h-11 min-w-11 items-center justify-center rounded-full border border-white/20 bg-black/65 px-3 font-mono text-sm text-white backdrop-blur-md">
          {displayId}
        </span>
        <span className="absolute bottom-4 right-4 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white/85 opacity-0 backdrop-blur-md transition group-hover:opacity-100 group-focus-within:opacity-100">
          Ouvrir ↗
        </span>
      </a>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#d3df63]">
              <span>{usage} · {image.aspect}</span>
              {image.status ? (
                <span className="rounded-full border border-[#d3df63]/35 bg-[#d3df63]/10 px-2 py-1 text-[9px] text-[#e2ed76]">
                  {statusLabels[image.status]}
                </span>
              ) : null}
            </div>
            <h2 className="font-heading text-xl font-medium tracking-[-0.025em] text-[#f4f0e7] sm:text-2xl">
              {image.title}
            </h2>
            {image.subject ? <p className="mt-2 text-sm text-[#aaa294]">Modèle de référence : {image.subject}</p> : null}
          </div>
          {!image.exports?.length ? (
            <a
              href={image.src}
              download
              className="rounded-full border border-[#51483a] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d7d0c4] transition hover:border-[#d3df63] hover:text-[#d3df63]"
            >
              Télécharger
            </a>
          ) : null}
        </div>

        {isReal && image.changeNotes?.length ? (
          <div className="mt-5 rounded-[12px] border border-[#332b21] bg-[#12100c] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f887b]">Améliorations effectuées</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#c6beb1]">
              {image.changeNotes.map((note) => <li key={note}>— {note}</li>)}
            </ul>
          </div>
        ) : null}

        {isReal && image.sourceAnchor ? (
          <div className="mt-5 grid gap-4 rounded-[12px] border border-[#332b21] bg-[#12100c] p-4 sm:grid-cols-[9rem_1fr] sm:items-center">
            <a
              href={image.sourceAnchor}
              target="_blank"
              rel="noreferrer"
              className="relative block aspect-[4/3] overflow-hidden rounded-[8px] bg-[#0b0a08]"
              aria-label={`Ouvrir la photo d’ancrage de ${displayId}`}
            >
              <Image src={image.sourceAnchor} alt={`Photo d’ancrage de ${displayId}`} fill sizes="144px" className="object-cover" />
            </a>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f887b]">Photo d’ancrage</p>
              <p className="mt-2 text-sm leading-6 text-[#c6beb1]">
                Cette vue verrouille le cadrage, la perspective et l’architecture de la composition.
              </p>
            </div>
          </div>
        ) : null}

        {image.exports?.length ? (
          <div className="mt-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f887b]">Exports</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {image.exports.map((item) => (
                <a
                  key={item.src}
                  href={item.src}
                  download
                  className="rounded-full border border-[#51483a] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#d7d0c4] transition hover:border-[#d3df63] hover:text-[#d3df63]"
                >
                  {item.label} · {item.width}×{item.height}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {isReal && image.references?.length ? (
          <details className="group/sources mt-5 border-t border-[#332b21] pt-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#bdb5a8] marker:hidden transition hover:text-white [&::-webkit-details-marker]:hidden">
              <span>Sources de travail · {image.references.length}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#51483a] text-base transition group-open/sources:rotate-45">+</span>
            </summary>
            <div className="grid gap-3 pb-4 sm:grid-cols-2">
              {image.references.map((item) => (
                <a
                  key={`${item.src}-${item.role}`}
                  href={item.src}
                  target="_blank"
                  rel="noreferrer"
                  className="overflow-hidden rounded-[10px] border border-[#332b21] bg-[#0d0b09] transition hover:border-[#5e5547]"
                >
                  <span className="relative block aspect-[4/3] overflow-hidden">
                    <Image src={item.src} alt={item.label} fill sizes="(min-width: 900px) 22vw, 45vw" className="object-cover" />
                  </span>
                  <span className="block p-3">
                    <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-[#d3df63]">{item.role}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#bcb3a5]">{item.label}</span>
                  </span>
                </a>
              ))}
            </div>
          </details>
        ) : null}

        <details className="group/prompt mt-1 border-t border-[#332b21] pt-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#bdb5a8] marker:hidden transition hover:text-white [&::-webkit-details-marker]:hidden">
            <span>Prompt complet</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#51483a] text-base transition group-open/prompt:rotate-45">+</span>
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
  const [activeCollection, setActiveCollection] = useState<GalleryCollection>("concept");
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("Tout");

  const collectionCounts = useMemo(() => ({
    concept: images.filter((image) => getCollection(image) === "concept").length,
    real: images.filter((image) => getCollection(image) === "real").length,
  }), [images]);

  const availableFilters = useMemo(
    () => filters.filter((filter) => filter === "Tout" || images.some(
      (image) => getCollection(image) === activeCollection && getUsage(image) === filter,
    )),
    [activeCollection, images],
  );

  const visibleImages = useMemo(
    () => images.filter((image) => getCollection(image) === activeCollection &&
      (activeFilter === "Tout" || getUsage(image) === activeFilter)),
    [activeCollection, activeFilter, images],
  );

  function selectCollection(collection: GalleryCollection) {
    setActiveCollection(collection);
    setActiveFilter("Tout");
  }

  return (
    <>
      <nav aria-label="Choisir une collection" className="mb-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
        <button
          type="button"
          onClick={() => selectCollection("concept")}
          aria-pressed={activeCollection === "concept"}
          className={`rounded-[16px] border p-5 text-left transition sm:p-6 ${activeCollection === "concept" ? "border-[#d3df63] bg-[#1b1a11]" : "border-[#332b21] bg-[#15120e] hover:border-[#5a5143]"}`}
        >
          <span className="block font-heading text-2xl text-[#f4f0e7]">Concepts IA</span>
          <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f887b]">{collectionCounts.concept} concepts existants · inchangés</span>
        </button>
        <button
          type="button"
          onClick={() => selectCollection("real")}
          aria-pressed={activeCollection === "real"}
          className={`rounded-[16px] border p-5 text-left transition sm:p-6 ${activeCollection === "real" ? "border-[#d3df63] bg-[#1b1a11]" : "border-[#332b21] bg-[#15120e] hover:border-[#5a5143]"}`}
        >
          <span className="block font-heading text-2xl text-[#f4f0e7]">Locaux réels</span>
          <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f887b]">{collectionCounts.real} compositions produites · locaux et objets réels</span>
        </button>
      </nav>

      {activeCollection === "real" ? (
        <p className="mb-8 max-w-3xl text-sm leading-6 text-[#aaa294] sm:mb-10">
          Série complète : R01 à R05 restent les étalons de direction artistique ; R06 à R36 déclinent les espaces, l’accès, les états du compte, les pages éditoriales, l’orgue, les pochettes et les gros plans de bureaux. Chaque visuel conserve ses sources, son prompt et ses exports.
        </p>
      ) : null}

      <nav aria-label="Filtrer les photographies" className="mb-9 overflow-x-auto sm:mb-12">
        <div className="flex min-w-max gap-6 border-b border-[#332b21] sm:gap-8">
          {availableFilters.map((filter) => {
            const active = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                aria-pressed={active}
                className={`border-b pb-3 font-mono text-[10px] uppercase tracking-[0.16em] transition ${active ? "border-[#d3df63] text-[#f4f0e7]" : "border-transparent text-[#777064] hover:text-[#c8c0b3]"}`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-2 2xl:gap-8">
        {visibleImages.map((image) => <GalleryCard key={image.code ?? image.id} image={image} />)}
      </div>
    </>
  );
}
