import { access, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const selectedRoot =
  process.env.PARIGO_SELECTED_HD_ROOT ??
  path.join(homedir(), "Downloads", "Parigo-HD-a-recropper-2026-08-27");
const deliveryRoot = path.join(
  process.cwd(),
  "deliverables",
  "parigo-photo-library-v3",
  "masters",
);
const outputRoot = path.join(
  process.cwd(),
  "public",
  "images",
  "editorial",
  "parigo-selected",
);

const sources = {
  r01: path.join(selectedRoot, "R01V1-master-HD.png"),
  r02: path.join(deliveryRoot, "r02-plateau-editorial-v1-desk-rework-master.png"),
  r03: path.join(selectedRoot, "R03V1-master-HD.png"),
  r11: path.join(selectedRoot, "R11V1-master-HD.png"),
  r13v2: path.join(deliveryRoot, "r13-register-place-v2-master.png"),
  r14: path.join(deliveryRoot, "r14-forgot-password-v3-master.png"),
  r15v1: path.join(selectedRoot, "R15V1-master-HD.png"),
} as const;

async function exportOriginal(input: string, filename: string) {
  await sharp(input)
    .rotate()
    .toColourspace("srgb")
    .avif({ quality: 80, effort: 7 })
    .toFile(path.join(outputRoot, filename));
}

async function exportCrop(
  input: string,
  filename: string,
  targetWidth: number,
  targetHeight: number,
  focusX: number,
  quality = 80,
) {
  const metadata = await sharp(input).rotate().metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Dimensions illisibles pour ${input}`);
  }

  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = metadata.width / metadata.height;
  const cropWidth = sourceRatio > targetRatio
    ? Math.round(metadata.height * targetRatio)
    : metadata.width;
  const cropHeight = sourceRatio > targetRatio
    ? metadata.height
    : Math.round(metadata.width / targetRatio);
  const left = Math.max(
    0,
    Math.min(
      metadata.width - cropWidth,
      Math.round(metadata.width * focusX - cropWidth / 2),
    ),
  );
  const top = Math.max(0, Math.round((metadata.height - cropHeight) / 2));

  await sharp(input)
    .rotate()
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(targetWidth, targetHeight, { fit: "fill" })
    .toColourspace("srgb")
    .avif({ quality, effort: 7 })
    .toFile(path.join(outputRoot, filename));
}

async function main() {
  await Promise.all(Object.values(sources).map((source) => access(source)));
  await mkdir(outputRoot, { recursive: true });

  await Promise.all([
    exportOriginal(sources.r01, "r01-v1-home-1672x941.avif"),
    exportCrop(sources.r01, "r01-v1-home-1080x1920.avif", 1080, 1920, 0.71),
    exportOriginal(sources.r02, "r02-v1-login-1448x1086.avif"),
    exportOriginal(sources.r03, "r03-v1-contact-1672x941.avif"),
    exportCrop(sources.r15v1, "r15-v1-register-1200x1500.avif", 1200, 1500, 0.5, 78),
    exportCrop(sources.r15v1, "r15-v1-register-1440x900.avif", 1440, 900, 0.5, 78),
    exportCrop(sources.r11, "r11-v1-forgot-password-1200x1500.avif", 1200, 1500, 0.5),
    exportCrop(sources.r13v2, "r13-v2-password-recovery-1200x1500.avif", 1200, 1500, 0.5),
    exportCrop(sources.r14, "r14-v3-forgot-password-1200x1500.avif", 1200, 1500, 0.5),
  ]);

  console.log(`9 exports Web créés dans ${outputRoot}`);
}

void main();
