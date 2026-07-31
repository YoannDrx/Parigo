import { describe, expect, it } from "vitest";
import {
  defaultMatchingDraft,
  MatchingReviewDraftSchema,
  validateMatchingDraft,
  type MatchingItem,
} from "./contracts";

const item: MatchingItem = {
  id: "relation:minimatic:album:PGO0050",
  entityType: "relation",
  title: "Minimatic",
  subtitle: "PGO0050 · Riviera Bizarre",
  evidence: [],
  agreement: "single-source",
  priority: 3,
  initialReviewStatus: "needs-review",
  currentPublished: true,
  relationExists: true,
  tags: [],
};

describe("matching review contracts", () => {
  it("sépare le statut, la relation et la publication", () => {
    const draft = defaultMatchingDraft(item, "matching-registry-v1");
    expect(draft.reviewStatus).toBe("needs-review");
    expect(draft.relationDecision).toBeNull();
    expect(draft.publicationDecision).toBe("unchanged");
  });

  it("refuse une validation sans décision, provenance ni relecteur", () => {
    const errors = validateMatchingDraft({
      ...defaultMatchingDraft(item, "matching-registry-v1"),
      reviewStatus: "verified",
    });
    expect(errors).toEqual([
      "Choisissez une décision de relation.",
      "Ajoutez au moins une provenance.",
      "Indiquez le nom du relecteur.",
    ]);
  });

  it("exige une note pour retirer ou rejeter une relation", () => {
    const draft = {
      ...defaultMatchingDraft(item, "matching-registry-v1"),
      reviewStatus: "rejected" as const,
      relationDecision: "remove" as const,
      provenanceIds: ["parigo-manual" as const],
      reviewer: "Caroline",
    };
    expect(validateMatchingDraft(draft)).toContain("Une note est obligatoire pour un rejet ou un retrait.");
    expect(validateMatchingDraft({ ...draft, note: "Crédit attribué à tort." })).toEqual([]);
  });

  it("conserve la correction compositeur–projet choisie dans l’export", () => {
    const draft = MatchingReviewDraftSchema.parse({
      ...defaultMatchingDraft(item, "matching-registry-v1"),
      relationDecision: "add",
      selectedComposerSlug: "minimatic",
      selectedWorkKey: "album:PGO0050",
    });
    expect(draft.selectedComposerSlug).toBe("minimatic");
    expect(draft.selectedWorkKey).toBe("album:PGO0050");
  });

  it("conserve une relation plusieurs-à-plusieurs et les retraits explicites", () => {
    const draft = MatchingReviewDraftSchema.parse({
      ...defaultMatchingDraft(item, "matching-registry-v1"),
      relationDecision: "add",
      assignmentMode: "replace-work-composers",
      selectedComposerSlugs: ["minimatic", "arom"],
      selectedWorkKeys: ["album:PGO0050"],
      removedComposerSlugs: ["ghostmaker"],
    });
    expect(draft.selectedComposerSlugs).toEqual(["minimatic", "arom"]);
    expect(draft.removedComposerSlugs).toEqual(["ghostmaker"]);
  });
});
