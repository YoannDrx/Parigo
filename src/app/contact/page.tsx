import { ContactExperience } from "@/components/institutional/ContactExperience";
import { getTrack } from "@/lib/harvest/catalog";
import type { Track } from "@/types";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ track?: string | string[] }> }) {
  const params = await searchParams;
  const requestedTrackId = Array.isArray(params.track) ? params.track[0] : params.track;
  let track: Track | null = null;

  if (requestedTrackId) {
    try {
      track = await getTrack(requestedTrackId);
    } catch {
      // The contact journey remains available with the reference even if the catalogue is temporarily unavailable.
    }
  }

  return <ContactExperience track={track} requestedTrackId={requestedTrackId} />;
}
