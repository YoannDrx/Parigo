export interface ComposerRoleProfile {
  kind: "person" | "group";
  grammaticalGender?: "masculine" | "feminine";
}

export function composerRoleLabel(
  profile: ComposerRoleProfile,
  locale: "fr" | "en",
): string {
  if (profile.kind === "group") return locale === "fr" ? "Collectif" : "Group";
  if (locale === "en") return "Composer";
  return "Compositeur";
}
