"use client";

import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clipboard,
  Copy,
  Database,
  FileWarning,
  GitCompareArrows,
  Layers3,
  ListMusic,
  Search,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import type {
  ComposerAuditCredit,
  ComposerAuditData,
  ComposerNamingIssue,
  ComposerTrackAnomalyKind,
  ComposerTrackRightsState,
} from "@/lib/harvest/composer-audit";
import { cn } from "@/lib/utils";

type DashboardView = "credits" | "track-anomalies";
type CreditFilter = "all" | "attention" | "society" | "duplicates" | "spelling" | "parenthetical" | "clean";
type CreditSort = "priority" | "name" | "tracks" | "albums";
type AnomalyFilter = "all" | ComposerTrackAnomalyKind;

const issueLabels: Record<ComposerNamingIssue, string> = {
  "society-suffix": "Société dans le nom",
  parenthetical: "Parenthèses à vérifier",
  "duplicate-variant": "Variantes / casse",
  "spelling-candidate": "Orthographe proche",
};

const issueStyles: Record<ComposerNamingIssue, string> = {
  "society-suffix": "border-[#6f3d00]/30 bg-[#f3dfbf] text-[#6f3d00] dark:bg-[#4b2f0b] dark:text-[#ffdca4]",
  parenthetical: "border-[#5b3f8c]/30 bg-[#ebe4f7] text-[#5b3f8c] dark:bg-[#302342] dark:text-[#d7c8ef]",
  "duplicate-variant": "border-[#173b83]/30 bg-[#dce7f8] text-[#173b83] dark:bg-[#1d2d4b] dark:text-[#c7dbff]",
  "spelling-candidate": "border-[#74170f]/30 bg-[#f7dedb] text-[#74170f] dark:bg-[#45201c] dark:text-[#ffc8c2]",
};

const rightsLabels: Record<ComposerTrackRightsState, string> = {
  aligned: "Ayant droit aligné",
  "missing-structured": "Aucun ayant droit structuré",
  different: "Ayant droit différent",
};

const anomalyLabels: Record<ComposerTrackAnomalyKind, string> = {
  "missing-public-credit": "Compositeur public manquant",
  "different-right-holders": "Noms contradictoires",
  "missing-structured-credit": "Ayant droit structuré absent",
};

const creditFilterHelp: Record<CreditFilter, string> = {
  all: "Affiche tous les libellés Composer exacts renvoyés par Harvest.",
  attention: "Affiche les crédits qui portent au moins une alerte de nom.",
  society: "Affiche les noms contenant une société comme NS ou SACEM entre parenthèses.",
  duplicates: "Affiche les libellés partageant la même base après retrait de la casse, des accents et des suffixes.",
  spelling: "Affiche les noms très proches détectés comme fautes potentielles ; une validation humaine reste obligatoire.",
  parenthetical: "Affiche les parenthèses qui ne correspondent pas à une société reconnue.",
  clean: "Affiche les crédits pour lesquels aucune alerte de nom n’a été détectée.",
};

const anomalyFilterHelp: Record<AnomalyFilter, string> = {
  all: "Affiche tous les écarts prioritaires entre le champ Composer et les ayants droit structurés.",
  "missing-public-credit": "Le champ public Composer est vide alors qu’un auteur, compositeur ou arrangeur structuré est présent.",
  "different-right-holders": "Le champ Composer et les ayants droit structurés contiennent des noms différents après normalisation.",
  "missing-structured-credit": "Le champ Composer est renseigné mais aucun auteur, compositeur ou arrangeur structuré n’est renvoyé.",
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function albumHref(albumId: string): string {
  return `/albums/${albumId}`;
}

function trackHref(albumId: string, trackId: string): string {
  return `${albumHref(albumId)}?track=${encodeURIComponent(trackId)}`;
}

function InternalLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn("inline-flex items-center gap-1.5 underline decoration-[var(--line-strong)] underline-offset-3 hover:text-[var(--signal-strong)]", className)}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
      <ArrowUpRight size={12} className="shrink-0" aria-hidden="true" />
    </Link>
  );
}

function MetricButton({
  label,
  value,
  detail,
  help,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: number;
  detail: string;
  help: string;
  tone?: "neutral" | "signal" | "warning" | "danger" | "info";
  onClick: () => void;
}) {
  const tones = {
    neutral: "border-t-[#343b35]",
    signal: "border-t-[#176b3a]",
    warning: "border-t-[#a45d00]",
    danger: "border-t-[#b42318]",
    info: "border-t-[#2457a7]",
  };
  return (
    <Tooltip label={help} side="bottom" className="min-w-[13rem] flex-1">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label} : ${value}. ${detail}. ${help}`}
        className={cn(
          "parigo-card w-full border border-t-4 border-[var(--line)] bg-[var(--surface)] p-4 text-left shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-x-[var(--line-strong)] hover:border-b-[var(--line-strong)]",
          tones[tone],
        )}
      >
        <span className="flex items-center justify-between gap-3 font-mono text-[.6rem] uppercase tracking-[.12em] text-[var(--text-muted)]"><span>{label}</span><CircleHelp size={13} aria-hidden="true" /></span>
        <span className="mt-3 block text-4xl font-semibold tracking-[-.06em]">{value}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{detail}</span>
      </button>
    </Tooltip>
  );
}

function HelpTip({ label, side = "top" }: { label: string; side?: "top" | "bottom" }) {
  return (
    <Tooltip label={label} side={side}>
      <button
        type="button"
        aria-label={`Aide : ${label}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--text-muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--signal-strong)]"
      >
        <CircleHelp size={14} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

function FilterButton({
  active,
  label,
  help,
  onClick,
}: {
  active: boolean;
  label: string;
  help: string;
  onClick: () => void;
}) {
  return (
    <Tooltip label={help}>
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 border px-3 text-xs font-semibold",
          active
            ? "border-[var(--surface-inverse)] bg-[var(--surface-inverse)] text-[var(--inverse-foreground)]"
            : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)]",
        )}
      >
        {label}<CircleHelp size={11} className="opacity-60" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

function IssueBadge({ issue }: { issue: ComposerNamingIssue }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[.66rem] font-semibold", issueStyles[issue])}>
      {issueLabels[issue]}
    </span>
  );
}

function RightsBadge({ state }: { state: ComposerTrackRightsState }) {
  return (
    <span className={cn(
      "inline-flex w-fit items-center rounded-full px-2 py-1 text-[.58rem] font-semibold",
      state === "aligned" && "bg-[#176b3a] text-white",
      state === "missing-structured" && "bg-[#555d57] text-white",
      state === "different" && "bg-[#b42318] text-white",
    )}>
      {rightsLabels[state]}
    </span>
  );
}

function creditSearchText(credit: ComposerAuditCredit): string {
  return normalize([
    credit.name,
    credit.baseName,
    ...credit.variants,
    ...credit.spellingCandidates,
    ...credit.albums.flatMap((album) => [
      album.code,
      album.title,
      ...album.tracks.flatMap((track) => [track.id, track.title, track.version, ...track.structuredWriterNames]),
    ]),
  ].filter(Boolean).join(" "));
}

function matchesCreditFilter(credit: ComposerAuditCredit, filter: CreditFilter): boolean {
  if (filter === "all") return true;
  if (filter === "attention") return credit.issues.length > 0;
  if (filter === "clean") return credit.issues.length === 0;
  if (filter === "society") return credit.issues.includes("society-suffix");
  if (filter === "duplicates") return credit.issues.includes("duplicate-variant");
  if (filter === "spelling") return credit.issues.includes("spelling-candidate");
  return credit.issues.includes("parenthetical");
}

function copyCreditText(credit: ComposerAuditCredit): string {
  return [
    `Crédit Harvest : ${credit.name}`,
    `Base détectée : ${credit.baseName}`,
    credit.variants.length > 1 ? `Variantes : ${credit.variants.join(" · ")}` : "",
    credit.spellingCandidates.length ? `Orthographes proches : ${credit.spellingCandidates.join(" · ")}` : "",
    ...credit.albums.flatMap((album) => [
      `\n${album.code ? `${album.code} · ` : ""}${album.title} — ${album.id}`,
      ...album.tracks.map((track) => `- ${track.title}${track.version ? ` [${track.version}]` : ""} — ${track.id}`),
    ]),
  ].filter(Boolean).join("\n");
}

function ComposerCreditCard({ credit }: { credit: ComposerAuditCredit }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyReferences = async () => {
    await navigator.clipboard.writeText(copyCreditText(credit));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <details
      data-testid="composer-audit-credit"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group parigo-frame border border-[var(--line)] bg-[var(--surface)]"
    >
      <summary className="grid cursor-pointer list-none gap-4 p-4 marker:content-none md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-xl font-semibold tracking-[-.035em]">{credit.name}</h3>
            {credit.issues.length === 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#176b3a] px-2.5 py-1 text-[.65rem] font-semibold text-white">
                <Check size={11} /> Nom sans alerte
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-[.58rem] text-[var(--text-muted)]">{credit.id}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {credit.issues.map((issue) => <IssueBadge key={issue} issue={issue} />)}
          </div>
        </div>
        <div className="flex items-center justify-between gap-5 md:justify-end">
          <div className="grid grid-cols-2 gap-4 text-right">
            <div><p className="text-2xl font-semibold">{credit.albumCount}</p><p className="text-[.62rem] text-[var(--text-muted)]">albums</p></div>
            <div><p className="text-2xl font-semibold">{credit.trackCount}</p><p className="text-[.62rem] text-[var(--text-muted)]">pistes</p></div>
          </div>
          <span className="grid h-10 w-10 place-items-center border border-[var(--line)] bg-[var(--background)] transition group-open:rotate-180">
            <ChevronDown size={17} aria-hidden="true" />
          </span>
        </div>
      </summary>

      {open && <div className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--signal)_2.5%,var(--background))] p-4 md:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.55fr)]">
          <div className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="font-mono text-[.58rem] uppercase tracking-[.1em] text-[var(--signal-strong)]">Diagnostic du nom</p>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-[var(--text-muted)]">Base sans société détectée</dt><dd className="mt-1 font-semibold">{credit.baseName}</dd></div>
              <div><dt className="text-xs text-[var(--text-muted)]">Société trouvée dans le texte</dt><dd className="mt-1 font-semibold">{credit.society ?? "Aucune"}</dd></div>
            </dl>
            {credit.variants.length > 1 && (
              <div className="mt-4 border-t border-[var(--line)] pt-4">
                <p className="text-xs font-semibold">Variantes exactes à rapprocher</p>
                <div className="mt-2 flex flex-wrap gap-2">{credit.variants.map((variant) => <span key={variant} className="rounded-full border border-[var(--line)] bg-[var(--background)] px-2.5 py-1 text-xs">{variant}</span>)}</div>
              </div>
            )}
            {credit.spellingCandidates.length > 0 && (
              <div className="mt-4 border-t border-[var(--line)] pt-4">
                <p className="text-xs font-semibold text-[var(--danger)]">Orthographes proches — validation humaine obligatoire</p>
                <div className="mt-2 flex flex-wrap gap-2">{credit.spellingCandidates.map((candidate) => <span key={candidate} className="rounded-full border border-[#b42318]/30 bg-[#b42318]/8 px-2.5 py-1 text-xs">{candidate}</span>)}</div>
              </div>
            )}
          </div>

          <div className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="font-mono text-[.58rem] uppercase tracking-[.1em] text-[var(--signal-strong)]">Action opérateur</p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Rechercher ce crédit exact dans le Track Manager, puis contrôler le champ
              <strong className="text-[var(--foreground)]"> Right Holder Text → Author(s)/Composer(s)/Arranger(s)</strong>.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <InternalLink href={`/compositeurs/${credit.id}`} className="min-h-10 items-center border border-[var(--line)] bg-[var(--background)] px-3 text-xs font-semibold no-underline">
                Voir la page publique
              </InternalLink>
              <button type="button" onClick={() => void copyReferences()} className="inline-flex min-h-10 items-center gap-2 border border-[var(--line)] bg-[var(--background)] px-3 text-xs font-semibold hover:border-[var(--line-strong)]">
                {copied ? <Clipboard size={14} /> : <Copy size={14} />}{copied ? "Références copiées" : "Copier les références"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          {credit.albums.map((album) => (
            <section key={album.id} className="parigo-card overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
              <div className="flex flex-col gap-2 border-b border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <InternalLink href={albumHref(album.id)} className="font-semibold">
                    {album.code ? `${album.code} · ` : ""}{album.title}
                  </InternalLink>
                  <p className="mt-1 font-mono text-[.56rem] text-[var(--text-muted)]">Album ID · {album.id}</p>
                </div>
                <span className="w-fit rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold">{album.tracks.length} piste{album.tracks.length > 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {album.tracks.map((track) => (
                  <div key={track.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(13rem,.45fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <InternalLink href={trackHref(album.id, track.id)} className="font-semibold">{track.title}</InternalLink>
                      <p className="mt-1 font-mono text-[.56rem] text-[var(--text-muted)]">{track.id}{track.version ? ` · ${track.version}` : ""}{track.isAlternate ? " · version" : ""}</p>
                    </div>
                    <div className="text-xs leading-5 text-[var(--text-muted)]">
                      <p><span className="font-semibold text-[var(--foreground)]">Ayants droit :</span> {track.structuredWriterNames.join(" · ") || "aucun renvoyé"}</p>
                    </div>
                    <RightsBadge state={track.rightsState} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>}
    </details>
  );
}

export function ComposerAuditDashboard({ data }: { data: ComposerAuditData }) {
  const [view, setView] = useState<DashboardView>("credits");
  const [query, setQuery] = useState("");
  const [creditFilter, setCreditFilter] = useState<CreditFilter>("attention");
  const [creditSort, setCreditSort] = useState<CreditSort>("priority");
  const [anomalyFilter, setAnomalyFilter] = useState<AnomalyFilter>("all");
  const [anomalyLimit, setAnomalyLimit] = useState(100);
  const deferredQuery = useDeferredValue(query);

  const filteredCredits = useMemo(() => {
    const normalizedQuery = normalize(deferredQuery);
    return data.credits
      .filter((credit) => matchesCreditFilter(credit, creditFilter))
      .filter((credit) => !normalizedQuery || creditSearchText(credit).includes(normalizedQuery))
      .sort((left, right) => {
        if (creditSort === "name") return left.name.localeCompare(right.name, "fr", { sensitivity: "base" });
        if (creditSort === "tracks") return right.trackCount - left.trackCount || left.name.localeCompare(right.name, "fr");
        if (creditSort === "albums") return right.albumCount - left.albumCount || left.name.localeCompare(right.name, "fr");
        return right.issues.length - left.issues.length || left.name.localeCompare(right.name, "fr", { sensitivity: "base" });
      });
  }, [creditFilter, creditSort, data.credits, deferredQuery]);

  const filteredAnomalies = useMemo(() => {
    const normalizedQuery = normalize(deferredQuery);
    return data.trackAnomalies.filter((anomaly) => {
      if (anomalyFilter !== "all" && anomaly.kind !== anomalyFilter) return false;
      if (!normalizedQuery) return true;
      return normalize([
        anomaly.track.albumCode,
        anomaly.track.albumTitle,
        anomaly.track.id,
        anomaly.track.title,
        anomaly.track.version,
        ...anomaly.track.composerNames,
        ...anomaly.track.structuredWriterNames,
      ].filter(Boolean).join(" ")).includes(normalizedQuery);
    });
  }, [anomalyFilter, data.trackAnomalies, deferredQuery]);

  const showCredits = (filter: CreditFilter) => {
    setView("credits");
    setCreditFilter(filter);
    setQuery("");
  };

  const showAnomalies = (filter: AnomalyFilter) => {
    setView("track-anomalies");
    setAnomalyFilter(filter);
    setQuery("");
    setAnomalyLimit(100);
  };

  return (
    <main data-testid="composer-audit-dashboard" className="matching-admin-shell min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="border-b border-[var(--line)] bg-[var(--surface-inverse)] text-[var(--inverse-foreground)]">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-4 px-4 py-4 md:px-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--inverse-accent)] text-[var(--inverse-foreground)]"><CircleHelp size={18} /></div>
            <div>
              <p className="text-sm font-semibold">Diagnostic Harvest en lecture seule</p>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--inverse-muted)]">Ce dashboard n’écrit rien dans Harvest. Il indique les albums, pistes et champs à contrôler dans le back-office.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link href="/admin/matching" className="inline-flex min-h-9 items-center gap-2 border border-white/20 px-3 font-semibold hover:border-white/50"><GitCompareArrows size={14} /> Matching éditorial</Link>
            <Link href="/compositeurs" className="inline-flex min-h-9 items-center gap-2 border border-white/20 px-3 font-semibold hover:border-white/50"><Users size={14} /> Répertoire public</Link>
            <span className="border border-white/15 px-2.5 py-2 font-mono text-[.6rem] uppercase tracking-[.08em] text-[var(--inverse-muted)]">Actualisé {formatDate(data.capturedAt)}</span>
          </div>
        </div>
      </div>

      <header className="mx-auto max-w-[1700px] px-4 pb-7 pt-8 md:px-7 md:pt-11">
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_28rem] xl:items-end">
          <div>
            <p className="font-mono text-[.68rem] font-medium uppercase tracking-[.18em] text-[var(--signal-strong)]">Administration catalogue · Parigo</p>
            <h1 className="mt-3 max-w-5xl text-4xl font-semibold leading-[.96] tracking-[-.06em] md:text-6xl">Audit des compositeurs<span className="block text-[var(--text-muted)]">crédits, variantes & ayants droit.</span></h1>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-[var(--text-muted)] md:text-base">Repérez les noms à nettoyer, les doublons potentiels et chaque piste à ouvrir dans Harvest. Les liens pointent vers les pages publiques Parigo pour contrôler immédiatement le résultat exposé.</p>
          </div>
          <div className="parigo-frame border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[var(--signal-strong)]" size={20} /><div><p className="font-semibold">Périmètre chargé</p><p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{data.metrics.albumCount}/{data.sourceAlbumCount} albums · {data.metrics.trackCount} pistes et versions · {data.metrics.creditCount} crédits exacts.</p></div></div>
            {data.failedAlbums.length > 0 && <p className="mt-4 border-l-2 border-[var(--danger)] pl-3 text-xs leading-5 text-[var(--danger)]">{data.failedAlbums.length} album(s) indisponible(s) : audit partiel.</p>}
          </div>
        </div>
      </header>

      <section aria-label="Mode d’emploi" className="mx-auto max-w-[1700px] px-4 md:px-7">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { icon: Search, step: "01", title: "Identifier", text: "Chercher un nom, un code PGO, un titre ou un ID de piste." },
            { icon: Tags, step: "02", title: "Contrôler le texte public", text: "Modifier Right Holder Text → Author(s)/Composer(s)/Arranger(s)." },
            { icon: Layers3, step: "03", title: "Vérifier les droits", text: "Comparer séparément les ayants droit, capacités, sociétés et parts." },
          ].map(({ icon: Icon, step, title, text }) => (
            <article key={step} className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[4px_5px_0_color-mix(in_srgb,var(--signal)_8%,transparent)]">
              <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--signal-soft)] text-[var(--signal-strong)]"><Icon size={16} /></span><div><p className="font-mono text-[.56rem] uppercase tracking-[.1em] text-[var(--text-muted)]">Étape {step}</p><h2 className="mt-1 text-base font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{text}</p></div></div>
            </article>
          ))}
        </div>
      </section>

      <section aria-label="Documentation du dashboard" className="mx-auto mt-4 max-w-[1700px] px-4 md:px-7">
        <details data-testid="composer-audit-help" className="group parigo-frame border border-[var(--line)] bg-[var(--surface)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-semibold marker:content-none md:px-5">
            <span className="inline-flex items-center gap-2"><CircleHelp size={17} className="text-[var(--signal-strong)]" /> Comprendre les onglets, filtres et indicateurs</span>
            <ChevronDown size={17} className="shrink-0 transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-3 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--signal)_2.5%,var(--background))] p-4 md:grid-cols-2 md:p-5 xl:grid-cols-3">
            <article className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4">
              <h2 className="text-base font-semibold">Crédits compositeurs</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Une fiche par libellé <code className="font-mono">Composer</code> exact. Ouvrez-la pour voir sa base sans société, ses variantes, ses albums et chaque piste à rechercher dans Harvest.</p>
            </article>
            <article className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4">
              <h2 className="text-base font-semibold">Écarts Composer / ayants droit</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Compare le texte public <code className="font-mono">Composer</code> aux Right Holders dont la capacité est Author, Composer ou Arranger. Un écart demande une vérification, pas une correction automatique.</p>
            </article>
            <article className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4">
              <h2 className="text-base font-semibold">Recherche</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Recherche simultanément dans les noms, variantes, codes PGO, titres et identifiants d’albums ou de pistes. Elle s’applique uniquement à l’onglet courant.</p>
            </article>
            <article className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4">
              <h2 className="text-base font-semibold">Filtres de noms</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]"><strong>NS / SACEM</strong> cible les sociétés dans le nom ; <strong>Variantes</strong> rapproche casse, accents et suffixes ; <strong>Orthographe</strong> montre des proximités à valider ; <strong>Parenthèses</strong> cible les autres annotations.</p>
            </article>
            <article className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4">
              <h2 className="text-base font-semibold">Tri</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]"><strong>Priorité</strong> place les crédits ayant le plus d’alertes en premier. Les autres options trient par nom ou par volume d’albums et de pistes.</p>
            </article>
            <article className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4">
              <h2 className="text-base font-semibold">Indicateurs</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">Chaque carte est un raccourci : elle ouvre directement la vue et le filtre correspondant. Les nombres reflètent le snapshot Harvest chargé, jamais une liste locale.</p>
            </article>
          </div>
        </details>
      </section>

      <section aria-label="Indicateurs" className="mx-auto mt-5 max-w-[1700px] px-4 md:px-7">
        <div className="flex gap-3 overflow-x-auto pb-2">
          <MetricButton label="Noms à contrôler" value={data.metrics.creditsWithNamingIssues} detail={`sur ${data.metrics.creditCount} crédits exacts`} help="Crédits contenant au moins un suffixe, une parenthèse, une variante ou une orthographe proche." tone="warning" onClick={() => showCredits("attention")} />
          <MetricButton label="Suffixes société" value={data.metrics.societySuffixCount} detail="NS, SACEM, BMI…" help="Libellés Composer dont le nom se termine par une société placée entre parenthèses." tone="warning" onClick={() => showCredits("society")} />
          <MetricButton label="Groupes de variantes" value={data.metrics.duplicateGroupCount} detail="casse, accents ou suffixes" help="Groupes de noms partageant la même base normalisée ; ils peuvent correspondre à une même personne." tone="info" onClick={() => showCredits("duplicates")} />
          <MetricButton label="Orthographes proches" value={data.metrics.spellingCandidatePairCount} detail="paires à valider humainement" help="Paires très proches détectées par distance d’édition, par exemple une faute probable ; aucune fusion automatique." tone="danger" onClick={() => showCredits("spelling")} />
          <MetricButton label="Crédits publics manquants" value={data.metrics.missingPublicCreditCount} detail="ayant droit présent, Composer vide" help="Pistes où un auteur, compositeur ou arrangeur structuré existe mais où le champ public Composer est vide." tone="danger" onClick={() => showAnomalies("missing-public-credit")} />
          <MetricButton label="Noms contradictoires" value={data.metrics.differentRightHoldersCount} detail="texte et ayants droit différents" help="Pistes où les noms du champ Composer ne correspondent pas aux ayants droit structurés après normalisation." tone="danger" onClick={() => showAnomalies("different-right-holders")} />
        </div>
      </section>

      <div className="sticky top-0 z-40 mt-7 border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_90%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-2 px-4 py-2 md:px-7 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Vues du dashboard" className="flex gap-1 overflow-x-auto">
            <Tooltip label="Une fiche par libellé Composer exact, avec ses variantes, albums, pistes et état des ayants droit." side="bottom">
              <button type="button" aria-current={view === "credits" ? "page" : undefined} onClick={() => setView("credits")} className={cn("flex min-h-11 shrink-0 items-center gap-2 px-3 text-xs font-semibold", view === "credits" ? "bg-[var(--surface-inverse)] text-[var(--inverse-foreground)] shadow-[inset_0_-3px_0_var(--signal)]" : "hover:bg-[var(--surface)]")}><Users size={15} /> Crédits compositeurs <span className="rounded-full bg-[var(--signal)] px-1.5 py-0.5 text-[.58rem] text-white">{data.metrics.creditCount}</span><CircleHelp size={12} className="opacity-65" /></button>
            </Tooltip>
            <Tooltip label="Pistes où le champ Composer est vide ou ne correspond pas aux ayants droit structurés." side="bottom">
              <button type="button" aria-current={view === "track-anomalies" ? "page" : undefined} onClick={() => setView("track-anomalies")} className={cn("flex min-h-11 shrink-0 items-center gap-2 px-3 text-xs font-semibold", view === "track-anomalies" ? "bg-[var(--surface-inverse)] text-[var(--inverse-foreground)] shadow-[inset_0_-3px_0_var(--signal)]" : "hover:bg-[var(--surface)]")}><FileWarning size={15} /> Écarts Composer / ayants droit <span className="rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[.58rem] text-white">{data.trackAnomalies.length}</span><CircleHelp size={12} className="opacity-65" /></button>
            </Tooltip>
          </nav>
          <div className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-xl">
            <label className="parigo-field flex min-h-11 min-w-0 flex-1 items-center gap-2 border border-[var(--line)] bg-[var(--surface)] px-3"><Search size={15} className="text-[var(--text-muted)]" /><span className="sr-only">Rechercher dans l’audit</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, PGO, album, piste ou ID Harvest…" aria-describedby="composer-audit-search-help" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" /></label>
            <HelpTip label="Recherche dans les noms, variantes, codes PGO, albums, pistes et identifiants Harvest de l’onglet courant." side="bottom" />
            <span id="composer-audit-search-help" className="sr-only">La recherche porte sur les noms, variantes, codes PGO, titres et identifiants Harvest affichés dans l’onglet courant.</span>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1700px] px-4 py-7 md:px-7 md:py-10">
        {view === "credits" ? (
          <>
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div><p className="font-mono text-[.62rem] uppercase tracking-[.1em] text-[var(--signal-strong)]">Inventaire exact Harvest</p><h2 className="mt-2 text-2xl font-semibold">{filteredCredits.length} crédit{filteredCredits.length > 1 ? "s" : ""} affiché{filteredCredits.length > 1 ? "s" : ""}</h2></div>
              <div className="flex flex-wrap gap-2">
                {([
                  ["attention", "À contrôler"], ["society", "NS / SACEM"], ["duplicates", "Variantes"], ["spelling", "Orthographe"], ["parenthetical", "Parenthèses"], ["clean", "Sans alerte"], ["all", "Tous"],
                ] as Array<[CreditFilter, string]>).map(([value, label]) => (
                  <FilterButton key={value} active={creditFilter === value} label={label} help={creditFilterHelp[value]} onClick={() => setCreditFilter(value)} />
                ))}
                <div className="flex items-center gap-1.5">
                  <select aria-label="Trier les compositeurs" value={creditSort} onChange={(event) => setCreditSort(event.target.value as CreditSort)} className="parigo-field min-h-9 border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold"><option value="priority">Priorité</option><option value="name">Nom A–Z</option><option value="tracks">Plus de pistes</option><option value="albums">Plus d’albums</option></select>
                  <HelpTip label="Priorité classe d’abord les crédits cumulant le plus d’alertes ; les autres tris utilisent le nom ou les volumes Harvest." />
                </div>
              </div>
            </div>
            <div className="grid gap-4">{filteredCredits.map((credit) => <ComposerCreditCard key={credit.id} credit={credit} />)}</div>
            {filteredCredits.length === 0 && <div className="parigo-frame border border-dashed border-[var(--line-strong)] bg-[var(--surface)] py-20 text-center"><Search className="mx-auto text-[var(--text-muted)]" size={28} /><p className="mt-4 font-semibold">Aucun crédit ne correspond à ces filtres.</p></div>}
          </>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div><p className="font-mono text-[.62rem] uppercase tracking-[.1em] text-[var(--signal-strong)]">Comparaison des deux couches Harvest</p><h2 className="mt-2 text-2xl font-semibold">{filteredAnomalies.length} piste{filteredAnomalies.length > 1 ? "s" : ""} à contrôler</h2><p className="mt-1 text-xs text-[var(--text-muted)]">{data.metrics.missingStructuredCreditCount} pistes sans ayant droit structuré restent signalées dans le détail de leur crédit, sans être classées comme erreur certaine.</p></div>
              <div className="flex flex-wrap gap-2">{([[
                "missing-public-credit", "Composer public manquant"], ["different-right-holders", "Noms contradictoires"], ["all", "Tous les écarts"],
              ] as Array<[AnomalyFilter, string]>).map(([value, label]) => (
                <FilterButton key={value} active={anomalyFilter === value} label={label} help={anomalyFilterHelp[value]} onClick={() => { setAnomalyFilter(value); setAnomalyLimit(100); }} />
              ))}</div>
            </div>
            <div data-testid="composer-track-anomalies" className="grid gap-3">
              {filteredAnomalies.slice(0, anomalyLimit).map((anomaly) => (
                <article key={anomaly.id} className="parigo-card grid gap-4 border border-l-4 border-[var(--line)] border-l-[var(--danger)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] lg:grid-cols-[minmax(0,1fr)_minmax(15rem,.5fr)_minmax(15rem,.5fr)] lg:items-center">
                  <div className="min-w-0"><span className="inline-flex rounded-full bg-[var(--danger)] px-2.5 py-1 text-[.6rem] font-semibold text-white">{anomalyLabels[anomaly.kind]}</span><h3 className="mt-3 font-semibold"><InternalLink href={trackHref(anomaly.track.albumId, anomaly.track.id)}>{anomaly.track.title}</InternalLink></h3><p className="mt-1 text-xs text-[var(--text-muted)]"><InternalLink href={albumHref(anomaly.track.albumId)}>{anomaly.track.albumCode ? `${anomaly.track.albumCode} · ` : ""}{anomaly.track.albumTitle}</InternalLink></p><p className="mt-1 font-mono text-[.56rem] text-[var(--text-muted)]">{anomaly.track.id}{anomaly.track.version ? ` · ${anomaly.track.version}` : ""}</p></div>
                  <div className="border-l-2 border-[var(--signal)] pl-3"><p className="font-mono text-[.55rem] uppercase tracking-[.08em] text-[var(--text-muted)]">Composer public</p><p className="mt-1 text-sm font-semibold">{anomaly.track.composerNames.join(" · ") || "Aucun crédit"}</p></div>
                  <div className="border-l-2 border-[#2457a7] pl-3"><p className="font-mono text-[.55rem] uppercase tracking-[.08em] text-[var(--text-muted)]">Ayants droit structurés</p><p className="mt-1 text-sm font-semibold">{anomaly.track.structuredWriterNames.join(" · ") || "Aucun ayant droit"}</p></div>
                </article>
              ))}
            </div>
            {filteredAnomalies.length > anomalyLimit && <div className="mt-6 text-center"><button type="button" onClick={() => setAnomalyLimit((current) => current + 100)} className="parigo-button min-h-11 border border-[var(--line-strong)] bg-[var(--surface)] px-5 text-sm font-semibold">Afficher 100 pistes supplémentaires</button></div>}
            {filteredAnomalies.length === 0 && <div className="parigo-frame border border-dashed border-[var(--line-strong)] bg-[var(--surface)] py-20 text-center"><Check className="mx-auto text-[var(--signal-strong)]" size={28} /><p className="mt-4 font-semibold">Aucune anomalie ne correspond à ces filtres.</p></div>}
          </>
        )}
      </section>

      <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-2 px-4 py-5 text-xs text-[var(--text-muted)] md:flex-row md:items-center md:justify-between md:px-7"><p className="inline-flex items-center gap-2"><Database size={14} /> Source unique : API Harvest · label Parigo</p><p className="inline-flex items-center gap-2"><ListMusic size={14} /> Les suggestions orthographiques ne sont jamais appliquées automatiquement.</p></div>
      </footer>
    </main>
  );
}
