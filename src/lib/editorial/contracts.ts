import { z } from "zod";
import editorial from "@/content/editorial.generated.json";
import { normalizeHarvestComposerCredit } from "@/lib/harvest/composer-credits";
export { composerRoleLabel } from "./composer-role";

const localizedCopySchema = z.object({
  fr: z.string().min(1).optional(),
  en: z.string().min(1).optional(),
});

export const ComposerProfileSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  image: z.string().regex(/^\/images\/composers\/[a-z0-9_]+\.webp$/),
  bio: localizedCopySchema,
  links: z.array(z.object({
    platform: z.string().min(1),
    label: z.string().min(1).optional(),
    url: z.string().url().startsWith("https://"),
  })),
  kind: z.enum(["person", "group"]),
  grammaticalGender: z.enum(["masculine", "feminine"]).optional(),
  harvestAliases: z.array(z.string().min(1)).max(5),
  verifiedAlbums: z.array(z.object({
    code: z.string().regex(/^PGO\d{4}$/),
    reviewState: z.literal("verified"),
    source: z.literal("client-confirmed"),
  })).optional(),
  excludedAlbums: z.array(z.object({
    code: z.string().regex(/^PGO\d{4}$/),
    reviewState: z.literal("verified"),
    source: z.literal("client-confirmed"),
  })).optional(),
  published: z.boolean(),
  source: z.literal("portfolio-caro"),
});

export const ClipSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.object({ fr: z.string().min(1), en: z.string().min(1) }),
  subtitle: localizedCopySchema,
  description: localizedCopySchema,
  cover: z.string().startsWith("/images/clips/"),
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).optional(),
  composerSlugs: z.array(z.string()),
  relatedAlbumCode: z.string().regex(/^PGO\d{4}$/).optional(),
  videoType: z.enum([
    "official-video",
    "teaser",
    "making-of",
    "live",
    "performance",
    "award",
    "announcement",
    "archive",
    "other",
  ]).default("official-video"),
  source: z.enum(["portfolio-caro", "youtube", "harvest"]).default("portfolio-caro"),
  reviewState: z.enum(["verified", "needs-review", "rejected"]).default("verified"),
  composerRelationSource: z.enum(["portfolio-caro", "harvest", "manual"]).optional(),
  albumRelationSource: z.enum(["portfolio-caro", "harvest", "manual"]).optional(),
  order: z.number().int(),
  published: z.boolean(),
});

export type ComposerProfile = z.infer<typeof ComposerProfileSchema>;
export type Clip = z.infer<typeof ClipSchema>;
export type VideoType = Clip["videoType"];
export type EditorialReviewState = Clip["reviewState"];

const EditorialSchema = z.object({
  composers: z.array(ComposerProfileSchema),
  clips: z.array(ClipSchema),
}).superRefine((value, context) => {
  const slugs = new Set<string>();
  for (const profile of value.composers) {
    if (slugs.has(profile.slug)) {
      context.addIssue({ code: "custom", path: ["composers"], message: `Duplicate composer slug: ${profile.slug}` });
    }
    slugs.add(profile.slug);
  }
  const clipSlugs = new Set<string>();
  for (const clip of value.clips) {
    if (clipSlugs.has(clip.slug)) {
      context.addIssue({ code: "custom", path: ["clips"], message: `Duplicate clip slug: ${clip.slug}` });
    }
    clipSlugs.add(clip.slug);
  }
  const aliases = new Map<string, string>();
  for (const profile of value.composers.filter((item) => item.published)) {
    for (const alias of profile.harvestAliases) {
      const normalized = normalizeHarvestCredit(alias);
      const owner = aliases.get(normalized);
      if (owner && owner !== profile.slug) {
        context.addIssue({ code: "custom", path: ["composers"], message: `Harvest alias collision: ${alias}` });
      }
      aliases.set(normalized, profile.slug);
    }
  }
  for (const clip of value.clips) {
    for (const slug of clip.composerSlugs) {
      if (!slugs.has(slug)) {
        context.addIssue({ code: "custom", path: ["clips"], message: `Unknown clip composer: ${slug}` });
      }
    }
  }
});

export function normalizeHarvestCredit(value: string): string {
  return normalizeHarvestComposerCredit(value);
}

const parsed = EditorialSchema.parse(editorial);

export const composerProfiles: ComposerProfile[] = parsed.composers;
export const publishedComposerProfiles = composerProfiles
  .filter((profile) => profile.published)
  .sort((left, right) => left.name.localeCompare(right.name, "fr"));
export const clips: Clip[] = parsed.clips.filter((clip) => clip.published).sort((left, right) => left.order - right.order);

const composersBySlug = new Map(composerProfiles.map((profile) => [profile.slug, profile]));
const publishedAliases = new Map(
  publishedComposerProfiles.flatMap((profile) => profile.harvestAliases.map((alias) => [normalizeHarvestCredit(alias), profile] as const)),
);

export function getComposerProfile(slug: string): ComposerProfile | undefined {
  const profile = composersBySlug.get(slug);
  return profile?.published ? profile : undefined;
}

export function getComposerByCredit(credit: string): ComposerProfile | undefined {
  return publishedAliases.get(normalizeHarvestCredit(credit));
}

export function getClip(slug: string): Clip | undefined {
  return clips.find((clip) => clip.slug === slug);
}

export function getClipsForComposer(slug: string): Clip[] {
  return clips.filter((clip) => clip.composerSlugs.includes(slug));
}
