import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const master = path.join(
  process.cwd(),
  "deliverables",
  "parigo-photo-library-v3",
  "masters",
  "r14-forgot-password-v3-master.png",
);
const outputDirectory = path.join(
  process.cwd(),
  "public",
  "images",
  "editorial",
  "parigo-real",
  "v3",
);
const output = path.join(outputDirectory, "r14-forgot-password-v3-1200x1500.avif");

async function main() {
  await access(master);
  await mkdir(outputDirectory, { recursive: true });
  await sharp(master)
    .rotate()
    .resize(1200, 1500, { fit: "cover", position: "centre" })
    .toColourspace("srgb")
    .avif({ quality: 78, effort: 7 })
    .toFile(output);
  console.log(output);
}

void main();
