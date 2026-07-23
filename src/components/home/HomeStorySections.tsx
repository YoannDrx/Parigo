"use client";

import type { Playlist } from "@/types";
import { EditorialScrollStory } from "./EditorialScrollStory";
import { ManifestoScrollSection } from "./ManifestoScrollSection";
import { ProcessSignalSection } from "./ProcessSignalSection";
import { ProjectInvitationSection } from "./ProjectInvitationSection";
import { SensationSignalSection } from "./SensationSignalSection";

export function HomeStorySections({ locale, playlists }: { locale: "fr" | "en"; playlists: Playlist[] }) {
  return (
    <>
      <ManifestoScrollSection locale={locale} />
      <ProcessSignalSection locale={locale} />
      <ProjectInvitationSection />
      <SensationSignalSection locale={locale} />
      <EditorialScrollStory playlists={playlists} locale={locale} />
    </>
  );
}
