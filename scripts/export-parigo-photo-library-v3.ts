import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { deliveryRoot, shots } from "./parigo-photo-library-v3-data";

type ExportSpec = { name: string; width: number; height: number; source: "master" | "portrait-master" };

function specsFor(shot: (typeof shots)[number]): ExportSpec[] {
  const specs: ExportSpec[] = shot.format === "16:9"
    ? [
        { name: "1920x1080", width: 1920, height: 1080, source: "master" },
        { name: "1920x1005", width: 1920, height: 1005, source: "master" },
      ]
    : shot.format === "4:3"
      ? [{ name: "1600x1200", width: 1600, height: 1200, source: "master" }]
      : [{ name: "1200x1500", width: 1200, height: 1500, source: "master" }];

  if (shot.variants?.includes("panoramic")) {
    specs.push({ name: "2100x900", width: 2100, height: 900, source: "master" });
  }
  if (shot.variants?.includes("portrait-dedicated")) {
    specs.push({ name: "1080x1920", width: 1080, height: 1920, source: "portrait-master" });
  }
  return specs;
}

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function exportImage(source: string, basename: string, spec: ExportSpec) {
  const pipeline = sharp(source)
    .rotate()
    .resize(spec.width, spec.height, { fit: "cover", position: "attention" })
    .toColourspace("srgb")
    .withMetadata({ orientation: 1 });

  const outputs = {
    png: path.join(deliveryRoot, "exports", "png", `${basename}.png`),
    avif: path.join(deliveryRoot, "exports", "avif", `${basename}.avif`),
    webp: path.join(deliveryRoot, "exports", "webp", `${basename}.webp`),
  };
  await Promise.all([
    pipeline.clone().png({ compressionLevel: 9 }).toFile(outputs.png),
    pipeline.clone().avif({ quality: 65, effort: 7 }).toFile(outputs.avif),
    pipeline.clone().webp({ quality: 82, effort: 6 }).toFile(outputs.webp),
  ]);
  return outputs;
}

async function main() {
  await Promise.all(["png", "avif", "webp"].map((format) => mkdir(path.join(deliveryRoot, "exports", format), { recursive: true })));
  const exported = [];
  const skipped = [];

  for (const shot of shots) {
    const base = `${shot.id.toLowerCase()}-${shot.slug}-v3`;
    const master = path.join(deliveryRoot, "masters", `${base}-master.png`);
    const portraitMaster = path.join(deliveryRoot, "masters", `${base}-portrait-master.png`);
    for (const spec of specsFor(shot)) {
      const source = spec.source === "master" ? master : portraitMaster;
      if (!(await exists(source))) {
        skipped.push({ id: shot.id, spec: spec.name, reason: `maître absent: ${source}` });
        continue;
      }
      const basename = `${base}-${spec.name}`;
      const outputs = await exportImage(source, basename, spec);
      exported.push({ id: shot.id, usage: shot.purpose, dimensions: spec.name, source, outputs });
    }
  }

  await writeFile(
    path.join(deliveryRoot, "delivery-manifest.json"),
    `${JSON.stringify({ version: 3, generatedAt: new Date().toISOString(), exported, skipped }, null, 2)}\n`,
    "utf8",
  );
  console.log(`${exported.length} déclinaisons exportées, ${skipped.length} en attente d'un maître validé.`);
}

void main();
