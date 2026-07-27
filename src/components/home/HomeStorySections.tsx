import { ManifestoScrollSection } from "./ManifestoScrollSection";
import { ProcessSignalSection } from "./ProcessSignalSection";
import { ProjectInvitationSection } from "./ProjectInvitationSection";

export function HomeStorySections({
  locale,
  albumCovers,
}: {
  locale: "fr" | "en";
  albumCovers: Array<{ src: string; title: string }>;
}) {
  return (
    <>
      <ManifestoScrollSection locale={locale} albumCovers={albumCovers} />
      <ProcessSignalSection locale={locale} />
      <ProjectInvitationSection />
    </>
  );
}
