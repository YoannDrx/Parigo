import type { Locale } from "@/i18n/messages";
import type { CanonicalComposerProfile } from "./profiles";

export function composerRoleLabel(
  profile: Pick<CanonicalComposerProfile, "slug" | "kind">,
  locale: Locale,
): string {
  if (profile.kind === "group") return locale === "fr" ? "Collectif" : "Collective";
  if (locale === "fr" && profile.slug === "flore") return "Compositrice";
  return locale === "fr" ? "Compositeur" : "Composer";
}
