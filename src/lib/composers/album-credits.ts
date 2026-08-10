import type {
  AlbumContributorGroup,
  AlbumContributorRole,
  ComposerCreditLink,
  RightHolder,
  Track,
} from "@/types";
import {
  getCanonicalComposerProfilesForRightHolderId,
  resolveCanonicalComposerCredits,
} from "./profiles";
import {
  harvestComposerCreditBaseName,
  harvestComposerCreditNames,
  normalizeHarvestComposerCredit,
} from "@/lib/harvest/composer-credits";

type AlbumCreditTrack = Pick<Track, "composers" | "authors" | "rightHolders">;

const ROLE_ORDER: AlbumContributorRole[] = [
  "composer",
  "author",
  "composer-author",
  "arranger",
  "credit",
];

function rightHolderRole(holder: RightHolder): AlbumContributorRole | undefined {
  const capacity = holder.capacity?.trim().toLocaleLowerCase("en").replaceAll("&", "/") ?? "";
  const capacityGroup = holder.capacityGroup?.trim().toLocaleLowerCase("en") ?? "";
  const isComposer = capacity.includes("composer");
  const isAuthor = capacity.includes("author") || capacity.includes("songwriter") || capacity.includes("lyricist");

  if (isComposer && isAuthor) return "composer-author";
  if (capacity.includes("arranger")) return "arranger";
  if (isComposer) return "composer";
  if (isAuthor || capacity === "writer") return "author";
  if (capacityGroup === "writer") return "credit";
  return undefined;
}

function cleanedCreditName(credit: string): string {
  const names = harvestComposerCreditNames(credit);
  return names.join(", ") || harvestComposerCreditBaseName(credit) || credit.trim();
}

function resolvedCreditLinks(
  credit: string,
  name: string,
  albumCode: string | undefined,
  rightHolderId: string | undefined,
  linkProfiles: boolean,
): ComposerCreditLink[] {
  if (!linkProfiles) return [{ credit, name }];

  const profiles = new Map(
    getCanonicalComposerProfilesForRightHolderId(rightHolderId ?? "")
      .map((profile) => [profile.slug, profile]),
  );
  for (const { profile } of resolveCanonicalComposerCredits(name, albumCode)) {
    profiles.set(profile.slug, profile);
  }

  if (!profiles.size) return [{ credit, name }];
  return [...profiles.values()].map((profile) => ({
    credit,
    name: profile.name,
    slug: profile.slug,
    href: `/talents/${profile.slug}`,
  }));
}

function addCredit(
  groups: Map<AlbumContributorRole, Map<string, ComposerCreditLink>>,
  role: AlbumContributorRole,
  credit: string,
  name: string,
  albumCode: string | undefined,
  rightHolderId: string | undefined,
  linkProfiles: boolean,
) {
  const entries = groups.get(role) ?? new Map<string, ComposerCreditLink>();
  for (const item of resolvedCreditLinks(credit, name, albumCode, rightHolderId, linkProfiles)) {
    const key = item.slug ? `profile:${item.slug}` : `name:${normalizeHarvestComposerCredit(item.name)}`;
    if (!entries.has(key)) entries.set(key, item);
  }
  groups.set(role, entries);
}

export function buildAlbumContributorGroups(
  tracks: AlbumCreditTrack[],
  options: { albumCode?: string; linkProfiles: boolean },
): AlbumContributorGroup[] {
  const groups = new Map<AlbumContributorRole, Map<string, ComposerCreditLink>>();

  for (const track of tracks) {
    const structuredWriters = (track.rightHolders ?? [])
      .map((holder) => ({ holder, role: rightHolderRole(holder) }))
      .filter((item): item is { holder: RightHolder; role: AlbumContributorRole } => Boolean(item.role));
    const structuredNames = new Set(
      structuredWriters.map(({ holder }) => normalizeHarvestComposerCredit(holder.name)),
    );

    for (const { holder, role } of structuredWriters) {
      addCredit(groups, role, holder.name, holder.name, options.albumCode, holder.id, options.linkProfiles);
    }

    for (const credit of new Set(track.authors ?? [])) {
      for (const name of harvestComposerCreditNames(credit)) {
        if (structuredNames.has(normalizeHarvestComposerCredit(name))) continue;
        addCredit(groups, "author", credit, name, options.albumCode, undefined, options.linkProfiles);
      }
    }
    for (const credit of new Set(track.composers ?? [])) {
      const names = harvestComposerCreditNames(credit);
      for (const name of names.length ? names : [cleanedCreditName(credit)]) {
        if (structuredNames.has(normalizeHarvestComposerCredit(name))) continue;
        addCredit(groups, "composer", credit, name, options.albumCode, undefined, options.linkProfiles);
      }
    }
  }

  return ROLE_ORDER.flatMap((role) => {
    const credits = [...(groups.get(role)?.values() ?? [])];
    return credits.length ? [{ role, credits }] : [];
  });
}

export function buildTrackCreditLinks(
  tracks: AlbumCreditTrack[],
  options: { albumCode?: string; linkProfiles: boolean },
): ComposerCreditLink[] {
  const credits = new Map<string, ComposerCreditLink>();
  for (const credit of new Set(tracks.flatMap((track) => [
    ...(track.composers ?? []),
    ...(track.authors ?? []),
  ]))) {
    const name = cleanedCreditName(credit);
    const links = resolvedCreditLinks(credit, name, options.albumCode, undefined, options.linkProfiles);
    for (const link of links) {
      const key = link.slug ? `profile:${link.slug}:credit:${credit}` : `credit:${credit}`;
      if (!credits.has(key)) credits.set(key, link);
    }
  }
  return [...credits.values()];
}
