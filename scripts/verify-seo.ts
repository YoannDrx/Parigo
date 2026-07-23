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
  await check("/fr/albums", [], 308);
  await check("/albums/__parigo_seo_missing_album__", [
    /name="robots" content="noindex/i,
    /404/i,
  ], 404);
  await check("/sitemap.xml", [/<sitemapindex/i]);
  await check("/robots.txt", [new RegExp(`sitemap: ${escapedOrigin}/sitemap\\.xml`, "i")]);
  console.log(`Contrats SEO principaux validés pour ${canonicalOrigin}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
