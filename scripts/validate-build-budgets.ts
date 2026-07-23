import { brotliCompressSync } from "node:zlib";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const nextRoot = path.join(root, ".next");
const staticRoot = path.join(nextRoot, "static");
const CSS_BUDGET = 120 * 1024;
const DEFAULT_JS_BUDGET = 200 * 1024;
const HOME_JS_BUDGET = 220 * 1024;

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
if (totalCss > CSS_BUDGET) throw new Error(`Budget CSS dépassé : ${(totalCss / 1024).toFixed(1)} Kio > 120 Kio.`);

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
  const budget = routeStat.route === "/" ? HOME_JS_BUDGET : DEFAULT_JS_BUDGET;
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
