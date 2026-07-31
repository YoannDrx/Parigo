import "server-only";

import { unstable_cache } from "next/cache";
import portfolioSnapshotJson from "@/content/matching/portfolio.snapshot.json";
import sheetSnapshotJson from "@/content/matching/google-sheet.snapshot.json";
import registryJson from "@/content/matching/registry.json";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { composerProfiles, clips, normalizeHarvestCredit } from "@/lib/editorial/contracts";
import { CLIPS_PLAYLIST_ID, getEditorialVideos } from "@/lib/editorial/videos";
import { cloudSearch } from "@/lib/harvest/catalog";
import { getCachedAlbumDiscovery } from "@/lib/harvest/catalog-cache";
import { fetchYouTubePlaylist } from "@/lib/youtube/playlists";
import type { Track } from "@/types";
import type {
  AgreementState,
  HarvestCreditView,
  MatchingComposerView,
  MatchingDashboardData,
  MatchingEvidence,
  MatchingItem,
  MatchingSheetRow,
  MatchingSourceId,
  MatchingSourceStatus,
  MatchingWorkView,
  ProvenanceId,
  ReviewStatus,
} from "./contracts";

type PortfolioSnapshot = {
  source: { commitSha: string; capturedAt: string };
  metrics: {
    artists: number;
    works: number;
    categories: Record<string, number>;
    contributions: number;
    albumContributions: number;
    vinylContributions: number;
    clipContributions: number;
    clipProjectRelations: number;
  };
  artists: Array<{ slug: string; name: string; isActive: boolean }>;
  works: Array<{
    slug: string;
    title: string;
    category: string;
    code?: string;
    youtubeId?: string;
    relatedProjectSlugs: string[];
    artistSlugs: string[];
  }>;
  contributions: Array<{
    id: string;
    workSlug: string;
    artistSlug: string;
    role: string;
    provenanceId: "portfolio-contribution";
  }>;
  clipProjectRelations: Array<{
    id: string;
    clipSlug: string;
    projectSlug: string;
    provenanceIds: ProvenanceId[];
    methods: string[];
  }>;
};

type Registry = {
  revision: string;
  updatedAt: string;
  identities: Array<{
    slug: string;
    name: string;
    kind: "person" | "group";
    visibility: "public" | "internal";
    published: boolean;
    aliases: string[];
    candidateAliases: string[];
  }>;
  decisions: Array<{
    itemId: string;
    entityType: "composer" | "album" | "vinyl" | "clip" | "relation";
    composerSlug?: string;
    workKey?: string;
    relationDecision: "keep" | "add" | "remove" | "none";
    reviewStatus: ReviewStatus;
    publicationDecision?: "unchanged" | "public" | "internal" | "do-not-publish";
    role?: string;
    provenanceIds: ProvenanceId[];
    note: string;
    evidenceLinks: string[];
    reviewer?: string;
    reviewedAt?: string;
  }>;
};

type SheetSnapshot = {
  source: { importedAt: string };
  tabs: Array<{
    title: string;
    rows: Array<MatchingSheetRow & { raw: string[] }>;
  }>;
};

type HarvestInventory = {
  albums: Array<{
    id: string;
    code?: string;
    title: string;
    tracks: Array<{ id: string; title: string; composers: string[] }>;
  }>;
  inventory: Array<{ id: string; code?: string; title: string }>;
  failedAlbumIds: string[];
};

const portfolioSnapshot = portfolioSnapshotJson as unknown as PortfolioSnapshot;
const sheetSnapshot = sheetSnapshotJson as unknown as SheetSnapshot;
const registry = registryJson as unknown as Registry;
const PORTFOLIO_PUBLIC_URL = "https://synck-psi.vercel.app";

const getMatchingYouTubeInventory = unstable_cache(
  () => fetchYouTubePlaylist(process.env.YOUTUBE_CLIPS_PLAYLIST_ID || CLIPS_PLAYLIST_ID),
  ["admin-matching-youtube-v1"],
  { revalidate: 300, tags: ["youtube", "clips", "admin-matching"] },
);

async function loadHarvestInventory(): Promise<HarvestInventory> {
  const inventory = await getCachedAlbumDiscovery({
    label: PARIGO_LABEL_ID,
    limit: 100,
    sort: "recent",
  });
  const tracks: Track[] = [];
  let offset = 0;
  let total = 1;
  while (offset < total) {
    const result = await cloudSearch({
      view: "Track",
      skip: offset,
      limit: 100,
      labels: [PARIGO_LABEL_ID],
      sort: "ReleaseDate_Desc",
    });
    tracks.push(...result.tracks);
    total = Math.min(result.total, 2_000);
    if (!result.tracks.length) break;
    offset += result.tracks.length;
  }
  return {
    inventory: inventory.items.map((album) => ({
      id: album.id,
      code: album.code,
      title: album.title,
    })),
    albums: inventory.items.map((album) => ({
      id: album.id,
      code: album.code,
      title: album.title,
      tracks: tracks
        .filter((track) => (
          track.albumId === album.id || Boolean(album.code && track.albumCode === album.code)
        ))
        .map((track) => ({
          id: track.id,
          title: track.title,
          composers: track.composers ?? [],
        })),
    })),
    failedAlbumIds: [],
  };
}

const getCachedMatchingHarvestInventory = unstable_cache(
  loadHarvestInventory,
  ["admin-matching-harvest-v2"],
  { revalidate: 300, tags: ["catalog", "albums", "tracks", "admin-matching"] },
);

function workType(category: string): MatchingWorkView["type"] {
  if (category === "album-de-librairie-musicale") return "album";
  if (category === "vinyle") return "vinyl";
  if (category === "clip") return "clip";
  if (category === "synchro") return "synchro";
  return "documentary";
}

function workKey(work: { slug: string; category: string; code?: string }): string {
  const type = workType(work.category);
  if (type === "album" && work.code) return `album:${work.code}`;
  return `${type}:${work.slug}`;
}

function youtubeIdFromReference(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.searchParams.get("v") || (url.hostname === "youtu.be" ? url.pathname.slice(1) : undefined);
  } catch {
    return undefined;
  }
}

function evidence(
  id: string,
  source: MatchingSourceId,
  provenanceId: ProvenanceId,
  method: MatchingEvidence["method"],
  label: string,
  detail?: string,
  reference?: string,
  direct = true,
): MatchingEvidence {
  return { id, source, provenanceId, method, label, detail, reference, direct };
}

function comparePriority(item: MatchingItem): number {
  if (item.agreement === "conflict" && item.currentPublished) return 1;
  if (item.agreement === "conflict") return 2;
  if (item.tags.includes("portfolio-without-harvest")) return 3;
  if (item.tags.includes("unmatched-harvest")) return 4;
  if (item.tags.includes("clip-without-composer")) return 5;
  if (item.tags.includes("work-orphan")) return 6;
  if (item.tags.includes("composer-orphan")) return 7;
  return item.initialReviewStatus === "unreviewed" ? 8 : 9;
}

function classifyAgreement(item: MatchingItem): AgreementState {
  if (item.agreement === "conflict" || item.agreement === "explicit-none" || item.agreement === "rejected") {
    return item.agreement;
  }
  const sources = new Set(item.evidence.map((entry) => entry.source));
  const onlyIndirect = item.evidence.length > 0 && item.evidence.every((entry) => !entry.direct);
  if (onlyIndirect) return "inferred";
  if (sources.has("harvest") && sources.has("portfolio")) {
    return item.evidence.some((entry) => entry.method === "declared-alias") ? "alias" : "exact";
  }
  if (sources.size === 1 && item.evidence.length) return "single-source";
  if (sources.size > 1) return "alias";
  return "unresolved";
}

export async function getMatchingDashboardData(): Promise<MatchingDashboardData> {
  const [harvestResult, youtubeResult, editorialVideosResult] = await Promise.allSettled([
    getCachedMatchingHarvestInventory(),
    getMatchingYouTubeInventory(),
    getEditorialVideos(),
  ]);
  const harvest = harvestResult.status === "fulfilled"
    ? harvestResult.value
    : { albums: [], inventory: [], failedAlbumIds: [] };
  const youtubeVideos = youtubeResult.status === "fulfilled" ? youtubeResult.value : [];
  const editorialVideos = editorialVideosResult.status === "fulfilled" ? editorialVideosResult.value : clips;
  const identityBySlug = new Map(registry.identities.map((identity) => [identity.slug, identity]));
  const normalizedIdentityNames = new Map<string, { slug: string; method: "normalized-exact" | "declared-alias" }>();
  for (const identity of registry.identities) {
    normalizedIdentityNames.set(normalizeHarvestCredit(identity.name), {
      slug: identity.slug,
      method: "normalized-exact",
    });
    for (const alias of identity.aliases) {
      normalizedIdentityNames.set(normalizeHarvestCredit(alias), {
        slug: identity.slug,
        method: normalizeHarvestCredit(alias) === normalizeHarvestCredit(identity.name)
          ? "normalized-exact"
          : "declared-alias",
      });
    }
  }
  const publishedAliases = new Map(
    composerProfiles.flatMap((profile) => profile.harvestAliases.map((alias) => [
      normalizeHarvestCredit(alias),
      profile.slug,
    ] as const)),
  );

  const worksByKey = new Map<string, MatchingWorkView>();
  const portfolioWorkBySlug = new Map(portfolioSnapshot.works.map((work) => [work.slug, work]));
  const registerWork = (input: MatchingWorkView) => {
    const current = worksByKey.get(input.key);
    if (!current) {
      worksByKey.set(input.key, input);
      return input;
    }
    current.sources = [...new Set([...current.sources, ...input.sources])];
    current.relatedProjects = [...new Set([...current.relatedProjects, ...input.relatedProjects])];
    if (!current.code && input.code) current.code = input.code;
    if (!current.slug && input.slug) current.slug = input.slug;
    if (!current.href && input.href) current.href = input.href;
    if (!current.sourceHref && input.sourceHref) current.sourceHref = input.sourceHref;
    return current;
  };
  for (const work of portfolioSnapshot.works) {
    registerWork({
      key: workKey(work),
      slug: work.slug,
      code: work.code,
      title: work.title,
      type: workType(work.category),
      sources: ["portfolio"],
      composerNames: [],
      relatedProjects: work.relatedProjectSlugs,
      relationCount: 0,
      sourceHref: `${PORTFOLIO_PUBLIC_URL}/fr/projets/${work.slug}`,
    });
  }
  for (const album of harvest.inventory) {
    registerWork({
      key: `album:${album.code || album.id}`,
      code: album.code,
      title: album.title,
      type: "album",
      sources: ["harvest"],
      composerNames: [],
      relatedProjects: [],
      relationCount: 0,
      href: `/albums/${album.id}`,
    });
  }
  for (const video of editorialVideos) {
    registerWork({
      key: `clip:${video.slug}`,
      slug: video.slug,
      title: video.title.fr,
      type: "clip",
      sources: [video.source === "youtube" ? "youtube" : "parigo"],
      composerNames: [],
      relatedProjects: video.relatedAlbumCode ? [`album:${video.relatedAlbumCode}`] : [],
      relationCount: 0,
      href: `/clips/${video.slug}`,
      sourceHref: video.youtubeId ? `https://www.youtube.com/watch?v=${video.youtubeId}` : undefined,
    });
  }
  const editorialByYoutube = new Map(
    editorialVideos.filter((video) => video.youtubeId).map((video) => [video.youtubeId!, video]),
  );
  for (const video of youtubeVideos) {
    const editorialVideo = editorialByYoutube.get(video.youtubeId);
    registerWork({
      key: `clip:${editorialVideo?.slug || `yt-${video.youtubeId}`}`,
      slug: editorialVideo?.slug || `yt-${video.youtubeId}`,
      title: editorialVideo?.title.fr || video.title,
      type: "clip",
      sources: ["youtube"],
      composerNames: [],
      relatedProjects: editorialVideo?.relatedAlbumCode ? [`album:${editorialVideo.relatedAlbumCode}`] : [],
      relationCount: 0,
      href: editorialVideo ? `/clips/${editorialVideo.slug}` : undefined,
      sourceHref: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    });
  }

  const itemById = new Map<string, MatchingItem>();
  const relationItem = (
    composerSlug: string | undefined,
    composerName: string,
    target: MatchingWorkView,
  ) => {
    const composerKey = composerSlug || `credit-${normalizeHarvestCredit(composerName).replace(/\s+/g, "-")}`;
    const id = `relation:${composerKey}:${target.key}`;
    let item = itemById.get(id);
    if (!item) {
      const identity = composerSlug ? identityBySlug.get(composerSlug) : undefined;
      item = {
        id,
        entityType: "relation",
        title: composerName,
        subtitle: target.code ? `${target.code} · ${target.title}` : target.title,
        composer: {
          slug: composerSlug,
          name: composerName,
          aliases: identity?.aliases ?? [],
          visibility: identity?.visibility,
          href: identity?.published ? `/compositeurs/${identity.slug}` : undefined,
          sourceHref: identity ? `${PORTFOLIO_PUBLIC_URL}/fr/artistes/${identity.slug}` : undefined,
        },
        work: {
          key: target.key,
          slug: target.slug,
          code: target.code,
          title: target.title,
          type: target.type as "album" | "vinyl" | "clip",
          href: target.href,
          sourceHref: target.sourceHref,
        },
        evidence: [],
        agreement: "unresolved",
        priority: 9,
        initialReviewStatus: "unreviewed",
        currentPublished: false,
        relationExists: true,
        tags: [],
      };
      itemById.set(id, item);
    }
    return item;
  };

  for (const contribution of portfolioSnapshot.contributions) {
    const identity = identityBySlug.get(contribution.artistSlug);
    const portfolioWork = portfolioWorkBySlug.get(contribution.workSlug);
    if (!identity || !portfolioWork) continue;
    const target = worksByKey.get(workKey(portfolioWork));
    if (!target || (target.type !== "album" && target.type !== "vinyl")) continue;
    const item = relationItem(identity.slug, identity.name, target);
    item.evidence.push(evidence(
      contribution.id,
      "portfolio",
      "portfolio-contribution",
      "direct",
      `${identity.name} est relié à ${target.title}`,
      `Rôle Portfolio : ${contribution.role}`,
      `${PORTFOLIO_PUBLIC_URL}/fr/projets/${portfolioWork.slug}`,
    ));
  }

  const rawCreditMap = new Map<string, HarvestCreditView>();
  const harvestCreditNamesByAlbum = new Map<string, Set<string>>();
  for (const album of harvest.albums) {
    const target = worksByKey.get(`album:${album.code || album.id}`);
    if (!target) continue;
    for (const track of album.tracks) {
      for (const credit of track.composers ?? []) {
        const normalized = normalizeHarvestCredit(credit);
        if (!normalized) continue;
        const resolution = normalizedIdentityNames.get(normalized);
        const identity = resolution ? identityBySlug.get(resolution.slug) : undefined;
        const creditKey = normalized;
        const creditView = rawCreditMap.get(creditKey) ?? {
          normalized,
          display: credit,
          albumCodes: [],
          albumTitles: [],
          trackTitles: [],
          matchedComposerSlug: identity?.slug,
          matchedComposerName: identity?.name,
          matchMethod: resolution?.method ?? "unmatched",
        };
        if (album.code && !creditView.albumCodes.includes(album.code)) creditView.albumCodes.push(album.code);
        if (!creditView.albumTitles.includes(album.title)) creditView.albumTitles.push(album.title);
        if (!creditView.trackTitles.includes(track.title)) creditView.trackTitles.push(track.title);
        rawCreditMap.set(creditKey, creditView);
        const albumCreditKey = album.code || album.id;
        const albumCredits = harvestCreditNamesByAlbum.get(albumCreditKey) ?? new Set<string>();
        albumCredits.add(normalized);
        harvestCreditNamesByAlbum.set(albumCreditKey, albumCredits);
        const item = relationItem(identity?.slug, identity?.name || credit, target);
        if (!item.evidence.some((entry) => entry.id === `harvest:${album.id}:${normalized}`)) {
          item.evidence.push(evidence(
            `harvest:${album.id}:${normalized}`,
            "harvest",
            "harvest-track-credit",
            resolution?.method ?? "direct",
            credit,
            `${album.code || "Sans code"} · ${album.title}`,
            target.href,
          ));
        }
        if (!identity) item.tags.push("unmatched-harvest");
        if (identity && publishedAliases.get(normalized) === identity.slug) item.currentPublished = true;
      }
    }
  }

  for (const video of editorialVideos) {
    const target = worksByKey.get(`clip:${video.slug}`);
    if (!target) continue;
    for (const composerSlug of video.composerSlugs) {
      const identity = identityBySlug.get(composerSlug);
      if (!identity) continue;
      const item = relationItem(identity.slug, identity.name, target);
      item.currentPublished = true;
      item.evidence.push(evidence(
        `parigo:clip-composer:${video.slug}:${composerSlug}`,
        "parigo",
        video.composerRelationSource === "manual" ? "parigo-manual" : "portfolio-contribution",
        video.composerRelationSource === "manual" ? "manual-decision" : "direct",
        `Relation actuellement publiée : ${identity.name}`,
        video.title.fr,
        target.href,
      ));
    }
  }

  for (const profile of composerProfiles) {
    for (const verified of profile.verifiedAlbums ?? []) {
      const target = worksByKey.get(`album:${verified.code}`);
      if (!target) continue;
      const identity = identityBySlug.get(profile.slug);
      const item = relationItem(profile.slug, identity?.name || profile.name, target);
      item.currentPublished = true;
      item.evidence.push(evidence(
        `parigo:verified-album:${profile.slug}:${verified.code}`,
        "parigo",
        "parigo-manual",
        "manual-decision",
        "Relation manuelle Parigo vérifiée",
        verified.code,
        target.href,
      ));
    }
  }

  for (const relation of portfolioSnapshot.clipProjectRelations) {
    const clipWork = worksByKey.get(`clip:${relation.clipSlug}`);
    const project = portfolioWorkBySlug.get(relation.projectSlug);
    const projectWork = project ? worksByKey.get(workKey(project)) : undefined;
    if (!clipWork || !projectWork) continue;
    const id = `relation:${clipWork.key}:${projectWork.key}`;
    const existing = itemById.get(id);
    const item: MatchingItem = existing ?? {
      id,
      entityType: "relation",
      title: clipWork.title,
      subtitle: `Projet relié : ${projectWork.title}`,
      work: {
        key: clipWork.key,
        slug: clipWork.slug,
        title: clipWork.title,
        type: "clip",
        href: clipWork.href,
        sourceHref: clipWork.sourceHref,
      },
      evidence: [],
      agreement: "inferred",
      priority: 9,
      initialReviewStatus: "unreviewed",
      currentPublished: false,
      relationExists: true,
      tags: ["indirect-project"],
    };
    for (const provenanceId of relation.provenanceIds) {
      item.evidence.push(evidence(
        `${relation.id}:${provenanceId}`,
        "portfolio",
        provenanceId,
        provenanceId === "portfolio-related-project" ? "indirect-project"
          : provenanceId === "portfolio-slug-inference" ? "heuristic"
            : "manual-decision",
        `${clipWork.title} → ${projectWork.title}`,
        "Ce lien n’attribue aucun compositeur au clip.",
        clipWork.sourceHref,
        false,
      ));
    }
    itemById.set(id, item);
  }

  const sheetRows = sheetSnapshot.tabs.flatMap((tab) => tab.rows.map((row) => ({ ...row, tab: tab.title })));
  const videoSheetByYoutube = new Map(
    sheetRows
      .filter((row) => row.tab === "Vidéos")
      .flatMap((row) => {
        const id = youtubeIdFromReference(row.reference);
        return id ? [[id, row] as const] : [];
      }),
  );
  for (const item of itemById.values()) {
    if (item.work?.type !== "clip" || !item.composer) continue;
    const matchingVideo = editorialVideos.find((video) => video.slug === item.work?.slug);
    const sheetRow = matchingVideo?.youtubeId ? videoSheetByYoutube.get(matchingVideo.youtubeId) : undefined;
    if (!sheetRow) continue;
    item.evidence.push(evidence(
      `sheet:${sheetRow.id}:${item.composer.slug || item.composer.name}`,
      "sheet",
      "google-sheet-review",
      "direct",
      sheetRow.composerAnswer || "Aucun compositeur renseigné",
      sheetRow.comment,
      sheetRow.reference,
    ));
    const acceptableNames = [item.composer.name, ...item.composer.aliases].map(normalizeHarvestCredit);
    const answer = normalizeHarvestCredit(sheetRow.composerAnswer);
    if (item.currentPublished && acceptableNames.every((name) => name && !answer.includes(name))) {
      item.agreement = "conflict";
      item.tags.push("sheet-contradiction");
    }
  }

  for (const sheetRow of sheetRows) {
    const entityType = sheetRow.tab === "Vidéos" ? "clip"
      : sheetRow.tab === "Albums" ? "album"
        : "composer";
    const id = `review:${sheetRow.id}`;
    const status: ReviewStatus = sheetRow.status === "À vérifier" ? "needs-review" : "verified";
    itemById.set(id, {
      id,
      entityType,
      title: sheetRow.element,
      subtitle: sheetRow.relationAnswer || sheetRow.missing,
      evidence: [evidence(
        `sheet-evidence:${sheetRow.id}`,
        "sheet",
        "google-sheet-review",
        "direct",
        sheetRow.composerAnswer || sheetRow.relationAnswer || sheetRow.status,
        sheetRow.comment,
        sheetRow.reference,
      )],
      agreement: status === "verified" ? "single-source" : "unresolved",
      priority: status === "needs-review" ? 2 : 9,
      initialReviewStatus: status,
      currentPublished: false,
      relationExists: Boolean(sheetRow.composerAnswer || sheetRow.relationAnswer),
      tags: status === "needs-review" ? ["sheet-needs-review"] : ["sheet-validated"],
    });
  }

  const relationItems = [...itemById.values()].filter((item) => item.entityType === "relation");
  for (const item of relationItems) {
    if (!item.composer?.slug || !item.work) continue;
    const portfolioEvidence = item.evidence.some((entry) => entry.provenanceId === "portfolio-contribution");
    const harvestEvidence = item.evidence.some((entry) => entry.provenanceId === "harvest-track-credit");
    if (portfolioEvidence && !harvestEvidence && item.work.type === "album") {
      item.tags.push("portfolio-without-harvest");
    }
  }

  const relationCounts = new Map<string, { albums: number; vinyls: number; clips: number; total: number }>();
  for (const item of relationItems) {
    if (!item.composer?.slug || !item.work || item.tags.includes("indirect-project")) continue;
    const counts = relationCounts.get(item.composer.slug) ?? { albums: 0, vinyls: 0, clips: 0, total: 0 };
    if (item.work.type === "album") counts.albums += 1;
    if (item.work.type === "vinyl") counts.vinyls += 1;
    if (item.work.type === "clip") counts.clips += 1;
    counts.total += 1;
    relationCounts.set(item.composer.slug, counts);
    const target = worksByKey.get(item.work.key);
    if (target) {
      target.composerNames = [...new Set([...target.composerNames, item.composer.name])];
      target.relationCount += 1;
    }
  }

  const composers: MatchingComposerView[] = registry.identities.map((identity) => {
    const counts = relationCounts.get(identity.slug) ?? { albums: 0, vinyls: 0, clips: 0, total: 0 };
    return {
      slug: identity.slug,
      name: identity.name,
      aliases: identity.aliases,
      candidateAliases: identity.candidateAliases,
      visibility: identity.visibility,
      published: identity.published,
      albumCount: counts.albums,
      vinylCount: counts.vinyls,
      clipCount: counts.clips,
      contributionCount: portfolioSnapshot.contributions.filter((item) => item.artistSlug === identity.slug).length,
      hasAnyEvidence: counts.total > 0,
      href: identity.published ? `/compositeurs/${identity.slug}` : undefined,
      sourceHref: `${PORTFOLIO_PUBLIC_URL}/fr/artistes/${identity.slug}`,
    };
  }).sort((left, right) => left.name.localeCompare(right.name, "fr"));

  for (const composer of composers.filter((item) => item.contributionCount === 0)) {
    const isGlobalOrphan = !composer.hasAnyEvidence;
    const id = `orphan:composer:${composer.slug}`;
    itemById.set(id, {
      id,
      entityType: "composer",
      title: composer.name,
      subtitle: isGlobalOrphan
        ? "Sans relation dans aucune source"
        : `Sans contribution Portfolio · ${composer.albumCount} album(s), ${composer.clipCount} clip(s) dans les autres sources`,
      composer: {
        slug: composer.slug,
        name: composer.name,
        aliases: composer.aliases,
        visibility: composer.visibility,
        href: composer.href,
        sourceHref: composer.sourceHref,
      },
      evidence: [],
      agreement: "unresolved",
      priority: 7,
      initialReviewStatus: "needs-review",
      currentPublished: composer.published,
      relationExists: false,
      tags: isGlobalOrphan ? ["composer-orphan", "portfolio-composer-orphan"] : ["portfolio-composer-orphan"],
    });
  }

  for (const work of worksByKey.values()) {
    if ((work.type === "album" || work.type === "vinyl") && work.relationCount === 0) {
      const id = `orphan:work:${work.key}`;
      itemById.set(id, {
        id,
        entityType: work.type,
        title: work.title,
        subtitle: work.code || "Aucun compositeur relié",
        work: {
          key: work.key,
          slug: work.slug,
          code: work.code,
          title: work.title,
          type: work.type,
          href: work.href,
          sourceHref: work.sourceHref,
        },
        evidence: [],
        agreement: "unresolved",
        priority: 6,
        initialReviewStatus: "needs-review",
        currentPublished: work.sources.includes("harvest"),
        relationExists: false,
        tags: ["work-orphan"],
      });
    }
    if (work.type === "clip" && work.composerNames.length === 0) {
      const id = `orphan:clip:${work.key}`;
      itemById.set(id, {
        id,
        entityType: "clip",
        title: work.title,
        subtitle: "Aucun compositeur direct relié",
        work: {
          key: work.key,
          slug: work.slug,
          title: work.title,
          type: "clip",
          href: work.href,
          sourceHref: work.sourceHref,
        },
        evidence: [],
        agreement: "unresolved",
        priority: 5,
        initialReviewStatus: "needs-review",
        currentPublished: work.sources.includes("parigo"),
        relationExists: false,
        tags: ["clip-without-composer"],
      });
    }
  }

  const portfolioAlbumContributions = portfolioSnapshot.contributions.filter((contribution) => {
    return portfolioWorkBySlug.get(contribution.workSlug)?.category === "album-de-librairie-musicale";
  });
  const portfolioDirectAlbumMatches = portfolioAlbumContributions.filter((contribution) => {
    const work = portfolioWorkBySlug.get(contribution.workSlug);
    const identity = identityBySlug.get(contribution.artistSlug);
    if (!work?.code || !identity) return false;
    return harvestCreditNamesByAlbum.get(work.code)?.has(normalizeHarvestCredit(identity.name));
  }).length;

  const items = [...itemById.values()].map((item) => {
    item.agreement = classifyAgreement(item);
    if (item.agreement === "conflict" && item.initialReviewStatus === "unreviewed") {
      item.initialReviewStatus = "needs-review";
    }
    item.priority = comparePriority(item);
    return item;
  }).sort((left, right) => left.priority - right.priority || left.title.localeCompare(right.title, "fr"));

  const harvestCredits = [...rawCreditMap.values()].sort((left, right) => left.display.localeCompare(right.display, "fr"));
  const albumOrphans = [...worksByKey.values()].filter((work) => (
    (work.type === "album" || work.type === "vinyl") && work.relationCount === 0
  )).length;
  const clipsWithoutDirectComposer = [...worksByKey.values()].filter((work) => (
    work.type === "clip" && work.composerNames.length === 0
  )).length;
  const conflicts = items.filter((item) => item.agreement === "conflict").length;
  const inferredOnly = items.filter((item) => item.agreement === "inferred").length;
  const verified = items.filter((item) => item.initialReviewStatus === "verified").length;
  const totalToReview = items.filter((item) => item.initialReviewStatus !== "verified").length;
  const sourceStatuses: MatchingSourceStatus[] = [
    {
      id: "harvest",
      label: "Harvest",
      state: harvestResult.status === "rejected" ? "unavailable"
        : harvest.failedAlbumIds.length ? "partial"
          : "ok",
      count: harvest.inventory.length,
      capturedAt: new Date().toISOString(),
      detail: harvestResult.status === "rejected"
        ? "Catalogue indisponible : les autres sources restent consultables."
        : `${harvest.albums.length}/${harvest.inventory.length} albums détaillés chargés.`,
    },
    {
      id: "portfolio",
      label: "Portfolio Caro",
      state: "stale",
      count: portfolioSnapshot.metrics.works,
      capturedAt: portfolioSnapshot.source.capturedAt,
      revision: portfolioSnapshot.source.commitSha,
      detail: `${portfolioSnapshot.metrics.artists} artistes · snapshot Git`,
    },
    {
      id: "youtube",
      label: "YouTube",
      state: youtubeResult.status === "fulfilled" ? "ok" : "unavailable",
      count: youtubeVideos.length,
      capturedAt: youtubeResult.status === "fulfilled" ? new Date().toISOString() : undefined,
      detail: youtubeResult.status === "fulfilled"
        ? "Playlist officielle chargée."
        : "Playlist indisponible ; les clips éditoriaux locaux restent visibles.",
    },
    {
      id: "sheet",
      label: "Google Sheet",
      state: "stale",
      count: sheetRows.length,
      capturedAt: sheetSnapshot.source.importedAt,
      detail: "Snapshot versionné en lecture seule.",
    },
    {
      id: "parigo",
      label: "Parigo / BFF",
      state: "ok",
      count: composerProfiles.length + editorialVideos.length,
      capturedAt: registry.updatedAt,
      revision: registry.revision,
      detail: `${composerProfiles.length} profils actuels · ${editorialVideos.length} clips éditoriaux`,
    },
  ];

  return {
    capturedAt: new Date().toISOString(),
    registryRevision: registry.revision,
    sources: sourceStatuses,
    metrics: {
      totalToReview,
      conflicts,
      inferredOnly,
      composerOrphans: composers.filter((composer) => !composer.hasAnyEvidence).length,
      portfolioComposerOrphans: composers.filter((composer) => composer.contributionCount === 0).length,
      albumOrphans,
      clipsWithoutDirectComposer,
      unmatchedHarvestCredits: harvestCredits.filter((credit) => credit.matchMethod === "unmatched").length,
      sheetNeedsReview: sheetRows.filter((row) => row.status === "À vérifier").length,
      verified,
      totalItems: items.length,
      portfolioDirectAlbumMatches,
      portfolioAlbumRelationsToReview: Math.max(
        0,
        portfolioSnapshot.metrics.albumContributions - portfolioDirectAlbumMatches,
      ),
    },
    items,
    composers,
    works: [...worksByKey.values()].sort((left, right) => left.title.localeCompare(right.title, "fr")),
    harvestCredits,
    sheetRows,
    portfolioInventory: {
      artists: portfolioSnapshot.metrics.artists,
      works: portfolioSnapshot.metrics.works,
      contributions: portfolioSnapshot.metrics.contributions,
      clipProjectRelations: portfolioSnapshot.metrics.clipProjectRelations,
      categories: portfolioSnapshot.metrics.categories,
      commitSha: portfolioSnapshot.source.commitSha,
    },
  };
}
