import { SEO_SELECTIONS } from "@/content/seo-selections";
import { getEditorialVideos } from "@/lib/editorial/videos";
import { canonicalComposerProfiles } from "@/lib/composers/profiles";
import { getCachedLabels, getCachedPlaylists } from "@/lib/harvest/catalog-cache";
import { renderUrlSet, unavailableSitemap, xmlResponse } from "@/lib/sitemap-xml";
import { getSynchronisations } from "@/lib/youtube/synchronisations";

const staticPaths = [
  "", "/albums", "/labels", "/playlists", "/synchronisations",
  "/label-parigo", "/talents", "/clips",
  "/licensing", "/contact", "/about", "/legal", "/privacy", "/terms", "/rights",
];

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const kind = (await params).kind.replace(/\.xml$/, "");
  try {
    if (kind === "static") {
      const synchronisations = await getSynchronisations();
      return xmlResponse(renderUrlSet([
        ...staticPaths.map((path) => ({ fr: path || "/", en: `/en${path}`, priority: path === "" ? 1 : 0.7 })),
        ...synchronisations.map(({ slug, publishedAt }) => ({ fr: `/synchronisations/${slug}`, en: `/en/synchronisations/${slug}`, lastModified: publishedAt, priority: 0.6 })),
      ]));
    }
    if (kind === "labels") {
      const labels = await getCachedLabels();
      return xmlResponse(renderUrlSet(labels.map((label) => ({ fr: `/labels/${label.id}`, en: `/en/labels/${label.id}`, lastModified: label.updatedAt, priority: 0.7 }))));
    }
    if (kind === "playlists") {
      const playlists = await getCachedPlaylists({ limit: 100 });
      return xmlResponse(renderUrlSet(playlists.items.map((playlist) => ({ fr: `/playlists/${playlist.id}`, en: `/en/playlists/${playlist.id}`, lastModified: playlist.updatedAt || playlist.createdAt, priority: 0.7 }))));
    }
    if (kind === "selections") {
      return xmlResponse(renderUrlSet(SEO_SELECTIONS.map((selection) => ({ fr: `/selections/${selection.content.fr.slug}`, en: `/en/selections/${selection.content.en.slug}`, priority: 0.8 }))));
    }
    if (kind === "editorial") {
      const videos = await getEditorialVideos();
      return xmlResponse(renderUrlSet([
        ...canonicalComposerProfiles.map(({ slug }) => ({ fr: `/talents/${slug}`, en: `/en/talents/${slug}`, priority: 0.7 })),
        ...videos.map(({ slug, publishedAt }) => ({ fr: `/clips/${slug}`, en: `/en/clips/${slug}`, lastModified: publishedAt, priority: 0.65 })),
      ]));
    }
    return new Response("Not found", { status: 404 });
  } catch {
    return unavailableSitemap();
  }
}
