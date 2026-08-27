import { parigoUsageImages } from "./parigo-image-gallery-usage";

export type ParigoGalleryImage = {
  id: number;
  code?: string;
  title: string;
  src: string;
  aspect: "16:9" | "4:3" | "4:5" | "21:9" | "1.91:1";
  category: string;
  usage?: ParigoGalleryUsage;
  subject?: string;
  prompt: string;
  collection?: "concept" | "real";
  sourceAnchor?: string;
  references?: ParigoGalleryReference[];
  changeNotes?: string[];
  status?: "calibration" | "approved" | "review";
  exports?: ParigoGalleryExport[];
};

export type ParigoGalleryReference = {
  src: string;
  label: string;
  role: "ancrage" | "géométrie" | "détail" | "suppression" | "décoration" | "vidéo";
};

export type ParigoGalleryExport = {
  src: string;
  label: string;
  width: number;
  height: number;
};

export type ParigoGalleryUsage =
  | "Espaces"
  | "Studio"
  | "Accès"
  | "Modales"
  | "Compte"
  | "Pages"
  | "Social"
  | "Hero"
  | "Pochettes 33 tours"
  | "Pochettes & mosaïques";

const COMMON_DIRECTION = `Use case: photorealistic-natural
Asset type: photographie éditoriale pour le site de Parigo Music

Primary request: photographier les mêmes locaux fictifs de Parigo Music, une librairie musicale indépendante parisienne. L’espace est contemporain mais fortement influencé par le meilleur design intérieur de la fin des années 1960 et des années 1970.

Scene/backdrop: bureaux et salons d’écoute cohérents d’une image à l’autre, murs en noyer chaud, panneaux rainurés, rangements à vinyles intégrés, verre fumé ambré, murs écrus légèrement texturés, touches de béton brut, métal chromé et acier brossé.

Interior design: fauteuils bas en cuir cognac ou tissu rouille, chaises tubulaires chromées, tables ovales en noyer, luminaires opalins, étagères modulaires, matériel hi-fi vintage parfaitement entretenu, mobilier sobre et crédible. Quelques objets contemporains discrets empêchent le décor de ressembler à un musée.

Color palette: noyer brun profond, écru, tabac, cognac, rouille, moutarde, olive sombre, noir, chrome, avec de très petites touches chartreuse inspirées de l’identité Parigo.

Style/medium: photographie d’architecture et de décoration intérieure haut de gamme, extrêmement réaliste, textures physiques détaillées, grain du bois visible, usure légère du cuir, traces naturelles sur le métal et les pochettes, profondeur de champ optique réaliste, léger grain photographique, contraste doux, dynamique naturelle.

Lighting/mood: lumière chaude et feutrée, lampes pratiques autour de 3200 K, lumière du jour filtrée lorsque la scène le permet, ombres profondes mais lisibles, atmosphère calme, cultivée et intime.

Continuity: tous les visuels doivent sembler avoir été photographiés dans différentes pièces du même siège Parigo. Réutiliser le même langage de boiserie, les mêmes tons et quelques familles de mobilier récurrentes.

Human presence: locaux entièrement vides, aucune personne, aucune main, aucune silhouette, aucun visage, aucun reflet humain.

Constraints: géométrie réaliste, perspective photographique naturelle, meubles structurellement crédibles, proportions exactes des vinyles et des pochettes, câbles et matériel cohérents. Laisser des pochettes carrées neutres aux emplacements indiqués afin d’y intégrer ensuite les vraies pochettes Parigo.

Text: aucun texte inventé. Le seul écriteau autorisé hors pochettes est "ON AIR", écrit exactement ainsi.

Avoid: rendu 3D, CGI, HDR agressif, showroom trop parfait, magasin de disques commercial, nightclub, décor kitsch, accumulation bohème, nostalgie caricaturale, mobilier déformé, répétitions de motifs, pochettes inventées, faux logos, texte illisible, watermark.`;

function spacePrompt(specific: string): string {
  return `${COMMON_DIRECTION}\n\nPROMPT SPÉCIFIQUE\n\n${specific}`;
}

const originalParigoImageGallery: ParigoGalleryImage[] = [
  {
    id: 1,
    title: "Retouche de l’image actuelle",
    src: "/images/editorial/parigo-spaces/01-home-studio-parigo-covers.avif",
    aspect: "16:9",
    category: "Espaces",
    prompt: spacePrompt(`Input Image 1: l’image actuelle public/images/parigo-studio.jpg, cible de l’édition.
Primary request: conserver la composition générale, la perspective, le mur de disques, le panneau "ON AIR", les bacs centraux et le comptoir. Réchauffer légèrement l’ambiance, approfondir les tons de noyer et rendre la lumière un peu plus feutrée sans transformer l’espace.
Composition: garder la partie gauche suffisamment calme et sombre pour le titre de la section. Les pochettes principales restent concentrées sur les présentoirs de gauche et les bacs du premier plan.
Cover inserts: Acid Body Music, Hand Funktion, Mustang Force, Ny Parigo, Une Dernière Fois et Videoclub.
Invariants: ne pas déplacer les murs, le canapé, les bacs, le panneau ON AIR ou le comptoir. Aucun nouvel objet important.`),
  },
  {
    id: 2,
    title: "Grand bureau éditorial du matin",
    src: "/images/editorial/parigo-spaces/02-office-wide-morning.avif",
    aspect: "16:9",
    category: "Espaces",
    prompt: spacePrompt(`Wide establishing photograph, eye-level, 28 mm lens. Grand bureau éditorial traversé par une lumière matinale filtrée, bibliothèque murale en noyer à gauche, bacs de vinyles intégrés, canapé modulaire rouille et longue table de consultation. Perspective profonde mais naturelle, espace vécu et parfaitement rangé.
Cover inserts: The Trip, Videoclub et Velodrome, présentées de face dans trois zones distinctes.`),
  },
  {
    id: 3,
    title: "Allée des archives musicales",
    src: "/images/editorial/parigo-spaces/03-archive-library-aisle.avif",
    aspect: "16:9",
    category: "Espaces",
    prompt: spacePrompt(`Wide architectural photograph, 24 mm lens, camera slightly below eye level. Allée calme entre deux grands meubles d’archives en noyer remplis de vinyles, tiroirs indexés sans texte lisible, panneaux de verre fumé ambré et lumière indirecte intégrée. L’allée conduit vers un petit salon au fond.
Cover inserts: Acid Body Music, Ny Parigo et Hand Funktion dans trois bacs ouverts au premier plan.`),
  },
  {
    id: 4,
    title: "Salon d’écoute principal",
    src: "/images/editorial/parigo-spaces/04-listening-lounge.avif",
    aspect: "16:9",
    category: "Espaces",
    prompt: spacePrompt(`Editorial interior photograph, 35 mm lens. Salon d’écoute chaleureux avec platine, enceintes en bois, canapé bas couleur tabac, deux fauteuils chromés et rouille, tapis géométrique discret et bibliothèque de vinyles. Fin d’après-midi, lumière douce et ombres feutrées. La scène doit sembler confortable, cultivée et réellement utilisée.
Cover inserts: The Trip posée près de la platine et Une Dernière Fois présentée dans une niche murale.`),
  },
  {
    id: 5,
    title: "Salle de réunion créative",
    src: "/images/editorial/parigo-spaces/05-meeting-room.avif",
    aspect: "16:9",
    category: "Espaces",
    prompt: spacePrompt(`Wide interior photograph, 28 mm lens. Salle de réunion vide avec table ovale en noyer, six chaises tubulaires chromées recouvertes de tissu olive, suspension opaline, rideaux lourds écrus et long rail mural pour pochettes de vinyles. Quelques carnets fermés, aucun texte lisible.
Cover inserts: Egocentric Visuo-Spatial Perspective, Hand Funktion et Mustang Force sur le rail mural.`),
  },
  {
    id: 6,
    title: "Suite d’écoute et de mastering",
    src: "/images/editorial/parigo-spaces/06-mastering-suite.avif",
    aspect: "16:9",
    category: "Espaces",
    prompt: spacePrompt(`Symmetrical wide photograph, 24 mm lens. Petite suite d’écoute professionnelle avec deux grandes enceintes en noyer, traitements acoustiques à lattes de bois, console analogique sobre, fauteuil bas en cuir cognac et éclairage indirect. Le matériel est crédible et fonctionnel, sans accumulation de boutons incohérents.
Cover inserts: Ny Parigo et Acid Body Music sur une étagère basse entre les enceintes.`),
  },
  {
    id: 7,
    title: "Couloir vers le studio",
    src: "/images/editorial/parigo-spaces/07-corridor-glimpse.avif",
    aspect: "16:9",
    category: "Espaces",
    prompt: spacePrompt(`Cinematic architectural photograph, 35 mm lens. Couloir légèrement courbe bordé de panneaux en noyer et de verre ambré, éclairé par des appliques opalines. Au fond, une porte entrouverte révèle un salon d’écoute. Un petit panneau lumineux "ON AIR" rouge crée le point focal.
Cover inserts: Videoclub et Velodrome visibles dans le salon au fond, sans devenir artificiellement grands.`),
  },
  {
    id: 8,
    title: "Plateau éditorial au crépuscule",
    src: "/images/editorial/parigo-spaces/08-editorial-floor-twilight.avif",
    aspect: "16:9",
    category: "Espaces",
    prompt: spacePrompt(`Wide evening photograph, 24 mm lens. Plateau éditorial vide après le travail, bureaux en noyer, lampes de table allumées, rangements de vinyles et grande fenêtre bleue au crépuscule. Mélange réaliste de lumière tungsten intérieure et de lumière froide extérieure. Atmosphère silencieuse, élégante et légèrement cinématographique.
Cover inserts: Une Dernière Fois, Egocentric Visuo-Spatial Perspective, The Trip et Mustang Force sur différents présentoirs.`),
  },
  {
    id: 9,
    title: "Platine et pochette Velodrome",
    src: "/images/editorial/parigo-spaces/09-turntable-close-up.avif",
    aspect: "4:3",
    category: "Espaces",
    prompt: spacePrompt(`Photorealistic close-up, 85 mm lens, shallow but realistic depth of field. Platine vintage noire et aluminium sur un meuble en noyer, vinyle noir posé sur le plateau, cellule et bras parfaitement crédibles. Une pochette carrée neutre est placée verticalement juste derrière, légèrement décalée. Éclairage chaud latéral, poussière très discrète et reflets réalistes.
Cover insert: Velodrome.`),
  },
  {
    id: 10,
    title: "Pochette sur console analogique",
    src: "/images/editorial/parigo-spaces/10-console-sleeve-close-up.avif",
    aspect: "4:3",
    category: "Espaces",
    prompt: spacePrompt(`Detailed close photograph, 70 mm lens. Bord d’une console analogique réaliste, potentiomètres nets au premier plan et pochette carrée posée contre un panneau de noyer. Lumière rouge-orangé très douce provenant d’une lampe hors champ, sans ambiance nightclub.
Cover insert: Une Dernière Fois.`),
  },
  {
    id: 11,
    title: "Bac à vinyles ouvert",
    src: "/images/editorial/parigo-spaces/11-record-drawer-close-up.avif",
    aspect: "4:3",
    category: "Espaces",
    prompt: spacePrompt(`Close editorial photograph, 50 mm lens. Tiroir profond en noyer ouvert, rempli de pochettes légèrement patinées. Trois pochettes neutres ressortent naturellement du bac, chacune à une profondeur différente. Montrer les textures du carton, les bords légèrement usés et les intercalaires sans texte.
Cover inserts: Acid Body Music, Ny Parigo et Hand Funktion.`),
  },
  {
    id: 12,
    title: "Chaîne hi-fi et pochette bleue",
    src: "/images/editorial/parigo-spaces/12-hifi-stack-close-up.avif",
    aspect: "4:3",
    category: "Espaces",
    prompt: spacePrompt(`Intimate close-up, 85 mm lens. Amplificateur et tuner vintage en aluminium brossé, cadrans analogiques ambre, meuble bas en palissandre et petite lampe opaline. Une pochette carrée est présentée dans un support métallique fin à côté de l’amplificateur.
Cover insert: Egocentric Visuo-Spatial Perspective.`),
  },
  {
    id: 13,
    title: "Table de sélection vue du dessus",
    src: "/images/editorial/parigo-spaces/13-editorial-desk-top-down.avif",
    aspect: "4:3",
    category: "Espaces",
    prompt: spacePrompt(`True overhead editorial photograph, 50 mm equivalent. Table en noyer avec deux pochettes carrées, un casque filaire soigneusement posé, un crayon, un carnet fermé et une petite tasse en grès. Composition graphique mais imparfaite et crédible, lumière naturelle douce, aucun document lisible.
Cover inserts: Videoclub et Mustang Force.`),
  },
  {
    id: 14,
    title: "Vitrine en verre ambré",
    src: "/images/editorial/parigo-spaces/14-amber-cabinet-detail.avif",
    aspect: "4:3",
    category: "Espaces",
    prompt: spacePrompt(`Close architectural detail, 85 mm lens. Porte de meuble en verre fumé ambré, structure fine chromée et intérieur en noyer. Une pochette est visible derrière le verre avec un reflet doux et physiquement réaliste. Ne pas masquer l’illustration par un reflet excessif.
Cover insert: The Trip.`),
  },
  {
    id: 15,
    title: "Rail mural de pochettes",
    src: "/images/editorial/parigo-spaces/15-wall-display-detail.avif",
    aspect: "4:3",
    category: "Espaces",
    prompt: spacePrompt(`Straight-on interior photograph, 50 mm lens. Mur écru texturé avec deux rails très fins en métal noir, boiserie basse en noyer et cinq pochettes carrées parfaitement alignées mais légèrement espacées. Éclairage mural doux, ombres de contact réalistes, aucune autre décoration.
Cover inserts: Acid Body Music, Hand Funktion, Une Dernière Fois, Velodrome et Videoclub.`),
  },
  {
    id: 16,
    title: "Nature morte du bureau musical",
    src: "/images/editorial/parigo-spaces/16-desk-lamp-still-life.avif",
    aspect: "4:3",
    category: "Espaces",
    prompt: spacePrompt(`Photorealistic still life, 50 mm lens. Coin de bureau en noyer avec lampe champignon orange, casque studio noir, petit haut-parleur vintage, cendrier en verre vide utilisé comme objet décoratif et une pochette debout. Éclairage très feutré, matières détaillées, composition non publicitaire.
Cover insert: Ny Parigo.`),
  },
  {
    id: 17,
    title: "Coin lecture et écoute",
    src: "/images/editorial/parigo-spaces/17-reading-nook-portrait.avif",
    aspect: "4:5",
    category: "Espaces",
    prompt: spacePrompt(`Vertical interior photograph, 50 mm lens. Coin lecture haut et étroit avec fauteuil bas rouille, lampadaire opalin, tablette en noyer et rideau lourd olive. Deux pochettes carrées sont posées sur la tablette à des hauteurs différentes. Beaucoup de profondeur et une lumière chaleureuse.
Cover inserts: The Trip et Une Dernière Fois.`),
  },
  {
    id: 18,
    title: "Mur de vinyles vertical",
    src: "/images/editorial/parigo-spaces/18-record-wall-portrait.avif",
    aspect: "4:5",
    category: "Espaces",
    prompt: spacePrompt(`Vertical architectural photograph, 35 mm lens. Portion verticale d’un mur en noyer composée de niches carrées rétroéclairées, quelques vinyles noirs et six pochettes présentées comme une sélection éditoriale. Perspective légèrement en contre-plongée pour montrer la hauteur de la pièce, sans effet spectaculaire artificiel.
Cover inserts: Acid Body Music, Egocentric Visuo-Spatial Perspective, Hand Funktion, Mustang Force, Ny Parigo et Velodrome.`),
  },
  {
    id: 19,
    title: "Étagère et objets vintage",
    src: "/images/editorial/parigo-spaces/19-shelving-vignette-portrait.avif",
    aspect: "4:5",
    category: "Espaces",
    prompt: spacePrompt(`Vertical close interior photograph, 85 mm lens. Étagère modulable en noyer et métal chromé avec deux pochettes, un vase en grès brun, une petite lampe ambrée et quelques livres sans titre visible. Profondeur de champ douce, lumière de fin de journée, aucun objet posé de manière trop parfaite.
Cover inserts: Videoclub et Mustang Force.`),
  },
  {
    id: 20,
    title: "Panorama des locaux Parigo",
    src: "/images/editorial/parigo-spaces/20-panoramic-studio-banner.avif",
    aspect: "21:9",
    category: "Espaces",
    prompt: spacePrompt(`Ultra-wide panoramic photograph, 24 mm lens without fisheye distortion. Vue continue du plateau Parigo réunissant bibliothèque musicale, salon d’écoute, table éditoriale et cloison en verre fumé. L’ensemble doit résumer la direction artistique de la série. Garder une zone visuellement calme au centre-gauche pour une éventuelle accroche de site.
Cover inserts: les neuf pochettes Parigo, réparties naturellement entre un rail mural, deux bacs et le meuble de la platine. Elles doivent rester des éléments de décor plausibles et non former un collage promotionnel.`),
  },
  {
    id: 21,
    title: "Hammond B-3 et Leslie 122",
    src: "/images/editorial/parigo-spaces/21-hammond-b3-leslie.avif",
    aspect: "4:3",
    category: "Instruments & studio",
    subject: "Hammond B-3 · Leslie 122",
    prompt: `Use case: photorealistic-natural
Asset type: photographie éditoriale pour le site Parigo Music

Create a highly realistic 4:3 editorial interior photograph inside the same fictional Parigo Music Paris offices as the first reference image. Empty room, no people, hands, silhouettes or human reflections.

Primary subject: a genuine vintage Hammond B-3 tonewheel organ in walnut with its characteristic dual manuals, drawbars and matching wooden bench, beside a genuine Leslie 122 rotating speaker cabinet. Reproduce the recognizable architecture and proportions of these real instruments faithfully; do not invent controls or merge models.

Scene: a compact live room with warm walnut acoustic slats, an ecru textured wall, smoked amber glass and brushed chrome details. A rust-colored low chair sits out of focus in the background. Add a small thin black metal record stand on the side shelf holding the exact Parigo vinyl cover from the second reference image; preserve its artwork, typography, square crop and colors without reinterpretation.

Camera: 35 mm lens, eye-level three-quarter view, natural perspective. The organ and Leslie dominate but still feel installed in a working studio.
Lighting: practical lamps at 3200 K plus soft filtered daylight, deep readable shadows, subtle photographic grain, realistic wood texture and light wear.
Constraints: real photographic geometry, correct keyboard proportions, credible cables with destinations, no made-up labels, no text except existing text on the supplied cover, no CGI, no HDR, no watermark, no nightclub mood, no commercial record store.`,
  },
  {
    id: 22,
    title: "Minimoog Model D",
    src: "/images/editorial/parigo-spaces/22-minimoog-model-d.avif",
    aspect: "4:3",
    category: "Instruments & studio",
    subject: "Moog Minimoog Model D",
    prompt: `Use case: photorealistic-natural
Asset type: photographie éditoriale Parigo Music, 4:3

Close editorial photograph inside the same fictional 1970s-influenced contemporary Parigo Music office as the first reference. Empty room; no people, hands, silhouettes, faces or reflections.

Primary subject: an authentic Minimoog Model D analog synthesizer, viewed in three-quarter close-up on a walnut studio desk. Faithfully reproduce the real instrument's compact 44-key keyboard, hinged walnut cabinet, three vertical black control panels, left oscillator bank, central mixer/filter/envelope sections, right output section, pitch and modulation wheels. Do not invent extra keys, screens, patch cables or controls.

Scene: walnut wall panels, smoked amber glass, one opaline lamp, dark olive acoustic textile. A thin chrome record holder behind the synthesizer displays the exact Parigo cover from reference image 2, preserving its artwork, typography, colors and square crop.

Camera: 70 mm lens, shallow but realistic depth of field focused across the knob rows; physically plausible perspective.
Lighting: warm side light around 3200 K, soft highlights on black painted metal and aged walnut, natural contrast, subtle grain.
Avoid: CGI, product-ad perfection, warped keys, repeated knobs, fake labels, invented logos, random text, nightclub lighting, watermark.`,
  },
  {
    id: 23,
    title: "Rhodes Stage 73",
    src: "/images/editorial/parigo-spaces/23-rhodes-stage-73.avif",
    aspect: "16:9",
    category: "Instruments & studio",
    subject: "Rhodes Stage 73 Mark I",
    prompt: `Use case: photorealistic-natural
Asset type: photographie éditoriale Parigo Music, 16:9

Wide interior photograph of a compact Parigo Music writing room, fully empty with no people, hands, silhouettes or human reflections. Match the warm walnut, ecru, rust, olive and chrome visual language of reference image 1.

Primary subject: a real Rhodes Stage 73 Mark I electric piano from the mid-1970s, faithfully recognizable: 73-key black-and-white keyboard, rounded black harp cover, silver name rail, chrome cross-braced legs, sustain pedal and taut support rods, shown at a believable working height. Reference image 2 is supplied for general Rhodes proportions but render the requested historical Stage 73 Mark I, not a futuristic keyboard and not a grand piano.

Scene: the piano faces a walnut acoustic wall; a low rust sofa and brushed-metal studio monitor appear farther back. On a narrow wall rail, display the exact square Parigo cover from reference image 3 without changing its artwork, typography or colors.

Camera: eye-level 35 mm lens, three-quarter establishing view with the keyboard leading into the room.
Lighting: filtered late-afternoon daylight plus one opaline floor lamp at 3200 K, soft readable shadows, detailed fabric and metal wear, subtle photographic grain.
Constraints: realistic keyboard geometry, credible pedal cable, no extra instruments, no text except existing markings on the real instrument and supplied cover, no CGI, no HDR, no watermark.`,
  },
  {
    id: 24,
    title: "Les Paul Goldtop",
    src: "/images/editorial/parigo-spaces/24-les-paul-goldtop.avif",
    aspect: "4:5",
    category: "Instruments & studio",
    subject: "Gibson Les Paul Standard Goldtop · 1957 style",
    prompt: `Use case: photorealistic-natural
Asset type: photographie éditoriale Parigo Music, portrait 4:5

Vertical editorial photograph in an empty Parigo Music recording booth. No people, hands, silhouettes, faces or reflections.

Primary subject: a genuine 1957-style Gibson Les Paul Standard Goldtop electric guitar resting securely on a minimal black floor stand. Faithfully show the single-cutaway mahogany body with gold-finished maple top, cream binding, two cream-ring humbuckers, Tune-O-Matic bridge and stopbar tailpiece, four amber control knobs, three-way toggle, rosewood fingerboard with trapezoid inlays and three-per-side headstock. No fantasy hardware or extra strings.

Scene: walnut slat wall, lower olive acoustic panel, smoked amber studio window, chrome-edged rust stool. A small square Parigo cover from reference image 2 sits naturally on a low walnut shelf behind the guitar; preserve the exact art, typography and colors.

Camera: vertical 50 mm lens, slightly below eye level, whole guitar visible with breathing room, controlled depth of field.
Lighting: warm practical light grazing the metallic gold finish, gentle daylight fill, realistic reflections and subtle wear, soft film grain.
Avoid: promotional showroom, stage, human traces, deformed neck, illegible invented text, fake logos, CGI, HDR, watermark.`,
  },
  {
    id: 25,
    title: "Steinway Model B",
    src: "/images/editorial/parigo-spaces/25-steinway-model-b.avif",
    aspect: "16:9",
    category: "Instruments & studio",
    subject: "Steinway & Sons Model B",
    prompt: `Use case: photorealistic-natural
Asset type: photographie éditoriale Parigo Music, 16:9

Wide architectural photograph inside the same fictional Parigo Music headquarters, empty of all people, hands, silhouettes and human reflections.

Primary subject: a genuine Steinway & Sons Model B grand piano, 211 cm professional-size proportions, in a refined dark Macassar-ebony wood veneer rather than flat black. The lid is open on its proper support, the keyboard, fallboard, three legs, lyre and pedals are structurally credible. Do not invent keys, pedals or ornamental forms.

Scene: an intimate scoring room with walnut wall panels, ecru acoustic plaster, olive curtain, opaline pendant and a rust lounge chair. The piano sits on a restrained wool rug. A low, thin metal vinyl stand beside the chair holds the exact Parigo cover from reference image 2, preserving artwork, typography, square crop and colors.

Camera: 28 mm lens from the tail-side three-quarter angle, natural architecture perspective with the full instrument readable.
Lighting: soft morning daylight filtered through the olive curtain plus warm practical lamps, detailed veneer reflections, natural dynamic range and subtle grain.
Constraints: physically plausible grand-piano geometry and lid reflections, no concert hall, no people, no extra text except legitimate instrument markings and supplied cover, no CGI, no HDR, no watermark.`,
  },
  {
    id: 26,
    title: "Console SSL 4000 E",
    src: "/images/editorial/parigo-spaces/26-ssl-4000e-console.avif",
    aspect: "16:9",
    category: "Instruments & studio",
    subject: "Solid State Logic SL 4000 E Series",
    prompt: `Use case: photorealistic-natural
Asset type: photographie éditoriale Parigo Music, 16:9

Photorealistic professional control-room photograph, no people, hands, silhouettes, faces or human reflections. Match the warm contemporary 1970s Parigo interior language from reference image 1.

Primary subject: a real Solid State Logic SL 4000 E Series analog recording console as introduced in 1979, configured credibly in a working studio. Faithfully show its broad modular channel strips, in-line architecture, light grey meter bridge, colored channel knobs and long fader rows; no touchscreens, no futuristic displays, no random repeated modules. Reference image 2 provides modern SSL family cues, but the rendered desk must specifically be the historic SL 4000 E Series, not the modern Origin.

Scene: walnut acoustic treatment, two professional nearfield monitors, smoked amber rear window, restrained rack bays and one opaline desk lamp. The exact Parigo cover from reference image 3 appears in a small walnut record stand on the far side of the meter bridge, naturally scaled and preserving its artwork and typography.

Camera: eye-level 24 mm lens, symmetrical but lived-in composition, console leading toward the studio window.
Lighting: warm console lamps at 3200 K, restrained colored status lights, natural low contrast, realistic metal wear and subtle film grain.
Avoid: sci-fi console, invented equipment, illegible fake labels, nightclub atmosphere, CGI, aggressive HDR, watermark.`,
  },
  {
    id: 27,
    title: "Compresseur 1176LN",
    src: "/images/editorial/parigo-spaces/27-ua-1176ln-close-up.avif",
    aspect: "4:3",
    category: "Instruments & studio",
    subject: "Universal Audio 1176LN",
    prompt: `Use case: photorealistic-natural
Asset type: photographie éditoriale Parigo Music, 4:3

Detailed close editorial photograph in an empty Parigo mastering rack, styled consistently with the walnut and amber Parigo offices. No people, hands, silhouettes or reflections.

Primary subject: a genuine Universal Audio 1176LN Classic Limiting Amplifier, faithfully recognizable as a 2U black rack unit: large central illuminated VU meter, Input and Output knobs on the left, Attack and Release knobs on the right, four vertical ratio buttons including the characteristic 4, 8, 12 and 20 positions, and proper meter buttons. Do not add extra displays, duplicate controls or turn it into generic rack gear.

Composition: 70 mm lens, straight-on close-up with the 1176 sharp and adjacent rack units only partially visible. A small walnut shelf at frame right supports the exact Parigo cover from reference image 2 in a thin black display stand; preserve all cover art and typography exactly.

Materials and light: brushed rack rails, slight patina around screws, warm amber VU glow, deep but readable shadows, background acoustic slats softly blurred, realistic optical depth and subtle grain.
Constraints: credible rack scale and screws, no random cables, no text except authentic equipment markings and supplied cover, no CGI, no watermark, no nightclub lighting.`,
  },
  {
    id: 28,
    title: "Micro Telefunken U47",
    src: "/images/editorial/parigo-spaces/28-telefunken-u47-microphone.avif",
    aspect: "4:5",
    category: "Instruments & studio",
    subject: "Telefunken U47",
    prompt: `Use case: photorealistic-natural
Asset type: photographie éditoriale Parigo Music, portrait 4:5

Vertical close editorial photograph in an empty vocal booth belonging to the same Parigo Music offices. No people, hands, faces, silhouettes or human reflections.

Primary subject: a genuine Telefunken U47 large-diaphragm tube condenser microphone mounted upright in its correct shock mount on a black studio stand. Faithfully reproduce the recognizable nickel-finished cylindrical body, tapered headbasket with dual-layer metal grille, central Telefunken diamond badge and realistic cable exiting below. No fantasy switches, duplicate grilles or handheld proportions.

Scene: warm walnut vertical acoustic slats, dark olive absorption panel and a small smoked-amber studio window. Behind the microphone, place a discreet freestanding walnut-and-brushed-brass studio plaque using the exact PARIGO logo supplied as reference image 2; preserve the logo's letterforms and chartreuse/ivory colors, naturally printed on the plaque rather than floating.

Camera: vertical 85 mm lens, microphone sharply focused, booth background softly falling away, natural headroom.
Lighting: one warm side key plus dim opaline practical, controlled specular highlights on the grille, readable shadows and subtle film grain.
Constraints: credible stand joints and cable destination, no singer, no pop filter obscuring the microphone, no invented text, no CGI, no HDR, no watermark.`,
  },
  {
    id: 29,
    title: "Magnétophone Revox B77",
    src: "/images/editorial/parigo-spaces/29-revox-b77-tape-machine.avif",
    aspect: "4:3",
    category: "Instruments & studio",
    subject: "Revox B77",
    prompt: `Use case: photorealistic-natural
Asset type: photographie éditoriale Parigo Music, 4:3

Photorealistic close interior view inside a quiet Parigo Music tape room, completely empty of people, hands, silhouettes and human reflections.

Primary subject: a genuine Revox B77 open-reel stereo tape recorder from the late 1970s, upright on a walnut credenza. Faithfully show its compact silver-grey front panel, two equal open reels up to 10.5 inches, central tape path and head block, two illuminated VU meters, left and right level-control clusters and the correct blocky transport controls. The brown magnetic tape must follow a physically plausible continuous path between reels. No extra reel, no digital screen, no random buttons.

Scene: smoked amber glass cabinet, walnut acoustic panels, ecru plaster and one low opaline lamp. A small metal record display on the credenza holds the exact Parigo cover from reference image 2; preserve its illustration, colors, typography and square proportions.

Camera: 50 mm lens at device height, three-quarter close view showing tape path and VU meters clearly.
Lighting: warm 3200 K practical light with soft daylight fill, realistic aluminum reflections, slight age patina and subtle grain.
Avoid: loose impossible tape, duplicated controls, generic reel machine, fake text, CGI, HDR, watermark, nightclub mood.`,
  },
  {
    id: 30,
    title: "Roland Jupiter-8",
    src: "/images/editorial/parigo-spaces/30-roland-jupiter-8.avif",
    aspect: "16:9",
    category: "Instruments & studio",
    subject: "Roland Jupiter-8",
    prompt: `Use case: photorealistic-natural
Asset type: photographie éditoriale Parigo Music, 16:9

Wide editorial studio photograph inside the same fictional Parigo Music Paris headquarters. Empty room: no people, hands, faces, silhouettes or human reflections.

Primary subject: an authentic Roland Jupiter-8 analog polyphonic synthesizer from 1981, closely matching the real instrument in reference image 2: 61-key keyboard, black panel with vivid orange and blue section stripes, left pitch/modulation area, clearly separated oscillator, mixer, filter, envelope and arpeggiator sections. It sits on a minimal chrome keyboard stand. Do not add screens, patch cables, extra keyboards or fantasy controls.

Scene: walnut paneling, smoked amber glass, ecru textured wall, rust low sofa and an opaline mushroom lamp. The exact Parigo cover from reference image 3 stands on a narrow walnut wall rail, naturally sized, with artwork and typography preserved.

Camera: 35 mm lens, slightly above keyboard height, three-quarter view showing the entire instrument and enough room context.
Lighting: twilight blue through the studio window mixed with warm tungsten practicals, instrument panel readable without neon excess, realistic depth, natural dynamic range and soft grain.
Constraints: correct 61-key proportions, structurally credible stand and cable destination, no nightclub, no invented text, no CGI, no HDR, no watermark.`,
  },
];

export { parigoUsageImages } from "./parigo-image-gallery-usage";

export const parigoImageGallery: ParigoGalleryImage[] = [
  ...originalParigoImageGallery,
  ...parigoUsageImages,
];
