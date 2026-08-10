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

const detailImageSchema = z.object({
  src: z.string().regex(/^\/images\/composers\/detail\/[a-z0-9_]+\.webp$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

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
  detailImage: detailImageSchema.nullable(),
  imageStatus: z.enum(["portrait", "placeholder"]),
  harvest: z.object({
    aliases: z.array(z.string().min(1)),
    rightHolderIds: z.array(z.string().min(1)),
    memberAliases: z.array(z.string().min(1)),
    scopedRelations: z.array(scopedRelationSchema),
    creditIdentities: z.array(harvestCreditIdentitySchema).optional(),
  }),
  legacySlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  provenance: z.object({
    source: z.literal("local-editorial"),
    capturedAt: z.string().datetime(),
    biographyFile: z.literal("site-biographies.user-provided.json"),
    sourceDocument: z.string().min(1),
    portraitFile: z.string().regex(/^(?:(?:public\/images\/composers\/detail|portraits)\/)?[a-z0-9_-]+\.(?:jpe?g|png|webp)$/),
  }),
});

export const CANONICAL_COMPOSER_PROFILE_COUNT = 63;

const registrySchema = z.object({
  generatedAt: z.string(),
  profiles: z.array(composerProfileSchema).length(CANONICAL_COMPOSER_PROFILE_COUNT),
}).superRefine((value, context) => {
  const slugs = new Set<string>();
  const names = new Set<string>();
  const globalAliases = new Map<string, string>();
  const rightHolderIdOwners = new Map<string, string>();
  for (const profile of value.profiles) {
    if (slugs.has(profile.slug)) context.addIssue({ code: "custom", message: `Slug compositeur dupliqué : ${profile.slug}` });
    if (names.has(profile.name)) context.addIssue({ code: "custom", message: `Nom compositeur dupliqué : ${profile.name}` });
    slugs.add(profile.slug);
    names.add(profile.name);
    if (profile.imageStatus === "portrait" && !profile.detailImage) {
      context.addIssue({ code: "custom", message: `Image de détail manquante : ${profile.slug}` });
    }
    if (profile.imageStatus === "placeholder" && profile.detailImage) {
      context.addIssue({ code: "custom", message: `Image de détail inattendue pour un placeholder : ${profile.slug}` });
    }
    if (profile.harvest.memberAliases.length && profile.kind !== "group") {
      context.addIssue({ code: "custom", message: `Seul un collectif peut déclarer des membres Harvest : ${profile.slug}` });
    }
    for (const rightHolderId of profile.harvest.rightHolderIds) {
      const owner = rightHolderIdOwners.get(rightHolderId);
      if (owner && owner !== profile.slug) {
        context.addIssue({ code: "custom", message: `ID ayant droit Harvest partagé : ${rightHolderId} (${owner}, ${profile.slug})` });
      }
      rightHolderIdOwners.set(rightHolderId, profile.slug);
    }
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

type CreditIdentityEntry = {
  profile: CanonicalComposerProfile;
  identity: CanonicalHarvestCreditIdentity;
};

const globalCreditIdentitiesByAlias = new Map<string, CreditIdentityEntry[]>();
const globalMemberIdentitiesByAlias = new Map<string, CreditIdentityEntry[]>();
const scopedCreditIdentities: CreditIdentityEntry[] = [];
const profilesByRightHolderId = new Map<string, CanonicalComposerProfile[]>();

function addGlobalIdentity(map: Map<string, CreditIdentityEntry[]>, lookupKey: string, entry: CreditIdentityEntry) {
  const entries = map.get(lookupKey) ?? [];
  entries.push(entry);
  map.set(lookupKey, entries);
}

for (const profile of canonicalComposerProfiles) {
  for (const rightHolderId of profile.harvest.rightHolderIds) {
    const matches = profilesByRightHolderId.get(rightHolderId) ?? [];
    matches.push(profile);
    profilesByRightHolderId.set(rightHolderId, matches);
  }
  for (const identity of canonicalHarvestCreditIdentities(profile)) {
    const entry = { profile, identity };
    if (identity.albumCodes?.length) {
      scopedCreditIdentities.push(entry);
      continue;
    }
    for (const alias of identity.aliases) {
      for (const lookupKey of harvestComposerCreditLookupKeys(alias)) {
        addGlobalIdentity(globalCreditIdentitiesByAlias, lookupKey, entry);
      }
    }
  }
  for (const alias of profile.harvest.memberAliases) {
    const entry = { profile, identity: { preferredName: alias, aliases: [alias] } };
    for (const lookupKey of harvestComposerCreditLookupKeys(alias)) {
      addGlobalIdentity(globalMemberIdentitiesByAlias, lookupKey, entry);
    }
  }
}

export function getCanonicalComposerProfile(slug: string): CanonicalComposerProfile | undefined {
  return profileBySlug.get(slug);
}

export function getCanonicalComposerProfileByLegacySlug(slug: string): CanonicalComposerProfile | undefined {
  return profileByLegacySlug.get(slug);
}

export function getCanonicalComposerProfilesForRightHolderId(id: string): CanonicalComposerProfile[] {
  return profilesByRightHolderId.get(id) ?? [];
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
    matches.push(...(globalCreditIdentitiesByAlias.get(lookupKey) ?? []));
  }
  if (albumCode) {
    matches.push(...scopedCreditIdentities.filter(({ identity }) => (
      identity.albumCodes?.includes(albumCode)
      && identity.aliases.some((alias) => harvestComposerCreditLookupKeys(alias).some((key) => lookupKeySet.has(key)))
    )));
  }
  for (const lookupKey of lookupKeys) {
    matches.push(...(globalMemberIdentitiesByAlias.get(lookupKey) ?? []));
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

type ComposerTrack = Pick<Track, "id" | "albumId" | "albumCode" | "albumTitle" | "composers" | "authors" | "rightHolderIds" | "artists" | "mainTrackId" | "isAlternate">;

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
    const matchedProfiles = new Map<string, { profile: CanonicalComposerProfile; credits: Set<string> }>();
    for (const rightHolderId of new Set(track.rightHolderIds ?? [])) {
      for (const profile of profilesByRightHolderId.get(rightHolderId) ?? []) {
        const match = matchedProfiles.get(profile.slug) ?? { profile, credits: new Set<string>() };
        match.credits.add(profile.harvest.aliases[0] ?? profile.name);
        matchedProfiles.set(profile.slug, match);
      }
    }
    for (const rawCredit of new Set([...(track.composers ?? []), ...(track.authors ?? [])])) {
      const name = rawCredit.trim();
      if (!name) continue;
      for (const { profile } of resolveCanonicalComposerCredits(name, track.albumCode)) {
        const match = matchedProfiles.get(profile.slug) ?? { profile, credits: new Set<string>() };
        match.credits.add(name);
        matchedProfiles.set(profile.slug, match);
      }
    }
    for (const { profile, credits } of matchedProfiles.values()) {
      const item = aggregate.get(profile.slug)!;
      item.variantIds.add(track.id);
      const workId = harvestMainWorkId(track);
      if (workId) {
        item.workIds.add(workId);
        if (track.albumId) item.albumIds.add(track.albumId);
        if (track.albumCode) item.albumCodes.add(track.albumCode);
        if (track.albumTitle) item.albumTitles.add(track.albumTitle);
      }
      for (const name of credits) {
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
