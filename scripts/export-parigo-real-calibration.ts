import { access, mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import sharp, { type Gravity } from "sharp";
import {
  parigoRealAssetSlugs,
  parigoRealProductionManifest,
} from "../src/data/parigo-real-production";

const masterRoot =
  process.env.PARIGO_MASTER_ROOT ??
  path.join(homedir(), "Downloads", "Parigo-references-IA", "07-rendus-maitres");
const outputRoot = path.join(
  process.cwd(),
  "public",
  "images",
  "editorial",
  "parigo-real",
);

const verticalPositions: Partial<Record<string, Gravity | string>> = {
  R01: "right",
  R03: "centre",
  R06: "right",
  R31: "centre",
};

async function main() {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  let count = 0;

  for (const item of parigoRealProductionManifest) {
    const slug = parigoRealAssetSlugs[item.code];
    const master = path.join(masterRoot, `${item.code}-${slug}-master.png`);
    await access(master);

    for (const { width, height } of item.exports) {
      const filename = `${item.code.toLowerCase()}-${slug}-${width}x${height}.avif`;
      const isVerticalDerivative = height / width > 1.2 && item.aspect !== "4:5";

      await sharp(master)
        .resize(width, height, {
          fit: "cover",
          position: isVerticalDerivative ? (verticalPositions[item.code] ?? "centre") : "centre",
        })
        .toColourspace("srgb")
        .avif({ quality: 68, effort: 6, chromaSubsampling: "4:4:4" })
        .toFile(path.join(outputRoot, filename));
      count += 1;
    }
  }

  console.log(`${count} exports AVIF créés depuis ${parigoRealProductionManifest.length} masters.`);
}

void main();
