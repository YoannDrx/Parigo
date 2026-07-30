import { brotliCompressSync } from "node:zlib";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const nextRoot = path.join(root, ".next");
const staticRoot = path.join(nextRoot, "static");
// The editorial home, menu and floating audio controls intentionally add
// responsive states while keeping a narrow margin over the current 128.8 KiB.
const CSS_BUDGET = 132 * 1024;
// The persistent media shell is shared by every public route. Keep its default
// allowance tight, then grant explicit headroom only to catalogue surfaces
// whose own client-side discovery controls are materially larger.
const DEFAULT_JS_BUDGET = 214 * 1024;
const HOME_JS_BUDGET = 220 * 1024;
const ROUTE_JS_BUDGETS = new Map<string, number>([
  ["/search", 236 * 1024],
  ["/albums", 234 * 1024],
  ["/albums/[id]", 234 * 1024],
  ["/label-parigo", 234 * 1024],
  ["/labels/[slug]", 234 * 1024],
  ["/playlists", 216 * 1024],
  ["/playlists/[slug]", 228 * 1024],
  ["/engage-playlist/[token]", 228 * 1024],
]);

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  }))).flat();
}

async function main() {
await stat(staticRoot).catch(() => {
  throw new Error("Build .next absent. Exécutez `pnpm build` avant la validation des budgets.");
});
const cssFiles = (await walk(path.join(root, "src"))).filter((file) => file.endsWith(".css"));
const totalCss = (await Promise.all(cssFiles.map(async (file) => (await stat(file)).size))).reduce((sum, value) => sum + value, 0);
if (totalCss > CSS_BUDGET) {
  throw new Error(
    `Budget CSS dépassé : ${(totalCss / 1024).toFixed(1)} Kio > ${CSS_BUDGET / 1024} Kio.`,
  );
}

const routeStats = JSON.parse(await readFile(path.join(nextRoot, "diagnostics", "route-bundle-stats.json"), "utf8")) as Array<{
  route: string;
  firstLoadChunkPaths: string[];
}>;
const publicRoutes = routeStats.filter(({ route }) => !/^\/(?:api|account|_not-found|sitemaps|sitemap)/.test(route));
const failures: string[] = [];
const compressedSizes = new Map<string, number>();

for (const chunk of [...new Set(publicRoutes.flatMap((route) => route.firstLoadChunkPaths.filter((file) => file.endsWith(".js"))))]) {
  const buffer = await readFile(path.join(root, chunk));
  compressedSizes.set(chunk, brotliCompressSync(buffer).byteLength);
}

for (const routeStat of publicRoutes) {
  const chunks = [...new Set(routeStat.firstLoadChunkPaths.filter((file) => file.endsWith(".js")))];
  const bytes = chunks.reduce((sum, chunk) => sum + (compressedSizes.get(chunk) ?? 0), 0);
  const budget = routeStat.route === "/"
    ? HOME_JS_BUDGET
    : (ROUTE_JS_BUDGETS.get(routeStat.route) ?? DEFAULT_JS_BUDGET);
  if (bytes > budget) failures.push(`${routeStat.route}: ${(bytes / 1024).toFixed(1)} Kio Brotli > ${budget / 1024} Kio`);
}

const initialJsNames = publicRoutes.flatMap((route) => route.firstLoadChunkPaths);
if (initialJsNames.some((name) => /wavesurfer|three/i.test(name))) failures.push("Three.js ou WaveSurfer apparaît dans un chunk initial.");
if (failures.length) throw new Error(`Budgets de build dépassés :\n${failures.join("\n")}`);
console.log(`Budgets respectés : CSS source ${(totalCss / 1024).toFixed(1)} Kio, ${publicRoutes.length} routes contrôlées.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
