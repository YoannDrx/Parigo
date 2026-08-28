export type ReferenceRole = "anchor" | "geometry" | "detail" | "remove" | "cover" | "style";

export type ShotReference = {
  role: ReferenceRole;
  token: string;
};

export type ParigoPhotoShot = {
  id: `R${string}`;
  slug: string;
  title: string;
  purpose: string;
  format: "16:9" | "4:3" | "4:5";
  variants?: Array<"panoramic" | "portrait-dedicated">;
  composition: string;
  cleanup: string[];
  additions: string[];
  references: ShotReference[];
  /** Sous-ensemble réellement joint à imagegen (limite technique : cinq fichiers). */
  generationTokens?: string[];
  stylePilot?: "R01" | "R02" | "R05";
};

export const referenceRoot = "/Users/yoannandrieux/Downloads/Parigo-references-IA";
export const deliveryRoot = "/Users/yoannandrieux/Projets/parigo/deliverables/parigo-photo-library-v3";

export const commonContract = `Use case: precise-object-edit
Asset type: photographie éditoriale Web des vrais locaux Parigo Music

Primary request: transformer l'image d'ancrage en photographie éditoriale haut de gamme du véritable bureau Parigo, avec 90 % de fidélité documentaire et 10 % maximum de préparation éditoriale. L'image d'ancrage impose le cadrage, le point de vue, la perspective et l'architecture. Les autres images expliquent uniquement la géométrie, les détails matériels, les suppressions et les inserts autorisés.

Style/medium: photographie d'architecture et d'intérieur photoréaliste, contemporaine, chaleureuse, musicale, analogique, sophistiquée, parisienne et habitée sans être encombrée. Influence 1970s très subtile, jamais pastiche.

Lighting/mood: lumière naturelle crédible venant uniquement des vraies fenêtres, complétée par les lampes existantes autour de 3000–3200 K. Contraste doux, noirs lisibles, murs blancs crédibles, aucune dominante orange. Grain fin discret, hautes lumières organiques, netteté moderne.

Materials/textures: parquet et bois véritables, patine réelle, métal, cannage, tissus et surfaces de bureau avec leurs textures physiques crédibles.

Constraints: conserver exactement les proportions de la pièce, murs, colonnes, poutres, portes, fenêtres, ouvertures, stores, parquet, garde-corps, mobilier majeur et relations spatiales. Ne jamais agrandir la pièce ni déplacer un élément architectural. Aucun humain, reflet humain, silhouette, main ou fragment de corps. L'orgue doit conserver exactement son meuble, ses deux claviers, son pédalier, ses commandes, sa patine, ses proportions et son vrai banc rectangulaire brun à structure chromée. Les bureaux restent rangés mais utilisés. Aucun texte ajouté, interface, bouton, faux logo ou watermark.

Avoid: architecture inventée, studio fictif, loft, showroom, mobilier remplacé, ultra grand-angle, HDR, CGI, rendu 3D, filtre sépia, orange excessif, pochettes fusionnées ou inventées, accessoires flottants, objets sans ombre de contact, symétrie artificielle.`;

const r = (role: ReferenceRole, ...tokens: string[]): ShotReference[] => tokens.map((token) => ({ role, token }));

export const shots: ParigoPhotoShot[] = [
  {
    id: "R01", slug: "hero-orgue", title: "Hero — l'orgue dans les vrais locaux", purpose: "Homepage hero", format: "16:9", variants: ["portrait-dedicated"],
    composition: "Plan large avec l'orgue à droite et une respiration calme centre-gauche. Préserver le grand volume réel et l'axe du plateau.",
    cleanup: ["tour PC", "multiprises", "câbles en amas", "désordre de bureau", "toute présence humaine"], additions: [],
    references: [...r("anchor", "V1083@1.5s"), ...r("geometry", "1048", "1047", "1081", "1086"), ...r("detail", "1036", "1038", "1044"), ...r("remove", "1046")],
    generationTokens: ["V1083@1.5s", "1048", "1047", "1036", "1044"],
  },
  {
    id: "R02", slug: "plateau-editorial", title: "Grand plateau éditorial", purpose: "Architecture / espaces", format: "16:9", variants: ["panoramic"],
    composition: "Grand plan du plateau réel, mobilier existant rangé, espace central lisible et perspective strictement identique à l'ancrage.",
    cleanup: ["personnes", "ventilateur", "manteaux", "cartons", "papiers excessifs", "écrans dominants"], additions: [],
    references: [...r("anchor", "1086"), ...r("geometry", "1085", "1084", "1072", "1073", "1080", "1051")],
    generationTokens: ["1086", "1085", "1084", "1073", "1051"],
  },
  {
    id: "R03", slug: "facade-angle", title: "Façade d'angle Parigo", purpose: "Contact / localisation", format: "16:9", variants: ["portrait-dedicated"],
    composition: "Façade d'angle exacte, pan coupé et continuité des deux rues conservés. Nettoyage urbain retenu et végétation existante simplement entretenue.",
    cleanup: ["personnes", "vélos", "encombrements temporaires", "salissures", "graffitis parasites"], additions: ["végétation existante légèrement entretenue"], stylePilot: "R02",
    references: [...r("anchor", "1067"), ...r("geometry", "1068", "1069", "1070", "1071", "1066", "V1074@20.5s"), ...r("detail", "plaque-rue-remy-dumoncel-detail.jpg")],
  },
  {
    id: "R04", slug: "login-entree", title: "Login — entrer dans les bureaux", purpose: "Authentification", format: "4:5",
    composition: "Circulation réelle de la table vers l'entrée avec zone calme à gauche pour une interface superposée ultérieurement, sans générer cette interface.",
    cleanup: ["personnes", "imprimante dominante", "manteaux", "ventilateur", "matériel temporaire"], additions: ["carnet fermé", "stylo discret"], stylePilot: "R02",
    references: [...r("anchor", "1080"), ...r("geometry", "1072", "1073", "1079", "1086", "V1076@28s")],
  },
  {
    id: "R05", slug: "orgue-commandes", title: "Signature de l'orgue", purpose: "Close-up signature", format: "4:3",
    composition: "Gros plan parfaitement fidèle des deux claviers et commandes. Aucun objet ajouté et aucun marquage réinventé.",
    cleanup: ["poussière superficielle", "reflets parasites"], additions: [],
    references: [...r("anchor", "1044"), ...r("detail", "1039", "1036", "1042", "1043", "1064", "1065")],
    generationTokens: ["1044", "1039", "1036", "1042", "1043"],
  },
  {
    id: "R06", slug: "a-propos-orgue-pochettes", title: "À propos — orgue et pochettes", purpose: "Page À propos", format: "16:9", variants: ["portrait-dedicated"],
    composition: "Orgue réel dans la pièce avec trois pochettes officielles, à l'échelle et physiquement posées sans masquer les commandes.",
    cleanup: ["personnes", "tour PC", "câbles en amas", "pochettes photographiées basse définition"], additions: ["trois pochettes HD officielles"], stylePilot: "R01",
    references: [...r("anchor", "V1091@1.2s"), ...r("geometry", "1093", "1088", "1036"), ...r("detail", "1044"), ...r("cover", "acid-body-music.jpg", "une-derniere-fois.jpg", "videoclub.jpg")],
  },
  {
    id: "R07", slug: "salle-reunion-fenetres", title: "Salle de réunion devant les fenêtres", purpose: "Espaces", format: "16:9",
    composition: "Vraie table devant les stores, chaises existantes rangées et ouvertures inchangées.", cleanup: ["personnes", "manteaux", "papiers", "écrans"], additions: ["lampe existante ou discrète"], stylePilot: "R02",
    references: [...r("anchor", "1079"), ...r("geometry", "1080", "1072", "1073")],
  },
  {
    id: "R08", slug: "palier-escalier", title: "Palier et escalier lumineux", purpose: "Espaces", format: "4:5",
    composition: "Garde-corps noir, fenêtres, stores et ombres rayées conservés. Une seule plante existante peut être mise en valeur.", cleanup: ["objets temporaires", "personnes"], additions: ["plante existante entretenue"], stylePilot: "R02",
    references: [...r("anchor", "1050"), ...r("geometry", "1049", "1051", "1052", "1053", "V1077@6s")],
  },
  {
    id: "R09", slug: "bureau-depuis-entree", title: "Bureau depuis l'entrée", purpose: "Espaces", format: "16:9",
    composition: "Axe réel depuis l'entrée vers l'orgue et le plateau, profondeur dégagée sans déplacement de mobilier majeur.", cleanup: ["personnes", "écrans dominants", "câbles", "papiers"], additions: [], stylePilot: "R02",
    references: [...r("anchor", "1073"), ...r("geometry", "1072", "1084", "1086", "1051", "1081")],
  },
  {
    id: "R10", slug: "meuble-rouge-noir", title: "Meuble rouge et noir", purpose: "Nature morte", format: "4:3",
    composition: "Nature morte sobre sur le vrai meuble rouge et noir avec une seule pochette Velodrome.", cleanup: ["câbles", "fournitures temporaires", "personnes"], additions: ["une pochette HD Velodrome"], stylePilot: "R05",
    references: [...r("anchor", "1054"), ...r("geometry", "1033", "1047", "V1076@7s"), ...r("detail", "1061"), ...r("cover", "velodrome.jpg")],
  },
  {
    id: "R11", slug: "orgue-selection-pochettes", title: "Orgue avec sélection de pochettes", purpose: "Pochettes 33 tours", format: "4:3",
    composition: "Orgue frontal exact avec trois pochettes distinctes ; aucune commande masquée.", cleanup: ["câbles", "tour PC", "pochettes basse définition"], additions: ["trois pochettes HD officielles"], stylePilot: "R01",
    references: [...r("anchor", "1088"), ...r("geometry", "1087", "1093", "1036"), ...r("detail", "1044"), ...r("cover", "mustang-force.jpg", "ny-parigo.jpg", "the-trip.jpg")],
  },
  {
    id: "R12", slug: "trophees-parigo", title: "Trophées Parigo", purpose: "Nature morte institutionnelle", format: "4:3",
    composition: "Les trois trophées réels sur la vraie table, proportions et gravures conservées, aucune récompense inventée.", cleanup: ["personnes", "fond parasite", "traces superficielles"], additions: [], stylePilot: "R05",
    references: [...r("anchor", "1061"), ...r("geometry", "1062", "1063", "1079"), ...r("detail", "1055", "1057", "1059")],
  },
  {
    id: "R13", slug: "register-place", title: "Register — une place vous attend", purpose: "Authentification", format: "4:5",
    composition: "Vraie table avec une chaise légèrement tirée, un carnet et un stylo. Composition accueillante sans symbole d'inscription.", cleanup: ["personnes", "désordre"], additions: ["carnet", "stylo"], stylePilot: "R02",
    references: [...r("anchor", "1079"), ...r("geometry", "1080", "1072")],
  },
  {
    id: "R14", slug: "forgot-password", title: "Forgot password — orgue, trophée et The Trip", purpose: "Authentification", format: "4:5",
    composition: "Conserver exactement la composition R14 V2 : orgue vertical et trophée réel. Remplacer uniquement la pochette Une Dernière Fois et son support décalé par une pochette carrée The Trip dont l'artwork coïncide parfaitement avec les quatre bords physiques.",
    cleanup: ["ancienne pochette Une Dernière Fois", "support beige décalé", "double bord"], additions: ["pochette HD officielle The Trip"],
    references: [...r("anchor", "R14-V2"), ...r("cover", "the-trip.jpg")],
    generationTokens: ["R14-V2", "the-trip.jpg"],
  },
  {
    id: "R15", slug: "reset-password", title: "Reset password — autre famille de commandes", purpose: "Authentification", format: "4:5",
    composition: "Autre famille de commandes réelles, aucun faux voyant, écran, texte ou câble.", cleanup: ["poussière", "reflets"], additions: [], stylePilot: "R05",
    references: [...r("anchor", "1065"), ...r("detail", "1044", "1042", "1039")],
  },
  {
    id: "R16", slug: "verification-reussie", title: "Vérification réussie", purpose: "Authentification", format: "4:5",
    composition: "Un trophée réel unique sur la vraie table, lumière chaleureuse mais sobre, aucun pictogramme.", cleanup: ["personnes", "fond parasite"], additions: [], stylePilot: "R05",
    references: [...r("anchor", "1055"), ...r("detail", "1056"), ...r("geometry", "1079")],
  },
  {
    id: "R17", slug: "lien-expire", title: "Lien expiré — orgue au repos", purpose: "Authentification", format: "4:5",
    composition: "Orgue réel au repos avec grande respiration murale, lumière douce jamais anxiogène.", cleanup: ["câbles", "désordre", "personnes"], additions: [], stylePilot: "R01",
    references: [...r("anchor", "1040"), ...r("geometry", "1036", "1047"), ...r("detail", "1044")],
  },
  {
    id: "R18", slug: "aucune-playlist", title: "Aucune playlist", purpose: "Empty state", format: "4:3",
    composition: "Compartiment du vrai meuble rouge et noir laissé vide ; l'espace libre est le sujet.", cleanup: ["objets du compartiment", "câbles", "personnes"], additions: [], stylePilot: "R05",
    references: [...r("anchor", "1054"), ...r("geometry", "1033", "1047", "V1076@7s")],
  },
  {
    id: "R19", slug: "aucun-favori", title: "Aucun favori", purpose: "Empty state", format: "4:3",
    composition: "Vraie table dégagée, chaises conservées et une lampe discrète. Aucun symbole littéral.", cleanup: ["personnes", "documents"], additions: ["lampe discrète"], stylePilot: "R05",
    references: [...r("anchor", "1079"), ...r("geometry", "1080", "1073")],
  },
  {
    id: "R20", slug: "aucun-telechargement", title: "Aucun téléchargement", purpose: "Empty state", format: "4:3",
    composition: "Orgue et pédalier réels, propres et au repos ; aucune flèche ou métaphore numérique.", cleanup: ["tour PC", "câbles", "personnes"], additions: [], stylePilot: "R01",
    references: [...r("anchor", "1038"), ...r("geometry", "1036", "1045"), ...r("detail", "1044")],
  },
  {
    id: "R21", slug: "aucun-historique", title: "Aucun historique", purpose: "Empty state", format: "4:3",
    composition: "Orgue éteint et carnet fermé sur un meuble voisin, aucune horloge ou métaphore littérale.", cleanup: ["câbles", "personnes"], additions: ["carnet fermé"], stylePilot: "R01",
    references: [...r("anchor", "1036"), ...r("geometry", "1040", "1047"), ...r("detail", "1044")],
  },
  {
    id: "R22", slug: "shortlist-vide", title: "Shortlist vide", purpose: "Empty state", format: "4:3",
    composition: "Table réelle dégagée avec deux séparateurs vierges maximum et aucun texte.", cleanup: ["personnes", "documents"], additions: ["deux séparateurs vierges maximum"], stylePilot: "R05",
    references: [...r("anchor", "1079"), ...r("geometry", "1080", "1072")],
  },
  {
    id: "R23", slug: "recherche-sauvegardee-vide", title: "Aucune recherche sauvegardée", purpose: "Empty state", format: "4:3",
    composition: "Bureau réel nettoyé avec carnet fermé et beaucoup de respiration.", cleanup: ["personnes", "écrans dominants", "papiers"], additions: ["carnet fermé"], stylePilot: "R02",
    references: [...r("anchor", "1085"), ...r("geometry", "1086", "1084", "1072")],
  },
  {
    id: "R24", slug: "aucun-tag", title: "Aucun tag", purpose: "Empty state", format: "4:3",
    composition: "Rangement réel avec séparateurs vierges, sans étiquette ni texte inventé.", cleanup: ["personnes", "cartons", "câbles en amas", "objets temporaires"], additions: ["séparateurs vierges"], stylePilot: "R02",
    references: [...r("anchor", "V1077@13s"), ...r("geometry", "1053", "1051", "V1077@10s")],
  },
  {
    id: "R25", slug: "aucune-communication", title: "Aucune communication", purpose: "Empty state", format: "4:3",
    composition: "Téléphone vintage crédible et carnet fermé sur le vrai meuble, sans message ni texte.", cleanup: ["câbles", "objets temporaires", "personnes"], additions: ["téléphone vintage", "carnet fermé"], stylePilot: "R05",
    references: [...r("anchor", "1054"), ...r("geometry", "1033", "V1076@7s")],
  },
  {
    id: "R26", slug: "recherche-sans-resultat", title: "Recherche sans résultat", purpose: "Empty state", format: "4:3",
    composition: "Vide central clairement lisible sur la vraie table avec les chaises conservées.", cleanup: ["personnes", "documents"], additions: [], stylePilot: "R05",
    references: [...r("anchor", "1079"), ...r("geometry", "1080")],
  },
  {
    id: "R27", slug: "similarite-sans-resultat", title: "Similarité sans résultat", purpose: "Empty state", format: "4:3",
    composition: "Orgue exact sans écran, texte ou symbole d'IA, avec une zone calme pour un message ultérieur.", cleanup: ["tour PC", "câbles", "personnes"], additions: [], stylePilot: "R01",
    references: [...r("anchor", "1045"), ...r("geometry", "1036", "1039"), ...r("detail", "1044")],
  },
  {
    id: "R28", slug: "contact", title: "Contact", purpose: "Page Contact", format: "4:3",
    composition: "Vrai bureau près de l'entrée avec téléphone et carnet, accueillant sans faux logo.", cleanup: ["personnes", "imprimante dominante", "manteaux"], additions: ["téléphone vintage", "carnet"], stylePilot: "R02",
    references: [...r("anchor", "1080"), ...r("geometry", "1072", "1073", "V1076@28s")],
  },
  {
    id: "R29", slug: "licensing-synchronisation", title: "Licensing et synchronisation", purpose: "Page Licensing", format: "16:9",
    composition: "Plateau professionnel rangé avec un seul écran discret, aucun faux logiciel ou waveform.", cleanup: ["personnes", "désordre", "écrans multiples"], additions: ["casque", "carnet"], stylePilot: "R02",
    references: [...r("anchor", "1084"), ...r("geometry", "1086", "1085", "1072", "1073")],
  },
  {
    id: "R30", slug: "404-erreur-globale", title: "404 et erreur globale", purpose: "État exceptionnel", format: "16:9",
    composition: "Passage réel vers le bureau, légèrement assombri mais jamais inquiétant, avec grande zone calme.", cleanup: ["personnes", "désordre", "câbles"], additions: [], stylePilot: "R02",
    references: [...r("anchor", "1051"), ...r("geometry", "1052", "1050", "1049", "V1077@6s")],
  },
  {
    id: "R31", slug: "mur-pochettes-parigo", title: "Mur de pochettes Parigo", purpose: "Pochettes / communication", format: "16:9", variants: ["portrait-dedicated"],
    composition: "Quatre cadres fins formant un seul groupe sur le vrai mur blanc, sans boiserie ou décor inventé.", cleanup: ["personnes", "tour PC", "câbles", "désordre"], additions: ["quatre cadres fins avec pochettes HD"], stylePilot: "R01",
    references: [...r("anchor", "V1083@1.5s"), ...r("geometry", "1047", "1048", "1036"), ...r("cover", "acid-body-music.jpg", "egocentric-visuo-spatial-perspective.jpg", "hand-funktion.jpg", "velodrome.jpg")],
  },
  {
    id: "R32", slug: "table-editoriale-pochettes-trophees", title: "Table éditoriale, pochettes et trophée", purpose: "Pochettes / communication", format: "4:3",
    composition: "Quatre pochettes distinctes et un seul trophée réel sur la vraie table, composition aérée.", cleanup: ["personnes", "documents"], additions: ["quatre pochettes HD", "un trophée réel"], stylePilot: "R05",
    references: [...r("anchor", "1079"), ...r("geometry", "1080"), ...r("detail", "1061", "1055"), ...r("cover", "videoclub.jpg", "une-derniere-fois.jpg", "ny-parigo.jpg", "the-trip.jpg")],
  },
  {
    id: "R33", slug: "orgue-plan-moyen-avec-pochette", title: "Orgue — plan moyen avec pochette", purpose: "Studio", format: "4:5",
    composition: "Plan moyen avec vrai banc rectangulaire brun chromé et une seule pochette Acid Body Music.", cleanup: ["tour PC", "câbles", "personnes"], additions: ["une pochette HD Acid Body Music"], stylePilot: "R01",
    references: [...r("anchor", "1030"), ...r("geometry", "1093", "1036"), ...r("detail", "1044"), ...r("cover", "acid-body-music.jpg")],
  },
  {
    id: "R34", slug: "orgue-closeup-avec-pochette", title: "Orgue — close-up avec pochette", purpose: "Studio", format: "4:3",
    composition: "Close-up plus large que R05 avec une seule pochette Hand Funktion posée sans masquer les commandes.", cleanup: ["poussière", "reflets"], additions: ["une pochette HD Hand Funktion"], stylePilot: "R05",
    references: [...r("anchor", "1031"), ...r("geometry", "1039", "1036"), ...r("detail", "1044"), ...r("cover", "hand-funktion.jpg")],
  },
  {
    id: "R35", slug: "closeup-bureau-vinyles", title: "Close-up bureau et vinyles", purpose: "Pochettes / communication", format: "4:3",
    composition: "Bureau vivant et tactile avec trois pochettes, casque et carnet, sans surcharge ni orgue dans le cadrage.", cleanup: ["personnes", "documents temporaires", "câbles en amas"], additions: ["casque", "carnet", "trois pochettes HD"], stylePilot: "R05",
    references: [...r("anchor", "1085"), ...r("geometry", "1084", "1079"), ...r("detail", "1058"), ...r("cover", "hand-funktion.jpg", "videoclub.jpg", "une-derniere-fois.jpg")],
  },
  {
    id: "R36", slug: "closeup-bureau-prix-parigo", title: "Bureau institutionnel et prix Parigo", purpose: "Pochettes / communication", format: "4:3",
    composition: "Deux vrais trophées, deux pochettes officielles et l'illustration existante sur un vrai bureau, sans surcharge.", cleanup: ["personnes", "documents temporaires", "câbles en amas"], additions: ["deux pochettes HD", "deux trophées réels"], stylePilot: "R05",
    references: [...r("anchor", "1061"), ...r("geometry", "1079", "1084"), ...r("detail", "1096"), ...r("cover", "egocentric-visuo-spatial-perspective.jpg", "mustang-force.jpg")],
  },
];

export function buildPrompt(shot: ParigoPhotoShot, candidate: "A" | "B", resolvedReferences: Array<ShotReference & { path: string }>) {
  const referenceLines = resolvedReferences.map((reference, index) => {
    const role = reference.role === "anchor" ? "edit target and absolute composition anchor"
      : reference.role === "geometry" ? "supporting geometry reference only"
      : reference.role === "detail" ? "supporting material/detail reference only"
      : reference.role === "remove" ? "removal evidence only"
      : reference.role === "cover" ? "official artwork compositing insert"
      : "approved style reference only; never copy geometry";
    return `Image ${index + 1}: ${role}; ${reference.path}`;
  });

  const candidateDirection = candidate === "A"
    ? "Favoriser une lumière naturelle douce de fin de matinée et un nettoyage très retenu."
    : "Favoriser une lumière naturelle douce de fin d'après-midi, toujours neutre et sans dominante orange, avec exactement le même niveau de fidélité.";

  return `${commonContract}

Input images:
${referenceLines.join("\n")}

Primary composition: ${shot.composition}
Intended use: ${shot.purpose}.
Master format: ${shot.format}.
Candidate direction: ${candidateDirection}

Change only: ${shot.cleanup.length ? `retirer ou ranger ${shot.cleanup.join(", ")}` : "nettoyage éditorial minimal"}.
Permitted additions: ${shot.additions.length ? shot.additions.join(", ") : "aucun ajout"}.
Keep everything else unchanged. Recognition of the real Parigo office is more important than visual perfection.`;
}
