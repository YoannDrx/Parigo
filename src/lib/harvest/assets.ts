import "server-only";

import { getServiceInfo, memberRequest } from "./client";
import { isRecord } from "./errors";
import { asBoolean, asNumber, asString, recordArray } from "./values";

export interface HarvestAssetTemplates {
  trackStream: string;
  albumArt: string;
  libraryLogo: string;
  playlistArt: string;
  waveformData: string;
  directDownload: string;
}

export interface HarvestDownloadFormat {
  id: string;
  extension: string;
  bitRate?: number;
  sampleRate?: number;
  sampleSize?: number;
  isMaster: boolean;
  isDefault: boolean;
  label: string;
}

const memberTemplateCache = new Map<string, {
  expiresAt: number;
  value: HarvestAssetTemplates;
}>();
const MEMBER_TEMPLATE_CACHE_MS = 5 * 60_000;

export async function getDownloadFormats(): Promise<HarvestDownloadFormat[]> {
  const info = await getServiceInfo();
  return recordArray(info, "FileFormats").map((format) => {
    const extension = asString(format.FileExtension, "MP3").replace(/^\./, "").toUpperCase();
    const rawBitRate = asNumber(format.BitRate);
    const bitRate = rawBitRate ? (rawBitRate >= 1000 ? rawBitRate / 1000 : rawBitRate) : undefined;
    const sampleRate = asNumber(format.SampleRate) || undefined;
    const sampleSize = asNumber(format.SampleSize) || undefined;
    const detail = bitRate ? `${bitRate} kb/s` : sampleRate ? `${sampleRate >= 1000 ? Math.round(sampleRate / 1000) : sampleRate} kHz` : "";
    return {
      id: asString(format.ID),
      extension,
      bitRate,
      sampleRate,
      sampleSize,
      isMaster: asBoolean(format.IsMaster),
      isDefault: asBoolean(format.Isdefaultdownload ?? format.isdefaultdownloadfortype),
      label: [extension, detail].filter(Boolean).join(" · "),
    };
  }).filter((format) => format.id);
}

function mapAssetTemplates(urls: Record<string, unknown>): HarvestAssetTemplates {
  return {
    trackStream: asString(urls.TrackStreamURL),
    albumArt: asString(urls.AlbumArtURL),
    libraryLogo: asString(urls.LibraryLogoUrl),
    playlistArt: asString(urls.PlaylistArtUrl),
    waveformData: asString(urls.WaveformDataPointUrl),
    directDownload: asString(urls.DirectDownloadURL),
  };
}

export async function getAssetTemplates(memberToken?: string): Promise<HarvestAssetTemplates> {
  const info = await getServiceInfo();
  const urls = isRecord(info.ServiceInfoURLs) ? info.ServiceInfoURLs : {};
  const serviceTemplates = mapAssetTemplates(urls);
  if (!memberToken) return serviceTemplates;
  const cached = memberTemplateCache.get(memberToken);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const payload = await memberRequest<Record<string, unknown>>(
    memberToken,
    (token) => `/getmember/${token}`,
  );
  const member = isRecord(payload.MemberAccount)
    ? payload.MemberAccount
    : isRecord(payload.Member)
      ? payload.Member
      : payload;
  const memberUrls = isRecord(member.ServiceInfoURLs) ? member.ServiceInfoURLs : {};
  const memberTemplates = mapAssetTemplates(memberUrls);
  const value = {
    trackStream: memberTemplates.trackStream || serviceTemplates.trackStream,
    albumArt: memberTemplates.albumArt || serviceTemplates.albumArt,
    libraryLogo: memberTemplates.libraryLogo || serviceTemplates.libraryLogo,
    playlistArt: memberTemplates.playlistArt || serviceTemplates.playlistArt,
    waveformData: memberTemplates.waveformData || serviceTemplates.waveformData,
    directDownload: memberTemplates.directDownload || serviceTemplates.directDownload,
  };
  memberTemplateCache.set(memberToken, {
    expiresAt: Date.now() + MEMBER_TEMPLATE_CACHE_MS,
    value,
  });
  return value;
}

export function assetUrl(
  template: string,
  values: Record<string, string | number | boolean | undefined>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const encodedValue = encodeURIComponent(String(value));
    result = result
      .replace(new RegExp(`\\{${key}\\}`, "gi"), encodedValue)
      .replace(new RegExp(`%7B${key}%7D`, "gi"), encodedValue);
  }
  return result
    .replace(/\{[^}]+\}/g, "")
    .replace(/%7B[^%]+%7D/gi, "");
}
