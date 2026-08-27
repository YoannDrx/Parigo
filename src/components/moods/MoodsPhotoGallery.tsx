"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type {
  ParigoGalleryImage,
  ParigoGalleryUsage,
  ParigoImageVersion,
} from "@/data/parigo-image-gallery";

type GalleryCollection = "concept" | "real";
type VersionView = "latest" | "v1" | "v2" | "v3" | "all";

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

const statusLabels = {
  historical: "Historique",
  calibration: "Étalon",
  approved: "Validé",
  review: "À revoir",
  rejected: "Rejeté",
} as const;

const versionViews: Array<{ key: VersionView; label: string; version?: ParigoImageVersion }> = [
  { key: "latest", label: "Dernières" },
  { key: "v1", label: "V1", version: 1 },
  { key: "v2", label: "V2", version: 2 },
  { key: "v3", label: "V3", version: 3 },
  { key: "all", label: "Toutes" },
];

function getUsage(image: ParigoGalleryImage): ParigoGalleryUsage {
  if (image.usage) return image.usage;
  return image.category === "Instruments & studio" ? "Studio" : "Espaces";
}

function getCollection(image: ParigoGalleryImage): GalleryCollection {
  return image.collection ?? "concept";
}

function getDisplayId(image: ParigoGalleryImage) {
  return image.familyCode ?? image.code ?? String(image.id).padStart(2, "0");
}

function getVersionKey(image: ParigoGalleryImage) {
  return image.versionKey ?? `concept-${image.id}`;
}

function GalleryImage({
  image,
  label,
}: {
  image: ParigoGalleryImage;
  label?: string;
}) {
  const displayId = getDisplayId(image);
  return (
    <div>
      {label ? (
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#d3df63]">
          {label}
        </p>
      ) : null}
      <a
        href={image.src}
        target="_blank"
        rel="noreferrer"
        className={`relative block w-full overflow-hidden rounded-[12px] bg-[#0b0a08] ${aspectClasses[image.aspect]}`}
        aria-label={`Ouvrir l’image ${displayId}${image.version ? ` V${image.version}` : ""} en pleine définition`}
      >
        <Image
          src={image.src}
          alt={`${displayId}. ${image.title}${image.version ? ` — V${image.version}` : ""}`}
          fill
          sizes="(min-width: 1536px) 44vw, (min-width: 900px) 48vw, 100vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.012]"
        />
        <span className="absolute left-4 top-4 flex h-11 min-w-11 items-center justify-center rounded-full border border-white/20 bg-black/65 px-3 font-mono text-sm text-white backdrop-blur-md">
          {displayId}{image.version ? ` · V${image.version}` : ""}
        </span>
      </a>
    </div>
  );
}

function GalleryCard({
  initialImage,
  familyVersions,
}: {
  initialImage: ParigoGalleryImage;
  familyVersions: ParigoGalleryImage[];
}) {
  const [selectedKey, setSelectedKey] = useState(getVersionKey(initialImage));
  const [compareWithV1, setCompareWithV1] = useState(false);
  const image = familyVersions.find((item) => getVersionKey(item) === selectedKey) ?? initialImage;
  const historicalV1 = familyVersions.find((item) => item.version === 1);
  const usage = getUsage(image);
  const displayId = getDisplayId(image);
  const isReal = getCollection(image) === "real";
  const canCompare = Boolean(historicalV1 && image.version && image.version > 1);

  function selectVersion(versionKey: string) {
    setSelectedKey(versionKey);
    setCompareWithV1(false);
  }

  return (
    <article
      id={image.version ? `image-${displayId.toLowerCase()}-v${image.version}` : `image-${displayId.toLowerCase()}`}
      className="group overflow-hidden rounded-[18px] border border-[#332b21] bg-[#17140f] shadow-[0_22px_70px_rgba(0,0,0,.24)]"
    >
      <div className="bg-[#0b0a08] p-3 sm:p-4">
        {compareWithV1 && historicalV1 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <GalleryImage image={historicalV1} label="V1 · Historique" />
            <GalleryImage image={image} label={`V${image.version} · Sélectionnée`} />
          </div>
        ) : (
          <GalleryImage image={image} />
        )}
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#d3df63]">
              <span>{usage} · {image.aspect}</span>
              {image.version ? <span>V{image.version}</span> : null}
              {image.status ? (
                <span className="rounded-full border border-[#d3df63]/35 bg-[#d3df63]/10 px-2 py-1 text-[9px] text-[#e2ed76]">
                  {statusLabels[image.status]}
                </span>
              ) : null}
            </div>
            <h2 className="font-heading text-xl font-medium tracking-[-0.025em] text-[#f4f0e7] sm:text-2xl">
              {image.title}
            </h2>
            {image.subject ? (
              <p className="mt-2 text-sm text-[#aaa294]">Modèle de référence : {image.subject}</p>
            ) : null}
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

        {isReal && familyVersions.length > 1 ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#332b21] pt-5">
            <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f887b]">
              Versions
            </span>
            {familyVersions.map((version) => (
              <button
                key={getVersionKey(version)}
                type="button"
                onClick={() => selectVersion(getVersionKey(version))}
                aria-pressed={getVersionKey(version) === getVersionKey(image)}
                aria-label={`Afficher ${displayId} V${version.version}`}
                className={`rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
                  getVersionKey(version) === getVersionKey(image)
                    ? "border-[#d3df63] bg-[#d3df63]/10 text-[#edf78b]"
                    : "border-[#51483a] text-[#bdb5a8] hover:border-[#d3df63]"
                }`}
              >
                V{version.version}
              </button>
            ))}
            {canCompare ? (
              <button
                type="button"
                onClick={() => setCompareWithV1((current) => !current)}
                aria-pressed={compareWithV1}
                className="ml-auto rounded-full border border-[#51483a] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#d7d0c4] transition hover:border-[#d3df63] hover:text-[#d3df63]"
              >
                {compareWithV1 ? "Fermer la comparaison" : "Comparer avec V1"}
              </button>
            ) : null}
          </div>
        ) : null}

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
                Cette vue verrouille le cadrage, la perspective et l’architecture de la version sélectionnée.
              </p>
            </div>
          </div>
        ) : null}

        {image.exports?.length ? (
          <div className="mt-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f887b]">Exports V{image.version}</p>
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
            <span>Prompt complet{image.version ? ` · V${image.version}` : ""}</span>
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
  const [activeVersionView, setActiveVersionView] = useState<VersionView>("latest");

  const conceptImages = useMemo(
    () => images.filter((image) => getCollection(image) === "concept"),
    [images],
  );
  const realImages = useMemo(
    () => images.filter((image) => getCollection(image) === "real"),
    [images],
  );

  const familyVersions = useMemo(() => {
    const result = new Map<string, ParigoGalleryImage[]>();
    for (const image of realImages) {
      const code = getDisplayId(image);
      const versions = result.get(code) ?? [];
      versions.push(image);
      versions.sort((left, right) => (left.version ?? 0) - (right.version ?? 0));
      result.set(code, versions);
    }
    return result;
  }, [realImages]);

  const versionCounts = useMemo(() => ({
    latest: familyVersions.size,
    v1: realImages.filter((image) => image.version === 1).length,
    v2: realImages.filter((image) => image.version === 2).length,
    v3: realImages.filter((image) => image.version === 3).length,
    all: realImages.length,
  }), [familyVersions, realImages]);

  const versionScopedImages = useMemo(() => {
    if (activeCollection === "concept") return conceptImages;
    if (activeVersionView === "all") return realImages;
    if (activeVersionView === "latest") {
      return [...familyVersions.values()].map(
        (versions) => versions.find((image) => image.isLatest) ?? versions.at(-1)!,
      );
    }
    const version = Number(activeVersionView.slice(1));
    return realImages.filter((image) => image.version === version);
  }, [activeCollection, activeVersionView, conceptImages, familyVersions, realImages]);

  const availableFilters = useMemo(
    () => filters.filter((filter) => filter === "Tout" || versionScopedImages.some(
      (image) => getUsage(image) === filter,
    )),
    [versionScopedImages],
  );

  const visibleImages = useMemo(
    () => versionScopedImages.filter(
      (image) => activeFilter === "Tout" || getUsage(image) === activeFilter,
    ),
    [activeFilter, versionScopedImages],
  );

  function selectCollection(collection: GalleryCollection) {
    setActiveCollection(collection);
    setActiveFilter("Tout");
    setActiveVersionView("latest");
  }

  function selectVersionView(view: VersionView) {
    setActiveVersionView(view);
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
          <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f887b]">{conceptImages.length} concepts existants · inchangés</span>
        </button>
        <button
          type="button"
          onClick={() => selectCollection("real")}
          aria-pressed={activeCollection === "real"}
          className={`rounded-[16px] border p-5 text-left transition sm:p-6 ${activeCollection === "real" ? "border-[#d3df63] bg-[#1b1a11]" : "border-[#332b21] bg-[#15120e] hover:border-[#5a5143]"}`}
        >
          <span className="block font-heading text-2xl text-[#f4f0e7]">Locaux réels</span>
          <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[#8f887b]">{familyVersions.size} familles · {realImages.length} versions historisées</span>
        </button>
      </nav>

      {activeCollection === "real" ? (
        <>
          <div className="mb-6 rounded-[14px] border border-[#d3df63]/25 bg-[#d3df63]/8 p-4 text-sm leading-6 text-[#c9c2b6] sm:p-5">
            <strong className="font-medium text-[#edf78b]">Jalon d’étalonnage V2 :</strong> 6 images sur 48 sont disponibles. La suite de la campagne reste volontairement en attente de validation de la fidélité 95/5.
          </div>
          <nav aria-label="Choisir une campagne" className="mb-8 overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {versionViews.map((view) => {
                const count = versionCounts[view.key];
                const active = activeVersionView === view.key;
                return (
                  <button
                    key={view.key}
                    type="button"
                    onClick={() => selectVersionView(view.key)}
                    disabled={count === 0}
                    aria-pressed={active}
                    className={`rounded-full border px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] transition ${
                      active
                        ? "border-[#d3df63] bg-[#d3df63]/10 text-[#edf78b]"
                        : "border-[#51483a] text-[#bdb5a8] hover:border-[#d3df63] disabled:cursor-not-allowed disabled:opacity-35"
                    }`}
                  >
                    {view.label} · {count}
                  </button>
                );
              })}
            </div>
          </nav>
        </>
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
        {visibleImages.map((image) => (
          <GalleryCard
            key={`${activeVersionView}-${getVersionKey(image)}`}
            initialImage={image}
            familyVersions={image.familyCode ? (familyVersions.get(image.familyCode) ?? [image]) : [image]}
          />
        ))}
      </div>
    </>
  );
}
