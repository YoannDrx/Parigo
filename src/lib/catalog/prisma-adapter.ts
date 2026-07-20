import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CatalogAdapter,
  CatalogAlbum,
  CatalogAlbumDetail,
  CatalogArtist,
  CatalogLabel,
  CatalogPlaylist,
  CatalogQuery,
  CatalogTrack,
  PaginatedResult,
} from "@/types";

const trackInclude = {
  audio: true,
  album: { include: { cover: true } },
  genres: { include: { genre: true } },
  moods: { include: { mood: true } },
  instruments: { include: { instrument: true } },
  artists: { include: { artist: true }, orderBy: { order: "asc" } },
} satisfies Prisma.TrackInclude;

const albumInclude = {
  cover: true,
  label: true,
  genres: { include: { genre: true } },
  moods: { include: { mood: true } },
  artists: { include: { artist: true }, orderBy: { order: "asc" } },
  _count: { select: { tracks: true } },
} satisfies Prisma.AlbumInclude;

type PrismaTrack = Prisma.TrackGetPayload<{ include: typeof trackInclude }>;
type PrismaAlbum = Prisma.AlbumGetPayload<{ include: typeof albumInclude }>;

function pagination(query?: CatalogQuery) {
  const page = Math.max(1, query?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query?.limit ?? 24));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function mapPrismaTrack(track: PrismaTrack): CatalogTrack {
  return {
    id: track.id,
    slug: track.slug,
    title: track.title,
    duration: track.duration,
    bpm: track.bpm,
    key: track.key,
    audioUrl: track.audio?.path ?? track.previewUrl,
    albumId: track.albumId,
    albumTitle: track.album.title,
    albumSlug: track.album.slug,
    albumCover: track.album.cover?.path,
    genres: track.genres.map(({ genre }) => genre.name),
    moods: track.moods.map(({ mood }) => mood.name),
    instruments: track.instruments.map(({ instrument }) => instrument.name),
    isVocal: track.isVocal,
    waveform: Array.isArray(track.waveform)
      ? track.waveform.filter((value): value is number => typeof value === "number")
      : null,
    trackNumber: track.trackNumber ?? undefined,
    artists: track.artists.map(({ artist }) => ({ name: artist.name, slug: artist.slug })),
  };
}

export function mapPrismaAlbum(album: PrismaAlbum): CatalogAlbum {
  return {
    id: album.id,
    slug: album.slug,
    title: album.title,
    label: album.label?.name ?? "Parigo",
    labelSlug: album.label?.slug,
    cover: album.cover?.path ?? "/media/mock/albums/pgo0022.avif",
    coverBlur: album.cover?.blurDataUrl ?? undefined,
    description: album.description,
    genres: album.genres.map(({ genre }) => genre.name),
    moods: album.moods.map(({ mood }) => mood.name),
    releaseDate: album.releaseDate?.toISOString(),
    year: album.year ?? undefined,
    spotifyUrl: album.spotifyUrl ?? undefined,
    trackCount: album._count.tracks,
    isFeatured: album.isFeatured,
    artists: album.artists.map(({ artist, role }) => ({
      name: artist.name,
      slug: artist.slug,
      role: role ?? undefined,
    })),
  };
}

function trackWhere(query: CatalogQuery): Prisma.TrackWhereInput {
  const clauses: Prisma.TrackWhereInput[] = [{ isActive: true, album: { isActive: true } }];
  const term = query.searchQuery?.trim();

  if (term) {
    clauses.push({
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { album: { title: { contains: term, mode: "insensitive" } } },
        { artists: { some: { artist: { name: { contains: term, mode: "insensitive" } } } } },
      ],
    });
  }
  if (query.genres?.length) clauses.push({ genres: { some: { genre: { slug: { in: query.genres } } } } });
  if (query.moods?.length) clauses.push({ moods: { some: { mood: { slug: { in: query.moods } } } } });
  if (query.instruments?.length) clauses.push({ instruments: { some: { instrument: { slug: { in: query.instruments } } } } });
  if (query.bpmRange) clauses.push({ bpm: { gte: query.bpmRange[0], lte: query.bpmRange[1] } });
  if (query.durationRange) clauses.push({ duration: { gte: query.durationRange[0], lte: query.durationRange[1] } });
  if (query.isVocal !== null && query.isVocal !== undefined) clauses.push({ isVocal: query.isVocal });

  return { AND: clauses };
}

export class PrismaCatalogAdapter implements CatalogAdapter {
  async search(query: CatalogQuery): Promise<PaginatedResult<CatalogTrack>> {
    const { page, pageSize, skip } = pagination(query);
    const where = trackWhere(query);
    const [rows, total] = await prisma.$transaction([
      prisma.track.findMany({ where, include: trackInclude, orderBy: [{ order: "asc" }, { title: "asc" }], skip, take: pageSize }),
      prisma.track.count({ where }),
    ]);
    return { items: rows.map(mapPrismaTrack), total, page, pageSize };
  }

  async getAlbums(query: CatalogQuery = {}): Promise<PaginatedResult<CatalogAlbum>> {
    const { page, pageSize, skip } = pagination(query);
    const term = query.searchQuery?.trim();
    const where: Prisma.AlbumWhereInput = {
      isActive: true,
      ...(term ? { title: { contains: term, mode: "insensitive" } } : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.album.findMany({ where, include: albumInclude, orderBy: [{ order: "asc" }, { releaseDate: "desc" }], skip, take: pageSize }),
      prisma.album.count({ where }),
    ]);
    return { items: rows.map(mapPrismaAlbum), total, page, pageSize };
  }

  async getAlbum(slug: string): Promise<CatalogAlbumDetail | null> {
    const row = await prisma.album.findFirst({
      where: { isActive: true, OR: [{ slug }, { id: slug }] },
      include: { ...albumInclude, tracks: { where: { isActive: true }, include: trackInclude, orderBy: [{ order: "asc" }, { trackNumber: "asc" }] } },
    });
    if (!row) return null;
    return { ...mapPrismaAlbum(row), tracks: row.tracks.map(mapPrismaTrack) };
  }

  async getPlaylists(query: CatalogQuery = {}): Promise<PaginatedResult<CatalogPlaylist>> {
    const { page, pageSize, skip } = pagination(query);
    const term = query.searchQuery?.trim();
    const where: Prisma.PlaylistWhereInput = { isActive: true, isPublic: true, ...(term ? { title: { contains: term, mode: "insensitive" } } : {}) };
    const [rows, total] = await prisma.$transaction([
      prisma.playlist.findMany({ where, include: { cover: true, _count: { select: { tracks: true } } }, orderBy: [{ order: "asc" }, { title: "asc" }], skip, take: pageSize }),
      prisma.playlist.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({ id: row.id, slug: row.slug, title: row.title, description: row.description ?? undefined, cover: row.cover?.path ?? "/media/mock/albums/pgo0025.avif", trackCount: row._count.tracks, category: row.category ?? undefined, isFeatured: row.isFeatured })),
      total, page, pageSize,
    };
  }

  async getArtists(query: CatalogQuery = {}): Promise<PaginatedResult<CatalogArtist>> {
    const { page, pageSize, skip } = pagination(query);
    const term = query.searchQuery?.trim();
    const where: Prisma.ArtistWhereInput = { isActive: true, ...(term ? { name: { contains: term, mode: "insensitive" } } : {}) };
    const [rows, total] = await prisma.$transaction([
      prisma.artist.findMany({ where, include: { image: true, links: { orderBy: { order: "asc" } }, _count: { select: { albumCredits: true, trackCredits: true } } }, orderBy: [{ order: "asc" }, { name: "asc" }], skip, take: pageSize }),
      prisma.artist.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({ id: row.id, slug: row.slug, name: row.name, bio: row.bio ?? undefined, image: row.image?.path ?? "", links: row.links.map(({ platform, url, label }) => ({ platform, url, label: label ?? undefined })), albumCount: row._count.albumCredits, trackCount: row._count.trackCredits })),
      total, page, pageSize,
    };
  }

  async getLabels(query: CatalogQuery = {}): Promise<PaginatedResult<CatalogLabel>> {
    const { page, pageSize, skip } = pagination(query);
    const term = query.searchQuery?.trim();
    const where: Prisma.LabelWhereInput = { isActive: true, ...(term ? { name: { contains: term, mode: "insensitive" } } : {}) };
    const [rows, total] = await prisma.$transaction([
      prisma.label.findMany({ where, include: { logo: true, _count: { select: { albums: true } } }, orderBy: [{ order: "asc" }, { name: "asc" }], skip, take: pageSize }),
      prisma.label.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({ id: row.id, slug: row.slug, name: row.name, logo: row.logo?.path ?? "", description: row.description ?? undefined, website: row.website ?? undefined, albumCount: row._count.albums })),
      total, page, pageSize,
    };
  }
}

export const catalogAdapter: CatalogAdapter = new PrismaCatalogAdapter();
