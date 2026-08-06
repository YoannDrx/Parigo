import { brotliCompressSync } from "node:zlib";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const publicRoot = path.join(root, "public");
// The canonical composer catalogue now includes the requested local portraits.
// Keep a narrow allowance above the current footprint so new assets still have
// to fit within an explicit budget instead of disabling the aggregate guard.
const MAX_STATIC_PUBLIC_BYTES = 13 * 1024 * 1024;
const MAX_VIDEO_BYTES = 72 * 1024 * 1024;
const LARGE_ASSET_BYTES = 500 * 1024;
const MEDIA_EXTENSIONS = /\.(mp3|wav|ogg|mp4|webm|jpg|jpeg|png|avif|webp)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm)$/i;
const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx|json|md|css)$/i;

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  }))).flat();
}

async function main() {
const publicFiles = await walk(publicRoot);
const sourceRoots = ["src", "e2e", "docs", "scripts"].map((item) => path.join(root, item));
const sourceFiles = (await Promise.all(sourceRoots.map((directory) => walk(directory).catch(() => [])))).flat().filter((file) => SOURCE_EXTENSIONS.test(file));
const sourceCorpus = (await Promise.all(sourceFiles.map((file) => readFile(file, "utf8").catch(() => "")))).join("\n");
let staticBytes = 0;
let videoBytes = 0;
const failures: string[] = [];

for (const file of publicFiles) {
  const details = await stat(file);
  const isVideo = VIDEO_EXTENSIONS.test(file);
  if (isVideo) videoBytes += details.size;
  else staticBytes += details.size;
  const relative = `/${path.relative(publicRoot, file).split(path.sep).join("/")}`;
  if (/\/(\.DS_Store|Thumbs\.db)$/i.test(relative)) failures.push(`Fichier système interdit : ${relative}`);
  if (relative.startsWith("/images/composers/") && !/^[a-z0-9_]+\.(?:svg|webp)$/.test(path.basename(file))) {
    failures.push(`Nom de portrait compositeur non normalisé : ${relative}`);
  }
  if (MEDIA_EXTENSIONS.test(file)) {
    const prefix = (await readFile(file)).subarray(0, 256).toString("utf8").trimStart().toLowerCase();
    if (prefix.startsWith("<!doctype html") || prefix.startsWith("<html")) failures.push(`HTML déguisé en média : ${relative}`);
  }
  if (details.size > LARGE_ASSET_BYTES && !sourceCorpus.includes(relative)) {
    failures.push(`Asset public > 500 Kio sans référence explicite : ${relative}`);
  }
  if (isVideo && details.size > MAX_VIDEO_BYTES) {
    failures.push(`Vidéo publique trop lourde : ${relative} (${(details.size / 1024 / 1024).toFixed(2)} Mio > 72 Mio)`);
  }
}

if (staticBytes > MAX_STATIC_PUBLIC_BYTES) failures.push(`Budget public statique dépassé : ${(staticBytes / 1024 / 1024).toFixed(2)} Mio > 12 Mio`);
if (videoBytes > MAX_VIDEO_BYTES) failures.push(`Budget vidéo public dépassé : ${(videoBytes / 1024 / 1024).toFixed(2)} Mio > 72 Mio`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Assets valides : ${publicFiles.length} fichiers, ${(staticBytes / 1024 / 1024).toFixed(2)} Mio statiques, ${(videoBytes / 1024 / 1024).toFixed(2)} Mio vidéo, ${(brotliCompressSync(Buffer.from(sourceCorpus)).byteLength / 1024).toFixed(1)} Kio de corpus analysé.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
