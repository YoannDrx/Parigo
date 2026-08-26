import { ManifestoScrollSection } from "./ManifestoScrollSection";
import { ProcessSignalSection } from "./ProcessSignalSection";
import { ProjectInvitationSection } from "./ProjectInvitationSection";
import { ComposerRelationshipSection, type ComposerStreamProfile } from "./ComposerRelationshipSection";
import type { ReactNode } from "react";

export function HomeStorySections({
  children,
  locale,
  profiles,
}: {
  children: ReactNode;
  locale: "fr" | "en";
  profiles: ComposerStreamProfile[];
}) {
  return (
    <>
      <ManifestoScrollSection locale={locale} />
      {children}
      <ComposerRelationshipSection profiles={profiles} locale={locale} />
      <ProcessSignalSection locale={locale} />
      <ProjectInvitationSection />
    </>
  );
}
