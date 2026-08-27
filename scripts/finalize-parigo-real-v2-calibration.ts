import { access, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const referenceRoot =
  process.env.PARIGO_REFERENCE_ROOT ??
  path.join(homedir(), "Downloads", "Parigo-references-IA");
const candidateRoot = path.join(
  referenceRoot,
  "10-imagegen-inputs",
  "calibration-selected",
);
const masterRoot = path.join(referenceRoot, "07-rendus-maitres", "v2");

const files = {
  r01: path.join(candidateRoot, "r01-v2-selected.png"),
  r02: path.join(candidateRoot, "r02-v2-selected.png"),
  r03: path.join(candidateRoot, "r03-v2-selected.png"),
  r14: path.join(candidateRoot, "r14-v2-placeholder-selected.png"),
  r15: path.join(
    referenceRoot,
    "01-orgue-reference",
    "orgue-commandes-temptation-detail-img-1065.jpg",
  ),
  r32: path.join(candidateRoot, "r32-v2-selected.png"),
  r03Anchor: path.join(
    referenceRoot,
    "04-exterieur-facade",
    "facade-angle-entree-img-1067.jpg",
  ),
  r14Cover: path.join(
    referenceRoot,
    "08-pochettes-hd",
    "une-derniere-fois.jpg",
  ),
} as const;

async function requireInputs() {
  await Promise.all(Object.values(files).map((file) => access(file)));
}

async function finalizeR03() {
  const candidate = await sharp(files.r03)
    .resize(1920, 1080, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  const source = await sharp(files.r03Anchor)
    .rotate()
    .resize(1920, 1080, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  // Preserve the real street plaque pixels instead of asking the model to redraw text.
  const plaque = await sharp(source)
    .extract({ left: 1081, top: 68, width: 112, height: 82 })
    .png()
    .toBuffer();

  await sharp(candidate)
    .composite([{ input: plaque, left: 1081, top: 68 }])
    .png({ compressionLevel: 7 })
    .toFile(path.join(masterRoot, "R03-facade-angle-v2-master.png"));
}

async function finalizeR14() {
  const cover = await sharp(files.r14Cover)
    .rotate()
    .resize(420, 390, { fit: "fill" })
    .affine(
      [
        [1, 0.042],
        [0, 1],
      ],
      { background: "#00000000" },
    )
    .png()
    .toBuffer();

  await sharp(files.r14)
    .composite([{ input: cover, left: 414, top: 251 }])
    .resize(1200, 1500, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 7 })
    .toFile(path.join(masterRoot, "R14-forgot-password-v2-master.png"));
}

async function main() {
  await requireInputs();
  await mkdir(masterRoot, { recursive: true });

  await Promise.all([
    sharp(files.r01)
      .resize(1920, 1080, { fit: "cover", position: "centre" })
      .png({ compressionLevel: 7 })
      .toFile(path.join(masterRoot, "R01-hero-orgue-v2-master.png")),
    sharp(files.r02)
      .resize(1920, 1080, { fit: "cover", position: "centre" })
      .png({ compressionLevel: 7 })
      .toFile(path.join(masterRoot, "R02-plateau-editorial-v2-master.png")),
    finalizeR03(),
    finalizeR14(),
    sharp(files.r15)
      .rotate()
      .resize(1200, 1500, { fit: "cover", position: "centre" })
      .modulate({ brightness: 1.03, saturation: 0.98 })
      .gamma(1.03)
      .sharpen({ sigma: 0.45 })
      .png({ compressionLevel: 7 })
      .toFile(path.join(masterRoot, "R15-reset-password-v2-master.png")),
    sharp(files.r32)
      .resize(1600, 1200, { fit: "cover", position: "centre" })
      .png({ compressionLevel: 7 })
      .toFile(
        path.join(
          masterRoot,
          "R32-table-editoriale-pochettes-trophees-v2-master.png",
        ),
      ),
  ]);

  console.log(`6 masters V2 d’étalonnage créés dans ${masterRoot}`);
}

void main();
