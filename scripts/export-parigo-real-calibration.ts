import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import sharp, { type Gravity } from "sharp";
import { parigoRealCalibrationV2Manifest } from "../src/data/parigo-real-v2-calibration";
import { parigoRealAssetSlugs } from "../src/data/parigo-real-production";

const versionArg = process.argv.find((argument) => argument.startsWith("--version="));
const version = Number(versionArg?.split("=")[1]);
const overwrite = process.argv.includes("--overwrite");
const onlyArg = process.argv.find((argument) => argument.startsWith("--only="));
const onlyCode = onlyArg?.split("=")[1]?.toUpperCase();

if (version !== 2) {
  throw new Error(
    "Cette étape d’étalonnage accepte uniquement --version=2. Les V1 restent immuables et la V3 sera activée après validation.",
  );
}

const masterRoot =
  process.env.PARIGO_MASTER_ROOT ??
  path.join(homedir(), "Downloads", "Parigo-references-IA", "07-rendus-maitres");
const outputRoot = path.join(
  process.cwd(),
  "public",
  "images",
  "editorial",
  "parigo-real",
  `v${version}`,
);

const verticalPositions: Partial<Record<string, Gravity | string>> = {
  R01: "right",
  R03: "centre",
};

async function assertWritable(filename: string) {
  if (overwrite) return;

  try {
    await access(filename, constants.F_OK);
  } catch {
    return;
  }

  throw new Error(
    `Export déjà présent : ${filename}. Relancer avec --overwrite uniquement après validation explicite.`,
  );
}

async function main() {
  await mkdir(outputRoot, { recursive: true });

  let count = 0;

  const selectedItems = onlyCode
    ? parigoRealCalibrationV2Manifest.filter((item) => item.code === onlyCode)
    : parigoRealCalibrationV2Manifest;

  if (selectedItems.length === 0) {
    throw new Error(`Aucun master d’étalonnage ne correspond à --only=${onlyCode}.`);
  }

  for (const item of selectedItems) {
    const slug = parigoRealAssetSlugs[item.code];
    const master = path.join(
      masterRoot,
      `v${version}`,
      `${item.code}-${slug}-v${version}-master.png`,
    );
    await access(master, constants.R_OK);

    for (const { width, height } of item.exports) {
      const filename = path.join(
        outputRoot,
        `${item.code.toLowerCase()}-${slug}-v${version}-${width}x${height}.avif`,
      );
      await assertWritable(filename);

      const isVerticalDerivative = height / width > 1.2 && item.aspect !== "4:5";

      await sharp(master)
        .resize(width, height, {
          fit: "cover",
          position: isVerticalDerivative
            ? (verticalPositions[item.code] ?? "centre")
            : "centre",
        })
        .toColourspace("srgb")
        .avif({ quality: 68, effort: 6, chromaSubsampling: "4:4:4" })
        .toFile(filename);
      count += 1;
    }
  }

  console.log(
    `${count} exports AVIF V${version} créés depuis ${selectedItems.length} masters, sans modifier la V1.`,
  );
}

void main();
