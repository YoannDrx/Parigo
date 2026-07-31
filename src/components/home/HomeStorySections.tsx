import { ManifestoScrollSection } from "./ManifestoScrollSection";
import { ProcessSignalSection } from "./ProcessSignalSection";
import { ProjectInvitationSection } from "./ProjectInvitationSection";
import { ComposerRelationshipSection } from "./ComposerRelationshipSection";

export function HomeStorySections({
  locale,
}: {
  locale: "fr" | "en";
}) {
  return (
    <>
      <ManifestoScrollSection locale={locale} />
      <ComposerRelationshipSection locale={locale} />
      <ProcessSignalSection locale={locale} />
      <ProjectInvitationSection />
    </>
  );
}
