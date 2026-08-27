import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  PARIGO_REAL_V1_COUNT,
  parigoRealAssetSlugs,
  parigoRealGallery,
} from "../src/data/parigo-real-production";
import {
  PARIGO_REAL_V2_CALIBRATION_COUNT,
  parigoRealCalibrationV2Gallery,
  parigoRealCalibrationV2Manifest,
  parigoRealVersionedGallery,
} from "../src/data/parigo-real-v2-calibration";

const masterRoot =
  process.env.PARIGO_MASTER_ROOT ??
  path.join(homedir(), "Downloads", "Parigo-references-IA", "07-rendus-maitres");

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function validateExports() {
  for (const image of parigoRealVersionedGallery) {
    for (const item of image.exports ?? []) {
      const filename = path.join(process.cwd(), "public", item.src.replace(/^\//, ""));
      await access(filename, constants.R_OK);
      const metadata = await sharp(filename).metadata();
      invariant(
        metadata.width === item.width && metadata.height === item.height,
        `${image.versionKey}: dimensions invalides pour ${item.src}`,
      );
      invariant(metadata.exif === undefined, `${image.versionKey}: EXIF présent dans ${item.src}`);
      invariant(
        metadata.space === "srgb",
        `${image.versionKey}: espace colorimétrique ${metadata.space ?? "inconnu"} au lieu de sRGB`,
      );
    }
  }
}

async function validateCalibrationMasters() {
  for (const item of parigoRealCalibrationV2Manifest) {
    const slug = parigoRealAssetSlugs[item.code];
    const filename = path.join(masterRoot, "v2", `${item.code}-${slug}-v2-master.png`);
    await access(filename, constants.R_OK);
  }
}

function validateManifest() {
  invariant(parigoRealGallery.length === 36, "Le compte V1 doit rester exactement égal à 36.");
  invariant(PARIGO_REAL_V1_COUNT === 36, "La constante V1 doit rester égale à 36.");
  invariant(
    parigoRealCalibrationV2Gallery.length === 6 && PARIGO_REAL_V2_CALIBRATION_COUNT === 6,
    "Le jalon V2 doit contenir exactement six étalons.",
  );

  const pairs = new Set<string>();
  for (const image of parigoRealVersionedGallery) {
    invariant(image.familyCode && image.version, "Une entrée réelle n’est pas versionnée.");
    const pair = `${image.familyCode}/${image.version}`;
    invariant(!pairs.has(pair), `Couple famille/version dupliqué : ${pair}`);
    pairs.add(pair);
    invariant((image.references?.length ?? 0) <= 10, `${pair}: plus de dix références.`);
  }

  const latestByFamily = new Map<string, number>();
  for (const image of parigoRealVersionedGallery) {
    if (!image.isLatest || !image.familyCode) continue;
    latestByFamily.set(image.familyCode, (latestByFamily.get(image.familyCode) ?? 0) + 1);
  }
  invariant(latestByFamily.size === 36, "Chaque famille V1 actuelle doit posséder une dernière version.");
  for (const [family, count] of latestByFamily) {
    invariant(count === 1, `${family}: ${count} versions marquées isLatest.`);
  }

  for (const item of parigoRealCalibrationV2Manifest) {
    const familyCode: string = item.code;
    const uniqueCovers = new Set(item.covers);
    invariant(uniqueCovers.size === item.covers.length, `${item.code}: pochette dupliquée.`);
    if (item.code === "R14") {
      invariant(
        item.covers.length === 1 && item.covers[0] === "Une Dernière Fois",
        "R14 doit contenir exactement Une Dernière Fois.",
      );
      invariant(
        item.additions.some((addition) => addition.includes("Mark Award")),
        "R14 doit contenir un Mark Award.",
      );
    } else {
      invariant(
        item.covers.length === 0 || item.covers.length >= 4,
        `${item.code}: une composition avec vinyles doit en utiliser au moins quatre.`,
      );
    }
    if (familyCode === "R31" || familyCode === "R48") {
      invariant(item.covers.length === 9, `${item.code}: neuf pochettes uniques requises.`);
    }
  }

  const clientPayload = JSON.stringify(parigoRealVersionedGallery);
  invariant(
    !/Downloads|Téléchargements|Parigo-references-IA/.test(clientPayload),
    "Un chemin local est exposé dans les données client.",
  );
}

async function main() {
  validateManifest();
  await Promise.all([validateExports(), validateCalibrationMasters()]);
  console.log(
    "Photothèque Parigo valide : 36 V1 historiques, 6 V2 d’étalonnage, exports sRGB sans EXIF et chemins client sûrs.",
  );
}

void main();
