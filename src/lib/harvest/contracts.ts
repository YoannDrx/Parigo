import "server-only";

import { z } from "zod";

const harvestId = z.union([z.string(), z.number()]).transform(String);
const harvestNumber = z.union([z.number(), z.string()]).transform((value, context) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    context.addIssue({ code: "custom", message: "Expected a Harvest number" });
    return z.NEVER;
  }
  return parsed;
});
const harvestNullableNumber = z.union([z.number(), z.string(), z.null()]).transform((value, context) => {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    context.addIssue({ code: "custom", message: "Expected a Harvest number or an empty value" });
    return z.NEVER;
  }
  return parsed;
});
const harvestBpm = z.union([z.number(), z.string()]).transform((value, context) => {
  const source = String(value).trim();
  const range = source.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  const parsed = range
    ? (Number(range[1]) + Number(range[2])) / 2
    : Number(source);
  if (!Number.isFinite(parsed)) {
    context.addIssue({ code: "custom", message: "Expected a Harvest BPM value" });
    return z.NEVER;
  }
  return Math.round(parsed);
});
const harvestBoolean = z.union([z.boolean(), z.number(), z.string()]).transform((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return ["true", "1", "yes"].includes(value.toLowerCase());
});
const stringList = z.union([z.array(z.string()), z.string(), z.null()]).optional();

export const HarvestRightHolderSchema = z.looseObject({
  ID: harvestId,
  Name: z.string().optional().default(""),
  FirstName: z.string().optional().nullable(),
  MiddleName: z.string().optional().nullable(),
  LastName: z.string().optional().nullable(),
  Capacity: z.string().optional().nullable(),
});

export const HarvestTrackSchema = z.looseObject({
  ID: harvestId,
  Name: z.string().optional(),
  DisplayTitle: z.string().optional(),
  Title: z.string().optional(),
  MainTrackID: harvestId.optional().nullable(),
  TrackNumber: harvestNumber.optional().nullable(),
  LengthSeconds: harvestNumber.optional().nullable(),
  Comment: z.string().optional().nullable(),
  Lyrics: z.string().optional().nullable(),
  Composer: stringList,
  Artist: stringList,
  Publisher: stringList,
  AlbumID: harvestId.optional().nullable(),
  AlbumName: z.string().optional().nullable(),
  AlbumTitle: z.string().optional().nullable(),
  AlbumReleaseDate: z.union([z.string(), z.null()]).optional(),
  LibraryID: harvestId.optional().nullable(),
  LibraryName: z.string().optional().nullable(),
  LibraryType: z.string().optional().nullable(),
  LibraryFeatured: harvestBoolean.optional(),
  Highlighted: harvestBoolean.optional(),
  Bpm: harvestBpm.optional().nullable(),
  Version: z.string().optional().nullable(),
  CDCode: z.string().optional().nullable(),
  ISRC: z.string().optional().nullable(),
  IsAlternate: harvestBoolean.optional(),
  IsExplicit: harvestBoolean.optional(),
  Mood: stringList,
  Tags: stringList,
  Keywords: stringList,
  Genre: stringList,
  Instrumentation: stringList,
  MusicFor: stringList,
  AlternateCount: harvestNumber.optional().nullable(),
  StemCount: harvestNumber.optional().nullable(),
  AlternateTracks: z.array(z.unknown()).optional().default([]),
  Stems: z.array(z.unknown()).optional().default([]),
  RightHolders: z.array(HarvestRightHolderSchema).optional().default([]),
  TrackRate: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const HarvestAlbumSchema = z.looseObject({
  ID: harvestId,
  Name: z.string().optional(),
  DisplayTitle: z.string().optional(),
  Title: z.string().optional(),
  LibraryID: harvestId.optional().nullable(),
  LibraryName: z.string().optional().nullable(),
  Detail: z.string().optional().nullable(),
  Description: z.string().optional().nullable(),
  ReleaseDate: z.string().optional().nullable(),
  LastUpdated: z.string().optional().nullable(),
  TrackCount: harvestNumber.optional().nullable(),
  Featured: harvestBoolean.optional(),
  LibraryFeatured: harvestBoolean.optional(),
  Code: z.string().optional().nullable(),
  CdCode: z.string().optional().nullable(),
  Genre: stringList,
  Mood: stringList,
  Keywords: stringList,
  Styles: z.array(z.looseObject({ ID: harvestId, Name: z.string() })).optional().default([]),
});

export const HarvestPlaylistSchema = z.looseObject({
  ID: harvestId,
  Name: z.string().optional(),
  DisplayTitle: z.string().optional(),
  Title: z.string().optional(),
  Description: z.string().optional().nullable(),
  TrackCount: harvestNumber.optional().nullable(),
  Type: z.string().optional().nullable(),
  Category: z.string().optional().nullable(),
  CreatedDate: z.string().optional().nullable(),
  LastUpdated: z.string().optional().nullable(),
  Tracks: z.array(HarvestTrackSchema).optional().default([]),
});

export const HarvestSearchResponseSchema = z.looseObject({
  TotalTracks: harvestNumber.optional().default(0),
  TotalAlbums: harvestNumber.optional().default(0),
  Tracks: z.array(HarvestTrackSchema).optional().default([]),
  Albums: z.array(HarvestAlbumSchema).optional().default([]),
  Facets: z.record(z.string(), z.unknown()).optional().default({}),
});

export const HarvestMemberSchema = z.looseObject({
  ID: harvestId,
  FirstName: z.string().optional().default(""),
  LastName: z.string().optional().default(""),
  Email: z.string().optional().default(""),
  Username: z.string().optional().default(""),
  Company: z.string().optional().nullable(),
  Country: z.string().optional().nullable(),
  Production: z.string().optional().nullable(),
  SubProduction: z.string().optional().nullable(),
  Position: z.string().optional().nullable(),
  Address1: z.string().optional().nullable(),
  Address2: z.string().optional().nullable(),
  Suburb: z.string().optional().nullable(),
  State: z.string().optional().nullable(),
  Postcode: z.string().optional().nullable(),
  Phone: z.string().optional().nullable(),
  Status: z.string().optional().nullable(),
  RegionID: harvestId.optional().nullable(),
  TermsAccept: harvestBoolean.optional(),
  PrivacyAccept: harvestBoolean.optional(),
  Subscribe: harvestBoolean.optional(),
  FileFormat: harvestId.optional().nullable(),
  FileFormats: z.array(z.unknown()).optional().default([]),
  DownloadEnabled: harvestBoolean.optional(),
  DownloadEnabledType: z.string().optional().nullable(),
  DownloadLimit: harvestNullableNumber.optional(),
  DownloadsUsed: harvestNullableNumber.optional(),
  DownloadsRemaining: harvestNullableNumber.optional(),
  DownloadStem: harvestBoolean.optional(),
  SampleEnabled: harvestBoolean.optional(),
  HasProfileImage: harvestBoolean.optional(),
  Website: z.string().optional().nullable(),
  PositionType: z.string().optional().nullable(),
  Freelancer: harvestBoolean.optional(),
  ManagedBy: z.looseObject({
    Name: z.string().optional().default(""),
    Email: z.string().optional().default(""),
    Phone: z.string().optional().default(""),
  }).optional().nullable(),
  ServiceInfoURLs: z.record(z.string(), z.unknown()).optional(),
});

export const HarvestMemberTagSchema = z.looseObject({
  TagID: harvestId,
  TagName: z.string(),
  Type: z.string().optional(),
  CreateDate: z.string().optional(),
  LastUpdateDate: z.string().optional(),
  TrackCount: harvestNumber.optional(),
  Tracks: z.array(HarvestTrackSchema).optional(),
});

export type HarvestTrackPayload = z.infer<typeof HarvestTrackSchema>;
export type HarvestAlbumPayload = z.infer<typeof HarvestAlbumSchema>;
export type HarvestPlaylistPayload = z.infer<typeof HarvestPlaylistSchema>;
export type HarvestMemberPayload = z.infer<typeof HarvestMemberSchema>;
export type HarvestMemberTagPayload = z.infer<typeof HarvestMemberTagSchema>;
