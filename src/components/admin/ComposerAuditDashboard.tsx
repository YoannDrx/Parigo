"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Database,
  Download,
  ListFilter,
  ListMusic,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type {
  ComposerAuditAlbum,
  ComposerAuditAlbumSummary,
  ComposerAuditIdentitySummary,
  ComposerAuditRecommendationKind,
  ComposerAuditSummaryData,
  ComposerTrackRightsState,
  EditorialAuditStatus,
  HarvestAuditStatus,
} from "@/lib/harvest/composer-audit";
import { cn } from "@/lib/utils";

type WorkFilter = "action" | HarvestAuditStatus | "all";
type SourceFilter = "all" | "public" | "harvest";
type PresenceFilter = "all" | "present" | "missing";
type RightsFilter = "all" | ComposerTrackRightsState;
type SortValue = "priority" | "name" | "albums" | "tracks";
type EditorialFilter = "all" | EditorialAuditStatus;

const rowGrid = "grid min-w-[1180px] grid-cols-[minmax(200px,1.35fr)_minmax(220px,1.35fr)_70px_70px_60px_60px_60px_125px_120px_44px] items-center gap-3";

const recommendationLabels: Record<ComposerAuditRecommendationKind, string> = {
  "society-suffix": "Suffixe de société",
  "preferred-name": "Nom Harvest non préféré",
  "duplicate-variant": "Variantes à rapprocher",
  "spelling-candidate": "Orthographe à vérifier",
  "missing-public-credit": "Composer public manquant",
  "different-right-holders": "Ayants droit contradictoires",
  "invalid-character": "Caractère corrompu",
};

const evidenceLabels = {
  "canonical-registry": "référence éditoriale contrôlée",
  "structured-right-holder": "ayant droit structuré Harvest",
  mechanical: "normalisation mécanique sûre",
};

const harvestStatusLabels: Record<HarvestAuditStatus, string> = {
  clean: "Correct",
  "cleanup-required": "Correction disponible",
  "review-required": "À vérifier",
  "no-credit": "Sans crédit",
};

const editorialStatusLabels: Record<EditorialAuditStatus, string> = {
  complete: "Complet",
  incomplete: "À compléter",
  "not-applicable": "Non applicable",
};

const rightsLabels: Record<ComposerTrackRightsState, string> = {
  aligned: "Alignés",
  different: "Contradictoires",
  "missing-structured": "Non structurés",
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
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function albumHref(albumId: string): string {
  return `/albums/${albumId}`;
}

function trackHref(albumId: string, trackId: string): string {
  return `${albumHref(albumId)}?track=${encodeURIComponent(trackId)}`;
}

function identitySearchText(identity: ComposerAuditIdentitySummary): string {
  return normalize(identity.searchText);
}

function StatusBadge({ status }: { status: HarvestAuditStatus }) {
  return (
    <span className={cn(
      "inline-flex w-fit rounded-full px-2.5 py-1 text-[.64rem] font-semibold",
      status === "clean" && "bg-[#176b3a] text-white",
      status === "cleanup-required" && "bg-[#a45d00] text-white",
      status === "review-required" && "bg-[#b42318] text-white",
      status === "no-credit" && "bg-[#555d57] text-white",
    )}>
      {harvestStatusLabels[status]}
    </span>
  );
}

function EditorialBadge({ status }: { status: EditorialAuditStatus }) {
  return (
    <span className={cn(
      "inline-flex w-fit rounded-full px-2.5 py-1 text-[.64rem] font-semibold",
      status === "complete" && "bg-[#176b3a] text-white",
      status === "incomplete" && "bg-[#2457a7] text-white",
      status === "not-applicable" && "bg-[var(--surface-soft)] text-[var(--text-muted)]",
    )}>
      {editorialStatusLabels[status]}
    </span>
  );
}

function Presence({ value }: { value: boolean | undefined }) {
  if (value === undefined) return <span className="text-[.68rem] text-[var(--text-muted)]">N/A</span>;
  return value
    ? <span className="inline-flex items-center gap-1 text-[.68rem] font-semibold text-[#176b3a]"><Check size={13} /> Oui</span>
    : <span className="inline-flex items-center gap-1 text-[.68rem] font-semibold text-[var(--danger)]"><AlertTriangle size={13} /> Non</span>;
}

function RightsBadge({ state }: { state: ComposerTrackRightsState }) {
  return (
    <span className={cn(
      "inline-flex w-fit rounded-full px-2 py-1 text-[.58rem] font-semibold",
      state === "aligned" && "bg-[#176b3a] text-white",
      state === "different" && "bg-[#b42318] text-white",
      state === "missing-structured" && "bg-[#555d57] text-white",
    )}>
      {rightsLabels[state]}
    </span>
  );
}

function RefreshSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-9 items-center gap-2 border border-white/20 px-3 text-xs font-semibold transition hover:border-white/50 disabled:cursor-wait disabled:opacity-60"
    >
      <RefreshCw size={14} className={pending ? "animate-spin" : undefined} />
      {pending ? "Actualisation…" : "Actualiser depuis Harvest"}
    </button>
  );
}

function MetricButton({ label, value, active, tone, onClick }: {
  label: string;
  value: number;
  active: boolean;
  tone: "danger" | "warning" | "success" | "info";
  onClick: () => void;
}) {
  const tones = {
    danger: "border-t-[#b42318]",
    warning: "border-t-[#a45d00]",
    success: "border-t-[#176b3a]",
    info: "border-t-[#2457a7]",
  };
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "parigo-card min-w-[10.5rem] flex-1 border border-t-4 bg-[var(--surface)] p-3 text-left transition hover:border-x-[var(--line-strong)] hover:border-b-[var(--line-strong)]",
        tones[tone],
        active ? "border-x-[var(--line-strong)] border-b-[var(--line-strong)] shadow-[var(--shadow-sm)]" : "border-x-[var(--line)] border-b-[var(--line)]",
      )}
    >
      <span className="block font-mono text-[.56rem] uppercase tracking-[.1em] text-[var(--text-muted)]">{label}</span>
      <span className="mt-2 block text-3xl font-semibold tracking-[-.05em]">{value}</span>
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1">
      <span className="font-mono text-[.54rem] uppercase tracking-[.08em] text-[var(--text-muted)]">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="parigo-field min-h-10 border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs font-semibold"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function AlbumDisclosure({ album, identityId }: { album: ComposerAuditAlbumSummary; identityId: string }) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<ComposerAuditAlbum | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (details || loading) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ album: album.id });
      const response = await fetch(`/api/admin/compositeurs/${encodeURIComponent(identityId)}?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.data?.album) throw new Error(payload.error?.message || "Pistes indisponibles.");
      setDetails(payload.data.album as ComposerAuditAlbum);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pistes indisponibles.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-col gap-2 bg-[var(--surface-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link href={albumHref(album.id)} prefetch={false} className="inline-flex items-center gap-1.5 font-semibold underline decoration-[var(--line-strong)] underline-offset-3 hover:text-[var(--signal-strong)]">
            {album.code ? `${album.code} · ` : ""}{album.title}<ArrowUpRight size={12} />
          </Link>
          <p className="mt-1 font-mono text-[.55rem] text-[var(--text-muted)]">Album ID · {album.id}</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => void toggle()}
          className="inline-flex min-h-9 items-center justify-center gap-2 border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold hover:border-[var(--line-strong)]"
        >
          {album.trackCount} piste{album.trackCount > 1 ? "s" : ""}
          <ChevronDown size={14} className={open ? "rotate-180" : undefined} />
        </button>
      </div>
      {open && details ? (
        <div className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {details.tracks.map((track) => (
            <article key={track.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,.65fr)_minmax(12rem,.65fr)_auto] md:items-center">
              <div className="min-w-0">
                <Link href={trackHref(album.id, track.id)} prefetch={false} className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-3 hover:text-[var(--signal-strong)]">
                  {track.title}<ArrowUpRight size={12} />
                </Link>
                <p className="mt-1 font-mono text-[.55rem] text-[var(--text-muted)]">
                  {track.id}{track.version ? ` · ${track.version}` : ""}{track.isAlternate ? " · version" : " · principale"}
                </p>
              </div>
              <div className="text-xs leading-5">
                <p className="font-mono text-[.53rem] uppercase tracking-[.08em] text-[var(--text-muted)]">Crédit exact lié</p>
                <p className="mt-1 font-semibold">{track.matchedCreditNames.join(" · ") || "Champ Composer vide"}</p>
              </div>
              <div className="text-xs leading-5">
                <p className="font-mono text-[.53rem] uppercase tracking-[.08em] text-[var(--text-muted)]">Ayants droit structurés</p>
                <p className="mt-1 font-semibold">{track.structuredWriterNames.join(" · ") || "Aucun renvoyé"}</p>
              </div>
              <RightsBadge state={track.rightsState} />
            </article>
          ))}
        </div>
      ) : open ? <div className="border-t border-[var(--line)] p-5 text-center text-xs text-[var(--text-muted)]">{loading ? "Chargement des pistes…" : error || "Pistes indisponibles."}</div> : null}
    </section>
  );
}

function IdentityDetails({ identity }: { identity: ComposerAuditIdentitySummary }) {
  return (
    <div className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--signal)_2.5%,var(--background))] p-4 md:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.45fr)]">
        <section className="border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="font-mono text-[.58rem] uppercase tracking-[.1em] text-[var(--signal-strong)]">Diagnostic courant</p>
          {identity.recommendations.length ? (
            <ul className="mt-3 grid gap-2">
              {identity.recommendations.map((item) => (
                <li key={item.id} className={cn("border-l-3 p-3", item.severity === "review" ? "border-l-[#b42318] bg-[#b42318]/6" : "border-l-[#a45d00] bg-[#a45d00]/6")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{recommendationLabels[item.kind]}</span>
                    <span className="text-[.65rem] text-[var(--text-muted)]">{item.trackCount} piste{item.trackCount > 1 ? "s" : ""}</span>
                  </div>
                  {item.currentNames.length ? <p className="mt-1 text-xs text-[var(--text-muted)]">Actuel : {item.currentNames.join(" · ")}</p> : null}
                  {item.proposedName ? <p className="mt-1 text-sm font-semibold">Cible : {item.proposedName}</p> : <p className="mt-1 text-xs font-semibold text-[var(--danger)]">Aucune cible certaine : validation humaine requise.</p>}
                  {item.evidence ? <p className="mt-1 text-[.65rem] text-[var(--text-muted)]">Preuve : {evidenceLabels[item.evidence]}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#176b3a]"><Check size={16} /> Aucun écart actif dans le snapshot Harvest.</p>
          )}
        </section>
        <section className="border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="font-mono text-[.58rem] uppercase tracking-[.1em] text-[var(--signal-strong)]">Libellés exacts Harvest</p>
          {identity.exactCredits.length ? (
            <ul className="mt-3 space-y-2">
              {identity.exactCredits.map((credit) => <li key={credit.name} className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2 text-sm last:border-0"><span className="font-semibold">{credit.name}</span><span className="text-xs text-[var(--text-muted)]">{credit.trackCount} piste{credit.trackCount > 1 ? "s" : ""}</span></li>)}
            </ul>
          ) : <p className="mt-3 text-sm text-[var(--text-muted)]">Aucun libellé Composer associé.</p>}
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-3 text-center">
            <div><dt className="text-[.58rem] text-[var(--text-muted)]">Alignées</dt><dd className="mt-1 text-lg font-semibold">{identity.alignedTrackCount}</dd></div>
            <div><dt className="text-[.58rem] text-[var(--text-muted)]">Contradictoires</dt><dd className="mt-1 text-lg font-semibold">{identity.differentRightHolderTrackCount}</dd></div>
            <div><dt className="text-[.58rem] text-[var(--text-muted)]">Non structurées</dt><dd className="mt-1 text-lg font-semibold">{identity.missingStructuredTrackCount}</dd></div>
          </dl>
        </section>
      </div>
      <div className="mt-4 grid gap-3">
        {identity.albums.map((album) => <AlbumDisclosure key={album.id} album={album} identityId={identity.id} />)}
        {!identity.albums.length ? <p className="border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text-muted)]">Aucun album Harvest relié à cette fiche publique.</p> : null}
      </div>
    </div>
  );
}

function IdentityRow({ identity }: { identity: ComposerAuditIdentitySummary }) {
  const [open, setOpen] = useState(false);
  const hasPublicProfile = Boolean(identity.publicProfile);
  return (
    <article data-testid="composer-audit-identity" data-status={identity.harvestStatus} className="border-b border-[var(--line)] bg-[var(--surface)] last:border-b-0">
      <div className={cn(rowGrid, "min-h-[76px] px-3 py-3 text-xs hover:bg-[var(--surface-soft)]")}>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{identity.preferredName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[.55rem] font-semibold", hasPublicProfile ? "bg-[var(--signal-soft)] text-[var(--signal-strong)]" : "bg-[var(--surface-soft)] text-[var(--text-muted)]")}>
              {hasPublicProfile ? "Profil public" : identity.source === "unassigned" ? "Non attribué" : "Harvest uniquement"}
            </span>
            {identity.publicProfile ? (
              <Link href={`/compositeurs/${identity.publicProfile.slug}`} className="inline-flex items-center gap-1 text-[.62rem] underline underline-offset-2 hover:text-[var(--signal-strong)]">
                {identity.publicProfile.name}<ArrowUpRight size={10} />
              </Link>
            ) : null}
          </div>
        </div>
        <div className="min-w-0">
          {identity.exactCredits.length ? (
            <>
              <p className="truncate font-semibold">{identity.exactCredits.slice(0, 2).map((credit) => credit.name).join(" · ")}</p>
              {identity.exactCredits.length > 2 ? <p className="mt-1 text-[.6rem] text-[var(--text-muted)]">+ {identity.exactCredits.length - 2} autre{identity.exactCredits.length - 2 > 1 ? "s" : ""}</p> : null}
              {identity.exactCredits.some((credit) => credit.name !== identity.preferredName) ? <p className="mt-1 truncate text-[.62rem] font-semibold text-[#a45d00]">→ {identity.preferredName}</p> : null}
            </>
          ) : <span className="text-[var(--text-muted)]">Aucun crédit associé</span>}
        </div>
        <div><span className="text-lg font-semibold">{identity.albumCount}</span><span className="ml-1 text-[.58rem] text-[var(--text-muted)]">albums</span></div>
        <div><span className="text-lg font-semibold">{identity.trackCount}</span><span className="ml-1 text-[.58rem] text-[var(--text-muted)]">pistes</span></div>
        <Presence value={identity.publicProfile?.hasBioFr} />
        <Presence value={identity.publicProfile?.hasBioEn} />
        <Presence value={identity.publicProfile?.hasPortrait} />
        <StatusBadge status={identity.harvestStatus} />
        <EditorialBadge status={identity.editorialStatus} />
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${open ? "Replier" : "Ouvrir"} ${identity.preferredName}`}
          onClick={() => setOpen((current) => !current)}
          className="grid h-10 w-10 place-items-center border border-[var(--line)] bg-[var(--background)] hover:border-[var(--line-strong)]"
        >
          <ChevronDown size={17} className={open ? "rotate-180" : undefined} />
        </button>
      </div>
      {open ? <IdentityDetails identity={identity} /> : null}
    </article>
  );
}

function csvCell(value: unknown): string {
  const string = Array.isArray(value) ? value.join(" · ") : String(value ?? "");
  return `"${string.replaceAll('"', '""').replace(/[\r\n]+/g, " ")}"`;
}

function identitiesCsv(identities: ComposerAuditIdentitySummary[]): string {
  const header = [
    "identite", "profil_public", "source", "nom_cible_harvest", "credits_harvest_exacts", "albums", "pistes",
    "bio_fr", "bio_en", "portrait", "statut_harvest", "statut_editorial", "recommandations", "preuves",
  ];
  return `\uFEFF${[
    header,
    ...identities.map((identity) => [
      identity.id,
      identity.publicProfile?.name,
      identity.source,
      identity.preferredName,
      identity.exactCredits.map((credit) => `${credit.name} (${credit.trackCount})`),
      identity.albums.map((album) => `${album.code ?? album.id} · ${album.title}`),
      identity.trackCount,
      identity.publicProfile?.hasBioFr ?? "N/A",
      identity.publicProfile?.hasBioEn ?? "N/A",
      identity.publicProfile?.hasPortrait ?? "N/A",
      identity.harvestStatus,
      identity.editorialStatus,
      identity.recommendations.map((item) => `${recommendationLabels[item.kind]}${item.proposedName ? ` → ${item.proposedName}` : ""}`),
      identity.recommendations.map((item) => item.evidence ? evidenceLabels[item.evidence] : "validation humaine"),
    ]),
  ].map((row) => row.map(csvCell).join(";")).join("\n")}\n`;
}

function sortPriority(identity: ComposerAuditIdentitySummary): number {
  if (identity.harvestStatus === "review-required") return 0;
  if (identity.harvestStatus === "cleanup-required") return 1;
  if (identity.harvestStatus === "no-credit") return 2;
  if (identity.editorialStatus === "incomplete") return 3;
  return 4;
}

export function ComposerAuditDashboard({ data, refreshAction }: { data: ComposerAuditSummaryData; refreshAction: () => Promise<void> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const deferredQuery = useDeferredValue(query);
  const work = (searchParams.get("work") ?? "action") as WorkFilter;
  const source = (searchParams.get("source") ?? "all") as SourceFilter;
  const bioFr = (searchParams.get("bioFr") ?? "all") as PresenceFilter;
  const bioEn = (searchParams.get("bioEn") ?? "all") as PresenceFilter;
  const photo = (searchParams.get("photo") ?? "all") as PresenceFilter;
  const editorial = (searchParams.get("editorial") ?? "all") as EditorialFilter;
  const rights = (searchParams.get("rights") ?? "all") as RightsFilter;
  const issue = (searchParams.get("issue") ?? "all") as ComposerAuditRecommendationKind | "all";
  const album = searchParams.get("album") ?? "all";
  const sort = (searchParams.get("sort") ?? "priority") as SortValue;

  const setParam = (key: string, value: string, defaultValue = "all") => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === defaultValue) params.delete(key);
    else params.set(key, value);
    const suffix = params.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  };

  const albumOptions = useMemo(() => {
    const values = new Map<string, string>();
    for (const identity of data.identities) {
      for (const item of identity.albums) values.set(item.code ?? item.id, `${item.code ? `${item.code} · ` : ""}${item.title}`);
    }
    return [...values].sort((left, right) => left[0].localeCompare(right[0], "fr", { numeric: true }));
  }, [data.identities]);

  const filteredIdentities = useMemo(() => {
    const normalizedQuery = normalize(deferredQuery);
    return data.identities.filter((identity) => {
      if (work === "action" && identity.harvestStatus === "clean" && identity.editorialStatus !== "incomplete") return false;
      if (work !== "action" && work !== "all" && identity.harvestStatus !== work) return false;
      if (source === "public" && !identity.publicProfile) return false;
      if (source === "harvest" && identity.publicProfile) return false;
      if (bioFr !== "all" && (!identity.publicProfile || identity.publicProfile.hasBioFr !== (bioFr === "present"))) return false;
      if (bioEn !== "all" && (!identity.publicProfile || identity.publicProfile.hasBioEn !== (bioEn === "present"))) return false;
      if (photo !== "all" && (!identity.publicProfile || identity.publicProfile.hasPortrait !== (photo === "present"))) return false;
      if (editorial !== "all" && identity.editorialStatus !== editorial) return false;
      if (rights === "aligned" && !identity.alignedTrackCount) return false;
      if (rights === "different" && !identity.differentRightHolderTrackCount) return false;
      if (rights === "missing-structured" && !identity.missingStructuredTrackCount) return false;
      if (issue !== "all" && !identity.recommendations.some((item) => item.kind === issue)) return false;
      if (album !== "all" && !identity.albums.some((item) => (item.code ?? item.id) === album)) return false;
      return !normalizedQuery || identitySearchText(identity).includes(normalizedQuery);
    }).sort((left, right) => {
      if (sort === "name") return left.preferredName.localeCompare(right.preferredName, "fr", { sensitivity: "base" });
      if (sort === "albums") return right.albumCount - left.albumCount || left.preferredName.localeCompare(right.preferredName, "fr");
      if (sort === "tracks") return right.trackCount - left.trackCount || left.preferredName.localeCompare(right.preferredName, "fr");
      return sortPriority(left) - sortPriority(right) || right.trackCount - left.trackCount || left.preferredName.localeCompare(right.preferredName, "fr");
    });
  }, [album, bioEn, bioFr, data.identities, deferredQuery, editorial, issue, photo, rights, sort, source, work]);

  const downloadCsv = () => {
    const href = URL.createObjectURL(new Blob([identitiesCsv(filteredIdentities)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `parigo-audit-compositeurs-${data.capturedAt.slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(href);
  };

  return (
    <main data-testid="composer-audit-dashboard" className="matching-admin-shell min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="border-b border-[var(--line)] bg-[var(--surface-inverse)] text-[var(--inverse-foreground)]">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-4 md:px-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <Database size={19} className="mt-0.5 text-[var(--inverse-accent)]" />
            <div>
              <p className="text-sm font-semibold">Snapshot Harvest en lecture seule</p>
              <p className="mt-1 text-xs text-[var(--inverse-muted)]">{data.metrics.albumCount}/{data.sourceAlbumCount} albums · {data.metrics.trackCount} pistes et versions · {data.metrics.exactCreditCount} libellés exacts · actualisé <time data-testid="composer-snapshot-time" dateTime={data.capturedAt}>{formatDate(data.capturedAt)}</time></p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/compositeurs" className="inline-flex min-h-9 items-center gap-2 border border-white/20 px-3 text-xs font-semibold hover:border-white/50"><Users size={14} /> Répertoire public</Link>
            <form action={refreshAction}><RefreshSubmit /></form>
          </div>
        </div>
      </div>

      <header className="mx-auto max-w-[1800px] px-4 pb-5 pt-7 md:px-7 md:pt-9">
        <p className="font-mono text-[.64rem] uppercase tracking-[.16em] text-[var(--signal-strong)]">Administration catalogue · Parigo</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-.055em] md:text-6xl">Rapprochement des compositeurs</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--text-muted)]">Une ligne par identité résolue, avec les variantes exactes Harvest, la complétude éditoriale et les pistes à contrôler. Les recommandations sont recalculées depuis l’API courante.</p>
      </header>

      {data.failedAlbums.length ? (
        <section className="mx-auto max-w-[1800px] px-4 md:px-7">
          <div className="border-l-4 border-l-[var(--danger)] bg-[#b42318]/7 p-4 text-sm">
            <p className="font-semibold">Audit partiel : aucun verdict global ne peut être considéré comme définitif.</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Albums indisponibles : {data.failedAlbums.map((item) => `${item.code ? `${item.code} · ` : ""}${item.title} (${item.id})`).join(" · ")}</p>
          </div>
        </section>
      ) : null}

      <section aria-label="Indicateurs" className="mx-auto mt-4 max-w-[1800px] px-4 md:px-7">
        <div className="flex gap-3 overflow-x-auto pb-2">
          <MetricButton label="Actions requises" value={data.metrics.actionRequiredCount} active={work === "action"} tone="warning" onClick={() => setParam("work", "action", "action")} />
          <MetricButton label="Corrections disponibles" value={data.metrics.cleanupRequiredCount} active={work === "cleanup-required"} tone="warning" onClick={() => setParam("work", "cleanup-required", "action")} />
          <MetricButton label="À vérifier" value={data.metrics.reviewRequiredCount} active={work === "review-required"} tone="danger" onClick={() => setParam("work", "review-required", "action")} />
          <MetricButton label="Contenus incomplets" value={data.metrics.incompleteEditorialCount} active={editorial === "incomplete"} tone="info" onClick={() => setParam("editorial", "incomplete")} />
          <MetricButton label="Corrects" value={data.metrics.cleanCount} active={work === "clean"} tone="success" onClick={() => setParam("work", "clean", "action")} />
        </div>
      </section>

      <section aria-label="Filtres" className="sticky top-0 z-40 mt-4 border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] backdrop-blur-xl">
        <div className="mx-auto max-w-[1800px] px-4 py-3 md:px-7">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <label className="grid min-w-0 flex-1 gap-1 xl:max-w-md">
              <span className="font-mono text-[.54rem] uppercase tracking-[.08em] text-[var(--text-muted)]">Recherche</span>
              <span className="parigo-field flex min-h-10 items-center gap-2 border border-[var(--line)] bg-[var(--surface)] px-3"><Search size={14} className="text-[var(--text-muted)]" /><input value={query} onChange={(event) => setParam("q", event.target.value, "")} placeholder="Nom, variante, PGO, album, piste ou ID…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></span>
            </label>
            <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              <FilterSelect label="Travail" value={work} onChange={(value) => setParam("work", value, "action")} options={[
                { value: "action", label: "Actions requises" }, { value: "review-required", label: "À vérifier" }, { value: "cleanup-required", label: "Correction disponible" }, { value: "clean", label: "Correct" }, { value: "no-credit", label: "Sans crédit" }, { value: "all", label: "Tous" },
              ]} />
              <FilterSelect label="Source" value={source} onChange={(value) => setParam("source", value)} options={[{ value: "all", label: "Toutes" }, { value: "public", label: "Profil public" }, { value: "harvest", label: "Harvest uniquement" }]} />
              <FilterSelect label="Bio FR" value={bioFr} onChange={(value) => setParam("bioFr", value)} options={[{ value: "all", label: "Toutes" }, { value: "present", label: "Présente" }, { value: "missing", label: "Manquante" }]} />
              <FilterSelect label="Bio EN" value={bioEn} onChange={(value) => setParam("bioEn", value)} options={[{ value: "all", label: "Toutes" }, { value: "present", label: "Présente" }, { value: "missing", label: "Manquante" }]} />
              <FilterSelect label="Photo" value={photo} onChange={(value) => setParam("photo", value)} options={[{ value: "all", label: "Toutes" }, { value: "present", label: "Présente" }, { value: "missing", label: "Manquante" }]} />
              <FilterSelect label="Tri" value={sort} onChange={(value) => setParam("sort", value, "priority")} options={[{ value: "priority", label: "Priorité" }, { value: "name", label: "Nom A–Z" }, { value: "albums", label: "Plus d’albums" }, { value: "tracks", label: "Plus de pistes" }]} />
            </div>
            <button type="button" onClick={() => router.replace(pathname, { scroll: false })} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-xs font-semibold hover:bg-[var(--surface-soft)]"><RotateCcw size={14} /> Réinitialiser les filtres</button>
          </div>
          <details className="group mt-3 border-t border-[var(--line)] pt-2">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold marker:content-none"><ListFilter size={14} /> Filtres avancés <ChevronDown size={13} className="transition group-open:rotate-180" /></summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect label="Ayants droit" value={rights} onChange={(value) => setParam("rights", value)} options={[{ value: "all", label: "Tous" }, { value: "aligned", label: "Alignés" }, { value: "different", label: "Contradictoires" }, { value: "missing-structured", label: "Non structurés" }]} />
              <FilterSelect label="Anomalie" value={issue} onChange={(value) => setParam("issue", value)} options={[{ value: "all", label: "Toutes" }, ...Object.entries(recommendationLabels).map(([value, label]) => ({ value, label }))]} />
              <FilterSelect label="Album" value={album} onChange={(value) => setParam("album", value)} options={[{ value: "all", label: "Tous les albums" }, ...albumOptions.map(([value, label]) => ({ value, label }))]} />
              <FilterSelect label="Éditorial" value={editorial} onChange={(value) => setParam("editorial", value)} options={[{ value: "all", label: "Tous" }, { value: "incomplete", label: "À compléter" }, { value: "complete", label: "Complet" }, { value: "not-applicable", label: "Non applicable" }]} />
            </div>
          </details>
        </div>
      </section>

      <section className="mx-auto max-w-[1800px] px-4 py-6 md:px-7 md:py-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[.6rem] uppercase tracking-[.1em] text-[var(--signal-strong)]">File opérationnelle</p>
            <h2 className="mt-1 text-2xl font-semibold">{filteredIdentities.length} identité{filteredIdentities.length > 1 ? "s" : ""} affichée{filteredIdentities.length > 1 ? "s" : ""} sur {data.metrics.identityCount}</h2>
          </div>
          <button type="button" onClick={downloadCsv} disabled={!filteredIdentities.length} className="inline-flex min-h-10 items-center gap-2 border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-xs font-semibold hover:bg-[var(--surface-soft)] disabled:opacity-50"><Download size={15} /> Exporter la sélection CSV</button>
        </div>

        <div data-testid="composer-identity-list" className="overflow-x-auto border border-[var(--line)] bg-[var(--surface)]">
          <div className={cn(rowGrid, "bg-[var(--surface-inverse)] px-3 py-3 font-mono text-[.54rem] font-semibold uppercase tracking-[.07em] text-[var(--inverse-foreground)]")}>
            <button type="button" onClick={() => setParam("sort", "name", "priority")} className="text-left hover:text-[var(--inverse-accent)]">Contributeur</button>
            <span>Noms Harvest / cible</span>
            <button type="button" onClick={() => setParam("sort", "albums", "priority")} className="text-left hover:text-[var(--inverse-accent)]">Albums</button>
            <button type="button" onClick={() => setParam("sort", "tracks", "priority")} className="text-left hover:text-[var(--inverse-accent)]">Pistes</button>
            <span>Bio FR</span><span>Bio EN</span><span>Photo</span>
            <button type="button" onClick={() => setParam("sort", "priority", "priority")} className="text-left hover:text-[var(--inverse-accent)]">État Harvest</button>
            <span>État éditorial</span><span className="sr-only">Détails</span>
          </div>
          {filteredIdentities.map((identity) => <IdentityRow key={identity.id} identity={identity} />)}
        </div>
        {!filteredIdentities.length ? <div className="border border-dashed border-[var(--line-strong)] bg-[var(--surface)] py-16 text-center"><Search size={28} className="mx-auto text-[var(--text-muted)]" /><p className="mt-3 font-semibold">Aucune identité ne correspond à ces filtres.</p></div> : null}

        <details className="group mt-5 border border-[var(--line)] bg-[var(--surface)]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold marker:content-none"><span className="inline-flex items-center gap-2"><CircleHelp size={16} className="text-[var(--signal-strong)]" /> Comprendre le rapprochement</span><ChevronDown size={15} className="transition group-open:rotate-180" /></summary>
          <div className="grid gap-4 border-t border-[var(--line)] p-4 text-xs leading-5 text-[var(--text-muted)] md:grid-cols-3">
            <p><strong className="text-[var(--foreground)]">Identité résolue.</strong> Les variantes de casse, d’accent et de société sont regroupées. Les personnes différentes d’un collectif restent sur des lignes distinctes.</p>
            <p><strong className="text-[var(--foreground)]">Deux états.</strong> Harvest juge les crédits et ayants droit. L’éditorial juge séparément les bios FR/EN et le portrait du profil public.</p>
            <p><strong className="text-[var(--foreground)]">Aucune écriture.</strong> Les cibles sont des diagnostics issus du registre contrôlé et de l’API live ; leur application reste manuelle dans Harvest.</p>
          </div>
        </details>
      </section>

      <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-2 px-4 py-5 text-xs text-[var(--text-muted)] md:flex-row md:items-center md:justify-between md:px-7">
          <p className="inline-flex items-center gap-2"><ShieldCheck size={14} /> Source musicale unique : API Harvest · label Parigo</p>
          <p className="inline-flex items-center gap-2"><ListMusic size={14} /> Les recommandations ambiguës ne reçoivent jamais de cible automatique.</p>
        </div>
      </footer>
    </main>
  );
}
