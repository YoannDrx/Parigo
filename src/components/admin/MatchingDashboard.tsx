"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Database,
  Download,
  ExternalLink,
  FileJson,
  Filter,
  GitCompareArrows,
  Layers3,
  ListChecks,
  Music2,
  Network,
  Search,
  Save,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, Select, type SelectOption } from "@/components/ui";
import {
  defaultMatchingDraft,
  provenanceOptions,
  validateMatchingDraft,
  type AgreementState,
  type MatchingDashboardData,
  type MatchingDraftExport,
  type MatchingItem,
  type MatchingComposerView,
  type MatchingReviewDraft,
  type MatchingSourceId,
  type PublicationDecision,
  type RelationDecision,
  type ReviewStatus,
  type MatchingRole,
  type MatchingWorkView,
} from "@/lib/matching/contracts";
import { cn } from "@/lib/utils";

type TabId = "albums" | "composers" | "vinyls" | "clips" | "queue" | "compare" | "harvest" | "portfolio" | "sheet" | "draft";
type QuickFilter = "all" | "conflict" | "inferred" | "composer-orphan" | "portfolio-orphan" | "work-orphan" | "clip-orphan" | "unmatched-harvest" | "sheet-needs-review";

const DRAFT_STORAGE_KEY = "parigo-matching-review-v1";
const REVIEWER_STORAGE_KEY = "parigo-matching-reviewer";

const primaryTabs: Array<{ id: TabId; label: string; description: string; icon: typeof ListChecks }> = [
  { id: "composers", label: "Compositeurs", description: "Attribuer des albums", icon: Users },
  { id: "albums", label: "Albums", description: "Attribuer des compositeurs", icon: Database },
  { id: "vinyls", label: "Vinyles", description: "Traiter les projets distincts", icon: Music2 },
  { id: "clips", label: "Clips", description: "Vérifier les crédits directs", icon: Video },
  { id: "draft", label: "Brouillon & export", description: "Contrôler et appliquer", icon: Download },
];

const diagnosticTabs: Array<{ id: TabId; label: string; icon: typeof ListChecks }> = [
  { id: "queue", label: "File technique", icon: ListChecks },
  { id: "compare", label: "Comparateur des sources", icon: GitCompareArrows },
  { id: "harvest", label: "Crédits Harvest", icon: Network },
  { id: "portfolio", label: "Portfolio", icon: FileJson },
  { id: "sheet", label: "Sheet Caroline", icon: ClipboardCheck },
];

const tabs = [...primaryTabs, ...diagnosticTabs];

const reviewStatusOptions: readonly SelectOption<ReviewStatus>[] = [
  { value: "unreviewed", label: "Non relu" },
  { value: "needs-review", label: "À vérifier" },
  { value: "in-progress", label: "En cours" },
  { value: "verified", label: "Vérifié" },
  { value: "rejected", label: "Rejeté" },
];

const relationOptions: readonly SelectOption<RelationDecision | "">[] = [
  { value: "", label: "Choisir…" },
  { value: "keep", label: "Conserver" },
  { value: "add", label: "Ajouter" },
  { value: "remove", label: "Retirer" },
  { value: "none", label: "Aucun lien" },
];

const publicationOptions: readonly SelectOption<PublicationDecision>[] = [
  { value: "unchanged", label: "Inchangé" },
  { value: "public", label: "Public" },
  { value: "internal", label: "Interne" },
  { value: "do-not-publish", label: "Ne pas publier" },
];

const roleOptions: readonly SelectOption<MatchingRole>[] = [
  { value: "composer", label: "Compositeur" },
  { value: "collective", label: "Collectif" },
  { value: "performer", label: "Interprète" },
  { value: "voice", label: "Voix" },
  { value: "remixer", label: "Remixeur" },
  { value: "other", label: "Autre / inconnu" },
];

const agreementLabels: Record<AgreementState, string> = {
  exact: "Accord exact",
  alias: "Accord par alias",
  "single-source": "Une seule source",
  inferred: "Lien indirect",
  conflict: "Conflit",
  "explicit-none": "Absence validée",
  rejected: "Rejeté",
  unresolved: "Non résolu",
};

const agreementStyles: Record<AgreementState, string> = {
  exact: "border-[#0d4f2a] bg-[#176b3a] text-white",
  alias: "border-[#173b83] bg-[#2457a7] text-white",
  "single-source": "border-[#262b27] bg-[#3e4640] text-white",
  inferred: "border-[#074f69] bg-[#087597] text-white",
  conflict: "border-[#74170f] bg-[#b42318] text-white",
  "explicit-none": "border-[#323633] bg-[#555d57] text-white",
  rejected: "border-black bg-[#34110e] text-white",
  unresolved: "border-[#6f3d00] bg-[#a45d00] text-white",
};

const sourceLabels: Record<MatchingSourceId, string> = {
  harvest: "Harvest",
  portfolio: "Portfolio",
  youtube: "YouTube",
  sheet: "Sheet",
  parigo: "Parigo",
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function itemSearchText(item: MatchingItem): string {
  return normalize([
    item.title,
    item.subtitle,
    item.composer?.name,
    ...(item.composer?.aliases ?? []),
    item.work?.code,
    item.work?.title,
    ...item.evidence.flatMap((entry) => [entry.label, entry.detail]),
    ...item.tags,
  ].filter(Boolean).join(" "));
}

function formatDate(value?: string): string {
  if (!value) return "Date indisponible";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function download(name: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | undefined): string {
  return `"${(value ?? "").replaceAll("\"", "\"\"")}"`;
}

function StatusBadge({ state }: { state: AgreementState }) {
  return (
    <span className={cn(
      "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[.68rem] font-semibold",
      agreementStyles[state],
    )}>
      {state === "conflict" && <AlertTriangle size={12} aria-hidden="true" />}
      {state === "exact" && <Check size={12} aria-hidden="true" />}
      {agreementLabels[state]}
    </span>
  );
}

function SourceEvidence({ item, source }: { item: MatchingItem; source: MatchingSourceId }) {
  const entries = item.evidence.filter((entry) => entry.source === source);
  if (!entries.length) return <span className="text-[var(--text-muted)]">—</span>;
  return (
    <div className="space-y-1.5">
      {entries.slice(0, 2).map((entry) => (
        <div key={entry.id}>
          {entry.reference ? (
            <a
              href={entry.reference}
              target={entry.reference.startsWith("http") ? "_blank" : undefined}
              rel={entry.reference.startsWith("http") ? "noreferrer" : undefined}
              className="group/link inline-flex max-w-full items-start gap-1 text-xs font-semibold leading-5 underline decoration-[var(--line-strong)] underline-offset-2 hover:text-[var(--signal-strong)]"
            >
              <span className="line-clamp-2">{entry.label}</span>
              <ExternalLink size={11} className="mt-1 shrink-0 opacity-55 group-hover/link:opacity-100" aria-hidden="true" />
            </a>
          ) : (
            <p className="line-clamp-2 text-xs font-semibold leading-5">{entry.label}</p>
          )}
          <p className="font-mono text-[.58rem] uppercase tracking-[.06em] text-[var(--text-muted)]">
            {entry.direct ? "Direct" : "Indirect"} · {entry.method}
          </p>
        </div>
      ))}
      {entries.length > 2 && (
        <span className="font-mono text-[.6rem] text-[var(--text-muted)]">+{entries.length - 2} preuves</span>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: number;
  detail: string;
  tone?: "neutral" | "danger" | "warning" | "signal" | "info";
  onClick: () => void;
}) {
  const tones = {
    neutral: "border-t-[#343b35] bg-[var(--surface)]",
    danger: "border-t-[#b42318] bg-[var(--surface)]",
    warning: "border-t-[#a45d00] bg-[var(--surface)]",
    signal: "border-t-[#176b3a] bg-[var(--surface)]",
    info: "border-t-[#087597] bg-[var(--surface)]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "parigo-card min-w-[12rem] flex-1 border border-t-4 border-[var(--line)] p-4 text-left transition hover:-translate-y-0.5 hover:border-x-[var(--line-strong)] hover:border-b-[var(--line-strong)]",
        tones[tone],
      )}
    >
      <span className="font-mono text-[.62rem] uppercase tracking-[.12em] text-[var(--text-muted)]">{label}</span>
      <span className="mt-3 block font-[var(--font-heading)] text-4xl font-semibold tracking-[-.06em]">{value}</span>
      <span className="mt-1 block text-xs text-[var(--text-muted)]">{detail}</span>
    </button>
  );
}

function EntityLink({
  href,
  sourceHref,
  children,
  className,
}: {
  href?: string;
  sourceHref?: string;
  children: ReactNode;
  className?: string;
}) {
  const primaryHref = href || sourceHref;
  if (!primaryHref) return <span className={className}>{children}</span>;
  const external = primaryHref.startsWith("http");
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {external ? (
        <a href={primaryHref} target="_blank" rel="noreferrer" className={cn("underline decoration-[var(--line-strong)] underline-offset-3 hover:text-[var(--signal-strong)]", className)}>
          {children}
        </a>
      ) : (
        <Link href={primaryHref} className={cn("underline decoration-[var(--line-strong)] underline-offset-3 hover:text-[var(--signal-strong)]", className)}>
          {children}
        </Link>
      )}
      <ExternalLink size={12} className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
      {href && sourceHref && (
        <a
          href={sourceHref}
          target="_blank"
          rel="noreferrer"
          aria-label="Voir aussi dans le Portfolio Caroline"
          title="Voir aussi dans le Portfolio Caroline"
          className="shrink-0 border-l border-[var(--line)] pl-1.5 font-mono text-[.52rem] uppercase text-[var(--text-muted)] hover:text-[var(--signal-strong)]"
        >
          Caro
        </a>
      )}
    </span>
  );
}

function ItemIdentity({ item }: { item: MatchingItem }) {
  return (
    <div className="min-w-0">
      <EntityLink
        href={item.composer?.href || (!item.composer ? item.work?.href : undefined)}
        sourceHref={item.composer?.sourceHref || (!item.composer ? item.work?.sourceHref : undefined)}
        className="font-semibold leading-5"
      >
        {item.title}
      </EntityLink>
      {item.composer && item.work ? (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">
          <EntityLink href={item.work.href} sourceHref={item.work.sourceHref}>{item.work.code ? `${item.work.code} · ` : ""}{item.work.title}</EntityLink>
        </p>
      ) : (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{item.subtitle || "Sans détail"}</p>
      )}
    </div>
  );
}

type MatchingPickerOption = {
  value: string;
  label: string;
  description?: string;
};

function MatchingMultiPicker({
  label,
  title,
  values,
  options,
  onChange,
}: {
  label: string;
  title: string;
  values: string[];
  options: MatchingPickerOption[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const pickerId = useId();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedLabels = values
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter(Boolean);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(query);
    return normalizedQuery
      ? options.filter((option) => normalize(`${option.label} ${option.description ?? ""}`).includes(normalizedQuery))
      : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const openPicker = () => {
    setPending(values);
    setQuery("");
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={pickerId}
        aria-haspopup="dialog"
        aria-label={label}
        onClick={openPicker}
        className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-left text-xs transition hover:border-[#176b3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176b3a]/30"
      >
        <span className="min-w-0">
          <span className="block font-mono text-[.54rem] font-semibold uppercase tracking-[.08em] text-[#176b3a]">{label}</span>
          <span className="mt-0.5 block truncate font-semibold">
            {selectedLabels.length
              ? `${selectedLabels.length} sélection${selectedLabels.length > 1 ? "s" : ""} · ${selectedLabels.slice(0, 2).join(", ")}${selectedLabels.length > 2 ? "…" : ""}`
              : "Aucune sélection"}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-[#30362f] px-2 py-1 font-mono text-[.58rem] text-white">
          {values.length}
        </span>
      </button>
      {open && createPortal(
        <div
          className="fixed inset-0 z-[140] flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            id={pickerId}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="flex max-h-[92dvh] w-full flex-col border border-[#30362f] bg-[var(--background)] shadow-2xl sm:max-w-2xl"
          >
            <header className="flex items-start justify-between gap-4 bg-[#30362f] px-4 py-4 text-white sm:px-5">
              <div>
                <p className="font-mono text-[.58rem] uppercase tracking-[.1em] text-white/65">Association multiple</p>
                <h3 className="mt-1 text-xl font-semibold">{title}</h3>
                <p className="mt-1 text-xs text-white/65">{pending.length} élément{pending.length > 1 ? "s" : ""} sélectionné{pending.length > 1 ? "s" : ""}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer la sélection" className="grid h-10 w-10 shrink-0 place-items-center border border-white/30 hover:bg-white/10">
                <X size={17} />
              </button>
            </header>
            <label className="relative m-3 block sm:m-4">
              <span className="sr-only">Rechercher dans les options</span>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher par nom, alias, code PGO ou titre…"
                className="min-h-12 w-full border border-[var(--line-strong)] bg-[var(--surface)] pl-10 pr-4 text-sm outline-none focus:border-[#176b3a]"
              />
            </label>
            <div className="min-h-0 flex-1 overflow-y-auto border-y border-[var(--line)]">
              {filteredOptions.length ? filteredOptions.map((option) => {
                const checked = pending.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => setPending((current) => checked
                      ? current.filter((value) => value !== option.value)
                      : [...current, option.value])}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 border-b border-[var(--line)] px-4 text-left transition last:border-b-0 hover:bg-[var(--surface-soft)]",
                      checked && "bg-[#edf5ef]",
                    )}
                  >
                    <span className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center border",
                      checked ? "border-[#176b3a] bg-[#176b3a] text-white" : "border-[var(--line-strong)] bg-[var(--surface)]",
                    )}>
                      {checked ? <Check size={14} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{option.label}</span>
                      {option.description ? <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{option.description}</span> : null}
                    </span>
                  </button>
                );
              }) : (
                <p className="px-5 py-16 text-center text-sm text-[var(--text-muted)]">Aucun résultat pour cette recherche.</p>
              )}
            </div>
            <footer className="grid grid-cols-2 gap-2 bg-[var(--surface)] p-3 sm:grid-cols-[auto_1fr_1fr] sm:p-4">
              <button type="button" onClick={() => setPending([])} className="min-h-11 border border-[var(--line-strong)] px-3 text-xs font-semibold">Tout retirer</button>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 border border-[var(--line-strong)] px-3 text-xs font-semibold">Annuler</button>
              <button
                type="button"
                onClick={() => {
                  onChange(pending);
                  setOpen(false);
                }}
                className="col-span-2 min-h-11 bg-[#176b3a] px-3 text-xs font-semibold text-white hover:bg-[#0d4f2a] sm:col-span-1"
              >
                Appliquer la sélection
              </button>
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

function RelationSources({ item }: { item: MatchingItem }) {
  const hasPortfolio = item.evidence.some((entry) => entry.source === "portfolio");
  const hasHarvest = item.evidence.some((entry) => entry.source === "harvest");
  const hasParigo = item.currentPublished || item.evidence.some((entry) => entry.source === "parigo");
  return (
    <span className="inline-flex flex-wrap gap-1">
      {hasParigo ? <span className="rounded-full bg-[#176b3a] px-2 py-0.5 font-mono text-[.52rem] font-semibold uppercase text-white">Site</span> : null}
      {hasPortfolio ? <span className="rounded-full bg-[#2457a7] px-2 py-0.5 font-mono text-[.52rem] font-semibold uppercase text-white">Caro</span> : null}
      {hasHarvest ? <span className="rounded-full bg-[#5b3f8c] px-2 py-0.5 font-mono text-[.52rem] font-semibold uppercase text-white">Harvest</span> : null}
    </span>
  );
}

function PrimaryAssignmentEditor({
  mode,
  item,
  draft,
  currentValues,
  fixedValue,
  options,
  reviewer,
  suggestedValues,
  suggestedLabel,
  onChange,
  onOpen,
}: {
  mode: "replace-work-composers" | "replace-composer-works";
  item: MatchingItem;
  draft?: MatchingReviewDraft;
  currentValues: string[];
  fixedValue: string;
  options: MatchingPickerOption[];
  reviewer: string;
  suggestedValues?: string[];
  suggestedLabel?: string;
  onChange: (patch: Partial<MatchingReviewDraft>) => void;
  onOpen: () => void;
}) {
  const selectedValues = mode === "replace-work-composers"
    ? draft?.selectedComposerSlugs ?? currentValues
    : draft?.selectedWorkKeys ?? currentValues;
  const pickerLabel = mode === "replace-work-composers" ? "Compositeurs attendus" : "Albums attendus";
  const pickerTitle = mode === "replace-work-composers"
    ? `Compositeurs à associer à ${item.work?.title ?? item.title}`
    : `Albums à associer à ${item.composer?.name ?? item.title}`;

  const buildPatch = (values: string[]): Partial<MatchingReviewDraft> => ({
    assignmentMode: mode,
    selectedComposerSlugs: mode === "replace-work-composers" ? values : [fixedValue],
    selectedWorkKeys: mode === "replace-composer-works" ? values : [fixedValue],
    removedComposerSlugs: mode === "replace-work-composers"
      ? currentValues.filter((value) => !values.includes(value))
      : [],
    removedWorkKeys: mode === "replace-composer-works"
      ? currentValues.filter((value) => !values.includes(value))
      : [],
    relationDecision: values.length ? "add" : "none",
    reviewStatus: "in-progress",
    provenanceIds: ["parigo-manual"],
    reviewer: reviewer || draft?.reviewer,
  });

  return (
    <div className="min-w-[20rem] space-y-2">
      {suggestedValues?.length ? (
        <button
          type="button"
          onClick={() => onChange(buildPatch(suggestedValues))}
          className="flex min-h-9 w-full items-center justify-between gap-3 border border-[#2457a7] bg-[#edf3ff] px-3 text-left text-[.65rem] font-semibold text-[#173b83] hover:bg-[#2457a7] hover:text-white"
        >
          <span>{suggestedLabel ?? "Reprendre la proposition source"}</span>
          <span className="rounded-full bg-current/10 px-2 py-0.5 font-mono">{suggestedValues.length}</span>
        </button>
      ) : null}
      <MatchingMultiPicker
        label={pickerLabel}
        title={pickerTitle}
        values={selectedValues}
        options={options}
        onChange={(values) => onChange(buildPatch(values))}
      />
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <input
          aria-label={`Note de matching pour ${item.title}`}
          value={draft?.note ?? ""}
          onChange={(event) => onChange({ note: event.target.value, reviewer: reviewer || draft?.reviewer })}
          placeholder="Note facultative…"
          className="min-h-10 min-w-0 border border-[var(--line)] bg-[var(--surface)] px-3 text-xs outline-none focus:border-[#176b3a]"
        />
        <button
          type="button"
          disabled={!reviewer.trim()}
          title={reviewer.trim() ? "Valider cette association" : "Renseignez d’abord le relecteur actif"}
          onClick={() => onChange({
            ...buildPatch(selectedValues),
            reviewStatus: "verified",
            reviewer,
            reviewedAt: new Date().toISOString(),
          })}
          className="min-h-10 bg-[#176b3a] px-3 text-xs font-semibold text-white transition hover:bg-[#0d4f2a] disabled:cursor-not-allowed disabled:bg-[#aeb5af]"
        >
          Valider
        </button>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Voir les preuves pour ${item.title}`}
          title="Voir les preuves et le détail"
          className="grid min-h-10 min-w-10 place-items-center border border-[var(--line-strong)] bg-[var(--surface)] hover:border-[#30362f]"
        >
          <Layers3 size={15} />
        </button>
      </div>
      <p className="font-mono text-[.54rem] uppercase tracking-[.06em] text-[var(--text-muted)]">
        {draft?.reviewStatus === "verified" ? "✓ Vérifié" : draft ? "Brouillon autosauvegardé" : "Aucune modification locale"}
      </p>
    </div>
  );
}

function QuickReviewEditor({
  item,
  draft,
  composers,
  works,
  onChange,
  onOpen,
}: {
  item: MatchingItem;
  draft?: MatchingReviewDraft;
  composers: MatchingComposerView[];
  works: MatchingWorkView[];
  onChange: (patch: Partial<MatchingReviewDraft>) => void;
  onOpen: () => void;
}) {
  const composerValues = draft?.selectedComposerSlugs
    ?? (draft?.selectedComposerSlug ? [draft.selectedComposerSlug] : item.composer?.slug ? [item.composer.slug] : []);
  const workValues = draft?.selectedWorkKeys
    ?? (draft?.selectedWorkKey ? [draft.selectedWorkKey] : item.work?.key ? [item.work.key] : []);
  const composerValue = composerValues[0] ?? "";
  const workValue = workValues[0] ?? "";
  const selectedComposer = composers.find((composer) => composer.slug === composerValue);
  const selectedWork = works.find((work) => work.key === workValue);
  const defaultProvenance = item.evidence.find((entry) => entry.direct)?.provenanceId
    ?? item.evidence[0]?.provenanceId
    ?? "parigo-manual";
  const quickPatch = (patch: Partial<MatchingReviewDraft>) => onChange({
    relationDecision: draft?.relationDecision ?? (item.relationExists ? "keep" : "add"),
    reviewStatus: draft?.reviewStatus === "verified" ? "verified" : "in-progress",
    provenanceIds: draft?.provenanceIds.length ? draft.provenanceIds : [defaultProvenance],
    ...patch,
  });

  return (
    <div className="grid min-w-[19rem] gap-2" data-testid={`quick-editor-${item.id}`}>
      <div className="flex min-h-7 items-center justify-between gap-3 border-l-4 border-[#176b3a] bg-[#edf5ef] px-2.5 py-1 text-[.64rem] text-[#153d24]">
        <span className="font-mono font-semibold uppercase tracking-[.07em]">Résultat Parigo</span>
        <span className="min-w-0 truncate text-right font-semibold">
          {selectedComposer?.name ?? "Compositeur à choisir"} → {selectedWork ? `${selectedWork.code ? `${selectedWork.code} · ` : ""}${selectedWork.title}` : "projet à choisir"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MatchingMultiPicker
          values={composerValues}
          onChange={(selectedComposerSlugs) => quickPatch({ selectedComposerSlugs })}
          label="Compositeurs"
          title={`Compositeurs associés à ${item.work?.title ?? item.title}`}
          options={composers.map((composer) => ({
            value: composer.slug,
            label: composer.name,
            description: composer.aliases.slice(0, 2).join(" · ") || (composer.visibility === "public" ? "Profil Parigo public" : "Profil interne"),
          }))}
        />
        <MatchingMultiPicker
          values={workValues}
          onChange={(selectedWorkKeys) => quickPatch({ selectedWorkKeys })}
          label="Albums / projets"
          title={`Albums, vinyles et clips associés à ${item.composer?.name ?? item.title}`}
          options={works.filter((work) => work.type === "album" || work.type === "vinyl" || work.type === "clip").map((work) => ({
            value: work.key,
            label: `${work.code ? `${work.code} · ` : ""}${work.title}`,
            description: work.type,
          }))}
        />
      </div>
      <div className="grid grid-cols-[8.5rem_7.5rem_1fr_auto] gap-2">
        <Select
          value={draft?.reviewStatus ?? item.initialReviewStatus}
          onValueChange={(reviewStatus) => quickPatch({ reviewStatus })}
          ariaLabel={`Statut de relecture de ${item.title}`}
          options={reviewStatusOptions}
        />
        <input
          aria-label={`Relecteur de ${item.title}`}
          value={draft?.reviewer ?? ""}
          onChange={(event) => quickPatch({ reviewer: event.target.value })}
          placeholder="Relecteur…"
          className="min-h-10 min-w-0 border border-[var(--line)] bg-[var(--surface)] px-3 text-xs outline-none focus:border-[var(--signal-strong)]"
        />
        <input
          aria-label={`Note rapide pour ${item.title}`}
          value={draft?.note ?? ""}
          onChange={(event) => quickPatch({ note: event.target.value })}
          placeholder="Note rapide…"
          className="min-h-10 min-w-0 border border-[var(--line)] bg-[var(--surface)] px-3 text-xs outline-none focus:border-[var(--signal-strong)]"
        />
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Ouvrir la fiche complète ${item.title}`}
          className="grid min-h-10 min-w-10 place-items-center border border-[var(--line-strong)] bg-[var(--surface-inverse)] text-white transition hover:bg-[var(--signal-strong)]"
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {item.composer?.slug && item.work && (
          <button
            type="button"
            onClick={() => quickPatch({
              selectedComposerSlug: item.composer?.slug,
              selectedWorkKey: item.work?.key,
              selectedComposerSlugs: item.composer?.slug ? [item.composer.slug] : [],
              selectedWorkKeys: item.work?.key ? [item.work.key] : [],
              relationDecision: "keep",
            })}
            className="min-h-8 border border-[#0d4f2a] px-2.5 text-[.62rem] font-semibold text-[#0d4f2a] transition hover:bg-[#176b3a] hover:text-white"
          >
            Conserver la relation actuelle
          </button>
        )}
        <button
          type="button"
          onClick={() => quickPatch({ relationDecision: "none" })}
          className="min-h-8 border border-[#555d57] px-2.5 text-[.62rem] font-semibold text-[#3e4640] transition hover:bg-[#555d57] hover:text-white"
        >
          Valider l’absence de lien
        </button>
        <button
          type="button"
          onClick={() => quickPatch({ reviewStatus: "needs-review" })}
          className="min-h-8 border border-[#a45d00] px-2.5 text-[.62rem] font-semibold text-[#7a4300] transition hover:bg-[#a45d00] hover:text-white"
        >
          Laisser à vérifier
        </button>
      </div>
    </div>
  );
}

export function MatchingDashboard({ data }: { data: MatchingDashboardData }) {
  const [tab, setTab] = useState<TabId>("composers");
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<MatchingSourceId | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, MatchingReviewDraft>>({});
  const [storageReady, setStorageReady] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [storageError, setStorageError] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const requestedTab = params.get("vue") as TabId | null;
      if (requestedTab && tabs.some((item) => item.id === requestedTab)) setTab(requestedTab);
      setQuery(params.get("q") ?? "");
      try {
        setReviewerName(window.localStorage.getItem(REVIEWER_STORAGE_KEY) ?? "");
        const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as MatchingDraftExport;
          setDrafts(Object.fromEntries(parsed.drafts.map((draft) => [draft.itemId, draft])));
          setLastSavedAt(parsed.exportedAt);
        }
      } catch {
        setImportMessage("Le brouillon local existant est illisible. Il n’a pas été écrasé.");
      } finally {
        setStorageReady(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const payload: MatchingDraftExport = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      baseRegistryRevision: data.registryRevision,
      drafts: Object.values(drafts),
    };
    let frame = 0;
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
      frame = window.requestAnimationFrame(() => {
        setLastSavedAt(payload.exportedAt);
        setStorageError("");
      });
    } catch {
      frame = window.requestAnimationFrame(() => {
        setStorageError("Sauvegarde locale indisponible : exportez le brouillon avant de quitter cette page.");
      });
    }
    return () => window.cancelAnimationFrame(frame);
  }, [data.registryRevision, drafts, storageReady]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (tab === "composers") params.delete("vue");
    else params.set("vue", tab);
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    const next = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`;
    window.history.replaceState(null, "", next);
  }, [query, tab]);

  const selected = selectedId ? data.items.find((item) => item.id === selectedId) : undefined;
  const selectedDraft = selected
    ? drafts[selected.id] ?? defaultMatchingDraft(selected, data.registryRevision)
    : undefined;

  const effectiveStatus = useCallback((item: MatchingItem) => (
    drafts[item.id]?.reviewStatus ?? item.initialReviewStatus
  ), [drafts]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalize(deferredQuery);
    return data.items.filter((item) => {
      if (tab === "queue" && effectiveStatus(item) === "verified") return false;
      if (normalizedQuery && !itemSearchText(item).includes(normalizedQuery)) return false;
      if (sourceFilter !== "all" && !item.evidence.some((entry) => entry.source === sourceFilter)) return false;
      if (statusFilter !== "all" && effectiveStatus(item) !== statusFilter) return false;
      if (quickFilter === "conflict" && item.agreement !== "conflict") return false;
      if (quickFilter === "inferred" && item.agreement !== "inferred") return false;
      if (quickFilter === "composer-orphan" && !item.tags.includes("composer-orphan")) return false;
      if (quickFilter === "portfolio-orphan" && !item.tags.includes("portfolio-composer-orphan")) return false;
      if (quickFilter === "work-orphan" && !item.tags.includes("work-orphan")) return false;
      if (quickFilter === "clip-orphan" && !item.tags.includes("clip-without-composer")) return false;
      if (quickFilter === "unmatched-harvest" && !item.tags.includes("unmatched-harvest")) return false;
      if (quickFilter === "sheet-needs-review" && !item.tags.includes("sheet-needs-review")) return false;
      return true;
    });
  }, [data.items, deferredQuery, effectiveStatus, quickFilter, sourceFilter, statusFilter, tab]);

  const composerByName = useMemo(
    () => new Map(data.composers.map((composer) => [normalize(composer.name), composer])),
    [data.composers],
  );
  const workByCode = useMemo(
    () => new Map(data.works.flatMap((work) => work.code ? [[work.code, work] as const] : [])),
    [data.works],
  );
  const relationsByWork = useMemo(() => {
    const map = new Map<string, MatchingItem[]>();
    for (const item of data.items) {
      if (!item.composer?.slug || !item.work || item.tags.includes("indirect-project")) continue;
      const relations = map.get(item.work.key) ?? [];
      relations.push(item);
      map.set(item.work.key, relations);
    }
    return map;
  }, [data.items]);
  const composerPickerOptions = useMemo<MatchingPickerOption[]>(() => data.composers.map((composer) => ({
    value: composer.slug,
    label: composer.name,
    description: composer.aliases.slice(0, 2).join(" · ") || (composer.published ? "Profil Parigo public" : "Identité interne"),
  })), [data.composers]);
  const albumPickerOptions = useMemo<MatchingPickerOption[]>(() => data.works
    .filter((work) => work.type === "album")
    .map((work) => ({
      value: work.key,
      label: `${work.code ? `${work.code} · ` : ""}${work.title}`,
      description: work.sources.map((source) => sourceLabels[source]).join(" · "),
    })), [data.works]);
  const albumRelationsByComposer = useMemo(() => {
    const map = new Map<string, MatchingItem[]>();
    for (const item of data.items) {
      if (!item.composer?.slug || item.work?.type !== "album" || item.tags.includes("indirect-project")) continue;
      const relations = map.get(item.composer.slug) ?? [];
      relations.push(item);
      map.set(item.composer.slug, relations);
    }
    return map;
  }, [data.items]);
  const reviewItemForComposer = useCallback((slug: string) => (
    data.items.find((item) => item.id === `orphan:composer:${slug}`)
    ?? data.items.find((item) => item.composer?.slug === slug)
  ), [data.items]);
  const reviewItemForWork = useCallback((key: string) => (
    data.items.find((item) => item.id === `orphan:work:${key}` || item.id === `orphan:clip:${key}`)
    ?? data.items.find((item) => item.work?.key === key)
  ), [data.items]);

  const updateDraft = useCallback((item: MatchingItem, patch: Partial<MatchingReviewDraft>) => {
    setDrafts((current) => {
      const base = current[item.id] ?? defaultMatchingDraft(item, data.registryRevision);
      return { ...current, [item.id]: { ...base, ...patch } };
    });
    setFormErrors([]);
  }, [data.registryRevision]);

  const moveToNext = useCallback(() => {
    if (!selected) return;
    const index = filteredItems.findIndex((item) => item.id === selected.id);
    const next = filteredItems[index + 1] ?? filteredItems[0];
    setSelectedId(next?.id ?? null);
  }, [filteredItems, selected]);

  const markVerified = useCallback(() => {
    if (!selected || !selectedDraft) return;
    const candidate: MatchingReviewDraft = {
      ...selectedDraft,
      reviewStatus: "verified",
      reviewedAt: new Date().toISOString(),
    };
    const errors = validateMatchingDraft(candidate);
    if (errors.length) {
      setFormErrors(errors);
      return;
    }
    setDrafts((current) => ({ ...current, [selected.id]: candidate }));
    setFormErrors([]);
    moveToNext();
  }, [moveToNext, selected, selectedDraft]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [role='combobox']")) return;
      if (event.key.toLowerCase() === "n" && selected) moveToNext();
      if (event.key.toLowerCase() === "v" && selected) markVerified();
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [markVerified, moveToNext, selected]);

  const setMetricFilter = (filter: QuickFilter) => {
    setTab("queue");
    setQuickFilter(filter);
    setStatusFilter("all");
  };

  const exportJson = () => {
    const payload: MatchingDraftExport = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      baseRegistryRevision: data.registryRevision,
      drafts: Object.values(drafts),
    };
    download(
      `parigo-matching-${new Date().toISOString().slice(0, 10)}.json`,
      `${JSON.stringify(payload, null, 2)}\n`,
      "application/json",
    );
  };

  const exportCsv = () => {
    const header = [
      "itemId", "entityType", "statut", "decision", "publication", "role",
      "compositeursAttribues", "projetsAttribues", "compositeursRetires", "projetsRetires",
      "provenances", "relecteur", "date", "note", "preuves",
    ];
    const rows = Object.values(drafts).map((draft) => [
      draft.itemId,
      draft.entityType,
      draft.reviewStatus,
      draft.relationDecision ?? "",
      draft.publicationDecision ?? "",
      draft.role ?? "",
      (draft.selectedComposerSlugs ?? (draft.selectedComposerSlug ? [draft.selectedComposerSlug] : [])).join(" | "),
      (draft.selectedWorkKeys ?? (draft.selectedWorkKey ? [draft.selectedWorkKey] : [])).join(" | "),
      (draft.removedComposerSlugs ?? []).join(" | "),
      (draft.removedWorkKeys ?? []).join(" | "),
      draft.provenanceIds.join(" | "),
      draft.reviewer ?? "",
      draft.reviewedAt ?? "",
      draft.note,
      draft.evidenceLinks.join(" | "),
    ]);
    download(
      `parigo-matching-${new Date().toISOString().slice(0, 10)}.csv`,
      [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"),
      "text/csv;charset=utf-8",
    );
  };

  const importDraft = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as MatchingDraftExport;
      if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.drafts)) throw new Error("Format non reconnu");
      const knownIds = new Set(data.items.map((item) => item.id));
      const imported = parsed.drafts.filter((draft) => knownIds.has(draft.itemId));
      setDrafts((current) => ({
        ...current,
        ...Object.fromEntries(imported.map((draft) => [draft.itemId, draft])),
      }));
      const revisionWarning = parsed.baseRegistryRevision !== data.registryRevision
        ? " Révision différente : chaque décision importée est signalée dans le panneau."
        : "";
      setImportMessage(`${imported.length} décision(s) importée(s).${revisionWarning}`);
    } catch {
      setImportMessage("Import refusé : ce fichier n’est pas un export de matching Parigo valide.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const draftCount = Object.keys(drafts).length;
  const invalidDraftCount = Object.values(drafts).filter((draft) => validateMatchingDraft(draft).length > 0).length;

  return (
    <main data-testid="matching-dashboard" className="matching-admin-shell min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="border-b border-[var(--line)] bg-[var(--surface-inverse)] text-[var(--inverse-foreground)]">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-4 px-4 py-4 md:px-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--inverse-accent)] text-[var(--inverse-foreground)]">
              <CircleHelp size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold">Outil interne accessible par URL, sans authentification</p>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--inverse-muted)]">
                Les données sont en lecture seule. Vos décisions et notes restent dans ce navigateur jusqu’à leur export ;
                le nom du relecteur est déclaratif.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[.65rem] uppercase tracking-[.08em] text-[var(--inverse-muted)]">
            <span className="border border-white/15 px-2.5 py-1.5">Révision {data.registryRevision}</span>
            <span className="border border-white/15 px-2.5 py-1.5">Actualisé {formatDate(data.capturedAt)}</span>
          </div>
        </div>
      </div>

      <header className="mx-auto max-w-[1700px] px-4 pb-6 pt-7 md:px-7 md:pt-9">
        <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-mono text-[.68rem] font-medium uppercase tracking-[.18em] text-[var(--signal-strong)]">
              Administration éditoriale · Parigo
            </p>
            <h1 className="mt-3 max-w-5xl text-4xl font-semibold leading-[.98] tracking-[-.055em] md:text-5xl">
              Contrôle des relations
              <span className="block text-[var(--text-muted)]">compositeurs, albums & clips.</span>
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-[var(--text-muted)] md:text-base">
              Chaque preuve conserve sa source. Les calculs du BFF, les liens indirects et les décisions Parigo
              restent lisibles séparément.
            </p>
          </div>
          <div className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] xl:w-[27rem]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[.62rem] uppercase tracking-[.12em] text-[var(--text-muted)]">Brouillon local</p>
                <p className="mt-1 text-lg font-semibold">{draftCount} décision{draftCount > 1 ? "s" : ""}</p>
              </div>
              <span className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                invalidDraftCount
                  ? "border-[#6f3d00] bg-[#a45d00] text-white"
                  : "border-[#0d4f2a] bg-[#176b3a] text-white",
              )}>
                {invalidDraftCount ? `${invalidDraftCount} à compléter` : "Exportable"}
              </span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
              <div
                className="h-full bg-[var(--signal-strong)] transition-[width]"
                style={{ width: `${data.metrics.totalItems ? (data.metrics.verified / data.metrics.totalItems) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {data.metrics.verified} éléments déjà validés sur {data.metrics.totalItems}.
            </p>
            <div className={cn(
              "mt-3 flex items-center gap-2 border-t pt-3 text-xs",
              storageError ? "border-[#b42318] text-[#b42318]" : "border-[var(--line)] text-[var(--text-muted)]",
            )}>
              {storageError ? <AlertTriangle size={14} /> : <Save size={14} className="text-[var(--signal-strong)]" />}
              <span>{storageError || (lastSavedAt ? `Sauvegardé dans ce navigateur à ${new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(lastSavedAt))}` : "Brouillon local prêt")}</span>
            </div>
          </div>
        </div>
      </header>

      <section aria-label="État des sources" className="mx-auto max-w-[1700px] px-4 md:px-7">
        <details className="border border-[var(--line)] bg-[var(--surface)]">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 text-sm font-semibold">
            <span>Sources et diagnostics secondaires</span>
            <span className="font-mono text-[.58rem] uppercase tracking-[.08em] text-[var(--text-muted)]">
              Harvest · Portfolio · YouTube · Sheet · Parigo
            </span>
          </summary>
        <div className="grid gap-3 border-t border-[var(--line)] p-3 sm:grid-cols-2 xl:grid-cols-5">
          {data.sources.map((source) => (
            <div key={source.id} className="parigo-card border border-t-4 border-[var(--line)] border-t-[#343b35] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{source.label}</p>
                <span className={cn(
                  "rounded-full px-2 py-1 font-mono text-[.55rem] font-semibold uppercase tracking-[.08em]",
                  source.state === "ok" && "bg-[#176b3a] text-white",
                  source.state === "partial" && "bg-[#a45d00] text-white",
                  source.state === "stale" && "bg-[#2457a7] text-white",
                  source.state === "unavailable" && "bg-[#b42318] text-white",
                )}>
                  {source.state === "ok" ? "Disponible" : source.state === "partial" ? "Partiel" : source.state === "stale" ? "Snapshot" : "Indisponible"}
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-[-.05em]">{source.count}</p>
              <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-4 text-[var(--text-muted)]">{source.detail}</p>
              {source.revision && (
                <p className="mt-2 truncate font-mono text-[.55rem] text-[var(--text-muted)]" title={source.revision}>
                  {source.revision}
                </p>
              )}
            </div>
          ))}
        </div>
        </details>
      </section>

      <section aria-label="Indicateurs de contrôle" className="mx-auto mt-5 max-w-[1700px] px-4 md:px-7">
        <div className="flex gap-3 overflow-x-auto pb-2">
          <MetricCard label="À traiter" value={data.metrics.totalToReview} detail={`sur ${data.metrics.totalItems}`} tone="warning" onClick={() => setMetricFilter("all")} />
          <MetricCard label="Conflits" value={data.metrics.conflicts} detail="sources contradictoires" tone="danger" onClick={() => setMetricFilter("conflict")} />
          <MetricCard label="Albums à compléter" value={data.metrics.albumOrphans} detail="sans compositeur" onClick={() => setMetricFilter("work-orphan")} />
          <MetricCard label="Compositeurs isolés" value={data.metrics.composerOrphans} detail="sans album ni clip" onClick={() => setMetricFilter("composer-orphan")} />
          <MetricCard label="Clips incomplets" value={data.metrics.clipsWithoutDirectComposer} detail="sans compositeur direct" tone="warning" onClick={() => setMetricFilter("clip-orphan")} />
        </div>
      </section>

      <div className="sticky top-0 z-40 mt-7 border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_90%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1700px] items-center gap-2 overflow-x-auto px-4 py-2 md:px-7">
        <nav aria-label="Vues principales du dashboard" className="flex gap-1">
          {primaryTabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => {
                  setTab(item.id);
                  setQuickFilter("all");
                }}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-2 px-3 text-xs font-semibold transition",
                  tab === item.id
                    ? "bg-[var(--surface-inverse)] text-[var(--inverse-foreground)] shadow-[inset_0_-3px_0_var(--signal)]"
                    : "hover:bg-[var(--surface)] hover:shadow-[inset_0_-3px_0_var(--line-strong)]",
                )}
              >
                <Icon size={15} aria-hidden="true" />
                {item.label}
                {item.id === "queue" && (
                  <span className="rounded-full bg-[var(--signal)] px-1.5 py-0.5 text-[.6rem] text-white">{data.metrics.totalToReview}</span>
                )}
                {item.id === "draft" && draftCount > 0 && (
                  <span className="rounded-full bg-[var(--signal)] px-1.5 py-0.5 text-[.6rem] text-white">{draftCount}</span>
                )}
              </button>
            );
          })}
        </nav>
        <details className="group relative shrink-0">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 border-l border-[var(--line)] px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)]">
            <Layers3 size={15} /> Sources & diagnostic
          </summary>
          <div className="fixed left-4 right-4 top-[4.1rem] z-[80] grid gap-1 border border-[#30362f] bg-[var(--surface)] p-2 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+.5rem)] sm:w-72">
            {diagnosticTabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(event) => {
                    setTab(item.id);
                    setQuickFilter("all");
                    event.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                  className={cn(
                    "flex min-h-11 items-center gap-3 px-3 text-left text-xs font-semibold",
                    tab === item.id ? "bg-[#30362f] text-white" : "hover:bg-[var(--surface-soft)]",
                  )}
                >
                  <Icon size={15} /> {item.label}
                </button>
              );
            })}
          </div>
        </details>
        </div>
      </div>

      <section className="mx-auto max-w-[1700px] px-4 py-6 md:px-7 md:py-8">
        {(tab === "albums" || tab === "composers" || tab === "vinyls") && (
          <div className="mb-5 flex flex-col gap-3 border border-[#30362f] bg-[var(--surface)] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[.58rem] font-semibold uppercase tracking-[.1em] text-[#176b3a]">Parcours principal</p>
              <p className="mt-1 text-sm font-semibold">
                {tab === "composers" ? "Choisissez les albums de chaque compositeur." : `Choisissez les compositeurs de chaque ${tab === "vinyls" ? "vinyle" : "album"}.`}
              </p>
            </div>
            <label className="flex min-w-0 items-center gap-2 sm:w-[22rem]">
              <span className="shrink-0 font-mono text-[.56rem] font-semibold uppercase tracking-[.08em] text-[var(--text-muted)]">Relecteur actif</span>
              <input
                value={reviewerName}
                onChange={(event) => {
                  const value = event.target.value;
                  setReviewerName(value);
                  try {
                    window.localStorage.setItem(REVIEWER_STORAGE_KEY, value);
                  } catch {
                    setStorageError("Sauvegarde locale indisponible : exportez le brouillon avant de quitter cette page.");
                  }
                }}
                placeholder="Ex. Caroline…"
                className="min-h-10 min-w-0 flex-1 border border-[var(--line-strong)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[#176b3a]"
              />
            </label>
          </div>
        )}
        {(tab === "queue" || tab === "compare") && (
          <>
            <div className="border border-[#30362f] bg-[var(--surface)] shadow-[4px_4px_0_#30362f]">
              <div className="border-b border-[#30362f] bg-[#30362f] px-4 py-2 font-mono text-[.6rem] uppercase tracking-[.12em] text-white">
                Recherche et filtres de contrôle
              </div>
              <div className="p-3 md:p-4">
              <div className="grid gap-3 xl:grid-cols-[minmax(20rem,1fr)_13rem_13rem_auto]">
                <label className="relative block">
                  <span className="sr-only">Rechercher dans le matching</span>
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nom, alias, crédit Harvest, titre, code PGO…"
                    className="min-h-11 w-full border border-[var(--line)] bg-[var(--background)] py-2 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--signal-strong)]"
                  />
                </label>
                <Select
                  value={sourceFilter}
                  onValueChange={setSourceFilter}
                  ariaLabel="Filtrer par source"
                  caption="Source"
                  options={[
                    { value: "all", label: "Toutes" },
                    ...Object.entries(sourceLabels).map(([value, label]) => ({ value: value as MatchingSourceId, label })),
                  ]}
                />
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  ariaLabel="Filtrer par statut"
                  caption="Statut"
                  options={[{ value: "all", label: "Tous" }, ...reviewStatusOptions]}
                />
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQuery("");
                    setQuickFilter("all");
                    setSourceFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  <X size={15} /> Réinitialiser
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Filter size={14} className="text-[var(--text-muted)]" aria-hidden="true" />
                {([
                  ["all", "Tout"],
                  ["conflict", "Conflits"],
                  ["inferred", "Indirects"],
                  ["composer-orphan", "Sans relation"],
                  ["portfolio-orphan", "Sans lien Portfolio"],
                  ["work-orphan", "Albums vides"],
                  ["clip-orphan", "Clips incomplets"],
                  ["unmatched-harvest", "Crédits non résolus"],
                  ["sheet-needs-review", "Sheet à vérifier"],
                ] as Array<[QuickFilter, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={quickFilter === value}
                    onClick={() => setQuickFilter(value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[.68rem] font-semibold transition",
                      quickFilter === value
                        ? "border-[#0d4f2a] bg-[#176b3a] text-white"
                        : "border-[var(--line-strong)] bg-[var(--background)] hover:border-[#30362f] hover:bg-[#30362f] hover:text-white",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-[var(--text-muted)]" role="status" aria-live="polite">
                <strong className="text-[var(--foreground)]">{filteredItems.length}</strong> résultat{filteredItems.length > 1 ? "s" : ""} affiché{filteredItems.length > 1 ? "s" : ""}
              </p>
              {quickFilter !== "all" && (
                <span className="font-mono text-[.62rem] uppercase tracking-[.08em] text-[var(--signal-strong)]">
                  Filtre actif · {quickFilter}
                </span>
              )}
            </div>

            <div data-testid="matching-comparison-table" className="mt-3 hidden max-h-[calc(100dvh-5rem)] overflow-auto border border-[#30362f] bg-[var(--surface)] xl:block">
              <table className="w-full min-w-[1660px] border-collapse text-left">
                <thead className="sticky top-0 z-30 bg-[#30362f] shadow-[0_2px_0_#30362f]">
                  <tr className="font-mono text-[.6rem] uppercase tracking-[.09em] text-white">
                    <th className="w-[17%] border-b border-r border-white/20 px-4 py-3">Relation / élément</th>
                    <th className="w-[10%] border-b border-r border-white/20 px-3 py-3">Harvest</th>
                    <th className="w-[10%] border-b border-r border-white/20 px-3 py-3">Portfolio</th>
                    <th className="w-[10%] border-b border-r border-white/20 px-3 py-3">Google Sheet</th>
                    <th className="w-[10%] border-b border-r border-white/20 px-3 py-3">Parigo / BFF</th>
                    <th className="w-[10%] border-b border-r border-white/20 px-3 py-3">État</th>
                    <th className="w-[33%] border-b border-white/20 px-3 py-3">Correction rapide · autosauvegardée</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="group align-top transition hover:bg-[var(--surface-soft)]/55">
                      <td className="border-b border-r border-[var(--line)] p-4">
                        <div className="flex items-start gap-3">
                          <span className={cn(
                            "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                            item.agreement === "conflict" ? "bg-[var(--danger)]"
                              : item.agreement === "exact" ? "bg-[var(--signal-strong)]"
                                : item.agreement === "inferred" ? "bg-blue-500"
                                  : "bg-amber-500",
                          )} />
                          <div className="min-w-0">
                            <ItemIdentity item={item} />
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="rounded-full border border-[var(--line)] px-2 py-0.5 font-mono text-[.55rem] uppercase">{item.entityType}</span>
                              {item.currentPublished && <span className="rounded-full bg-[#176b3a] px-2 py-0.5 font-mono text-[.55rem] uppercase text-white">Actuellement public</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-r border-[var(--line)] p-3"><SourceEvidence item={item} source="harvest" /></td>
                      <td className="border-b border-r border-[var(--line)] p-3"><SourceEvidence item={item} source="portfolio" /></td>
                      <td className="border-b border-r border-[var(--line)] p-3"><SourceEvidence item={item} source="sheet" /></td>
                      <td className="border-b border-r border-[var(--line)] p-3"><SourceEvidence item={item} source="parigo" /></td>
                      <td className="border-b border-r border-[var(--line)] p-3">
                        <StatusBadge state={item.agreement} />
                        <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
                          {reviewStatusOptions.find((option) => option.value === effectiveStatus(item))?.label}
                        </p>
                      </td>
                      <td className="border-b border-[var(--line)] p-3">
                        <QuickReviewEditor
                          item={item}
                          draft={drafts[item.id]}
                          composers={data.composers}
                          works={data.works}
                          onChange={(patch) => updateDraft(item, patch)}
                          onOpen={() => setSelectedId(item.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 grid gap-3 xl:hidden">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="matching-long-item parigo-card border border-[var(--line-strong)] bg-[var(--surface)] p-4 text-left shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <ItemIdentity item={item} />
                    <button type="button" onClick={() => setSelectedId(item.id)} aria-label={`Ouvrir la fiche ${item.title}`} className="grid h-9 w-9 shrink-0 place-items-center bg-[#30362f] text-white">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <StatusBadge state={item.agreement} />
                    <span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[.65rem] font-medium">
                      {item.evidence.length} preuve{item.evidence.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-4 border-t border-[var(--line)] pt-4">
                    <QuickReviewEditor
                      item={item}
                      draft={drafts[item.id]}
                      composers={data.composers}
                      works={data.works}
                      onChange={(patch) => updateDraft(item, patch)}
                      onOpen={() => setSelectedId(item.id)}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {(tab === "albums" || tab === "vinyls") && (
          <InventorySection
            title={tab === "albums" ? "Albums → compositeurs" : "Vinyles → compositeurs"}
            description={tab === "albums"
              ? "Une ligne par album Harvest. Sélectionnez l’ensemble attendu des compositeurs ; plusieurs choix sont possibles."
              : "Les vinyles sont séparés des albums de librairie pour éviter de mélanger deux natures de projets."}
            query={query}
            setQuery={setQuery}
          >
            <div data-testid={`matching-${tab}-table`} className="max-h-[calc(100dvh-12rem)] overflow-auto border border-[#30362f] bg-[var(--surface)]">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-30 bg-[#30362f] font-mono text-[.6rem] uppercase tracking-[.09em] text-white shadow-[0_2px_0_#30362f]">
                  <tr>
                    <th className="w-[22%] border-r border-white/15 p-3">{tab === "albums" ? "Album" : "Vinyle"}</th>
                    <th className="w-[35%] border-r border-white/15 p-3">Relations repérées · Site / Caro / Harvest</th>
                    <th className="w-[11%] border-r border-white/15 p-3">État</th>
                    <th className="w-[32%] p-3">Compositeurs attendus</th>
                  </tr>
                </thead>
                <tbody>
                  {data.works.filter((work) => {
                    if (work.type !== (tab === "albums" ? "album" : "vinyl")) return false;
                    return normalize([work.title, work.code, work.slug, ...work.composerNames].filter(Boolean).join(" ")).includes(normalize(deferredQuery));
                  }).map((work) => {
                    const relations = relationsByWork.get(work.key) ?? [];
                    const portfolioRelations = relations.filter((item) => item.evidence.some((entry) => entry.source === "portfolio"));
                    const parigoRelations = relations.filter((item) => item.currentPublished || item.evidence.some((entry) => entry.source === "parigo"));
                    const currentValues = [...new Set(parigoRelations.flatMap((item) => item.composer?.slug ? [item.composer.slug] : []))];
                    const portfolioValues = [...new Set(portfolioRelations.flatMap((item) => item.composer?.slug ? [item.composer.slug] : []))];
                    const hasPortfolioDelta = portfolioValues.length !== currentValues.length
                      || portfolioValues.some((value) => !currentValues.includes(value));
                    const reviewItem = reviewItemForWork(work.key);
                    return (
                      <tr key={work.key} className="border-t border-[var(--line)] align-top">
                        <td className="p-3">
                          <p className="font-mono text-[.56rem] font-semibold uppercase tracking-[.08em] text-[#176b3a]">{work.code || work.type}</p>
                          <p className="mt-1 font-semibold"><EntityLink href={work.href} sourceHref={work.sourceHref}>{work.title}</EntityLink></p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {work.sources.map((source) => (
                              <span key={source} className={cn(
                                "rounded-full px-2 py-0.5 font-mono text-[.5rem] font-semibold uppercase text-white",
                                source === "portfolio" ? "bg-[#2457a7]" : source === "parigo" ? "bg-[#176b3a]" : "bg-[#5b3f8c]",
                              )}>{sourceLabels[source]}</span>
                            ))}
                          </div>
                        </td>
                        <td className="border-l border-[var(--line)] p-3">
                          <div className="flex flex-wrap gap-2">
                            {relations.length ? relations.map((relation) => (
                              <span key={relation.id} className="inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--background)] px-2.5 py-1.5 text-xs">
                                <EntityLink href={relation.composer?.href} sourceHref={relation.composer?.sourceHref}>{relation.composer?.name}</EntityLink>
                                <RelationSources item={relation} />
                              </span>
                            )) : <span className="font-semibold text-[#8b4e00]">Aucun compositeur relié</span>}
                          </div>
                        </td>
                        <td className="border-l border-[var(--line)] p-3">
                          <span className={cn(
                            "rounded-full px-2.5 py-1 text-[.62rem] font-semibold text-white",
                            drafts[reviewItem?.id ?? ""]?.reviewStatus === "verified" ? "bg-[#176b3a]" : relations.length ? "bg-[#3e4640]" : "bg-[#a45d00]",
                          )}>
                            {drafts[reviewItem?.id ?? ""]?.reviewStatus === "verified" ? "Vérifié" : relations.length ? `${relations.length} relation${relations.length > 1 ? "s" : ""}` : "À compléter"}
                          </span>
                        </td>
                        <td className="border-l border-[var(--line)] p-3">
                          {reviewItem ? (
                            <PrimaryAssignmentEditor
                              mode="replace-work-composers"
                              item={reviewItem}
                              draft={drafts[reviewItem.id]}
                              currentValues={currentValues}
                              fixedValue={work.key}
                              reviewer={reviewerName}
                              suggestedValues={hasPortfolioDelta ? portfolioValues : undefined}
                              suggestedLabel="Reprendre les compositeurs Caro"
                              options={composerPickerOptions}
                              onChange={(patch) => updateDraft(reviewItem, patch)}
                              onOpen={() => setSelectedId(reviewItem.id)}
                            />
                          ) : <span className="text-xs text-[var(--text-muted)]">Aucune unité de revue associée</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </InventorySection>
        )}

        {tab === "composers" && (
          <InventorySection
            title="Compositeurs → albums"
            description={`${data.composers.length} compositeurs. Les sources techniques restent visibles uniquement sur les relations existantes.`}
            query={query}
            setQuery={setQuery}
          >
            <div data-testid="matching-composer-table" className="max-h-[calc(100dvh-12rem)] overflow-auto border border-[#30362f] bg-[var(--surface)]">
              <table className="w-full min-w-[1540px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-30 bg-[#30362f] font-mono text-[.6rem] uppercase tracking-[.09em] text-white shadow-[0_2px_0_#30362f]">
                  <tr>
                    <th className="w-[13%] border-r border-white/15 p-3">Compositeur</th>
                    <th className="w-[12%] border-r border-white/15 p-3">Portfolio Caroline</th>
                    <th className="w-[12%] border-r border-white/15 p-3">Site Parigo</th>
                    <th className="w-[18%] border-r border-white/15 p-3">Albums Caro</th>
                    <th className="w-[18%] border-r border-white/15 p-3">Albums Parigo</th>
                    <th className="w-[11%] border-r border-white/15 p-3">Delta</th>
                    <th className="w-[28%] p-3">Correction Parigo</th>
                  </tr>
                </thead>
                <tbody data-testid="matching-composer-rows">
                  {data.composers.filter((item) => normalize([
                    item.name,
                    ...item.aliases,
                    ...item.candidateAliases,
                    ...(albumRelationsByComposer.get(item.slug) ?? []).flatMap((relation) => [relation.work?.code, relation.work?.title].filter(Boolean)),
                  ].join(" ")).includes(normalize(deferredQuery))).map((composer) => {
                    const reviewItem = reviewItemForComposer(composer.slug);
                    const relations = albumRelationsByComposer.get(composer.slug) ?? [];
                    const portfolioRelations = relations.filter((item) => item.evidence.some((entry) => entry.source === "portfolio"));
                    const parigoRelations = relations.filter((item) => item.currentPublished || item.evidence.some((entry) => entry.source === "parigo"));
                    const portfolioValues = [...new Set(portfolioRelations.flatMap((item) => item.work?.key ? [item.work.key] : []))];
                    const currentValues = [...new Set(parigoRelations.flatMap((item) => item.work?.key ? [item.work.key] : []))];
                    const missingInParigo = portfolioRelations.filter((item) => item.work?.key && !currentValues.includes(item.work.key));
                    const extraInParigo = parigoRelations.filter((item) => item.work?.key && !portfolioValues.includes(item.work.key));
                    return (
                    <tr key={composer.slug} className="border-t border-[var(--line)] align-top">
                      <td className="p-3">
                        <p className="font-semibold">{composer.name}</p>
                        <p className="mt-1 font-mono text-[.56rem] text-[var(--text-muted)]">{composer.slug}</p>
                        {composer.aliases.length ? <p className="mt-2 text-[.68rem] text-[var(--text-muted)]">Alias : {composer.aliases.join(", ")}</p> : null}
                      </td>
                      <td className="border-l border-[var(--line)] p-3">
                        {composer.sourceHref ? (
                          <a href={composer.sourceHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border border-[#2457a7] bg-[#edf3ff] px-2.5 py-2 text-xs font-semibold text-[#173b83] hover:bg-[#2457a7] hover:text-white">
                            Ouvrir chez Caro <ExternalLink size={12} />
                          </a>
                        ) : <span className="text-xs text-[var(--text-muted)]">Lien absent</span>}
                      </td>
                      <td className="border-l border-[var(--line)] p-3">
                        {composer.href ? (
                          <Link href={composer.href} className="inline-flex items-center gap-1.5 border border-[#176b3a] bg-[#edf5ef] px-2.5 py-2 text-xs font-semibold text-[#0d4f2a] hover:bg-[#176b3a] hover:text-white">
                            Page Parigo <ExternalLink size={12} />
                          </Link>
                        ) : (
                          <span className="inline-flex border border-[#b42318] bg-[#fff0ef] px-2.5 py-2 text-xs font-semibold text-[#8c1d14]">
                            Aucune page publique
                          </span>
                        )}
                      </td>
                      <td className="border-l border-[var(--line)] p-3">
                        <div className="flex flex-wrap gap-2">
                          {portfolioRelations.length ? portfolioRelations.map((relation) => (
                            <span key={relation.id} className="inline-flex items-center gap-2 border border-[#2457a7] bg-[#edf3ff] px-2.5 py-1.5 text-xs text-[#173b83]">
                              <EntityLink sourceHref={relation.work?.sourceHref}>{relation.work?.code ? `${relation.work.code} · ` : ""}{relation.work?.title}</EntityLink>
                              <span className="rounded-full bg-[#2457a7] px-1.5 py-0.5 font-mono text-[.48rem] uppercase text-white">Caro</span>
                            </span>
                          )) : <span className="text-xs text-[var(--text-muted)]">Aucun album Portfolio</span>}
                        </div>
                      </td>
                      <td className="border-l border-[var(--line)] p-3">
                        <div className="flex flex-wrap gap-2">
                          {parigoRelations.length ? parigoRelations.map((relation) => (
                            <span key={relation.id} className="inline-flex items-center gap-2 border border-[#176b3a] bg-[#edf5ef] px-2.5 py-1.5 text-xs text-[#0d4f2a]">
                              <EntityLink href={relation.work?.href}>{relation.work?.code ? `${relation.work.code} · ` : ""}{relation.work?.title}</EntityLink>
                              <span className="rounded-full bg-[#176b3a] px-1.5 py-0.5 font-mono text-[.48rem] uppercase text-white">Site</span>
                            </span>
                          )) : <span className="font-semibold text-[#8b4e00]">Aucun album côté Parigo</span>}
                        </div>
                      </td>
                      <td className="border-l border-[var(--line)] p-3">
                        {missingInParigo.length === 0 && extraInParigo.length === 0 ? (
                          <span className="rounded-full bg-[#176b3a] px-2.5 py-1 text-[.62rem] font-semibold text-white">Identique</span>
                        ) : (
                          <div className="space-y-2 text-xs">
                            {missingInParigo.length ? <p className="font-semibold text-[#a45d00]">+{missingInParigo.length} à ajouter</p> : null}
                            {extraInParigo.length ? <p className="font-semibold text-[#b42318]">−{extraInParigo.length} à contrôler</p> : null}
                          </div>
                        )}
                      </td>
                      <td className="border-l border-[var(--line)] p-3">
                        {reviewItem ? (
                          <PrimaryAssignmentEditor
                            mode="replace-composer-works"
                            item={reviewItem}
                            draft={drafts[reviewItem.id]}
                            currentValues={currentValues}
                            fixedValue={composer.slug}
                            reviewer={reviewerName}
                            suggestedValues={missingInParigo.length || extraInParigo.length ? portfolioValues : undefined}
                            suggestedLabel="Reprendre les albums Caro"
                            options={albumPickerOptions}
                            onChange={(patch) => updateDraft(reviewItem, patch)}
                            onOpen={() => setSelectedId(reviewItem.id)}
                          />
                        ) : <span className="text-xs text-[var(--text-muted)]">Aucune unité de revue associée</span>}
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </InventorySection>
        )}

        {(tab === "clips" || tab === "portfolio") && (
          <InventorySection
            title={tab === "clips" ? "Tous les clips" : "Inventaire Portfolio complet"}
            description={tab === "portfolio"
              ? `${data.portfolioInventory.works} œuvres au commit ${data.portfolioInventory.commitSha.slice(0, 12)}.`
              : "Les absences de relation restent visibles et comptées."}
            query={query}
            setQuery={setQuery}
          >
            {tab === "portfolio" && (
              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <SmallStat label="Artistes" value={data.portfolioInventory.artists} />
                <SmallStat label="Œuvres" value={data.portfolioInventory.works} />
                <SmallStat label="Contributions" value={data.portfolioInventory.contributions} />
                <SmallStat label="Liens clip–projet" value={data.portfolioInventory.clipProjectRelations} />
                <SmallStat label="Accords Harvest directs" value={data.metrics.portfolioDirectAlbumMatches} />
                <SmallStat label="Relations à revoir" value={data.metrics.portfolioAlbumRelationsToReview} />
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.works.filter((work) => {
                if (tab === "clips" && work.type !== "clip") return false;
                if (tab === "portfolio" && !work.sources.includes("portfolio")) return false;
                return normalize([work.title, work.code, work.slug, ...work.composerNames].filter(Boolean).join(" ")).includes(normalize(deferredQuery));
              }).map((work) => {
                const reviewItem = reviewItemForWork(work.key);
                return (
                <article key={work.key} className="matching-long-item parigo-card border border-t-4 border-[var(--line)] border-t-[#30362f] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[.58rem] uppercase tracking-[.09em] text-[var(--signal-strong)]">{work.type} {work.code ? `· ${work.code}` : ""}</p>
                      <h3 className="mt-2 text-lg font-semibold"><EntityLink href={work.href} sourceHref={work.sourceHref}>{work.title}</EntityLink></h3>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 font-mono text-[.6rem] font-semibold text-white", work.relationCount ? "bg-[#176b3a]" : "bg-[#a45d00]")}>{work.relationCount} lien{work.relationCount > 1 ? "s" : ""}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-xs leading-5 text-[var(--text-muted)]">
                    {work.composerNames.length ? work.composerNames.map((name) => {
                      const composer = composerByName.get(normalize(name));
                      return <EntityLink key={name} href={composer?.href} sourceHref={composer?.sourceHref}>{name}</EntityLink>;
                    }) : <span className="font-semibold text-[#8b4e00]">{work.type === "clip" ? "Aucun compositeur direct" : "Aucun compositeur relié"}</span>}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {work.sources.map((source) => <span key={source} className="rounded-full bg-[#3e4640] px-2 py-1 text-[.62rem] font-semibold text-white">{sourceLabels[source]}</span>)}
                  </div>
                  {reviewItem && (
                    <div className="mt-4 border-t border-[var(--line)] pt-4">
                      <QuickReviewEditor
                        item={reviewItem}
                        draft={drafts[reviewItem.id]}
                        composers={data.composers}
                        works={data.works}
                        onChange={(patch) => updateDraft(reviewItem, patch)}
                        onOpen={() => setSelectedId(reviewItem.id)}
                      />
                    </div>
                  )}
                </article>
              );})}
            </div>
          </InventorySection>
        )}

        {tab === "harvest" && (
          <InventorySection
            title="Crédits Harvest bruts"
            description={`${data.harvestCredits.length} variantes normalisées, texte source et albums conservés.`}
            query={query}
            setQuery={setQuery}
          >
            <div data-testid="matching-harvest-table" className="max-h-[calc(100dvh-9rem)] overflow-auto border border-[var(--line)] bg-[var(--surface)]">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="sticky top-0 z-30 bg-[#30362f] font-mono text-[.6rem] uppercase tracking-[.09em] text-white shadow-[0_2px_0_#30362f]">
                  <tr><th className="p-3">Crédit brut</th><th className="p-3">Résolution</th><th className="p-3">Albums</th><th className="p-3">Pistes</th><th className="min-w-[22rem] p-3">Corriger le matching</th></tr>
                </thead>
                <tbody>
                  {data.harvestCredits.filter((credit) => normalize([credit.display, credit.matchedComposerName, ...credit.albumCodes, ...credit.trackTitles].filter(Boolean).join(" ")).includes(normalize(deferredQuery))).map((credit) => {
                    const reviewItem = data.items.find((item) => item.evidence.some((entry) => (
                      entry.source === "harvest" && normalize(entry.label) === normalize(credit.display)
                    )));
                    const matchedComposer = credit.matchedComposerSlug
                      ? data.composers.find((composer) => composer.slug === credit.matchedComposerSlug)
                      : undefined;
                    return (
                    <tr key={credit.normalized} className="border-t border-[var(--line)] align-top">
                      <td className="p-3"><p className="font-semibold">{credit.display}</p><p className="font-mono text-[.58rem] text-[var(--text-muted)]">{credit.normalized}</p></td>
                      <td className="p-3">
                        <EntityLink href={matchedComposer?.href} sourceHref={matchedComposer?.sourceHref} className={cn("font-semibold", credit.matchMethod === "unmatched" ? "text-[#8b4e00]" : "text-[#176b3a]")}>{credit.matchedComposerName || "Non résolu"}</EntityLink>
                        <p className="font-mono text-[.58rem] text-[var(--text-muted)]">{credit.matchMethod}</p>
                      </td>
                      <td className="p-3 text-xs">
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          {credit.albumCodes.length ? credit.albumCodes.map((code) => {
                            const work = workByCode.get(code);
                            return <EntityLink key={code} href={work?.href} sourceHref={work?.sourceHref}>{code}</EntityLink>;
                          }) : credit.albumTitles.join(", ")}
                        </div>
                      </td>
                      <td className="max-w-xl p-3 text-xs leading-5 text-[var(--text-muted)]">{credit.trackTitles.join(", ")}</td>
                      <td className="p-3">
                        {reviewItem ? (
                          <QuickReviewEditor
                            item={reviewItem}
                            draft={drafts[reviewItem.id]}
                            composers={data.composers}
                            works={data.works}
                            onChange={(patch) => updateDraft(reviewItem, patch)}
                            onOpen={() => setSelectedId(reviewItem.id)}
                          />
                        ) : <span className="text-xs text-[var(--text-muted)]">Aucune unité de revue associée</span>}
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </InventorySection>
        )}

        {tab === "sheet" && (
          <InventorySection
            title="Snapshot du Google Sheet"
            description={`${data.sheetRows.length} lignes importées ; le texte de Caroline est conservé sans réécriture.`}
            query={query}
            setQuery={setQuery}
          >
            <div className="grid gap-3">
              {data.sheetRows.filter((row) => normalize(Object.values(row).join(" ")).includes(normalize(deferredQuery))).map((row) => {
                const reviewItem = data.items.find((item) => item.id === `review:${row.id}`);
                return (
                <article key={row.id} data-testid="matching-sheet-row" className="matching-long-item parigo-card border border-t-4 border-[var(--line)] border-t-[#30362f] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-mono text-[.58rem] uppercase tracking-[.09em] text-[var(--signal-strong)]">{row.tab} · ligne {row.rowNumber}</p>
                      <h3 className="mt-2 text-lg font-semibold">
                        {row.reference ? <a href={row.reference} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline decoration-[var(--line-strong)] underline-offset-3 hover:text-[var(--signal-strong)]">{row.element}<ExternalLink size={13} /></a> : row.element}
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{row.known}</p>
                    </div>
                    <span className={cn(
                      "w-fit rounded-full border px-3 py-1 text-xs font-semibold",
                      row.status === "À vérifier"
                        ? "border-[#6f3d00] bg-[#a45d00] text-white"
                        : "border-[#0d4f2a] bg-[#176b3a] text-white",
                    )}>{row.status}</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="border border-[var(--line)] bg-[var(--background)] p-3">
                      <p className="font-mono text-[.56rem] uppercase tracking-[.08em] text-[var(--text-muted)]">Compositeur(s)</p>
                      <p className="mt-1 text-sm">{row.composerAnswer || "—"}</p>
                    </div>
                    <div className="border border-[var(--line)] bg-[var(--background)] p-3">
                      <p className="font-mono text-[.56rem] uppercase tracking-[.08em] text-[var(--text-muted)]">Album, clip ou décision</p>
                      <p className="mt-1 text-sm">{row.relationAnswer || "—"}</p>
                    </div>
                  </div>
                  {row.comment && <p className="mt-3 border-l-2 border-[var(--signal-strong)] pl-3 text-xs leading-5 text-[var(--text-muted)]">{row.comment}</p>}
                  {reviewItem && (
                    <div className="mt-4 border-t border-[var(--line)] pt-4">
                      <QuickReviewEditor
                        item={reviewItem}
                        draft={drafts[reviewItem.id]}
                        composers={data.composers}
                        works={data.works}
                        onChange={(patch) => updateDraft(reviewItem, patch)}
                        onOpen={() => setSelectedId(reviewItem.id)}
                      />
                    </div>
                  )}
                </article>
              );})}
            </div>
          </InventorySection>
        )}

        {tab === "draft" && (
          <section>
            <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
              <div>
                <p className="font-mono text-[.65rem] uppercase tracking-[.12em] text-[var(--signal-strong)]">Brouillon local</p>
                <h2 className="mt-3 text-3xl font-semibold">Décisions prêtes à être exportées</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
                  Ce navigateur contient {draftCount} décision{draftCount > 1 ? "s" : ""}. L’application côté serveur
                  se fera ensuite avec <code className="font-mono text-xs">pnpm matching:apply export.json</code>.
                </p>
                {importMessage && <p className="mt-4 border border-[var(--line)] bg-[var(--surface)] p-3 text-sm">{importMessage}</p>}
              </div>
              <div className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="font-mono text-[.6rem] uppercase tracking-[.1em] text-[var(--text-muted)]">Contrôle</p>
                <p className="mt-2 text-3xl font-semibold">{draftCount - invalidDraftCount}/{draftCount}</p>
                <p className="text-xs text-[var(--text-muted)]">décisions complètes</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={exportJson} disabled={!draftCount}><Download size={16} /> Export JSON</Button>
              <Button variant="outline" onClick={exportCsv} disabled={!draftCount}><Download size={16} /> Export CSV</Button>
              <Button variant="outline" onClick={() => importRef.current?.click()}><Upload size={16} /> Importer JSON</Button>
              <input ref={importRef} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void importDraft(event.target.files?.[0])} />
              <Button
                variant="ghost"
                disabled={!draftCount}
                onClick={() => {
                  if (window.confirm("Supprimer toutes les décisions de ce navigateur ? Cette action est irréversible sans export.")) {
                    setDrafts({});
                    setImportMessage("Brouillon local supprimé.");
                  }
                }}
              >
                <Trash2 size={16} /> Effacer le brouillon
              </Button>
            </div>
            <div className="mt-6 grid gap-3">
              {Object.values(drafts).length ? Object.values(drafts).map((draft) => {
                const item = data.items.find((candidate) => candidate.id === draft.itemId);
                const errors = validateMatchingDraft(draft);
                return (
                  <button
                    key={draft.itemId}
                    type="button"
                    onClick={() => item && setSelectedId(item.id)}
                    className="matching-long-item parigo-card flex w-full flex-col gap-3 border border-[var(--line)] bg-[var(--surface)] p-4 text-left shadow-[var(--shadow-sm)] md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{item?.title || draft.itemId}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{item?.subtitle || "Élément absent du snapshot courant"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        errors.length ? "border-amber-700/30 bg-amber-500/13" : "border-emerald-700/30 bg-emerald-500/12",
                      )}>{errors.length ? `${errors.length} erreur(s)` : "Complet"}</span>
                      <ArrowRight size={17} />
                    </div>
                  </button>
                );
              }) : (
                <div className="border border-dashed border-[var(--line-strong)] py-20 text-center">
                  <ClipboardCheck className="mx-auto text-[var(--text-muted)]" size={28} />
                  <p className="mt-4 font-semibold">Aucune décision locale</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Ouvrez un élément dans la file de vérification pour commencer.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </section>

      {selected && selectedDraft && (
        <div className="fixed inset-0 z-[90] flex justify-end bg-black/35 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedId(null);
        }}>
          <aside
            data-testid="matching-review-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="matching-review-title"
            className="h-full w-full overflow-y-auto border-l border-[var(--line-strong)] bg-[var(--background)] shadow-2xl md:max-w-[46rem]"
          >
            <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_94%,transparent)] px-4 py-4 backdrop-blur-xl md:px-6">
              <div>
                <p className="font-mono text-[.58rem] uppercase tracking-[.1em] text-[var(--signal-strong)]">
                  Relecture · {selected.entityType}
                </p>
                <h2 id="matching-review-title" className="mt-1 text-xl font-semibold"><EntityLink href={selected.composer?.href || selected.work?.href} sourceHref={selected.composer?.sourceHref || selected.work?.sourceHref}>{selected.title}</EntityLink></h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{selected.subtitle}</p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} aria-label="Fermer le panneau" className="grid h-11 w-11 shrink-0 place-items-center border border-[var(--line)] bg-[var(--surface)]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6 p-4 pb-32 md:p-6 md:pb-36">
              {selectedDraft.baseRegistryRevision !== data.registryRevision && (
                <div className="border border-amber-700/35 bg-amber-500/13 p-4 text-sm leading-6">
                  <strong>Conflit de révision.</strong> Cette décision a été créée sur {selectedDraft.baseRegistryRevision},
                  tandis que le registre courant est {data.registryRevision}. Elle doit être revue avant application.
                </div>
              )}

              <section className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge state={selected.agreement} />
                  {selected.currentPublished && <span className="rounded-full bg-[#176b3a] px-3 py-1 text-xs font-semibold text-white">Actuellement public</span>}
                  {!selected.relationExists && <span className="rounded-full bg-[#555d57] px-3 py-1 text-xs font-semibold text-white">Aucun lien actuel</span>}
                </div>
                {selected.composer && (
                  <div className="mt-4">
                    <p className="font-mono text-[.56rem] uppercase tracking-[.09em] text-[var(--text-muted)]">Identité</p>
                    <p className="mt-1 text-lg font-semibold"><EntityLink href={selected.composer.href} sourceHref={selected.composer.sourceHref}>{selected.composer.name}</EntityLink></p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Alias : {selected.composer.aliases.join(", ") || "aucun alias validé"}
                    </p>
                  </div>
                )}
                {selected.work && (
                  <div className="mt-4 border-t border-[var(--line)] pt-4">
                    <p className="font-mono text-[.56rem] uppercase tracking-[.09em] text-[var(--text-muted)]">Projet</p>
                    <p className="mt-1 font-semibold"><EntityLink href={selected.work.href} sourceHref={selected.work.sourceHref}>{selected.work.code ? `${selected.work.code} · ` : ""}{selected.work.title}</EntityLink></p>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-lg font-semibold">Comparaison des sources</h3>
                <div className="mt-3 grid gap-3">
                  {(["harvest", "portfolio", "youtube", "sheet", "parigo"] as MatchingSourceId[]).map((source) => {
                    const entries = selected.evidence.filter((entry) => entry.source === source);
                    return (
                      <div key={source} className="border border-[var(--line)] bg-[var(--surface)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-[.62rem] font-semibold uppercase tracking-[.1em]">{sourceLabels[source]}</p>
                          <span className="text-xs text-[var(--text-muted)]">{entries.length} preuve{entries.length > 1 ? "s" : ""}</span>
                        </div>
                        {entries.length ? (
                          <div className="mt-3 space-y-3">
                            {entries.map((entry) => (
                              <div key={entry.id} className="border-l-2 border-[var(--signal-strong)] pl-3">
                                <p className="text-sm font-semibold">{entry.label}</p>
                                {entry.detail && <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{entry.detail}</p>}
                                <p className="mt-1 font-mono text-[.55rem] uppercase text-[var(--text-muted)]">
                                  {entry.direct ? "Preuve directe" : "Lien indirect"} · {entry.method} · {entry.provenanceId}
                                </p>
                                {entry.reference && <a href={entry.reference} target={entry.reference.startsWith("http") ? "_blank" : undefined} rel={entry.reference.startsWith("http") ? "noreferrer" : undefined} className="mt-1 inline-block text-xs font-semibold text-[var(--signal-strong)] underline">Ouvrir la référence</a>}
                              </div>
                            ))}
                          </div>
                        ) : <p className="mt-3 text-xs text-[var(--text-muted)]">Aucune donnée dans cette source.</p>}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold">Graphe local</h3>
                <div className="mt-3 overflow-x-auto border border-[var(--line)] bg-[var(--surface)] p-5">
                  <div className="flex min-w-[32rem] items-center justify-center gap-3">
                    <GraphNode tone="composer" label={selected.composer?.name || selected.title} caption={selected.composer ? "Compositeur" : selected.entityType} />
                    <div className="flex items-center gap-1 text-[var(--text-muted)]"><span className="h-px w-10 bg-[var(--line-strong)]" /><ArrowRight size={15} /></div>
                    <GraphNode tone={selected.work?.type === "clip" ? "clip" : "work"} label={selected.work?.title || selected.subtitle || "Décision"} caption={selected.work?.type || "Élément"} />
                    {selected.tags.includes("indirect-project") && (
                      <>
                        <div className="flex items-center gap-1 text-blue-600"><span className="h-px w-10 border-t border-dashed border-blue-500" /><ArrowRight size={15} /></div>
                        <GraphNode tone="indirect" label="Projet associé" caption="Pas un crédit clip" />
                      </>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t border-[var(--line)] pt-6">
                <div>
                  <h3 className="text-lg font-semibold">Relation à appliquer</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Ces listes contiennent toutes les identités et tous les albums, vinyles et clips chargés. La sélection crée une proposition ; elle ne modifie pas le site public avant export et application.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Compositeur attribué">
                    <MatchingMultiPicker
                      values={selectedDraft.selectedComposerSlugs
                        ?? (selectedDraft.selectedComposerSlug ? [selectedDraft.selectedComposerSlug] : selected.composer?.slug ? [selected.composer.slug] : [])}
                      onChange={(selectedComposerSlugs) => updateDraft(selected, {
                        selectedComposerSlugs,
                        relationDecision: selectedDraft.relationDecision ?? (selected.relationExists ? "keep" : "add"),
                      })}
                      label="Compositeurs"
                      title={`Compositeurs associés à ${selected.work?.title ?? selected.title}`}
                      options={[
                        ...data.composers.map((composer) => ({ value: composer.slug, label: composer.name, description: composer.aliases.slice(0, 2).join(" · ") || composer.visibility })),
                      ]}
                    />
                  </Field>
                  <Field label="Album, vinyle ou clip attribué">
                    <MatchingMultiPicker
                      values={selectedDraft.selectedWorkKeys
                        ?? (selectedDraft.selectedWorkKey ? [selectedDraft.selectedWorkKey] : selected.work?.key ? [selected.work.key] : [])}
                      onChange={(selectedWorkKeys) => updateDraft(selected, {
                        selectedWorkKeys,
                        relationDecision: selectedDraft.relationDecision ?? (selected.relationExists ? "keep" : "add"),
                      })}
                      label="Albums / projets"
                      title={`Albums, vinyles et clips associés à ${selected.composer?.name ?? selected.title}`}
                      options={[
                        ...data.works.filter((work) => work.type === "album" || work.type === "vinyl" || work.type === "clip").map((work) => ({ value: work.key, label: `${work.code ? `${work.code} · ` : ""}${work.title}`, description: work.type })),
                      ]}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Statut de relecture">
                    <Select
                      value={selectedDraft.reviewStatus}
                      onValueChange={(reviewStatus) => updateDraft(selected, { reviewStatus })}
                      ariaLabel="Statut de relecture"
                      options={reviewStatusOptions}
                    />
                  </Field>
                  <Field label="Décision de relation" required>
                    <Select
                      value={selectedDraft.relationDecision ?? ""}
                      onValueChange={(value) => updateDraft(selected, { relationDecision: value || null })}
                      ariaLabel="Décision de relation"
                      options={relationOptions}
                    />
                  </Field>
                  <Field label="Publication">
                    <Select
                      value={selectedDraft.publicationDecision ?? "unchanged"}
                      onValueChange={(publicationDecision) => updateDraft(selected, { publicationDecision })}
                      ariaLabel="Décision de publication"
                      options={publicationOptions}
                    />
                  </Field>
                  <Field label="Rôle">
                    <Select
                      value={selectedDraft.role ?? "composer"}
                      onValueChange={(role) => updateDraft(selected, { role })}
                      ariaLabel="Rôle éditorial"
                      options={roleOptions}
                    />
                  </Field>
                </div>

                <fieldset>
                  <legend className="text-xs font-semibold">Provenances retenues <span className="text-[var(--danger)]">*</span></legend>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Sélectionner les preuves qui justifient la décision ; les sources originales restent inchangées.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {provenanceOptions.map((option) => {
                      const checked = selectedDraft.provenanceIds.includes(option.value);
                      return (
                        <label key={option.value} className={cn(
                          "flex cursor-pointer items-start gap-3 border p-3 text-xs transition",
                          checked ? "border-[#0d4f2a] bg-[#176b3a] text-white" : "border-[var(--line)] bg-[var(--surface)]",
                        )}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => updateDraft(selected, {
                              provenanceIds: checked
                                ? selectedDraft.provenanceIds.filter((value) => value !== option.value)
                                : [...selectedDraft.provenanceIds, option.value],
                            })}
                            className="mt-0.5 accent-[var(--signal-strong)]"
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <Field label="Nom du relecteur" required={selectedDraft.reviewStatus === "verified"}>
                  <input
                    aria-label="Nom du relecteur"
                    value={selectedDraft.reviewer ?? ""}
                    onChange={(event) => updateDraft(selected, { reviewer: event.target.value })}
                    placeholder="Ex. Caroline, Yoann…"
                    className="min-h-11 w-full border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--signal-strong)]"
                  />
                </Field>
                <Field label="Notes" required={selectedDraft.reviewStatus === "rejected" || selectedDraft.relationDecision === "remove"}>
                  <textarea
                    aria-label="Notes de relecture"
                    rows={5}
                    value={selectedDraft.note}
                    onChange={(event) => updateDraft(selected, { note: event.target.value })}
                    placeholder="Décision, doute restant, alias à confirmer, correction Harvest à demander…"
                    className="w-full resize-y border border-[var(--line)] bg-[var(--surface)] p-3 text-sm leading-6 outline-none focus:border-[var(--signal-strong)]"
                  />
                </Field>
                <Field label="Liens justificatifs">
                  <textarea
                    aria-label="Liens justificatifs"
                    rows={3}
                    value={selectedDraft.evidenceLinks.join("\n")}
                    onChange={(event) => updateDraft(selected, {
                      evidenceLinks: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean),
                    })}
                    placeholder={"Une URL https:// par ligne"}
                    className="w-full resize-y border border-[var(--line)] bg-[var(--surface)] p-3 font-mono text-xs leading-6 outline-none focus:border-[var(--signal-strong)]"
                  />
                </Field>
                {formErrors.length > 0 && (
                  <div role="alert" className="border border-red-700/30 bg-red-500/10 p-4">
                    <p className="text-sm font-semibold">La décision ne peut pas être vérifiée :</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                      {formErrors.map((error) => <li key={error}>{error}</li>)}
                    </ul>
                  </div>
                )}
              </section>
            </div>

            <div className="fixed bottom-0 right-0 z-30 flex w-full flex-col gap-2 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_94%,transparent)] p-3 backdrop-blur-xl md:max-w-[46rem] md:flex-row md:items-center md:justify-between md:px-6">
              <p className="hidden text-xs text-[var(--text-muted)] md:block">
                Raccourcis : <kbd className="border border-[var(--line)] px-1.5 py-0.5 font-mono">V</kbd> vérifier · <kbd className="border border-[var(--line)] px-1.5 py-0.5 font-mono">N</kbd> suivant
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 md:flex-none" onClick={moveToNext}>Élément suivant</Button>
                <Button className="flex-1 md:flex-none" onClick={markVerified}><Check size={16} /> Vérifié</Button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function InventorySection({
  title,
  description,
  query,
  setQuery,
  children,
}: {
  title: string;
  description: string;
  query: string;
  setQuery: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
        </div>
        <label className="relative block w-full lg:max-w-md">
          <span className="sr-only">Rechercher dans cet inventaire</span>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrer l’inventaire…"
            className="min-h-11 w-full border border-[var(--line)] bg-[var(--surface)] py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--signal-strong)]"
          />
        </label>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="parigo-card border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="font-mono text-[.58rem] uppercase tracking-[.09em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function GraphNode({
  label,
  caption,
  tone,
}: {
  label: string;
  caption: string;
  tone: "composer" | "work" | "clip" | "indirect";
}) {
  return (
    <div className={cn(
      "min-w-32 max-w-44 border px-4 py-3 text-center",
      tone === "composer" && "border-[var(--signal-strong)] bg-[var(--signal-soft)]",
      tone === "work" && "border-[var(--line-strong)] bg-[var(--surface-soft)]",
      tone === "clip" && "border-blue-600/40 bg-blue-500/10",
      tone === "indirect" && "border-dashed border-blue-600/50 bg-blue-500/5",
    )}>
      <p className="line-clamp-2 text-xs font-semibold">{label}</p>
      <p className="mt-1 font-mono text-[.52rem] uppercase tracking-[.08em] text-[var(--text-muted)]">{caption}</p>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-2 block text-xs font-semibold">
        {label} {required && <span className="text-[var(--danger)]">*</span>}
      </span>
      {children}
    </div>
  );
}
