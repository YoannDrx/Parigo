"use client";

import { use } from "react";
import { SharedMusicExperience } from "@/components/features/SharedMusicExperience";

export default function EngagePlaylistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <SharedMusicExperience token={token} kind="playlist" />;
}
