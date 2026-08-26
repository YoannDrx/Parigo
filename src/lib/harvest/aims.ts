import "server-only";

import type { AimsCapabilities, AimsExternalPlatform, AimsSearchRequest, AimsSearchSource, Track } from "@/types";
import { logEvent } from "@/lib/logger";
import {
  AIMS_PLATFORM_HARVEST_TYPES,
  AIMS_PLATFORM_SEARCH_TYPES,
  aimsAudioExtension,
  buildAimsCloudSearch,
  normalizeAimsAudioContentType,
  parseAimsCapabilities,
} from "@/lib/search/aims-contract";
import { getAssetTemplates } from "./assets";
import { mapTrack } from "./catalog";
import { getRegionId, getServiceInfo, guestRequest, memberRequest } from "./client";
import { HarvestSearchResponseSchema } from "./contracts";
import { HarvestError } from "./errors";
import { aimsReferenceTokensConfigured, type AimsReferencePayload } from "./aims-reference";
import { asString } from "./values";

function enabled(name: string): boolean {
  return process.env[name]?.trim() === "1";
}

export function aimsFeatureFlags() {
  return {
    track: enabled("AIMS_TRACK_SEARCH_ENABLED"),
    prompt: enabled("AIMS_PROMPT_SEARCH_ENABLED"),
    upload: enabled("AIMS_UPLOAD_SEARCH_ENABLED"),
    url: enabled("AIMS_URL_SEARCH_ENABLED"),
    contractVerified: enabled("AIMS_CONTRACT_VERIFIED"),
    promptCapabilityOverride: enabled("AIMS_PROMPT_CAPABILITY_OVERRIDE"),
    referenceTokensConfigured: aimsReferenceTokensConfigured(),
  };
}

export async function getAimsCapabilities(): Promise<AimsCapabilities> {
  return parseAimsCapabilities(await getServiceInfo(), aimsFeatureFlags());
}

function assertAimsFeature(capabilities: AimsCapabilities, type: AimsSearchSource): void {
  const available = type === "track"
    ? capabilities.track.enabled
    : type === "prompt"
      ? capabilities.prompt.enabled
      : type === "upload"
        ? capabilities.upload.enabled
        : capabilities.externalUrl.enabled;
  if (!available) {
    throw new HarvestError("AIMS search mode is not enabled", "AIMS_FEATURE_UNAVAILABLE", 503, false);
  }
}

async function aimsMemberRequest<T>(
  memberToken: string | undefined,
  path: (token: string) => string,
  init: RequestInit,
  timeoutMs = 20_000,
): Promise<T> {
  return memberToken
    ? memberRequest<T>(memberToken, path, init, timeoutMs)
    : guestRequest<T>(path, init, { timeoutMs });
}

function normalizeAimsFailure(error: unknown, source: AimsSearchSource): never {
  if (error instanceof HarvestError) {
    const description = error.message.toLocaleLowerCase("en");
    if (source === "track" && error.code === "VALIDATION_FAILED" && error.upstreamCode === "1") {
      throw new HarvestError("One or more source tracks are invalid", "AIMS_INVALID_SEED", 400, false, error.upstreamCode);
    }
    if (/analysis.*pending|pending.*analysis|still.*analy/i.test(description)) {
      throw new HarvestError("AIMS analysis is still pending", "AIMS_ANALYSIS_PENDING", 202, true, error.upstreamCode);
    }
    if (/timed?\s*out|timeout/i.test(description)) {
      throw new HarvestError("AIMS search timed out", "AIMS_TIMEOUT", 504, true, error.upstreamCode);
    }
    if (["HARVEST_UNAVAILABLE", "HARVEST_INVALID_RESPONSE"].includes(error.code)) {
      throw new HarvestError("AIMS is temporarily unavailable", "AIMS_UNAVAILABLE", 503, true, error.upstreamCode);
    }
  }
  throw error;
}

export async function searchAims(
  input: AimsSearchRequest,
  options: { memberToken?: string; reference?: AimsReferencePayload } = {},
): Promise<{ tracks: Track[]; total: number; indexed?: boolean }> {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const capabilities = await getAimsCapabilities();
  assertAimsFeature(capabilities, input.type);
  if (input.type === "track" && input.seedTrackIds.length > 1 && !capabilities.track.multiSeed) {
    throw new HarvestError("Multi-track AIMS search is unavailable", "AIMS_FEATURE_UNAVAILABLE", 503, false);
  }
  if (input.type === "track" && input.prioritizeBpm && !capabilities.track.prioritizeBpm) {
    throw new HarvestError("BPM prioritisation is unavailable", "VALIDATION_FAILED", 400, false);
  }
  if ((input.type === "upload" || input.type === "url") && options.reference?.kind !== input.type) {
    throw new HarvestError("AIMS reference type does not match the search", "VALIDATION_FAILED", 400, false);
  }

  try {
    const regionId = await getRegionId();
    const requestBody = JSON.stringify(buildAimsCloudSearch(input, {
      regionId,
      ...(options.reference ? {
        reference: {
          resourceUrl: options.reference.resourceUrl,
          harvestType: options.reference.harvestType,
        },
      } : {}),
    }));
    const [unparsedPayload, templates] = await Promise.all([
      aimsMemberRequest<unknown>(
        options.memberToken,
        (token) => `/cloudsearch/${token}`,
        { method: "POST", body: requestBody },
      ),
      getAssetTemplates(options.memberToken),
    ]);
    const payload = HarvestSearchResponseSchema.parse(unparsedPayload);
    const tracks = payload.Tracks
      .slice(0, 30)
      .map((item) => mapTrack(item, templates, undefined, `aims-${input.type}`));
    logEvent({
      level: "info",
      message: "aims_search",
      route: "aims-search",
      requestId,
      durationMs: Date.now() - startedAt,
      searchMode: input.type,
      provider: "AIMS",
      total: tracks.length,
    });
    return {
      tracks,
      total: tracks.length,
      ...(input.type === "track" ? { indexed: tracks.length > 0 } : {}),
    };
  } catch (error) {
    logEvent({
      level: "warn",
      message: "aims_search_failed",
      route: "aims-search",
      requestId,
      durationMs: Date.now() - startedAt,
      searchMode: input.type,
      provider: "AIMS",
      code: error instanceof HarvestError ? error.code : "UNKNOWN",
    });
    return normalizeAimsFailure(error, input.type);
  }
}

export async function getAimsUpload(
  input: { contentType: string },
  memberToken?: string,
): Promise<{ uploadUrl: string; resourceUrl: string; fileName: string; contentType: string; harvestType: "MP3" | "WAV" }> {
  const capabilities = await getAimsCapabilities();
  assertAimsFeature(capabilities, "upload");
  const normalizedContentType = normalizeAimsAudioContentType(input.contentType);
  const extension = aimsAudioExtension(input.contentType);
  if (!normalizedContentType || !extension) {
    throw new HarvestError("Only MP3 and WAV files are accepted", "VALIDATION_FAILED", 400, false);
  }
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const payload = await aimsMemberRequest<Record<string, unknown>>(
    memberToken,
    (token) => `/getpresigneduploadurl/${token}`,
    {
      method: "POST",
      body: JSON.stringify({
        AssetType: "AudioExtract",
        FileName: fileName,
        ContentType: normalizedContentType,
        ExpiresInSeconds: "900",
        ObjectId: "",
      }),
    },
  );
  const uploadUrl = asString(payload.PresignedUploadUrl);
  const resourceUrl = asString(payload.ResourceUrl);
  if (!uploadUrl || !resourceUrl) {
    throw new HarvestError("AIMS did not return an audio upload URL", "HARVEST_INVALID_RESPONSE", 502, false);
  }
  return {
    uploadUrl,
    resourceUrl,
    fileName,
    contentType: normalizedContentType,
    harvestType: extension === "mp3" ? "MP3" : "WAV",
  };
}

export async function confirmAimsUpload(reference: AimsReferencePayload, memberToken?: string): Promise<void> {
  if (reference.kind !== "upload-pending" || !reference.fileName) {
    throw new HarvestError("AIMS upload reference is invalid", "VALIDATION_FAILED", 400, false);
  }
  await aimsMemberRequest<Record<string, unknown>>(
    memberToken,
    (token) => `/confirmpresignedupload/${token}`,
    {
      method: "POST",
      body: JSON.stringify({
        AssetType: "AudioExtract",
        FileName: reference.fileName,
        ReturnWaveformDatapoints: false,
        ReturnWaveformDatapointsUrl: false,
        ObjectId: "",
      }),
    },
  );
}

export async function createAimsExternalReference(
  rawUrl: string,
  platform: AimsExternalPlatform,
  memberToken?: string,
): Promise<{ resourceUrl: string; harvestType: string }> {
  const capabilities = await getAimsCapabilities();
  assertAimsFeature(capabilities, "url");
  if (!capabilities.externalUrl.platforms.includes(platform)) {
    throw new HarvestError("This audio platform is not enabled by Harvest", "VALIDATION_FAILED", 400, false);
  }
  const preparationType = AIMS_PLATFORM_HARVEST_TYPES[platform];
  await aimsMemberRequest<Record<string, unknown>>(
    memberToken,
    (token) => `/getexternalaudiobyurl/${token}`,
    {
      method: "POST",
      body: JSON.stringify({
        Url: rawUrl,
        Type: preparationType,
        ReturnWaveformDataPoints: false,
        ReturnWaveformDataPointsUrl: false,
      }),
    },
  );
  // Harvest documents ResourceUrl as an optional preview/sampling asset. The
  // similarity request itself must receive the original external URL.
  return {
    resourceUrl: rawUrl,
    harvestType: AIMS_PLATFORM_SEARCH_TYPES[platform],
  };
}
