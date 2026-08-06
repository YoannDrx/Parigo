import { z } from "zod";
import registry from "@/content/composer-profiles.generated.json";
import { harvestComposerCreditId, harvestComposerCreditLookupKeys, normalizeHarvestComposerCredit } from "@/lib/harvest/composer-credits";
import type { Track } from "@/types";
import { harvestMainWorkId } from "@/lib/harvest/track-works";

const nullableBioSchema = z.object({
  fr: z.string().min(1).nullable(),
  en: z.string().min(1).nullable(),
});

const scopedRelationSchema = z.object({
  albumCodes: z.array(z.string().regex(/^PGO\d{4}$/)).min(1),
  aliases: z.array(z.string().min(1)).min(1),
});

const imageOverrideSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("user-provided"),
    file: z.string().regex(/^[a-z0-9_]+\.(?:jpe?g|png|webp)$/),
  }),
  z.object({
    source: z.literal("portfolio-caro-git"),
    repository: z.literal("portfolio-caro"),
    commit: z.string().regex(/^[a-f0-9]{40}$/),
    path: z.string().min(1),
    file: z.string().regex(/^[a-z0-9_]+\.(?:jpe?g|png|webp)$/),
  }),
]);

const harvestCreditIdentitySchema = z.object({
  preferredName: z.string().min(1),
  aliases: z.array(z.string().min(1)).min(1),
  albumCodes: z.array(z.string().regex(/^PGO\d{4}$/)).optional(),
}).refine(
  (identity) => identity.aliases.some((alias) => normalizeHarvestComposerCredit(alias) === normalizeHarvestComposerCredit(identity.preferredName)),
  "Le nom Harvest préféré doit être inclus dans les alias de l’identité",
);

const composerProfileSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  kind: z.enum(["person", "group"]),
  bio: nullableBioSchema,
  image: z.string().regex(/^\/images\/composers\/(?:canonical\/[a-z0-9_]+\.webp|composer_placeholder\.svg)$/),
  imageStatus: z.enum(["portrait", "placeholder"]),
  harvest: z.object({
    aliases: z.array(z.string().min(1)),
    scopedRelations: z.array(scopedRelationSchema),
    creditIdentities: z.array(harvestCreditIdentitySchema).optional(),
  }),
  legacySlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  provenance: z.discriminatedUnion("source", [
    z.object({
      source: z.literal("portfolio-caro-git"),
      repository: z.literal("portfolio-caro"),
      commit: z.string().regex(/^[a-f0-9]{40}$/),
      bioSlug: z.string().nullable(),
      imageSlug: z.string().nullable(),
      editorialArtistSlug: z.string().nullable(),
      imageOverride: imageOverrideSchema.optional(),
    }),
    z.object({
      source: z.literal("portfolio-caro-api"),
      urls: z.object({ fr: z.string().url(), en: z.string().url() }),
      capturedAt: z.string().datetime(),
      artistSlug: z.string().min(1),
      imageUrl: z.string().url(),
      imageFallback: z.object({
        repository: z.literal("portfolio-caro"),
        ref: z.string().min(1),
        path: z.string().min(1),
      }).optional(),
    }),
    z.object({
      source: z.literal("user-provided"),
      capturedAt: z.string().datetime(),
      bioFile: z.string().min(1),
      sourceDocument: z.string().min(1).optional(),
      imageSource: z.object({
        repository: z.literal("portfolio-caro"),
        commit: z.string().regex(/^[a-f0-9]{40}$/),
        imageSlug: z.string().nullable(),
      }),
      imageOverride: imageOverrideSchema.optional(),
    }),
  ]),
});

export const CANONICAL_COMPOSER_PROFILE_COUNT = 55;

const registrySchema = z.object({
  generatedAt: z.string(),
  profiles: z.array(composerProfileSchema).length(CANONICAL_COMPOSER_PROFILE_COUNT),
}).superRefine((value, context) => {
  const slugs = new Set<string>();
  const names = new Set<string>();
  const globalAliases = new Map<string, string>();
  for (const profile of value.profiles) {
    if (slugs.has(profile.slug)) context.addIssue({ code: "custom", message: `Slug compositeur dupliqué : ${profile.slug}` });
    if (names.has(profile.name)) context.addIssue({ code: "custom", message: `Nom compositeur dupliqué : ${profile.name}` });
    slugs.add(profile.slug);
    names.add(profile.name);
    for (const alias of profile.harvest.aliases) {
      for (const lookupKey of harvestComposerCreditLookupKeys(alias)) {
        const owner = globalAliases.get(lookupKey);
        if (owner && owner !== profile.slug) {
          context.addIssue({ code: "custom", message: `Alias Harvest global partagé : ${alias} (${owner}, ${profile.slug})` });
        }
        globalAliases.set(lookupKey, profile.slug);
      }
    }
  }
});

export type CanonicalComposerProfile = z.infer<typeof composerProfileSchema>;
export type CanonicalHarvestCreditIdentity = z.infer<typeof harvestCreditIdentitySchema>;

const parsedRegistry = registrySchema.parse(registry);

export const CANONICAL_COMPOSER_SOURCE_COMMIT = "02e173bb95e0481e0dee29c3b2d6b3a8ca01e8e2";
export const canonicalComposerProfiles: CanonicalComposerProfile[] = [...parsedRegistry.profiles]
  .sort((left, right) => left.name.localeCompare(right.name, "fr", { sensitivity: "base" }));

const profileBySlug = new Map(canonicalComposerProfiles.map((profile) => [profile.slug, profile]));
const profileByLegacySlug = new Map(
  canonicalComposerProfiles.flatMap((profile) => profile.legacySlugs.map((slug) => [slug, profile] as const)),
);

export function canonicalHarvestCreditIdentities(profile: CanonicalComposerProfile): CanonicalHarvestCreditIdentity[] {
  if (profile.harvest.creditIdentities?.length) return profile.harvest.creditIdentities;

  const identities: CanonicalHarvestCreditIdentity[] = [];
  if (profile.harvest.aliases.length) {
    identities.push({
      preferredName: profile.harvest.aliases[0],
      aliases: profile.harvest.aliases,
    });
  }
  for (const relation of profile.harvest.scopedRelations) {
    for (const alias of relation.aliases) {
      identities.push({
        preferredName: alias,
        aliases: [alias],
        albumCodes: relation.albumCodes,
      });
    }
  }
  return identities;
}

const globalCreditIdentityByAlias = new Map<string, {
  profile: CanonicalComposerProfile;
  identity: CanonicalHarvestCreditIdentity;
}>();
const scopedCreditIdentities: Array<{
  profile: CanonicalComposerProfile;
  identity: CanonicalHarvestCreditIdentity;
}> = [];

for (const profile of canonicalComposerProfiles) {
  for (const identity of canonicalHarvestCreditIdentities(profile)) {
    const entry = { profile, identity };
    if (identity.albumCodes?.length) {
      scopedCreditIdentities.push(entry);
      continue;
    }
    for (const alias of identity.aliases) {
      for (const lookupKey of harvestComposerCreditLookupKeys(alias)) {
        globalCreditIdentityByAlias.set(lookupKey, entry);
      }
    }
  }
}

export function getCanonicalComposerProfile(slug: string): CanonicalComposerProfile | undefined {
  return profileBySlug.get(slug);
}

export function getCanonicalComposerProfileByLegacySlug(slug: string): CanonicalComposerProfile | undefined {
  return profileByLegacySlug.get(slug);
}

export function resolveCanonicalComposerCredit(
  credit: string,
  albumCode?: string,
): { profile: CanonicalComposerProfile; identity: CanonicalHarvestCreditIdentity } | undefined {
  return resolveCanonicalComposerCredits(credit, albumCode)[0];
}

export function resolveCanonicalComposerCredits(
  credit: string,
  albumCode?: string,
): Array<{ profile: CanonicalComposerProfile; identity: CanonicalHarvestCreditIdentity }> {
  const lookupKeys = harvestComposerCreditLookupKeys(credit);
  const lookupKeySet = new Set(lookupKeys);
  const matches: Array<{ profile: CanonicalComposerProfile; identity: CanonicalHarvestCreditIdentity }> = [];
  for (const lookupKey of lookupKeys) {
    const global = globalCreditIdentityByAlias.get(lookupKey);
    if (global) matches.push(global);
  }
  if (albumCode) {
    matches.push(...scopedCreditIdentities.filter(({ identity }) => (
      identity.albumCodes?.includes(albumCode)
      && identity.aliases.some((alias) => harvestComposerCreditLookupKeys(alias).some((key) => lookupKeySet.has(key)))
    )));
  }
  return matches.filter((match, index) => matches.findIndex((candidate) => (
    candidate.profile.slug === match.profile.slug
    && candidate.identity.preferredName === match.identity.preferredName
  )) === index);
}

export function getCanonicalComposerProfileForCredit(
  credit: string,
  albumCode?: string,
): CanonicalComposerProfile | undefined {
  return resolveCanonicalComposerCredit(credit, albumCode)?.profile;
}

export interface CanonicalComposerCreditSummary {
  id: string;
  name: string;
  trackCount: number;
}

export interface CanonicalComposerSummary extends CanonicalComposerProfile {
  trackCount: number;
  variantCount: number;
  albumIds: string[];
  albumCodes: string[];
  albumTitles: string[];
  harvestCredits: CanonicalComposerCreditSummary[];
}

type ComposerTrack = Pick<Track, "id" | "albumId" | "albumCode" | "albumTitle" | "composers" | "artists" | "mainTrackId" | "isAlternate">;

export function collectCanonicalComposerSummaries(tracks: ComposerTrack[]): CanonicalComposerSummary[] {
  const aggregate = new Map<string, {
    workIds: Set<string>;
    variantIds: Set<string>;
    albumIds: Set<string>;
    albumCodes: Set<string>;
    albumTitles: Set<string>;
    creditTracks: Map<string, Set<string>>;
  }>();

  for (const profile of canonicalComposerProfiles) {
    aggregate.set(profile.slug, {
      workIds: new Set(),
      variantIds: new Set(),
      albumIds: new Set(),
      albumCodes: new Set(),
      albumTitles: new Set(),
      creditTracks: new Map(),
    });
  }

  for (const track of tracks) {
    for (const rawCredit of new Set(track.composers ?? [])) {
      const name = rawCredit.trim();
      if (!name) continue;
      for (const { profile } of resolveCanonicalComposerCredits(name, track.albumCode)) {
        const item = aggregate.get(profile.slug)!;
        item.variantIds.add(track.id);
        const workId = harvestMainWorkId(track);
        if (workId) {
          item.workIds.add(workId);
          if (track.albumId) item.albumIds.add(track.albumId);
          if (track.albumCode) item.albumCodes.add(track.albumCode);
          if (track.albumTitle) item.albumTitles.add(track.albumTitle);
        }
        const ids = item.creditTracks.get(name) ?? new Set<string>();
        if (workId) ids.add(workId);
        item.creditTracks.set(name, ids);
      }
    }
  }

  return canonicalComposerProfiles.map((profile) => {
    const item = aggregate.get(profile.slug)!;
    return {
      ...profile,
      trackCount: item.workIds.size,
      variantCount: item.variantIds.size,
      albumIds: [...item.albumIds].sort(),
      albumCodes: [...item.albumCodes].sort((left, right) => left.localeCompare(right, "fr", { numeric: true })),
      albumTitles: [...item.albumTitles].sort((left, right) => left.localeCompare(right, "fr", { sensitivity: "base" })),
      harvestCredits: [...item.creditTracks.entries()]
        .map(([name, trackIds]) => ({ id: harvestComposerCreditId(name), name, trackCount: trackIds.size }))
        .sort((left, right) => left.name.localeCompare(right.name, "fr", { sensitivity: "base" })),
    };
  });
}

export function emptyCanonicalComposerSummaries(): CanonicalComposerSummary[] {
  return collectCanonicalComposerSummaries([]);
}
