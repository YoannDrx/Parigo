import type { SimilarityExternalPlatform } from "@/types";

const PLATFORM_HOSTS: Record<SimilarityExternalPlatform, ReadonlySet<string>> = {
  youtube: new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]),
  spotify: new Set(["open.spotify.com"]),
  vimeo: new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]),
  soundcloud: new Set(["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"]),
  appleMusic: new Set(["music.apple.com"]),
  tiktok: new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com"]),
};

function hasEmbeddedCredentials(url: URL): boolean {
  const authority = url.href.slice(url.protocol.length + 2).split("/", 1)[0];
  return authority.includes("@");
}

export function detectSimilarityPlatform(rawUrl: string): SimilarityExternalPlatform | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || hasEmbeddedCredentials(url) || url.port) return null;
    const hostname = url.hostname.toLocaleLowerCase("en").replace(/\.$/, "");
    for (const [platform, hosts] of Object.entries(PLATFORM_HOSTS) as Array<[SimilarityExternalPlatform, ReadonlySet<string>]>) {
      if (hosts.has(hostname)) return platform;
    }
    return null;
  } catch {
    return null;
  }
}

export function looksLikeExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}
