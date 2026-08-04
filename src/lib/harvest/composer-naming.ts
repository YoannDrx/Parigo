import { normalizeHarvestComposerCredit } from "./composer-credits";

export const COMPOSER_SOCIETY_SUFFIX = /\s*\((SACEM|NS|BMI|ASCAP|PRS|SESAC)(?:[^)]*)\)\s*$/i;

export type ComposerNamingEvidence = "canonical-registry" | "structured-right-holder" | "mechanical";

export interface ComposerNameRecommendation {
  proposedName?: string;
  evidence?: ComposerNamingEvidence;
  hasSocietySuffix: boolean;
  hasInvalidCharacter: boolean;
}

export function composerCreditBaseName(value: string): string {
  return value.replace(COMPOSER_SOCIETY_SUFFIX, "").trim();
}

export function hasInvalidComposerCharacter(value: string): boolean {
  return value.includes("\uFFFD") || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value);
}

export function recommendComposerCreditName(
  name: string,
  options: {
    preferredName?: string;
    structuredWriterNames?: string[];
    hasContradictoryEvidence?: boolean;
  } = {},
): ComposerNameRecommendation {
  const trimmed = name.trim();
  const hasSocietySuffix = COMPOSER_SOCIETY_SUFFIX.test(trimmed);
  const hasInvalidCharacter = hasInvalidComposerCharacter(trimmed);

  if (options.hasContradictoryEvidence) {
    return { hasSocietySuffix, hasInvalidCharacter };
  }

  if (options.preferredName && options.preferredName !== trimmed) {
    return {
      proposedName: options.preferredName,
      evidence: "canonical-registry",
      hasSocietySuffix,
      hasInvalidCharacter,
    };
  }

  const normalized = normalizeHarvestComposerCredit(trimmed);
  const matchingWriters = [...new Set((options.structuredWriterNames ?? [])
    .map((writer) => writer.trim())
    .filter((writer) => normalizeHarvestComposerCredit(writer) === normalized))];

  if (matchingWriters.length === 1 && matchingWriters[0] !== trimmed) {
    return {
      proposedName: matchingWriters[0],
      evidence: "structured-right-holder",
      hasSocietySuffix,
      hasInvalidCharacter,
    };
  }

  const baseName = composerCreditBaseName(trimmed);
  if (baseName !== trimmed) {
    return {
      proposedName: baseName,
      evidence: "mechanical",
      hasSocietySuffix,
      hasInvalidCharacter,
    };
  }

  return { hasSocietySuffix, hasInvalidCharacter };
}
