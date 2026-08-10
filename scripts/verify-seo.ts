const baseUrl = process.env.SEO_BASE_URL || process.env.PLAYWRIGHT_BASE_URL;
if (!baseUrl) throw new Error("SEO_BASE_URL ou PLAYWRIGHT_BASE_URL est requis.");
const previewBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

async function check(path: string, expectations: RegExp[], expectedStatus = 200) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "manual",
    headers: previewBypass ? { "x-vercel-protection-bypass": previewBypass } : undefined,
  });
  if (response.status !== expectedStatus) throw new Error(`${path}: HTTP ${response.status}, attendu ${expectedStatus}`);
  const body = await response.text();
  for (const expectation of expectations) {
    if (!expectation.test(body)) throw new Error(`${path}: motif absent ${expectation}`);
  }
  return body;
}

async function main() {
  const home = await check("/", [/<html[^>]+lang="fr"/i, /<h1[\s>]/i, /rel="canonical"/i]);
  const canonicalOrigin = home.match(/rel="canonical" href="(https?:\/\/[^/"]+)/i)?.[1];
  if (!canonicalOrigin) throw new Error("/: origine canonique introuvable.");
  const escapedOrigin = canonicalOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  await check("/en", [/<html[^>]+lang="en"/i, /hreflang="fr"/i, /hreflang="en"/i]);
  await check("/search?q=cinematic", [
    /name="robots" content="noindex, follow"/i,
    new RegExp(`rel="canonical" href="${escapedOrigin}/search"`, "i"),
  ]);
  await check("/notre-label", [/Notre label/i, /hreflang="en"/i]);
  await check("/en/notre-label", [/Our label/i, /hreflang="fr"/i]);
  await check("/label-parigo", [], 308);
  await check("/en/label-parigo", [], 308);
  await check("/talents", [/Nos talents/i, /rel="canonical"/i]);
  await check("/talents?q=ugly", [
    /name="robots" content="noindex, follow"/i,
    new RegExp(`rel="canonical" href="${escapedOrigin}/talents"`, "i"),
  ]);
  await check("/clips", [/Clips/i, /rel="canonical"/i]);
  await check("/talents/__parigo_seo_missing_profile__", [/404/i], 404);
  await check("/clips/__parigo_seo_missing_clip__", [/404/i], 404);
  await check("/fr/albums", [], 308);
  await check("/albums/__parigo_seo_missing_album__", [
    /name="robots" content="noindex/i,
    /404/i,
  ], 404);
  await check("/sitemap.xml", [/<sitemapindex/i]);
  const staticSitemap = await check("/sitemaps/static.xml", [
    /\/notre-label/i,
    /\/en\/notre-label/i,
  ]);
  if (/\/label-parigo/i.test(staticSitemap)) {
    throw new Error("/sitemaps/static.xml: l’ancienne route Label Parigo est encore indexée.");
  }
  const editorialSitemap = await check("/sitemaps/editorial.xml", [
    /\/talents\/ugly-mac-beer/i,
    /\/clips\/yt-[a-z0-9_-]+/i,
  ]);
  if (/\/talents\/harvest-[a-z0-9-]+/i.test(editorialSitemap)) {
    throw new Error("/sitemaps/editorial.xml: un ancien slug Harvest est encore indexé.");
  }
  await check("/robots.txt", [new RegExp(`sitemap: ${escapedOrigin}/sitemap\\.xml`, "i")]);
  console.log(`Contrats SEO principaux validés pour ${canonicalOrigin}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
