import type {
  ParigoGalleryExport,
  ParigoGalleryImage,
  ParigoGalleryReference,
  ParigoGalleryUsage,
} from "./parigo-image-gallery";
import { parigoRealGallery } from "./parigo-real-production";

type CalibrationSeed = {
  code: "R01" | "R02" | "R03" | "R14" | "R15" | "R32";
  title: string;
  usage: ParigoGalleryUsage;
  aspect: ParigoGalleryImage["aspect"];
  editTarget: string;
  geometryFiles: string[];
  detailFiles: string[];
  covers: string[];
  remove: string[];
  additions: string[];
  exports: Array<{ width: number; height: number }>;
  specific: string;
};

export const PARIGO_REAL_V2_CONTRACT = `Use case: strict photorealistic image editing
Asset type: photographie éditoriale des vrais locaux Parigo Music

CONTRAT DE FIDÉLITÉ 95/5 — La sortie est une retouche photographique de la photo d’ancrage, jamais une réinterprétation du lieu. La photo d’ancrage est l’unique autorité pour le cadrage, la perspective, l’architecture, les ouvertures, les murs, les colonnes, les fenêtres, les stores, le parquet et l’implantation des meubles. Fidélité visuelle cible : 95 %. Intervention IA maximale : 5 % de la surface, hors correction globale d’exposition et de colorimétrie.

Les masques d’intervention se limitent aux personnes, câbles, cartons, papiers, multiprises, tour PC, ventilateur, manteaux et accessoires explicitement demandés. Aucun outpainting ni extension générative du cadre lorsqu’un recadrage réel suffit. Aucun mur, plafond, moulure, fenêtre, ouverture, escalier, garde-corps, porte, meuble ou luminaire structurel nouveau. Ne pas remplacer les meubles réels par du mobilier fictif. Conserver des traces normales d’usage : le lieu est rangé et photographiable, mais pas transformé en showroom.

Lumière naturelle chaude, murs toujours blancs, parquet légèrement ravivé, contraste doux et aucune dominante orange excessive. Aucun humain, reflet humain, silhouette, main ou fragment de corps. Aucun texte, logo ou commande technique redessiné. Les zones comportant la plaque de rue ou les marquages de l’orgue sont exclues des retouches génératives. Toute architecture ou commande inventée entraîne le rejet.

RÈGLES PHYSIQUES — Un MacBook Pro mesure visuellement environ 30 × 21 cm, reste parallèle au bord du bureau, écran tourné vers la chaise et clavier accessible depuis la position assise. Une chaise de bureau est centrée sur l’axe de travail, face au bureau et dégagée pour les jambes. Devant l’orgue, utiliser uniquement un tabouret d’orgue rectangulaire brun sans dossier, centré sur les claviers. Une pochette 33 tours mesure visuellement 31,5 × 31,5 cm, possède une épaisseur de carton crédible, un point d’appui réel et une ombre de contact. Sur un bureau, les pochettes sont posées à plat ou se chevauchent de moins de 15 %. Sur l’orgue, leur bord inférieur repose sur le pupitre existant : rien ne flotte et rien ne pénètre dans le bois. Aucun doublon de pochette dans une même image, y compris dans les reflets et arrière-plans. Aucun texte éditorial, interface, bouton ou watermark.`;

const sourceRoot = "/images/editorial/parigo-real-sources";
const coverRoot = "/images/editorial/parigo-real-covers";
const outputRoot = "/images/editorial/parigo-real/v2";

const coverSlugs: Record<string, string> = {
  "Acid Body Music": "acid-body-music",
  "Egocentric Visuo-Spatial Perspective": "egocentric-visuo-spatial-perspective",
  "Hand Funktion": "hand-funktion",
  "Mustang Force": "mustang-force",
  "Ny Parigo": "ny-parigo",
  "The Trip": "the-trip",
  "Une Dernière Fois": "une-derniere-fois",
  Velodrome: "velodrome",
  Videoclub: "videoclub",
};

const assetSlugs: Record<CalibrationSeed["code"], string> = {
  R01: "hero-orgue",
  R02: "plateau-editorial",
  R03: "facade-angle",
  R14: "forgot-password",
  R15: "reset-password",
  R32: "table-editoriale-pochettes-trophees",
};

function source(filename: string) {
  return `${sourceRoot}/${filename.replace(/\.jpg$/, ".webp")}`;
}

function sourceReference(
  filename: string,
  label: string,
  role: ParigoGalleryReference["role"],
): ParigoGalleryReference {
  return { src: source(filename), label, role };
}

function exportLabel(width: number, height: number) {
  if (width === 1080 && height === 1920) return "Story";
  if (width === 1920 && height === 1005) return "Open Graph";
  if (width === 2100 && height === 900) return "Panoramique";
  if (width / height > 1.5) return "Horizontal";
  if (height > width) return "Portrait";
  return "Format 4:3";
}

function itemExports(item: CalibrationSeed): ParigoGalleryExport[] {
  const slug = assetSlugs[item.code];
  return item.exports.map(({ width, height }) => ({
    src: `${outputRoot}/${item.code.toLowerCase()}-${slug}-v2-${width}x${height}.avif`,
    label: exportLabel(width, height),
    width,
    height,
  }));
}

function itemReferences(item: CalibrationSeed): ParigoGalleryReference[] {
  return [
    sourceReference(item.editTarget, "Photo d’ancrage — cible de l’édition", "ancrage"),
    ...item.geometryFiles.map((file) =>
      sourceReference(file, "Référence de géométrie", "géométrie"),
    ),
    ...item.detailFiles.map((file) =>
      sourceReference(file, "Référence de détail", "détail"),
    ),
    ...item.covers.map((cover) => ({
      src: `${coverRoot}/${coverSlugs[cover]}.webp`,
      label: `Pochette HD — ${cover}`,
      role: "décoration" as const,
    })),
  ].slice(0, 10);
}

export const parigoRealCalibrationV2Manifest: CalibrationSeed[] = [
  {
    code: "R01",
    title: "Hero — l’orgue dans les vrais locaux",
    usage: "Hero",
    aspect: "16:9",
    editTarget: "plateau-bureau-orgue-plan-large-img-1081.jpg",
    geometryFiles: ["orgue-plan-large-piece-img-1048.jpg", "orgue-face-complete-img-1036.jpg"],
    detailFiles: ["orgue-commandes-claviers-detail-img-1044.jpg"],
    covers: ["Acid Body Music", "Hand Funktion", "Videoclub", "Ny Parigo", "The Trip"],
    remove: ["tour PC", "multiprises", "câbles en paquet"],
    additions: ["MacBook ergonomique", "tabouret d’orgue centré", "cinq pochettes officielles distinctes"],
    exports: [
      { width: 1920, height: 1080 },
      { width: 1200, height: 1500 },
      { width: 1920, height: 1005 },
      { width: 1080, height: 1920 },
    ],
    specific: `Repartir de IMG_1081. Conserver exactement l’ouverture, les colonnes, fenêtres, garde-corps et l’implantation de l’orgue. Tourner uniquement le bureau gauche pour qu’il soit perpendiculaire à la fenêtre ; placer la chaise entre la fenêtre et le bureau, dossier vers la fenêtre, face au plan de travail. Centrer le MacBook sur cet axe et le tabouret devant les claviers. Disposer sur toute la largeur du pupitre, sans doublon : Acid Body Music, Hand Funktion, Videoclub, Ny Parigo et The Trip.`,
  },
  {
    code: "R02",
    title: "Plateau éditorial Parigo",
    usage: "Espaces",
    aspect: "16:9",
    editTarget: "plateau-bureau-perspective-large-img-1086.jpg",
    geometryFiles: ["plateau-bureau-perspective-longue-img-1085.jpg", "plateau-bureau-vue-generale-img-1084.jpg"],
    detailFiles: [],
    covers: ["Mustang Force", "Ny Parigo", "The Trip", "Velodrome"],
    remove: ["personnes", "manteaux", "ventilateur", "documents temporaires", "écrans redondants"],
    additions: ["MacBook à gauche face à l’assise", "casque à droite", "quatre pochettes sur le meuble bas"],
    exports: [
      { width: 1920, height: 1080 },
      { width: 2100, height: 900 },
      { width: 1920, height: 1005 },
    ],
    specific: `Conserver le cadrage et toute l’implantation de IMG_1086. Sur le bureau gauche, placer le MacBook à gauche face à la chaise et le casque à sa droite. Centrer l’assise sur l’axe du bureau. Aucun meuble ne se déplace vers les fenêtres. Présenter sur le meuble bas existant Mustang Force, Ny Parigo, The Trip et Velodrome, une seule fois chacune.`,
  },
  {
    code: "R03",
    title: "Façade d’angle Parigo",
    usage: "Espaces",
    aspect: "16:9",
    editTarget: "facade-angle-entree-img-1067.jpg",
    geometryFiles: [],
    detailFiles: ["plaque-rue-remy-dumoncel-detail.jpg"],
    covers: [],
    remove: ["personnes", "vélos", "arceaux seulement dans leur emprise réelle"],
    additions: [],
    exports: [
      { width: 1920, height: 1080 },
      { width: 1200, height: 1500 },
      { width: 1920, height: 1005 },
      { width: 1080, height: 1920 },
    ],
    specific: `Recadrer réellement IMG_1067 en 16:9, sans étendre le bâtiment. Conserver pierre, arcs, fenêtres, balcons, porte, vitrines, trottoir, bordure, chaussée, potelets et végétation réellement présente. La plaque est un fragment photographique intact et doit lire exactement « RUE RÉMY DUMONCEL ». Aucun bac à fleurs, aucune jardinière et aucun élément de façade inventé.`,
  },
  {
    code: "R14",
    title: "Forgot Password — retrouver le fil",
    usage: "Accès",
    aspect: "4:5",
    editTarget: "orgue-face-complete-img-1036.jpg",
    geometryFiles: ["orgue-commandes-intermezzo-detail-img-1064.jpg"],
    detailFiles: ["orgue-commandes-claviers-detail-img-1044.jpg", "trophee-metal-01-face-img-1055.jpg"],
    covers: ["Une Dernière Fois"],
    remove: ["poussière superficielle", "reflets non informatifs"],
    additions: ["exactement une pochette Une Dernière Fois", "un Mark Award réel"],
    exports: [{ width: 1200, height: 1500 }],
    specific: `Utiliser IMG_1036 comme cible instrumentale et IMG_1064/1044 pour les détails. Conserver les vraies commandes. Exception verrouillée à la règle des quatre pochettes : ajouter exactement une pochette « Une Dernière Fois » dans le coin supérieur du pupitre et un Mark Award réel sur le haut de l’orgue. Appuis et ombres de contact crédibles ; aucune autre pochette ni récompense.`,
  },
  {
    code: "R15",
    title: "Reset Password — rétablir le signal",
    usage: "Accès",
    aspect: "4:5",
    editTarget: "orgue-commandes-temptation-detail-img-1065.jpg",
    geometryFiles: [],
    detailFiles: ["orgue-commandes-claviers-detail-img-1044.jpg"],
    covers: [],
    remove: ["poussière superficielle", "reflets non informatifs"],
    additions: [],
    exports: [{ width: 1200, height: 1500 }],
    specific: `Portrait depuis IMG_1065, sans ajout. Corriger légèrement exposition et balance des blancs tout en préservant chaque commande, inscription, couleur et marque d’usure. Aucun bouton, curseur, texte, vinyle ou accessoire inventé.`,
  },
  {
    code: "R32",
    title: "Table éditoriale, pochettes et trophées",
    usage: "Pochettes & mosaïques",
    aspect: "4:3",
    editTarget: "table-reunion-devant-fenetre-img-1079.jpg",
    geometryFiles: ["plateau-bureau-perspective-large-img-1086.jpg"],
    detailFiles: ["trophee-metal-01-face-img-1055.jpg"],
    covers: ["Videoclub", "Une Dernière Fois", "Ny Parigo", "The Trip"],
    remove: ["personnes", "documents temporaires"],
    additions: ["MacBook face à une chaise", "casque hors de l’axe du clavier", "un Mark Award", "quatre pochettes distinctes"],
    exports: [
      { width: 1600, height: 1200 },
      { width: 1920, height: 1005 },
    ],
    specific: `Conserver table, fenêtre, stores et chaises de IMG_1079. Disposer Videoclub, Une Dernière Fois, Ny Parigo et The Trip sans doublon, avec un seul Mark Award réel. Aligner le MacBook face à une chaise et poser le casque à côté, jamais dans l’axe du clavier. Aucun autre objet dominant.`,
  },
];

export const parigoRealCalibrationV2Gallery: ParigoGalleryImage[] =
  parigoRealCalibrationV2Manifest.map((item, index) => {
    const exports = itemExports(item);
    return {
      id: 201 + index,
      code: item.code,
      familyCode: item.code,
      version: 2,
      versionKey: `${item.code}-v2`,
      variantKind: "core",
      isLatest: true,
      supersedes: `${item.code}-v1`,
      title: item.title,
      src: exports[0].src,
      aspect: item.aspect,
      category: item.usage,
      usage: item.usage,
      collection: "real",
      sourceAnchor: source(item.editTarget),
      references: itemReferences(item),
      prompt: `${PARIGO_REAL_V2_CONTRACT}\n\nCOMPOSITION SPÉCIFIQUE — ${item.code}\n\n${item.specific}`,
      changeNotes: [
        `Nettoyage localisé : ${item.remove.join(", ") || "aucun"}`,
        `Ajouts contrôlés : ${item.additions.join(", ") || "aucun"}`,
        item.covers.length
          ? `Pochettes officielles sans doublon : ${item.covers.join(", ")}`
          : "Aucune pochette ajoutée",
      ],
      status: "calibration",
      exports,
    };
  });

export const parigoRealVersionedGallery: ParigoGalleryImage[] = [
  ...parigoRealGallery,
  ...parigoRealCalibrationV2Gallery,
];

export const PARIGO_REAL_FAMILY_COUNT = 36;
export const PARIGO_REAL_VERSION_COUNT = parigoRealVersionedGallery.length;
export const PARIGO_REAL_V2_CALIBRATION_COUNT = parigoRealCalibrationV2Gallery.length;
export const PARIGO_REAL_V2_TARGET_COUNT = 48;
export const PARIGO_REAL_FINAL_FAMILY_TARGET = 48;
export const PARIGO_REAL_FINAL_VERSION_TARGET = 90;

