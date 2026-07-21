import "server-only";

import { getServiceInfo } from "./client";
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

export async function getAssetTemplates(): Promise<HarvestAssetTemplates> {
  const info = await getServiceInfo();
  const urls = isRecord(info.ServiceInfoURLs) ? info.ServiceInfoURLs : {};
  return {
    trackStream: asString(urls.TrackStreamURL),
    albumArt: asString(urls.AlbumArtURL),
    libraryLogo: asString(urls.LibraryLogoUrl),
    playlistArt: asString(urls.PlaylistArtUrl),
    waveformData: asString(urls.WaveformDataPointUrl),
    directDownload: asString(urls.DirectDownloadURL),
  };
}

export function assetUrl(
  template: string,
  values: Record<string, string | number | boolean | undefined>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    result = result.replace(new RegExp(`\\{${key}\\}`, "gi"), encodeURIComponent(String(value)));
  }
  return result.replace(/\{[^}]+\}/g, "");
}
