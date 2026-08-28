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

export const parigoRealCalibrationV2Gallery: ParigoGalleryImage[] = [
  ...parigoRealCalibrationV2Manifest.map<ParigoGalleryImage>((item, index) => {
    const exports = itemExports(item);
    return {
      id: 201 + index,
      code: item.code,
      familyCode: item.code,
      version: 2,
      versionKey: `${item.code}-v2`,
      variantKind: "core",
      isLatest: item.code !== "R14",
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
  }),
  {
    id: 207,
    code: "R29",
    familyCode: "R29",
    version: 2,
    versionKey: "R29-v2",
    variantKind: "core",
    isLatest: true,
    supersedes: "R29-v1",
    title: "L’atelier des droits",
    src: "/images/editorial/parigo-real/v2/r29-atelier-des-droits-v2-1920x1080.avif",
    aspect: "16:9",
    category: "Pages",
    usage: "Pages",
    collection: "real",
    sourceAnchor: source("plateau-bureau-vue-generale-img-1084.jpg"),
    references: [
      sourceReference("plateau-bureau-vue-generale-img-1084.jpg", "Photo d’ancrage — plateau Parigo", "ancrage"),
      sourceReference("plateau-bureau-perspective-large-img-1086.jpg", "Référence de géométrie — perspective large", "géométrie"),
      sourceReference("plateau-bureau-perspective-longue-img-1085.jpg", "Référence de géométrie — profondeur du plateau", "géométrie"),
      sourceReference("table-reunion-devant-fenetre-img-1079.jpg", "Référence de détail — table de réunion", "détail"),
    ],
    prompt: `Use case: precise-object-edit
Asset type: photographie éditoriale pour la page Licensing de Parigo Music

Image 1 est la cible 16:9 et l’autorité unique pour le cadrage, la perspective, l’architecture, les ouvertures, les colonnes, les fenêtres, les stores, le parquet et le mobilier. Les autres images documentent uniquement la géométrie du vrai plateau.

Préparer les vrais bureaux Parigo pour une discussion professionnelle autour du licensing et de la synchronisation. Retirer les personnes, manteaux, papiers temporaires, imprimante, écrans redondants, déchets et câbles parasites. Conserver l’orgue, les tables, bureaux, chaises, murs blancs et ouvertures dans leurs positions réelles. Ajouter uniquement un carnet noir fermé, un stylo et un casque avec des appuis et ombres crédibles.

Photographie d’intérieur éditoriale contemporaine, lumière naturelle chaude provenant des vraies fenêtres, murs blanc cassé neutres, bois naturel, contraste doux et zone calme pour l’interface. Aucun écran fictif, waveform, timecode, texte, logo, pochette inventée, mobilier nouveau, architecture modifiée, personne, reflet humain, CGI, HDR ou watermark.`,
    changeNotes: [
      "Personnes, manteaux, imprimante et désordre temporaire retirés",
      "Orgue, ouvertures, colonnes et implantation du mobilier préservés",
      "Carnet, stylo et casque disposés sobrement pour l’usage Licensing",
    ],
    status: "approved",
    exports: [
      {
        src: "/images/editorial/parigo-real/v2/r29-atelier-des-droits-v2-1920x1080.avif",
        label: "Horizontal",
        width: 1920,
        height: 1080,
      },
    ],
  } satisfies ParigoGalleryImage,
  {
    id: 208,
    code: "R30",
    familyCode: "R30",
    version: 2,
    versionKey: "R30-v2",
    variantKind: "core",
    isLatest: true,
    supersedes: "R30-v1",
    title: "Le palier au bleu du soir",
    src: "/images/editorial/parigo-real/v2/r30-palier-bleu-du-soir-v2-1920x1080.avif",
    aspect: "16:9",
    category: "Pages",
    usage: "Pages",
    collection: "real",
    sourceAnchor: source("palier-vers-bureau-img-1051.jpg"),
    references: [
      sourceReference("palier-vers-bureau-img-1051.jpg", "Photo d’ancrage — palier vers le bureau", "ancrage"),
      sourceReference("bureau-depuis-palier-plantes-img-1052.jpg", "Référence de géométrie — plantes et garde-corps", "géométrie"),
      sourceReference("bureau-depuis-palier-contexte-img-1053.jpg", "Référence de géométrie — passage vers le bureau", "géométrie"),
      sourceReference("palier-escalier-fenetres-plan-large-img-1050.jpg", "Référence de géométrie — escalier et fenêtres", "géométrie"),
      sourceReference("palier-escalier-fenetre-portrait-img-1049.jpg", "Référence de détail — fenêtre du palier", "détail"),
    ],
    prompt: `Use case: lighting-weather
Asset type: photographie éditoriale pour la page 404 de Parigo Music

Image 1 est la cible 16:9 et l’autorité unique pour le cadrage, la perspective, le garde-corps, l’escalier, les fenêtres, les stores, les plantes et le parquet. Les autres images documentent uniquement la géométrie réelle du palier.

Transformer seulement la lumière et le désordre temporaire pour créer un début de soirée crédible. Retirer les câbles et petits objets parasites, entretenir légèrement les plantes existantes et mélanger un bleu extérieur discret avec les lampes chaudes réellement plausibles. Préserver chaque mur, colonne, ouverture, fenêtre, store, radiateur, garde-corps, main courante, plante, meuble et profondeur de la photo d’ancrage.

Atmosphère calme, sophistiquée et légèrement cinématographique, jamais inquiétante. Aucun panneau, chiffre 404, texte, logo, nouvelle ouverture, plante dupliquée, garde-corps déformé, personne, reflet humain, CGI, HDR, vignettage noir ou watermark.`,
    changeNotes: [
      "Lumière de début de soirée, entre bleu extérieur et lampes chaudes",
      "Garde-corps, fenêtres, stores, plantes et circulation intégralement préservés",
      "Câbles et désordre temporaire retirés sans vider le lieu",
    ],
    status: "approved",
    exports: [
      {
        src: "/images/editorial/parigo-real/v2/r30-palier-bleu-du-soir-v2-1920x1080.avif",
        label: "Horizontal",
        width: 1920,
        height: 1080,
      },
    ],
  } satisfies ParigoGalleryImage,
];

export const parigoRealCalibrationV3Gallery: ParigoGalleryImage[] = [
  {
    id: 301,
    code: "R14",
    familyCode: "R14",
    version: 3,
    versionKey: "R14-v3",
    variantKind: "core",
    isLatest: true,
    supersedes: "R14-v2",
    title: "Forgot Password — The Trip ajustée",
    src: "/images/editorial/parigo-real/v3/r14-forgot-password-v3-1200x1500.avif",
    aspect: "4:5",
    category: "Accès",
    usage: "Accès",
    collection: "real",
    sourceAnchor: "/images/editorial/parigo-real/v2/r14-forgot-password-v2-1200x1500.avif",
    references: [
      {
        src: "/images/editorial/parigo-real/v2/r14-forgot-password-v2-1200x1500.avif",
        label: "R14 V2 — cible de l’édition",
        role: "ancrage",
      },
      {
        src: "/images/editorial/parigo-real-covers/the-trip.webp",
        label: "Pochette HD — The Trip",
        role: "décoration",
      },
    ],
    prompt: `Use case: precise-object-edit
Asset type: photographie éditoriale Parigo R14 V3

Image 1 : R14 V2, cible absolue de l’édition.
Image 2 : pochette HD officielle The Trip, insert de compositing.

Remplacer uniquement la pochette Une Dernière Fois et son support beige décalé par une unique pochette physique carrée The Trip. Faire coïncider parfaitement l’artwork et les quatre bords de la pochette, sans deuxième carton, décalage, recadrage ni déformation. Conserver le cadre pâle et le titre manuscrit appartenant à l’artwork officiel. Poser le bord inférieur sur la réglette en bois avec une ombre de contact discrète.

Conserver le cadrage, le mur, le trophée, l’orgue, le bois, les claviers, les commandes, les inscriptions, la lumière et la colorimétrie de R14 V2. Aucun autre ajout, aucun humain, reflet, texte inventé, logo ou watermark.`,
    changeNotes: [
      "Une Dernière Fois remplacée par la pochette HD officielle The Trip",
      "Artwork et support physique recalés bord à bord, sans carton décalé",
      "R14 V2 conservée et toujours accessible dans l’historique",
    ],
    status: "calibration",
    exports: [
      {
        src: "/images/editorial/parigo-real/v3/r14-forgot-password-v3-1200x1500.avif",
        label: "Portrait",
        width: 1200,
        height: 1500,
      },
    ],
  },
];

export const parigoRealVersionedGallery: ParigoGalleryImage[] = [
  ...parigoRealGallery,
  ...parigoRealCalibrationV2Gallery,
  ...parigoRealCalibrationV3Gallery,
];

export const PARIGO_REAL_FAMILY_COUNT = 36;
export const PARIGO_REAL_VERSION_COUNT = parigoRealVersionedGallery.length;
export const PARIGO_REAL_V2_CALIBRATION_COUNT = parigoRealCalibrationV2Gallery.length;
export const PARIGO_REAL_V3_CALIBRATION_COUNT = parigoRealCalibrationV3Gallery.length;
export const PARIGO_REAL_V2_TARGET_COUNT = 48;
export const PARIGO_REAL_FINAL_FAMILY_TARGET = 48;
export const PARIGO_REAL_FINAL_VERSION_TARGET = 90;
