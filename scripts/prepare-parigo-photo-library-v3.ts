import { execFile } from "node:child_process";
import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import {
  buildPrompt,
  deliveryRoot,
  referenceRoot,
  shots,
  type ShotReference,
} from "./parigo-photo-library-v3-data";

const execFileAsync = promisify(execFile);

const photoFolders = [
  "01-orgue-reference",
  "02-orgue-et-pochettes",
  "03-locaux-et-circulation",
  "04-exterieur-facade",
  "05-objets-et-decoration",
] as const;

const videoFrames = {
  "V1083@1.5s": {
    input: "plateau-bureau-orgue-plan-fixe-img-1083.mov",
    time: "00:00:01.500",
    output: "v1083-1.5s-orgue-plateau.jpg",
  },
  "V1091@1.2s": {
    input: "orgue-pochettes-plan-fixe-img-1091.mov",
    time: "00:00:01.200",
    output: "v1091-1.2s-orgue-pochettes.jpg",
  },
  "V1074@20.5s": {
    input: "exterieur-tour-facade-img-1074.mov",
    time: "00:00:20.500",
    output: "v1074-20.5s-facade-rues.jpg",
  },
  "V1076@7s": {
    input: "bureau-tour-meubles-et-entree-img-1076.mov",
    time: "00:00:07.000",
    output: "v1076-7s-meuble-orgue.jpg",
  },
  "V1076@28s": {
    input: "bureau-tour-meubles-et-entree-img-1076.mov",
    time: "00:00:28.000",
    output: "v1076-28s-entree-circulation.jpg",
  },
  "V1077@6s": {
    input: "circulation-palier-et-rangements-img-1077.mov",
    time: "00:00:06.000",
    output: "v1077-6s-palier-entree.jpg",
  },
  "V1077@10s": {
    input: "circulation-palier-et-rangements-img-1077.mov",
    time: "00:00:10.000",
    output: "v1077-10s-bureau-palier.jpg",
  },
  "V1077@13s": {
    input: "circulation-palier-et-rangements-img-1077.mov",
    time: "00:00:13.000",
    output: "v1077-13s-rangements.jpg",
  },
} as const;

type InventoryRow = {
  file: string;
  space: string;
  angle: string;
  usefulInformation: string;
  dimensions: string;
  quality: string;
  decision: string;
  reason: string;
};

async function filesIn(directory: string) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(directory, entry.name));
}

function sceneName(relative: string) {
  if (relative.includes("01-orgue-reference")) return "orgue-reference";
  if (relative.includes("02-orgue-et-pochettes")) return "orgue-et-pochettes";
  if (relative.includes("03-locaux-et-circulation")) return "locaux-et-circulation";
  if (relative.includes("04-exterieur-facade")) return "exterieur-facade";
  if (relative.includes("05-objets-et-decoration")) return "objets-et-decoration";
  if (relative.includes("06-videos-contexte")) return "videos-contexte";
  if (relative.includes("08-pochettes-hd")) return "pochettes-hd";
  if (relative.includes("09-images-fixes-videos")) return "images-fixes-videos";
  return "autre";
}

function angleFromName(filename: string) {
  const base = path.basename(filename).toLowerCase();
  if (base.includes("plan-large") || base.includes("vue-generale")) return "plan large";
  if (base.includes("portrait")) return "portrait";
  if (base.includes("detail")) return "détail";
  if (base.includes("plongeante")) return "plongée";
  if (base.includes("angle-droit")) return "trois-quarts droit";
  if (base.includes("angle-gauche")) return "trois-quarts gauche";
  if (base.includes("profil")) return "profil";
  if (base.includes("face")) return "frontal";
  if (base.includes("entree")) return "depuis/vers l'entrée";
  if (base.includes("palier")) return "depuis/vers le palier";
  return "contexte";
}

function informationFromName(filename: string) {
  return path.basename(filename, path.extname(filename))
    .replace(/-img-\d+(?:-still(?:-\d+s)?)?$/i, "")
    .replaceAll("-", " ");
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function imageDimensions(file: string) {
  const metadata = await sharp(file).metadata();
  return metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : "unknown";
}

async function videoDimensions(file: string) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height:format=duration",
    "-of", "json", file,
  ]);
  const payload = JSON.parse(stdout) as { streams?: Array<{ width?: number; height?: number }>; format?: { duration?: string } };
  const stream = payload.streams?.[0];
  const duration = Number(payload.format?.duration ?? 0).toFixed(2);
  return `${stream?.width ?? "?"}x${stream?.height ?? "?"}; ${duration}s`;
}

async function buildPhotoIndex() {
  const index = new Map<string, string>();
  for (const folder of photoFolders) {
    for (const file of await filesIn(path.join(referenceRoot, folder))) {
      const match = path.basename(file).match(/img-(\d{4})/i);
      if (match) index.set(match[1], file);
    }
  }
  return index;
}

async function extractFrames() {
  const outputRoot = path.join(deliveryRoot, "video-stills");
  await mkdir(outputRoot, { recursive: true });
  const resolved = new Map<string, string>();

  for (const [token, frame] of Object.entries(videoFrames)) {
    const input = path.join(referenceRoot, "06-videos-contexte", frame.input);
    const output = path.join(outputRoot, frame.output);
    await execFileAsync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-i", input,
      "-ss", frame.time, "-frames:v", "1", "-q:v", "2", "-y", output,
    ]);
    resolved.set(token, output);
  }

  return resolved;
}

async function resolveReferences(photoIndex: Map<string, string>, frameIndex: Map<string, string>) {
  const plaque = path.join(referenceRoot, "09-images-fixes-videos", "plaque-rue-remy-dumoncel-detail.jpg");
  const coverRoot = path.join(referenceRoot, "08-pochettes-hd");

  return shots.map((shot) => {
    const references = shot.references.map((reference) => {
      let file: string | undefined;
      if (reference.token.startsWith("V")) file = frameIndex.get(reference.token);
      else if (/^\d{4}$/.test(reference.token)) file = photoIndex.get(reference.token);
      else if (reference.token === "R14-V2") file = path.join(referenceRoot, "07-rendus-maitres", "v2", "R14-forgot-password-v2-master.png");
      else if (reference.token === "plaque-rue-remy-dumoncel-detail.jpg") file = plaque;
      else if (reference.role === "cover") file = path.join(coverRoot, reference.token);
      if (!file) throw new Error(`Référence introuvable pour ${shot.id}: ${reference.token}`);
      return { ...reference, path: file };
    });
    if (references.length + (shot.stylePilot ? 1 : 0) > 10) {
      throw new Error(`${shot.id} dépasse 10 références (${references.length + (shot.stylePilot ? 1 : 0)})`);
    }
    return { ...shot, resolvedReferences: references };
  });
}

async function prepareFolders() {
  const folders = [
    "sources/selected", "sources/rejected", "sources/normalized", "video-stills", "prompts",
    "candidates", "masters", "exports/png", "exports/avif", "exports/webp", "qa",
  ];
  await Promise.all(folders.map((folder) => mkdir(path.join(deliveryRoot, folder), { recursive: true })));
  await Promise.all(shots.map((shot) => mkdir(path.join(deliveryRoot, "candidates", shot.id), { recursive: true })));
}

function normalizedReferencePath(reference: ShotReference & { path: string }) {
  const safeToken = reference.token.replace(/[^a-z0-9.-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return path.join(deliveryRoot, "sources", "normalized", `${safeToken}.png`);
}

async function normalizeReferences(resolvedShots: Awaited<ReturnType<typeof resolveReferences>>) {
  const unique = new Map<string, ShotReference & { path: string }>();
  for (const shot of resolvedShots) {
    for (const reference of shot.resolvedReferences) unique.set(reference.path, reference);
  }
  await Promise.all([...unique.values()].map(async (reference) => {
    const output = normalizedReferencePath(reference);
    await execFileAsync("sips", ["-s", "format", "png", reference.path, "--out", output]);
  }));
}

function coverBoardPath(shotId: string) {
  return path.join(deliveryRoot, "sources", "normalized", `${shotId.toLowerCase()}-official-cover-board.png`);
}

async function createCoverBoards(resolvedShots: Awaited<ReturnType<typeof resolveReferences>>) {
  for (const shot of resolvedShots) {
    const covers = shot.resolvedReferences.filter((reference) => reference.role === "cover");
    if (covers.length < 2) continue;
    const inputs = covers.flatMap((reference) => ["-i", normalizedReferencePath(reference)]);
    const cells = covers.map((_, index) => `[${index}:v]scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:white[c${index}]`);
    const layout = covers.length === 4
      ? "0_0|512_0|0_512|512_512"
      : covers.map((_, index) => `${index * 512}_0`).join("|");
    const stack = `${covers.map((_, index) => `[c${index}]`).join("")}xstack=inputs=${covers.length}:layout=${layout}[out]`;
    await execFileAsync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", ...inputs,
      "-filter_complex", `${cells.join(";")};${stack}`,
      "-map", "[out]", "-frames:v", "1", "-y", coverBoardPath(shot.id),
    ]);
  }
}

async function curateSources(resolvedShots: Awaited<ReturnType<typeof resolveReferences>>) {
  const usedPaths = new Set(resolvedShots.flatMap((shot) => shot.resolvedReferences.map((reference) => reference.path)));
  const inventory: InventoryRow[] = [];

  const sourceGroups = [
    ...photoFolders.map((folder) => path.join(referenceRoot, folder)),
    path.join(referenceRoot, "07-rendus-maitres", "v2"),
    path.join(referenceRoot, "08-pochettes-hd"),
    path.join(referenceRoot, "09-images-fixes-videos"),
  ];

  for (const directory of sourceGroups) {
    for (const file of await filesIn(directory)) {
      if (!/\.(?:jpe?g|png|webp)$/i.test(file)) continue;
      const relative = path.relative(referenceRoot, file);
      const selected = usedPaths.has(file);
      const bucket = selected ? "selected" : "rejected";
      const scene = sceneName(relative);
      const destinationDirectory = path.join(deliveryRoot, "sources", bucket, scene);
      await mkdir(destinationDirectory, { recursive: true });
      await copyFile(file, path.join(destinationDirectory, path.basename(file)));
      const details = await stat(file);
      inventory.push({
        file: relative,
        space: scene,
        angle: angleFromName(file),
        usefulInformation: informationFromName(file),
        dimensions: await imageDimensions(file),
        quality: details.size > 500_000 ? "haute" : "suffisante",
        decision: selected ? "selected" : "rejected",
        reason: selected ? "Référence explicitement utilisée par au moins une génération V3" : "Doublon, cadrage moins informatif ou non requis par la shot list V3",
      });
    }
  }

  const videoRoot = path.join(referenceRoot, "06-videos-contexte");
  const selectedVideos = new Set(Object.values(videoFrames).map((frame) => frame.input));
  for (const file of await filesIn(videoRoot)) {
    const selected = selectedVideos.has(path.basename(file) as (typeof videoFrames)[keyof typeof videoFrames]["input"]);
    inventory.push({
      file: path.relative(referenceRoot, file),
      space: "videos-contexte",
      angle: "parcours vidéo",
      usefulInformation: informationFromName(file),
      dimensions: await videoDimensions(file),
      quality: "contexte uniquement",
      decision: selected ? "selected-frame" : "context-only",
      reason: selected ? "Une frame précise est extraite pour résoudre la géométrie" : "Vidéo inspectée mais aucune frame supplémentaire n'est nécessaire",
    });
  }

  const header = ["Fichier", "Espace", "Angle", "Informations utiles", "Dimensions", "Qualité", "Garder ?", "Motif"];
  const csv = [header, ...inventory.map((row) => [row.file, row.space, row.angle, row.usefulInformation, row.dimensions, row.quality, row.decision, row.reason])]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  await writeFile(path.join(deliveryRoot, "inventory.csv"), `${csv}\n`, "utf8");
  return inventory;
}

function spatialMap() {
  return `# Cartographie documentaire des locaux Parigo

## Plateau principal et entrée

- Volume ouvert en angle, parquet continu, murs blancs et plusieurs colonnes blanches existantes.
- Entrée vitrée sur la façade d'angle ; table de réunion placée devant les fenêtres et stores.
- Mobilier majeur hétérogène mais cohérent : tables en bois, bureaux, chaises cannées et fauteuils de travail.
- À conserver : implantation, entrée, fenêtres, stores, colonnes, table et circulation vers le palier.
- À nettoyer : personnes, imprimante dominante, ventilateur, manteaux, cartons, papiers et écrans multiples.
- Ambiguïté : aucune vue unique ne décrit tout le volume ; utiliser collectivement IMG_1072, 1073, 1084, 1085, 1086 et la vidéo 1076.

## Orgue et zone attenante

- Orgue en bois contre un mur blanc, proche du meuble rouge/noir et d'un poste informatique.
- Objet iconique verrouillé : deux claviers, pédalier, commandes colorées, façades en bois et cannage, patine, proportions et banc brun chromé.
- À conserver : relation avec le mur, le plateau, le meuble rouge/noir, le parquet et le passage vers le garde-corps.
- À nettoyer : tour PC à droite, multiprises et câbles en amas ; ne pas supprimer les câbles fonctionnels crédibles.
- Ambiguïté : les plans frontaux décrivent l'objet, les plans larges et V1083 décrivent sa relation avec la pièce.

## Palier, escalier et circulation

- Escalier intérieur bordé d'un garde-corps métallique noir avec main courante brune.
- Grandes fenêtres à stores produisant des ombres rayées caractéristiques sur le parquet et les murs.
- Plantes hautes existantes près du garde-corps ; elles peuvent être entretenues, jamais multipliées.
- À conserver : trémie, garde-corps, stores, radiateurs, colonnes, ouvertures et continuité vers l'entrée.
- À nettoyer : cartons, objets temporaires et personnes visibles dans les vidéos.

## Façade et rues

- Rez-de-chaussée d'un immeuble parisien en pierre, local situé sur un pan coupé d'angle.
- Porte vitrée et grandes vitrines encadrées de blanc ; plaques de rues et étages supérieurs verrouillés.
- À conserver : pierre, pan coupé, vitrines, porte, trottoirs, potelets, proportions et continuité des deux rues.
- À nettoyer : vélos, encombrements temporaires, salissures et graffitis parasites avec retenue.
- Aucune enseigne ou signalétique Parigo ne doit être inventée.

## Objets d'identité

- Trois trophées métalliques aux silhouettes distinctes et une illustration encadrée femme/chien.
- Ne jamais inventer une récompense, modifier les gravures, dupliquer un objet ou changer ses proportions.
- Les neuf pochettes HD officielles sont les seules surfaces graphiques autorisées.
`;
}

function deliveryReadme() {
  return `# Parigo Photo Library V3

Livraison documentaire non destructive de 36 concepts photographiques et quatre compositions verticales dédiées.

## Règles

- Les sources originales restent dans \`${referenceRoot}\`.
- Les anciens rendus et candidats V2 sont exclus des références V3, sauf R14-V2 explicitement autorisé comme cible locale par la demande du 27 août 2026.
- Le manifeste conserve une ancre unique et dix références documentaires maximum.
- Le générateur intégré accepte cinq fichiers par appel : \`generationReferences\` décrit le sous-ensemble opérationnel choisi.
- Pour plusieurs pochettes, une planche dérivée uniquement des fichiers HD officiels occupe une entrée opérationnelle.
- Deux candidats sont prévus par composition.
- Les dossiers \`masters\` et \`exports\` ne reçoivent que des images validées.
- Aucun fichier de l'application n'importe automatiquement cette livraison.

## Ordre de validation

1. Pilotes R02, R01 et R05.
2. R03, R04, R06–R09.
3. R10–R15.
4. R16–R21.
5. R22–R27.
6. R28–R33.
7. R34–R36.

## État courant

Le gate pilote général reste actif. R14 a reçu une demande autonome : sa V3 remplace uniquement la pochette mal ajustée de R14-V2 par l'artwork HD officiel The Trip, sans écraser la V2.
`;
}

function qaTemplate(id: string, title: string) {
  return `# QA ${id} — ${title}

## Candidats

- [ ] Candidat A inspecté
- [ ] Candidat B inspecté
- [ ] Comparaison avec l'ancrage effectuée
- [ ] Meilleur candidat sélectionné

## Critères bloquants

- [ ] Architecture, proportions et perspective conformes
- [ ] Implantation et mobilier majeur conformes
- [ ] Objets iconiques conformes
- [ ] Aucun humain, reflet ou fragment de corps
- [ ] Aucun faux logo, texte ou artwork
- [ ] Pochettes exactes, uniques et à la bonne échelle

## Score

- Fidélité architecturale : /40
- Perspective et implantation : /20
- Objets iconiques : /20
- Cohérence photographique : /10
- Efficacité UI : /10
- Total : /100

Statut : pending
Sélection : —
Notes :
`;
}

async function writeProductionFiles(resolvedShots: Awaited<ReturnType<typeof resolveReferences>>) {
  const serializable = resolvedShots.map((shot) => {
    const styleReference = shot.stylePilot
      ? {
          role: "style" as const,
          token: `STYLE:${shot.stylePilot}`,
          path: path.join(deliveryRoot, "masters", `${shot.stylePilot.toLowerCase()}-style-pilot-v3-master.png`),
        }
      : null;
    return {
      id: shot.id,
      slug: shot.slug,
      title: shot.title,
      purpose: shot.purpose,
      format: shot.format,
      variants: shot.variants ?? [],
      composition: shot.composition,
      cleanup: shot.cleanup,
      additions: shot.additions,
      references: styleReference ? [...shot.resolvedReferences, styleReference] : shot.resolvedReferences,
      generationReferences: generationReferencesFor(shot, styleReference),
      candidateCount: 2,
      status: shot.id === "R01" || shot.id === "R02" || shot.id === "R05" ? "pilot-pending" : "blocked-by-pilot",
    };
  });

  await writeFile(path.join(deliveryRoot, "shot-manifest.json"), `${JSON.stringify({ version: 3, generatedAt: new Date().toISOString(), shots: serializable }, null, 2)}\n`, "utf8");
  await writeFile(path.join(deliveryRoot, "spatial-map.md"), spatialMap(), "utf8");
  await writeFile(path.join(deliveryRoot, "README.md"), deliveryReadme(), "utf8");

  for (const shot of resolvedShots) {
    const styleReference: Array<ShotReference & { path: string }> = shot.stylePilot
      ? [{ role: "style", token: `STYLE:${shot.stylePilot}`, path: path.join(deliveryRoot, "masters", `${shot.stylePilot.toLowerCase()}-style-pilot-v3-master.png`) }]
      : [];
    const references = generationReferencesFor(shot, styleReference[0] ?? null);
    const qaPath = path.join(deliveryRoot, "qa", `${shot.id.toLowerCase()}-${shot.slug}.md`);
    const writeQaIfMissing = async () => {
      try {
        await stat(qaPath);
      } catch {
        await writeFile(qaPath, qaTemplate(shot.id, shot.title), "utf8");
      }
    };
    await Promise.all([
      writeFile(path.join(deliveryRoot, "prompts", `${shot.id.toLowerCase()}-${shot.slug}-candidate-a.txt`), `${buildPrompt(shot, "A", references)}\n`, "utf8"),
      writeFile(path.join(deliveryRoot, "prompts", `${shot.id.toLowerCase()}-${shot.slug}-candidate-b.txt`), `${buildPrompt(shot, "B", references)}\n`, "utf8"),
      writeQaIfMissing(),
    ]);
  }
}

function generationReferencesFor(
  shot: Awaited<ReturnType<typeof resolveReferences>>[number],
  styleReference: (ShotReference & { path: string }) | null,
) {
  const sourceLimit = styleReference ? 4 : 5;
  const requested = shot.generationTokens?.map((token) => {
    const reference = shot.resolvedReferences.find((item) => item.token === token);
    if (!reference) throw new Error(`Référence opérationnelle introuvable pour ${shot.id}: ${token}`);
    return reference;
  });
  const anchor = shot.resolvedReferences.find((reference) => reference.role === "anchor");
  if (!anchor) throw new Error(`Ancrage absent pour ${shot.id}`);
  const covers = shot.resolvedReferences.filter((reference) => reference.role === "cover");
  const coverInput: (ShotReference & { path: string }) | null = covers.length > 1
    ? { role: "cover", token: `OFFICIAL-COVER-BOARD:${shot.id}`, path: coverBoardPath(shot.id) }
    : covers[0] ?? null;
  const supporting = shot.resolvedReferences
    .filter((reference) => reference !== anchor && reference.role !== "cover")
    .sort((left, right) => {
      const priority: Record<ShotReference["role"], number> = { detail: 0, geometry: 1, remove: 2, anchor: 3, cover: 4, style: 5 };
      return priority[left.role] - priority[right.role];
    });
  const supportingLimit = sourceLimit - 1 - (coverInput ? 1 : 0);
  const sources = requested ?? [anchor, ...supporting.slice(0, supportingLimit), ...(coverInput ? [coverInput] : [])];
  if (sources[0]?.role !== "anchor") throw new Error(`L'ancrage doit être la première référence opérationnelle de ${shot.id}`);
  if (sources.length > sourceLimit) throw new Error(`${shot.id} dépasse la limite imagegen de ${sourceLimit} sources`);
  const normalizedSources = sources.map((reference) => reference.token.startsWith("OFFICIAL-COVER-BOARD:")
    ? reference
    : ({ ...reference, path: normalizedReferencePath(reference) }));
  return styleReference ? [...normalizedSources, styleReference] : normalizedSources;
}

async function main() {
  if (shots.length !== 36) throw new Error(`36 shots attendus, ${shots.length} reçus`);
  await prepareFolders();
  const [photoIndex, frameIndex] = await Promise.all([buildPhotoIndex(), extractFrames()]);
  const resolvedShots = await resolveReferences(photoIndex, frameIndex);
  await normalizeReferences(resolvedShots);
  await createCoverBoards(resolvedShots);
  const inventory = await curateSources(resolvedShots);
  await writeProductionFiles(resolvedShots);
  console.log(`V3 préparée : ${shots.length} shots, ${inventory.length} entrées inventoriées, ${frameIndex.size} frames extraites.`);
  console.log(deliveryRoot);
}

void main();
