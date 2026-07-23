import { SEO_SELECTIONS } from "@/content/seo-selections";
import { SYNCHRONISATIONS } from "@/content/synchronisations";
import { getCachedLabels, getCachedPlaylists, getCachedStyles } from "@/lib/harvest/catalog-cache";
import { renderUrlSet, unavailableSitemap, xmlResponse } from "@/lib/sitemap-xml";

const staticPaths = [
  "", "/albums", "/labels", "/collections", "/playlists", "/synchronisations",
  "/licensing", "/contact", "/about", "/legal", "/privacy", "/terms", "/rights",
];

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const kind = (await params).kind.replace(/\.xml$/, "");
  try {
    if (kind === "static") {
      return xmlResponse(renderUrlSet([
        ...staticPaths.map((path) => ({ fr: path || "/", en: `/en${path}`, priority: path === "" ? 1 : 0.7 })),
        ...SYNCHRONISATIONS.map(({ slug }) => ({ fr: `/synchronisations/${slug}`, en: `/en/synchronisations/${slug}`, priority: 0.6 })),
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
    if (kind === "collections") {
      const collections = await getCachedStyles();
      return xmlResponse(renderUrlSet(collections.map((collection) => ({ fr: `/collections/${collection.id}`, en: `/en/collections/${collection.id}`, priority: 0.6 }))));
    }
    if (kind === "selections") {
      return xmlResponse(renderUrlSet(SEO_SELECTIONS.map((selection) => ({ fr: `/selections/${selection.content.fr.slug}`, en: `/en/selections/${selection.content.en.slug}`, priority: 0.8 }))));
    }
    return new Response("Not found", { status: 404 });
  } catch {
    return unavailableSitemap();
  }
}
