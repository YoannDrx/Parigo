import { z } from "zod";
import type { AimsCapabilities, AimsExternalPlatform, AimsSearchRequest, SimilarityCapabilities } from "@/types";
import { isRecord } from "@/lib/harvest/errors";
import { asBoolean, asList, asNumber, asString } from "@/lib/harvest/values";

export const AIMS_RESULT_LIMIT = 30;
export const AIMS_MAX_SEEDS = 10;
export const AIMS_MAX_UPLOAD_BYTES = 120 * 1024 * 1024;
export const AIMS_MAX_AUDIO_DURATION_SECONDS = 900;
export const AIMS_UPLOAD_CONTENT_TYPES = ["audio/mpeg", "audio/wav"] as const;

const trackSearchSchema = z.object({
  type: z.literal("track"),
  seedTrackIds: z.array(z.string().trim().min(1).max(256)).min(1).max(AIMS_MAX_SEEDS)
    .transform((ids) => [...new Set(ids)]),
  includeSeed: z.boolean().optional().default(false),
  prioritizeBpm: z.boolean().optional().default(false),
});

const promptSearchSchema = z.object({
  type: z.literal("prompt"),
  prompt: z.string().trim().min(3).max(500),
  locale: z.enum(["fr", "en"]),
});

const uploadSearchSchema = z.object({
  type: z.literal("upload"),
  referenceToken: z.string().min(32).max(8_192),
});

const urlSearchSchema = z.object({
  type: z.literal("url"),
  referenceToken: z.string().min(32).max(8_192),
});

export const AimsSearchRequestSchema = z.discriminatedUnion("type", [
  trackSearchSchema,
  promptSearchSchema,
  uploadSearchSchema,
  urlSearchSchema,
]);

export const AimsUploadMetadataSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(["audio/mpeg", "audio/wav", "audio/wave", "audio/x-wav"]),
  size: z.number().int().min(1).max(AIMS_MAX_UPLOAD_BYTES),
});

export const AimsUploadConfirmationSchema = z.object({
  uploadToken: z.string().min(32).max(8_192),
});

export const AimsExternalReferenceSchema = z.object({
  url: z.url().max(2_048),
});

export interface AimsProviderFlags {
  track: boolean;
  prompt: boolean;
  upload: boolean;
  url: boolean;
  contractVerified: boolean;
  promptCapabilityOverride: boolean;
  referenceTokensConfigured: boolean;
}

const PLATFORM_HOSTS: Record<AimsExternalPlatform, ReadonlySet<string>> = {
  youtube: new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]),
  spotify: new Set(["open.spotify.com"]),
  vimeo: new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]),
  soundcloud: new Set(["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"]),
  appleMusic: new Set(["music.apple.com"]),
  tiktok: new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com"]),
};

export const AIMS_PLATFORM_HARVEST_TYPES: Record<AimsExternalPlatform, string> = {
  youtube: "YouTube",
  spotify: "Spotify",
  vimeo: "Vimeo",
  soundcloud: "SoundCloud",
  appleMusic: "AppleMusic",
  tiktok: "TikTok",
};

// CloudSearch uses a slightly different spelling from getexternalaudiobyurl
// for YouTube. Keep both contracts explicit instead of normalising the value.
export const AIMS_PLATFORM_SEARCH_TYPES: Record<AimsExternalPlatform, string> = {
  youtube: "Youtube",
  spotify: "Spotify",
  vimeo: "Vimeo",
  soundcloud: "SoundCloud",
  appleMusic: "AppleMusic",
  tiktok: "TikTok",
};

function hasEmbeddedCredentials(url: URL): boolean {
  const authority = url.href.slice(url.protocol.length + 2).split("/", 1)[0];
  return authority.includes("@");
}

export function detectAimsExternalPlatform(rawUrl: string): AimsExternalPlatform | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || hasEmbeddedCredentials(url) || url.port) return null;
    const hostname = url.hostname.toLocaleLowerCase("en").replace(/\.$/, "");
    for (const [platform, hosts] of Object.entries(PLATFORM_HOSTS) as Array<[AimsExternalPlatform, ReadonlySet<string>]>) {
      if (hosts.has(hostname)) return platform;
    }
    return null;
  } catch {
    return null;
  }
}

export function normalizeAimsAudioContentType(contentType: string): "audio/mpeg" | "audio/wave" | null {
  if (contentType === "audio/mpeg") return "audio/mpeg";
  if (["audio/wav", "audio/wave", "audio/x-wav"].includes(contentType)) return "audio/wave";
  return null;
}

export function aimsAudioExtension(contentType: string): "mp3" | "wav" | null {
  const normalized = normalizeAimsAudioContentType(contentType);
  if (normalized === "audio/mpeg") return "mp3";
  if (normalized === "audio/wave") return "wav";
  return null;
}

function caseInsensitiveValue(record: Record<string, unknown>, key: string): unknown {
  const exact = record[key];
  if (exact !== undefined) return exact;
  const normalizedKey = key.toLocaleLowerCase("en");
  return Object.entries(record).find(([candidate]) => candidate.toLocaleLowerCase("en") === normalizedKey)?.[1];
}

function settingsRecord(provider: Record<string, unknown>): Record<string, unknown> {
  const settings = caseInsensitiveValue(provider, "Settings");
  return isRecord(settings) ? settings : provider;
}

function modeSettings(settings: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = caseInsensitiveValue(settings, key);
  return isRecord(value) ? value : {};
}

export function findAimsProvider(serviceInfo: Record<string, unknown>): Record<string, unknown> | undefined {
  const providers = caseInsensitiveValue(serviceInfo, "SearchSimilarInfo");
  if (!Array.isArray(providers)) return undefined;
  return providers.find((provider): provider is Record<string, unknown> => {
    if (!isRecord(provider)) return false;
    return [provider.Type, provider.Provider, provider.Name]
      .map((value) => asString(value).toLocaleLowerCase("en"))
      .some((value) => value.includes("aims"));
  });
}

export function parseAimsCapabilities(serviceInfo: Record<string, unknown>, flags: AimsProviderFlags): AimsCapabilities {
  const provider = findAimsProvider(serviceInfo);
  const settings = provider ? settingsRecord(provider) : {};
  // Harvest's public contract currently spells these fields "Similiar".
  const track = modeSettings(settings, "SimiliarByTrackID");
  const prompt = modeSettings(settings, "SimiliarByPrompt");
  const upload = modeSettings(settings, "SimiliarByUpload");
  const externalUrl = modeSettings(settings, "SimiliarByUrl");
  const providerAvailable = Boolean(provider);
  const verified = flags.contractVerified && providerAvailable;
  const trackAdvertised = asBoolean(track.Allow);
  const promptAdvertised = asBoolean(prompt.Allow);
  const uploadAdvertised = asBoolean(upload.Allow);
  const urlAdvertised = asBoolean(externalUrl.Allow);
  const uploadSizeMb = asNumber(upload.MaximumSize, 120);
  const uploadDuration = asNumber(upload.MaximumDuration, AIMS_MAX_AUDIO_DURATION_SECONDS);
  const externalTypes = asList(externalUrl.Types);
  const platforms = (Object.entries(AIMS_PLATFORM_HARVEST_TYPES) as Array<[AimsExternalPlatform, string]>)
    .filter(([, harvestType]) => externalTypes.some((value) => value.toLocaleLowerCase("en") === harvestType.toLocaleLowerCase("en")))
    .map(([platform]) => platform);

  return {
    provider: "AIMS",
    track: {
      advertised: trackAdvertised,
      enabled: verified && trackAdvertised && flags.track,
      multiSeed: asBoolean(settings.AllowMultiSeedSearching) && trackAdvertised,
      prioritizeBpm: asBoolean(track.AllowPrioritizeBPM),
    },
    prompt: {
      advertised: promptAdvertised,
      enabled: verified && flags.prompt && (promptAdvertised || flags.promptCapabilityOverride),
    },
    upload: {
      advertised: uploadAdvertised,
      enabled: verified && uploadAdvertised && flags.upload && flags.referenceTokensConfigured,
      contentTypes: ["audio/mpeg", "audio/wav"],
      maxBytes: Math.min(Math.max(uploadSizeMb, 1), 120) * 1024 * 1024,
      maxDurationSeconds: Math.min(Math.max(uploadDuration, 1), AIMS_MAX_AUDIO_DURATION_SECONDS),
    },
    externalUrl: {
      advertised: urlAdvertised,
      enabled: verified && urlAdvertised && flags.url && flags.referenceTokensConfigured,
      platforms,
    },
    playlistSuggestions: providerAvailable,
  };
}

export function publicSimilarityCapabilities(
  capabilities: AimsCapabilities,
  publicEnabled = true,
): SimilarityCapabilities {
  const normalized = {
    track: capabilities.track,
    prompt: {
      ...capabilities.prompt,
      // The public contract describes what Parigo can actually offer. Harvest
      // may still advertise prompt=false while accepting successful searches.
      advertised: capabilities.prompt.advertised || capabilities.prompt.enabled,
    },
    upload: capabilities.upload,
    externalUrl: capabilities.externalUrl,
    playlistSuggestions: capabilities.playlistSuggestions,
  };
  if (publicEnabled) return normalized;
  return {
    track: { ...normalized.track, enabled: false },
    prompt: { ...normalized.prompt, enabled: false },
    upload: { ...normalized.upload, enabled: false },
    externalUrl: { ...normalized.externalUrl, enabled: false },
    playlistSuggestions: false,
  };
}

type AimsAudioSeed = { TrackID: string } | { Prompt: string } | { Url: string; Type: string };

export function buildAimsCloudSearch(
  input: AimsSearchRequest,
  options: { regionId: string; reference?: { resourceUrl: string; harvestType: string } },
): Record<string, unknown> {
  let audio: AimsAudioSeed[];
  let includeSeed = false;
  let prioritizeBpm = false;
  if (input.type === "track") {
    audio = input.seedTrackIds.map((TrackID) => ({ TrackID }));
    includeSeed = Boolean(input.includeSeed);
    prioritizeBpm = Boolean(input.prioritizeBpm);
  } else if (input.type === "prompt") {
    audio = [{ Prompt: input.prompt }];
  } else {
    if (!options.reference) throw new Error("AIMS reference is required");
    audio = [{ Url: options.reference.resourceUrl, Type: options.reference.harvestType }];
  }

  return {
    SaveSearchHistory: false,
    RegionID: options.regionId,
    SearchFilters: {
      SearchType: "Normal",
      LibraryType: "",
      IncludeInactive: false,
      MainOnly: true,
      AlternateOnly: false,
      NearestBPM: false,
      NearestDuration: false,
      NearestAlternate: false,
      ParentSearchHistoryID: "",
      SearchTermBundle: { St_Audio: { Audio: audio, Start: "0", Duration: "0" } },
      ResultView: {
        View: "Track",
        Sort_Predefined: "EvokeRanking",
        RankExpression: "",
        Skip: "0",
        Limit: String(AIMS_RESULT_LIMIT),
        ReturnRates: false,
        Evoke_IncludeSeed: includeSeed,
        Evoke_PrioritizeBPM: prioritizeBpm,
        Evoke_SuppressVocals: false,
        Facet_Library: false,
        Facet_Style: false,
        Facet_BPM: false,
        Facet_Duration: false,
        Facet_Category: false,
      },
    },
  };
}
