import { ManifestoScrollSection } from "./ManifestoScrollSection";
import { ProcessSignalSection } from "./ProcessSignalSection";
import { ProjectInvitationSection } from "./ProjectInvitationSection";
import { ComposerRelationshipSection, type ComposerStreamProfile } from "./ComposerRelationshipSection";

export function HomeStorySections({
  locale,
  profiles,
}: {
  locale: "fr" | "en";
  profiles: ComposerStreamProfile[];
}) {
  return (
    <>
      <ManifestoScrollSection locale={locale} />
      <ComposerRelationshipSection profiles={profiles} locale={locale} />
      <ProcessSignalSection locale={locale} />
      <ProjectInvitationSection />
    </>
  );
}
