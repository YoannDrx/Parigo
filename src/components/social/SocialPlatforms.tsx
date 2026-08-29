import type { SVGProps } from "react";

export type SocialPlatformName = "Instagram" | "YouTube" | "LinkedIn" | "Facebook" | "Bandcamp" | "Spotify" | "TikTok" | "Linktree";

export interface SocialPlatform {
  name: SocialPlatformName;
  href: string;
  label: { fr: string; en: string };
}

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  { name: "Instagram", href: "https://www.instagram.com/parigo_music/", label: { fr: "Parigo sur Instagram", en: "Parigo on Instagram" } },
  { name: "YouTube", href: "https://www.youtube.com/@parigoproductionmusic", label: { fr: "Parigo sur YouTube", en: "Parigo on YouTube" } },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/parigo/", label: { fr: "Parigo sur LinkedIn", en: "Parigo on LinkedIn" } },
  { name: "Facebook", href: "https://www.facebook.com/Parigomusic", label: { fr: "Parigo sur Facebook", en: "Parigo on Facebook" } },
  { name: "Bandcamp", href: "https://parigomusic.bandcamp.com/music", label: { fr: "Parigo sur Bandcamp", en: "Parigo on Bandcamp" } },
  { name: "Spotify", href: "https://open.spotify.com/user/zy4tz4ibp2hi7qvf315g5dv85/playlists", label: { fr: "Les playlists Parigo sur Spotify", en: "Parigo playlists on Spotify" } },
  { name: "TikTok", href: "https://www.tiktok.com/@parigomusic", label: { fr: "Parigo sur TikTok", en: "Parigo on TikTok" } },
  { name: "Linktree", href: "https://linktr.ee/parigomusicproduction", label: { fr: "Tous les liens Parigo sur Linktree", en: "All Parigo links on Linktree" } },
] as const;

export const LINKTREE_URL = SOCIAL_PLATFORMS.find((platform) => platform.name === "Linktree")!.href;

export function SocialPlatformIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: SocialPlatformName }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...props };
  if (name === "Instagram") return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.6" cy="6.5" r=".8" fill="currentColor" stroke="none" /></svg>;
  if (name === "YouTube") return <svg {...common}><path d="M21 12c0 2.2-.2 4.2-.6 5.2-.3.8-.9 1.4-1.7 1.7-1.4.4-5 .6-6.7.6s-5.3-.2-6.7-.6a2.7 2.7 0 0 1-1.7-1.7C3.2 16.2 3 14.2 3 12s.2-4.2.6-5.2c.3-.8.9-1.4 1.7-1.7 1.4-.4 5-.6 6.7-.6s5.3.2 6.7.6c.8.3 1.4.9 1.7 1.7.4 1 .6 3 .6 5.2Z" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" /></svg>;
  if (name === "LinkedIn") return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="1.5" /><path d="M8 10v7M8 7.2v.1M11.5 17v-4c0-1.7 1-2.8 2.5-2.8 1.6 0 2.5 1.1 2.5 2.8v4M11.5 10.5V17" /></svg>;
  if (name === "Facebook") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M13.2 20v-7h2.4l.4-2.7h-2.8V8.6c0-.8.3-1.4 1.4-1.4H16V4.8c-.4-.1-1.2-.2-2.1-.2-2.2 0-3.7 1.4-3.7 3.8v1.9H8V13h2.2v7" fill="currentColor" stroke="none" /></svg>;
  if (name === "Bandcamp") return <svg {...common} fill="currentColor" stroke="none"><path d="M7.1 6.6h14.4l-4.6 10.8H2.5L7.1 6.6Z" /></svg>;
  if (name === "Spotify") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M7 9.2c3.4-1 7.5-.7 10.6.9M7.8 12.4c2.9-.8 6.4-.5 9 .7M8.6 15.4c2.3-.6 5-.3 7.1.6" /></svg>;
  if (name === "TikTok") return <svg {...common} fill="currentColor" stroke="none"><path d="M14.2 3h3.1c.3 2.1 1.5 3.4 3.7 3.8V10a8.4 8.4 0 0 1-3.7-1.1v6.2a5.9 5.9 0 1 1-5.9-5.9c.4 0 .8 0 1.2.1v3.2a2.8 2.8 0 1 0 1.6 2.6V3Z" /></svg>;
  return <svg {...common}><path d="M12 3v18M6.3 6.2l11.4 11.6M17.7 6.2 6.3 17.8M3.5 10.2h17M3.5 13.8h17" /><path d="m8.5 21 3.5-3.5 3.5 3.5" /></svg>;
}
