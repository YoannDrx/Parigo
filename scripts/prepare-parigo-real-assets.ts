import { execFile } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const referenceRoot = process.env.PARIGO_REFERENCE_ROOT ?? path.join(homedir(), "Downloads", "Parigo-references-IA");
const publicEditorialRoot = path.join(process.cwd(), "public", "images", "editorial");
const sourcePreviewRoot = path.join(publicEditorialRoot, "parigo-real-sources");
const coverPreviewRoot = path.join(publicEditorialRoot, "parigo-real-covers");
const coverRoot = path.join(referenceRoot, "08-pochettes-hd");
const coverBoardRoot = path.join(coverRoot, "planches");
const videoStillRoot = path.join(referenceRoot, "09-images-fixes-videos");

const referenceFolders = [
  "01-orgue-reference",
  "02-orgue-et-pochettes",
  "03-locaux-et-circulation",
  "04-exterieur-facade",
  "05-objets-et-decoration",
] as const;

const covers = [
  ["acid-body-music.jpg", "https://synck-psi.vercel.app/images/projets/vinyles/acid-body-music.jpg"],
  ["egocentric-visuo-spatial-perspective.jpg", "https://synck-psi.vercel.app/images/projets/vinyles/hexahedre.jpg"],
  ["hand-funktion.jpg", "https://synck-psi.vercel.app/images/projets/vinyles/hand-funktion.jpg"],
  ["mustang-force.jpg", "https://synck-psi.vercel.app/images/projets/vinyles/mustang-force.jpg"],
  ["ny-parigo.jpg", "https://synck-psi.vercel.app/images/projets/vinyles/ny-parigo.jpg"],
  ["the-trip.jpg", "https://synck-psi.vercel.app/images/projets/vinyles/the-trip.jpg"],
  ["une-derniere-fois.jpg", "https://synck-psi.vercel.app/images/projets/vinyles/une-derniere-fois.jpg"],
  ["velodrome.jpg", "https://synck-psi.vercel.app/images/projets/vinyles/velodrome.jpg"],
  ["videoclub.jpg", "https://synck-psi.vercel.app/images/projets/vinyles/videoclub.jpg"],
] as const;

const coverBoards = [
  ["parigo-selection-a.jpg", ["acid-body-music.jpg", "hand-funktion.jpg", "videoclub.jpg"]],
  ["parigo-selection-b.jpg", ["mustang-force.jpg", "ny-parigo.jpg", "the-trip.jpg"]],
  ["parigo-selection-c.jpg", ["acid-body-music.jpg", "une-derniere-fois.jpg", "videoclub.jpg"]],
  ["parigo-selection-d.jpg", ["acid-body-music.jpg", "egocentric-visuo-spatial-perspective.jpg", "hand-funktion.jpg", "velodrome.jpg"]],
  ["parigo-selection-e.jpg", ["videoclub.jpg", "une-derniere-fois.jpg", "ny-parigo.jpg", "the-trip.jpg"]],
  ["parigo-selection-f.jpg", ["acid-body-music.jpg", "ny-parigo.jpg", "velodrome.jpg"]],
  ["parigo-selection-g.jpg", ["hand-funktion.jpg", "videoclub.jpg", "une-derniere-fois.jpg"]],
  ["parigo-selection-h.jpg", ["egocentric-visuo-spatial-perspective.jpg", "mustang-force.jpg", "velodrome.jpg"]],
] as const;

async function downloadCovers() {
  await mkdir(coverRoot, { recursive: true });
  for (const [filename, url] of covers) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Téléchargement impossible (${response.status}) : ${url}`);
    await writeFile(path.join(coverRoot, filename), Buffer.from(await response.arrayBuffer()));
  }
}

async function extractVideoStill() {
  await mkdir(videoStillRoot, { recursive: true });
  const input = path.join(referenceRoot, "06-videos-contexte", "circulation-palier-et-rangements-img-1077.mov");
  const output = path.join(videoStillRoot, "circulation-palier-et-rangements-img-1077-still.jpg");
  await execFileAsync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", "00:00:02.000", "-i", input, "-frames:v", "1", "-q:v", "2", "-y", output]);
}

async function sourceFiles() {
  const files = (await Promise.all(referenceFolders.map(async (folder) => {
    const names = await readdir(path.join(referenceRoot, folder));
    return names.filter((name) => /\.jpe?g$/i.test(name)).map((name) => path.join(referenceRoot, folder, name));
  }))).flat();
  files.push(path.join(videoStillRoot, "circulation-palier-et-rangements-img-1077-still.jpg"));
  files.push(path.join(videoStillRoot, "plaque-rue-remy-dumoncel-detail.jpg"));
  return files;
}

async function prepareSourcePreviews() {
  await mkdir(sourcePreviewRoot, { recursive: true });
  const files = await sourceFiles();
  for (const inputPath of files) {
    const outputName = `${path.parse(inputPath).name}.webp`;
    await sharp(inputPath)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(path.join(sourcePreviewRoot, outputName));
  }
  return files.length;
}

async function prepareCoverAssets() {
  await Promise.all([mkdir(coverPreviewRoot, { recursive: true }), mkdir(coverBoardRoot, { recursive: true })]);
  for (const [filename] of covers) {
    await sharp(path.join(coverRoot, filename))
      .resize(1200, 1200, { fit: "cover" })
      .webp({ quality: 82, effort: 5 })
      .toFile(path.join(coverPreviewRoot, filename.replace(/\.jpg$/, ".webp")));
  }

  for (const [boardName, boardCovers] of coverBoards) {
    const tileSize = 900;
    const gap = 48;
    const canvasSize = tileSize * 2 + gap * 3;
    const composites = await Promise.all(boardCovers.map(async (filename, index) => ({
      input: await sharp(path.join(coverRoot, filename)).resize(tileSize, tileSize, { fit: "cover" }).jpeg({ quality: 95 }).toBuffer(),
      left: gap + (index % 2) * (tileSize + gap),
      top: gap + Math.floor(index / 2) * (tileSize + gap),
    })));
    await sharp({ create: { width: canvasSize, height: canvasSize, channels: 3, background: "#17140f" } })
      .composite(composites)
      .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
      .toFile(path.join(coverBoardRoot, boardName));
  }
}

async function main() {
  await downloadCovers();
  await extractVideoStill();
  const sourceCount = await prepareSourcePreviews();
  await prepareCoverAssets();
  console.log(`${sourceCount} aperçus sources, ${covers.length} pochettes HD et ${coverBoards.length} planches préparés.`);
}

void main();
