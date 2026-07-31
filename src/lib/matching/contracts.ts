import { z } from "zod";

export const provenanceOptions = [
  { value: "harvest-track-credit", label: "Harvest — crédit de piste", source: "harvest" },
  { value: "portfolio-contribution", label: "Portfolio — contribution explicite", source: "portfolio" },
  { value: "portfolio-related-project", label: "Portfolio — projet relié", source: "portfolio" },
  { value: "portfolio-manual-map", label: "Portfolio — table manuelle", source: "portfolio" },
  { value: "portfolio-slug-inference", label: "Portfolio — inférence de slug", source: "portfolio" },
  { value: "portfolio-subtitle", label: "Portfolio — sous-titre", source: "portfolio" },
  { value: "youtube-title", label: "YouTube — titre", source: "youtube" },
  { value: "youtube-description", label: "YouTube — description", source: "youtube" },
  { value: "google-sheet-review", label: "Google Sheet — relecture", source: "sheet" },
  { value: "parigo-declared-alias", label: "Parigo — alias déclaré", source: "parigo" },
  { value: "parigo-manual", label: "Parigo — décision manuelle", source: "parigo" },
  { value: "public-external-source", label: "Source publique externe", source: "external" },
] as const;

export type ProvenanceId = (typeof provenanceOptions)[number]["value"];
export type MatchingEntityType = "composer" | "album" | "vinyl" | "clip" | "relation";
export type RelationDecision = "keep" | "add" | "remove" | "none";
export type ReviewStatus = "unreviewed" | "needs-review" | "in-progress" | "verified" | "rejected";
export type PublicationDecision = "unchanged" | "public" | "internal" | "do-not-publish";
export type MatchingRole = "composer" | "collective" | "performer" | "voice" | "remixer" | "other";
export type AgreementState =
  | "exact"
  | "alias"
  | "single-source"
  | "inferred"
  | "conflict"
  | "explicit-none"
  | "rejected"
  | "unresolved";
export type MatchingSourceId = "harvest" | "portfolio" | "youtube" | "sheet" | "parigo";

export const MatchingReviewDraftSchema = z.object({
  itemId: z.string().min(1),
  entityType: z.enum(["composer", "album", "vinyl", "clip", "relation"]),
  relationDecision: z.enum(["keep", "add", "remove", "none"]).nullable(),
  reviewStatus: z.enum(["unreviewed", "needs-review", "in-progress", "verified", "rejected"]),
  publicationDecision: z.enum(["unchanged", "public", "internal", "do-not-publish"]).optional(),
  role: z.enum(["composer", "collective", "performer", "voice", "remixer", "other"]).optional(),
  provenanceIds: z.array(z.enum(provenanceOptions.map((option) => option.value) as [
    ProvenanceId,
    ...ProvenanceId[],
  ])),
  note: z.string(),
  evidenceLinks: z.array(z.string().url()),
  selectedComposerSlug: z.string().min(1).optional(),
  selectedWorkKey: z.string().min(1).optional(),
  selectedComposerSlugs: z.array(z.string().min(1)).optional(),
  selectedWorkKeys: z.array(z.string().min(1)).optional(),
  removedComposerSlugs: z.array(z.string().min(1)).optional(),
  removedWorkKeys: z.array(z.string().min(1)).optional(),
  assignmentMode: z.enum(["relation", "replace-work-composers", "replace-composer-works"]).optional(),
  reviewer: z.string().optional(),
  reviewedAt: z.string().datetime().optional(),
  baseRegistryRevision: z.string().min(1),
});

export type MatchingReviewDraft = z.infer<typeof MatchingReviewDraftSchema>;

export interface MatchingEvidence {
  id: string;
  source: MatchingSourceId;
  provenanceId: ProvenanceId;
  method:
    | "direct"
    | "source-id"
    | "normalized-exact"
    | "declared-alias"
    | "collective-member"
    | "indirect-project"
    | "heuristic"
    | "manual-decision";
  label: string;
  detail?: string;
  reference?: string;
  direct: boolean;
}

export interface MatchingItem {
  id: string;
  entityType: MatchingEntityType;
  title: string;
  subtitle: string;
  composer?: {
    slug?: string;
    name: string;
    aliases: string[];
    visibility?: "public" | "internal";
    href?: string;
    sourceHref?: string;
  };
  work?: {
    key: string;
    slug?: string;
    code?: string;
    title: string;
    type: "album" | "vinyl" | "clip";
    href?: string;
    sourceHref?: string;
  };
  evidence: MatchingEvidence[];
  agreement: AgreementState;
  priority: number;
  initialReviewStatus: ReviewStatus;
  currentPublished: boolean;
  relationExists: boolean;
  tags: string[];
}

export interface MatchingComposerView {
  slug: string;
  name: string;
  aliases: string[];
  candidateAliases: string[];
  visibility: "public" | "internal";
  published: boolean;
  albumCount: number;
  vinylCount: number;
  clipCount: number;
  contributionCount: number;
  hasAnyEvidence: boolean;
  href?: string;
  sourceHref?: string;
}

export interface MatchingWorkView {
  key: string;
  slug?: string;
  code?: string;
  title: string;
  type: "album" | "vinyl" | "clip" | "documentary" | "synchro";
  sources: MatchingSourceId[];
  composerNames: string[];
  relatedProjects: string[];
  relationCount: number;
  href?: string;
  sourceHref?: string;
}

export interface HarvestCreditView {
  normalized: string;
  display: string;
  albumCodes: string[];
  albumTitles: string[];
  trackTitles: string[];
  matchedComposerSlug?: string;
  matchedComposerName?: string;
  matchMethod: "normalized-exact" | "declared-alias" | "unmatched";
}

export interface MatchingSheetRow {
  id: string;
  tab: string;
  rowNumber: number;
  element: string;
  reference: string;
  missing: string;
  known: string;
  composerAnswer: string;
  relationAnswer: string;
  status: string;
  comment: string;
}

export interface MatchingSourceStatus {
  id: MatchingSourceId;
  label: string;
  state: "ok" | "partial" | "stale" | "unavailable";
  count: number;
  capturedAt?: string;
  revision?: string;
  detail: string;
}

export interface MatchingMetrics {
  totalToReview: number;
  conflicts: number;
  inferredOnly: number;
  composerOrphans: number;
  portfolioComposerOrphans: number;
  albumOrphans: number;
  clipsWithoutDirectComposer: number;
  unmatchedHarvestCredits: number;
  sheetNeedsReview: number;
  verified: number;
  totalItems: number;
  portfolioDirectAlbumMatches: number;
  portfolioAlbumRelationsToReview: number;
}

export interface MatchingDashboardData {
  capturedAt: string;
  registryRevision: string;
  sources: MatchingSourceStatus[];
  metrics: MatchingMetrics;
  items: MatchingItem[];
  composers: MatchingComposerView[];
  works: MatchingWorkView[];
  harvestCredits: HarvestCreditView[];
  sheetRows: MatchingSheetRow[];
  portfolioInventory: {
    artists: number;
    works: number;
    contributions: number;
    clipProjectRelations: number;
    categories: Record<string, number>;
    commitSha: string;
  };
}

export interface MatchingDraftExport {
  schemaVersion: 1;
  exportedAt: string;
  baseRegistryRevision: string;
  drafts: MatchingReviewDraft[];
}

export function defaultMatchingDraft(
  item: Pick<MatchingItem, "id" | "entityType" | "initialReviewStatus">,
  baseRegistryRevision: string,
): MatchingReviewDraft {
  return {
    itemId: item.id,
    entityType: item.entityType,
    relationDecision: null,
    reviewStatus: item.initialReviewStatus,
    publicationDecision: "unchanged",
    role: "composer",
    provenanceIds: [],
    note: "",
    evidenceLinks: [],
    baseRegistryRevision,
  };
}

export function validateMatchingDraft(draft: MatchingReviewDraft): string[] {
  const errors: string[] = [];
  if (draft.reviewStatus === "verified") {
    if (!draft.relationDecision) errors.push("Choisissez une décision de relation.");
    if (!draft.provenanceIds.length) errors.push("Ajoutez au moins une provenance.");
    if (!draft.reviewer?.trim()) errors.push("Indiquez le nom du relecteur.");
  }
  if (
    (draft.reviewStatus === "rejected" || draft.relationDecision === "remove")
    && !draft.note.trim()
  ) {
    errors.push("Une note est obligatoire pour un rejet ou un retrait.");
  }
  return errors;
}
