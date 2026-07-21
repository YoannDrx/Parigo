"use client";

import { useState } from "react";
import { ListPlus, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/components/providers/I18nProvider";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui";

export function AddToPlaylistButton({ trackId, trackTitle, className }: { trackId: string; trackTitle: string; className?: string }) {
  const { data: session } = useSession();
  const openLogin = useAuthModalStore((state) => state.openLogin);
  const { locale } = useI18n();
  const [loading, setLoading] = useState(false);
  const add = async () => {
    if (!session?.user) {
      openLogin();
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/user/playlists", { cache: "no-store" });
      const payload = await response.json();
      const playlists = payload.data?.playlists || [];
      if (!playlists.length) {
        window.alert(locale === "fr" ? "Créez d’abord une playlist dans votre compte." : "Create a playlist in your account first.");
        return;
      }
      const choice = window.prompt(`${locale === "fr" ? "Ajouter à quelle playlist ?" : "Add to which playlist?"}\n${playlists.map((playlist: { title: string }, index: number) => `${index + 1}. ${playlist.title}`).join("\n")}`);
      const playlist = playlists[Number(choice) - 1];
      if (!playlist) return;
      const addResponse = await fetch(`/api/user/playlists/${encodeURIComponent(playlist.id)}/tracks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", trackIds: [trackId] }) });
      if (!addResponse.ok) throw new Error("add failed");
    } catch {
      window.alert(locale === "fr" ? "Impossible d’ajouter cette piste." : "Could not add this track.");
    } finally {
      setLoading(false);
    }
  };
  const label = locale === "fr" ? "Ajouter à une playlist" : "Add to playlist";
  return <Tooltip label={label}><button type="button" onClick={() => void add()} disabled={loading} className={cn("flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50", className)} aria-label={`${label} : ${trackTitle}`}>{loading ? <Loader2 size={17} className="animate-spin" /> : <ListPlus size={17} className="text-[var(--color-gray-500)]" />}</button></Tooltip>;
}
