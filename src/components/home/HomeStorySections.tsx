import { ManifestoScrollSection } from "./ManifestoScrollSection";
import { ProcessSignalSection } from "./ProcessSignalSection";
import { ProjectInvitationSection } from "./ProjectInvitationSection";
import { ComposerPortraitsSection, type HomeComposerProfile } from "./ComposerPortraitsSection";

export function HomeStorySections({
  locale,
  homeComposers,
}: {
  locale: "fr" | "en";
  homeComposers: HomeComposerProfile[];
}) {
  return (
    <>
      <ManifestoScrollSection locale={locale} />
      <ComposerPortraitsSection locale={locale} profiles={homeComposers} />
      <ProcessSignalSection locale={locale} />
      <ProjectInvitationSection />
    </>
  );
}
