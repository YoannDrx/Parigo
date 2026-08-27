import type {
  ParigoGalleryImage,
  ParigoGalleryReference,
  ParigoGalleryUsage,
} from "./parigo-image-gallery";

export type ParigoRealProductionItem = {
  code: `R${string}`;
  title: string;
  usage: ParigoGalleryUsage;
  aspect: ParigoGalleryImage["aspect"];
  anchorFile: string;
  geometryFiles: string[];
  detailFiles: string[];
  remove: string[];
  additions: string[];
  covers: string[];
  exports: Array<{ width: number; height: number }>;
  prompt: string;
  status: "calibration" | "approved" | "review";
};

const PRODUCTION_CONTRACT = `Use case: photorealistic-natural image editing
Asset type: photographie éditoriale des vrais locaux Parigo Music

CONTRAT COMMUN — L’image d’ancrage impose le cadrage, le point de vue, la perspective et l’architecture. Les autres images expliquent uniquement la géométrie, les détails matériels, les suppressions et les éventuels inserts. Conserver murs blancs, parquet, fenêtres, ouvertures, colonnes, garde-corps, stores, proportions et implantation réelle. Le lieu doit rester immédiatement reconnaissable.

Locaux entièrement vides : aucune personne, main, silhouette, fragment de corps ou reflet humain. Retirer selon le cadrage tour PC, multiprises, câbles en paquet, ventilateur, cartons, manteaux, bouteilles, papiers, écrans dominants et fournitures temporaires. Intervention éditoriale maximale 30 % : rangement, nettoyage, lumière, textile, lampe, plante, cadre, téléphone vintage, casque, carnet, stylo, trophée, MacBook Pro ou pochettes fournies. Maximum trois groupes décoratifs dominants. Les bureaux doivent paraître vivants et réellement utilisés, jamais stériles : ordinateur et chaise sont placés de façon ergonomique, sans bureau collé à une fenêtre.

Lumière naturelle chaude complétée par des lampes autour de 3000–3200 K, contraste doux, noirs lisibles, murs encore blancs et chaleur sans dominante orange. Photographie réaliste, verticales naturelles, textures physiques, profondeur optique crédible et léger grain. Réserver la zone de texte demandée, mais ne jamais générer d’interface, titre, bouton ou texte éditorial.

L’orgue n’est jamais nommé par une marque ou un modèle dans le prompt. Lorsqu’il apparaît, reproduire exactement son meuble, ses deux claviers, son pédalier, ses commandes, ses couleurs, ses proportions et sa patine d’après les références. Devant lui, utiliser exclusivement le vrai large banc rectangulaire brun sans dossier à structure tubulaire chromée ; jamais chaise design, fauteuil, pied pivotant ou tabouret rond. Rejeter toute commande, touche, pédale, prise, écran ou proportion inventée. Une pochette peut être posée sur le haut ou le pupitre sans masquer les commandes.

Pochettes : utiliser uniquement les fichiers HD officiels fournis. Une même pochette ne doit jamais apparaître deux fois dans une composition. Ne jamais fusionner, réinterpréter, recoloriser ou inventer une couverture. Les cadres muraux et les pochettes posées conservent une échelle, une épaisseur, un appui et des ombres de contact crédibles.

Interdit : architecture modifiée, studio fictif entièrement boisé, mobilier déformé, humain ou reflet, pochettes fusionnées ou inventées, faux logo, texte illisible ajouté, CGI, rendu 3D, HDR agressif, showroom trop parfait, watermark.`;

function prompt(specific: string) {
  return `${PRODUCTION_CONTRACT}\n\nCOMPOSITION SPÉCIFIQUE\n\n${specific}`;
}

const manifestSeed: Array<Omit<ParigoRealProductionItem, "prompt"> & { specific: string }> = [
  {
    code: "R01", title: "Hero — l’orgue dans les vrais locaux", usage: "Hero", aspect: "16:9",
    anchorFile: "orgue-plan-large-piece-img-1048.jpg",
    geometryFiles: ["orgue-face-complete-img-1036.jpg", "plateau-bureau-orgue-plan-large-img-1081.jpg"],
    detailFiles: ["orgue-profil-gauche-pedalier-img-1038.jpg", "orgue-commandes-claviers-detail-img-1044.jpg", "orgue-profil-gauche-tour-pc-img-1046.jpg"],
    remove: ["tour PC", "multiprises", "câbles", "ventilateur", "désordre des bureaux"],
    additions: ["MacBook Pro", "casque", "trophée", "cadre Parigo"], covers: ["Acid Body Music", "Hand Funktion", "Videoclub"],
    exports: [{ width: 1920, height: 1080 }, { width: 1200, height: 1500 }, { width: 1920, height: 1005 }, { width: 1080, height: 1920 }],
    status: "calibration",
    specific: "Cadrage 16:9 depuis IMG_1048. L’orgue reste au premier plan à droite et le grand volume réel, l’ouverture, les colonnes, les fenêtres et le garde-corps restent identiques. Nettoyer la zone à droite de l’orgue et ménager une respiration calme centre-gauche pour un hero Web.",
  },
  {
    code: "R02", title: "Plateau éditorial Parigo", usage: "Espaces", aspect: "16:9",
    anchorFile: "plateau-bureau-perspective-large-img-1086.jpg",
    geometryFiles: ["plateau-bureau-perspective-longue-img-1085.jpg", "plateau-bureau-vue-generale-img-1084.jpg", "bureau-vue-depuis-vitrine-img-1073.jpg"],
    detailFiles: ["table-reunion-devant-fenetre-img-1079.jpg"],
    remove: ["personnes", "ventilateur", "manteaux", "papiers", "écrans dominants"],
    additions: ["deux MacBook Pro", "casque", "carnet fermé et stylo", "deux trophées"], covers: ["Mustang Force", "Ny Parigo", "The Trip"],
    exports: [{ width: 1920, height: 1080 }, { width: 2100, height: 900 }, { width: 1920, height: 1005 }],
    status: "calibration",
    specific: "Plan large 16:9 depuis IMG_1086. Conserver l’implantation exacte du plateau, de la table, de l’entrée vitrée et des bureaux ; vider toutes les personnes, ranger sans remplacer le mobilier, conserver au plus un écran discret et une grande zone centrale lisible.",
  },
  {
    code: "R03", title: "Façade d’angle Parigo", usage: "Espaces", aspect: "16:9",
    anchorFile: "facade-angle-entree-img-1067.jpg",
    geometryFiles: ["facade-face-velos-img-1066.jpg", "facade-angle-droit-img-1068.jpg", "facade-face-large-img-1069.jpg", "facade-contexte-rue-plan-large-img-1071.jpg"],
    detailFiles: ["plaque-rue-remy-dumoncel-detail.jpg"], remove: ["personnes", "vélos", "arceaux à vélos", "graffitis", "salissures des vitrines"],
    additions: ["deux jardinières fines", "floraison écrue ou jaune pâle"], covers: [],
    exports: [{ width: 1920, height: 1080 }, { width: 1200, height: 1500 }, { width: 1920, height: 1005 }, { width: 1080, height: 1920 }],
    status: "calibration",
    specific: "Vue d’angle 16:9 depuis IMG_1067. Préserver exactement le pan coupé, la pierre, les balcons, la porte, la vitrine, le trottoir et les deux rues. Retirer vélos et encombrements, nettoyer avec retenue et fleurir sobrement sans inventer d’enseigne ni changer la voirie.",
  },
  {
    code: "R04", title: "Login — entrer dans les bureaux", usage: "Accès", aspect: "4:5",
    anchorFile: "espace-reunion-vers-entree-img-1080.jpg",
    geometryFiles: ["bureau-vue-depuis-entree-img-1072.jpg", "bureau-vue-depuis-vitrine-img-1073.jpg", "table-reunion-devant-fenetre-img-1079.jpg", "plateau-bureau-perspective-large-img-1086.jpg"],
    detailFiles: [], remove: ["personnes", "imprimante", "manteaux", "écrans", "matériel temporaire"],
    additions: ["lampe opaline", "carnet et stylo", "plante près de l’entrée"], covers: [],
    exports: [{ width: 1200, height: 1500 }], status: "calibration",
    specific: "Portrait 4:5 depuis IMG_1080. Garder la circulation réelle de la table vers la porte vitrée, retirer les obstacles et créer une invitation lumineuse. Laisser une zone calme à gauche pour le formulaire sans générer de formulaire, cadenas, clé ou autre symbole de sécurité.",
  },
  {
    code: "R05", title: "Détail signature de l’orgue", usage: "Studio", aspect: "4:3",
    anchorFile: "orgue-commandes-claviers-detail-img-1044.jpg",
    geometryFiles: ["orgue-face-complete-img-1036.jpg", "orgue-claviers-vue-plongeante-img-1039.jpg"],
    detailFiles: ["orgue-commandes-gauche-detail-img-1042.jpg", "orgue-commandes-centre-detail-img-1043.jpg"],
    remove: ["poussière superficielle", "reflets parasites"], additions: [], covers: [],
    exports: [{ width: 1600, height: 1200 }], status: "calibration",
    specific: "Gros plan frontal 4:3 depuis IMG_1044. Fidélité absolue des deux claviers, commandes, curseurs, boutons colorés, bois et patine. Aucun objet ajouté. Si un marquage n’est pas certain, conserver son aspect source plutôt que d’inventer du texte.",
  },
  {
    code: "R06", title: "À propos — orgue et pochettes", usage: "Pages", aspect: "16:9",
    anchorFile: "orgue-pochettes-face-contexte-img-1093.jpg", geometryFiles: ["orgue-pochettes-face-large-img-1088.jpg"], detailFiles: ["orgue-commandes-claviers-detail-img-1044.jpg"],
    remove: ["câbles", "tour PC", "pochettes photographiées en basse définition"], additions: ["trois pochettes HD sur supports crédibles"],
    covers: ["Acid Body Music", "Une Dernière Fois", "Videoclub"], exports: [{ width: 1920, height: 1080 }, { width: 1200, height: 1500 }, { width: 1080, height: 1920 }], status: "review",
    specific: "Plan 16:9 fidèle à IMG_1093. L’orgue et la pièce restent réels ; remplacer uniquement les surfaces graphiques des trois pochettes par les fichiers HD fournis, sans changer leur taille, leur carton ni leur appui physique.",
  },
  {
    code: "R07", title: "Salle de réunion devant les fenêtres", usage: "Espaces", aspect: "16:9",
    anchorFile: "table-reunion-devant-fenetre-img-1079.jpg", geometryFiles: ["espace-reunion-vers-entree-img-1080.jpg"], detailFiles: [],
    remove: ["personnes", "manteaux", "papiers", "écrans"], additions: ["lampe opaline", "textile discret"], covers: [],
    exports: [{ width: 1920, height: 1080 }, { width: 1600, height: 1200 }], status: "review",
    specific: "Plan 16:9 de la vraie table devant les stores. Ranger la table, réordonner les chaises existantes, filtrer la lumière et conserver l’entrée ainsi que toutes les ouvertures à leur place.",
  },
  {
    code: "R08", title: "Palier et escalier lumineux", usage: "Espaces", aspect: "4:5",
    anchorFile: "palier-escalier-fenetres-plan-large-img-1050.jpg", geometryFiles: ["palier-escalier-fenetre-portrait-img-1049.jpg"], detailFiles: [],
    remove: ["petits objets temporaires"], additions: ["plante unique"], covers: [], exports: [{ width: 1200, height: 1500 }], status: "review",
    specific: "Portrait 4:5. Conserver garde-corps, stores, fenêtres, colonnes et ombres rayées ; nettoyer seulement le palier et renforcer délicatement la chaleur naturelle.",
  },
  {
    code: "R09", title: "Bureau vu depuis l’entrée", usage: "Espaces", aspect: "16:9",
    anchorFile: "bureau-vue-depuis-vitrine-img-1073.jpg", geometryFiles: ["bureau-vue-depuis-entree-img-1072.jpg", "plateau-bureau-vue-generale-img-1084.jpg"], detailFiles: [],
    remove: ["personnes", "écrans dominants", "câbles", "papiers"], additions: ["lampe de bureau", "plante"], covers: [], exports: [{ width: 1920, height: 1080 }], status: "review",
    specific: "Vue 16:9 depuis l’entrée, profondeur réelle dégagée. Préserver exactement l’axe vers l’orgue et le plateau, sans déplacer fenêtres, colonnes ou tables.",
  },
  {
    code: "R10", title: "Meuble rouge et noir", usage: "Espaces", aspect: "4:3",
    anchorFile: "meuble-rouge-noir-et-orgue-img-1054.jpg", geometryFiles: [], detailFiles: [], remove: ["câbles", "petites fournitures"],
    additions: ["lampe ou casque", "pochette unique"], covers: ["Velodrome"], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "Nature morte 4:3 sur le vrai meuble rouge et noir. Ajouter au maximum une lampe ou un casque et une seule pochette HD, chaque objet correctement posé et à l’échelle.",
  },
  {
    code: "R11", title: "Orgue avec sélection de pochettes", usage: "Pochettes 33 tours", aspect: "4:3",
    anchorFile: "orgue-pochettes-face-large-img-1088.jpg", geometryFiles: ["orgue-pochettes-angle-droit-img-1087.jpg"], detailFiles: ["orgue-face-complete-img-1036.jpg"],
    remove: ["câbles", "graphismes basse définition"], additions: ["trois pochettes HD"], covers: ["Mustang Force", "Ny Parigo", "The Trip"],
    exports: [{ width: 1600, height: 1200 }, { width: 1200, height: 1500 }], status: "review",
    specific: "Plan 4:3 fidèle à IMG_1088. Conserver l’orgue exact et la matérialité des pochettes réelles ; remplacer seulement les graphismes par les trois fichiers HD fournis.",
  },
  {
    code: "R12", title: "Trophées Parigo", usage: "Pages", aspect: "4:3",
    anchorFile: "trophees-metal-groupe-face-img-1061.jpg", geometryFiles: ["trophees-metal-groupe-droit-img-1063.jpg"], detailFiles: ["trophee-metal-01-face-img-1055.jpg", "trophee-metal-02-face-img-1057.jpg", "trophee-metal-03-face-img-1059.jpg"],
    remove: ["fond parasite", "traces superficielles"], additions: ["table réelle propre"], covers: [], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "Nature morte 4:3. Reproduire exactement le groupe de trophées et leurs proportions sur une vraie table des locaux, avec un éclairage chaud sobre et aucune récompense inventée.",
  },
  {
    code: "R13", title: "Register — une place vous attend", usage: "Accès", aspect: "4:5",
    anchorFile: "table-reunion-devant-fenetre-img-1079.jpg", geometryFiles: ["espace-reunion-vers-entree-img-1080.jpg"], detailFiles: [], remove: ["personnes", "désordre"],
    additions: ["chaise légèrement tirée", "carnet", "stylo"], covers: [], exports: [{ width: 1200, height: 1500 }], status: "review",
    specific: "Portrait 4:5 pour Register. Une vraie chaise légèrement tirée, carnet et stylo sur la table ; composition accueillante avec zone calme pour l’interface, sans symbole d’inscription.",
  },
  {
    code: "R14", title: "Forgot Password — retrouver le fil", usage: "Accès", aspect: "4:5",
    anchorFile: "orgue-commandes-intermezzo-detail-img-1064.jpg", geometryFiles: ["orgue-commandes-claviers-detail-img-1044.jpg"], detailFiles: ["orgue-commandes-centre-detail-img-1043.jpg"],
    remove: ["poussière", "reflets"], additions: [], covers: [], exports: [{ width: 1200, height: 1500 }], status: "review",
    specific: "Portrait 4:5 sur les vraies commandes analogiques de IMG_1064. Préserver chaque commande et suggérer la continuité par la composition, sans inventer machine, câble, texte ou symbole de mot de passe.",
  },
  {
    code: "R15", title: "Reset Password — rétablir le signal", usage: "Accès", aspect: "4:5",
    anchorFile: "orgue-commandes-temptation-detail-img-1065.jpg", geometryFiles: ["orgue-commandes-claviers-detail-img-1044.jpg"], detailFiles: ["orgue-commandes-gauche-detail-img-1042.jpg"],
    remove: ["poussière", "reflets"], additions: [], covers: [], exports: [{ width: 1200, height: 1500 }], status: "review",
    specific: "Portrait 4:5 sur une autre famille de commandes réelles. État actif mais techniquement neutre, aucune fausse lumière, aucun câble inventé et aucune métaphore de cybersécurité.",
  },
  {
    code: "R16", title: "Vérification réussie", usage: "Accès", aspect: "4:5",
    anchorFile: "trophee-metal-01-face-img-1055.jpg", geometryFiles: [], detailFiles: ["trophee-metal-01-angle-img-1056.jpg"], remove: ["fond parasite"],
    additions: ["lampe chaude hors champ"], covers: [], exports: [{ width: 1200, height: 1500 }], status: "review",
    specific: "Portrait 4:5 d’un trophée réel unique sur une table du bureau. Lumière chaleureuse de confirmation, composition sobre, aucun check, texte ou pictogramme.",
  },
  {
    code: "R17", title: "Lien expiré — signal au repos", usage: "Accès", aspect: "4:5",
    anchorFile: "orgue-face-plan-large-mur-img-1040.jpg", geometryFiles: ["orgue-face-complete-img-1036.jpg"], detailFiles: [], remove: ["câbles", "désordre"], additions: [], covers: [],
    exports: [{ width: 1200, height: 1500 }], status: "review",
    specific: "Portrait 4:5 de l’orgue réel au repos dans la pièce. Lumière plus calme et douce, jamais sombre ou anxiogène ; grande zone calme pour le message.",
  },
  {
    code: "R18", title: "Aucune playlist", usage: "Compte", aspect: "4:3", anchorFile: "meuble-rouge-noir-et-orgue-img-1054.jpg", geometryFiles: [], detailFiles: [],
    remove: ["objets du meuble", "câbles"], additions: ["support de pochettes vide"], covers: [], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "État vide 4:3. Un support de pochettes réellement vide sur le meuble, sans icône, texte ni pochette ; l’espace libre est le sujet.",
  },
  {
    code: "R19", title: "Aucun favori", usage: "Compte", aspect: "4:3", anchorFile: "table-reunion-devant-fenetre-img-1079.jpg", geometryFiles: [], detailFiles: [],
    remove: ["désordre"], additions: ["petit support vide", "lampe opaline"], covers: [], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "État vide 4:3 sur la vraie table : petit présentoir vide et lampe opaline, sans cœur, étoile, texte ou symbole littéral.",
  },
  {
    code: "R20", title: "Aucun téléchargement", usage: "Compte", aspect: "4:3", anchorFile: "orgue-profil-gauche-pedalier-img-1038.jpg", geometryFiles: ["orgue-face-complete-img-1036.jpg"], detailFiles: [],
    remove: ["câbles", "tour PC"], additions: [], covers: [], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "État vide 4:3. Orgue et pédalier réels au repos, exacts et propres ; aucune flèche, aucun écran et aucun symbole numérique.",
  },
  {
    code: "R21", title: "Aucun historique", usage: "Compte", aspect: "4:3", anchorFile: "orgue-face-complete-img-1036.jpg", geometryFiles: [], detailFiles: ["orgue-commandes-claviers-detail-img-1044.jpg"],
    remove: ["câbles"], additions: ["carnet fermé"], covers: [], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "État vide 4:3. Orgue éteint, carnet fermé posé sur un meuble voisin et lumière du matin ; aucune horloge ou métaphore littérale.",
  },
  {
    code: "R22", title: "Shortlist vide", usage: "Compte", aspect: "4:3", anchorFile: "table-reunion-devant-fenetre-img-1079.jpg", geometryFiles: [], detailFiles: [],
    remove: ["tous les documents", "personnes"], additions: ["deux séparateurs vierges"], covers: [], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "Table de sélection réelle entièrement dégagée en 4:3, deux séparateurs vierges au maximum, zone centrale vide et aucun texte.",
  },
  {
    code: "R23", title: "Aucune recherche sauvegardée", usage: "Compte", aspect: "4:3", anchorFile: "plateau-bureau-perspective-longue-img-1085.jpg", geometryFiles: ["plateau-bureau-perspective-large-img-1086.jpg"], detailFiles: [],
    remove: ["personnes", "écrans", "papiers"], additions: ["carnet fermé"], covers: [], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "Bureau réel nettoyé en 4:3 avec un carnet fermé et beaucoup de respiration. Aucun champ de recherche, loupe, écran ou texte.",
  },
  {
    code: "R24", title: "Aucun tag", usage: "Compte", aspect: "4:3", anchorFile: "circulation-palier-et-rangements-img-1077-still.jpg", geometryFiles: ["bureau-depuis-palier-contexte-img-1053.jpg"], detailFiles: [],
    remove: ["objets temporaires"], additions: ["séparateurs vierges"], covers: [], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "Utiliser uniquement l’image fixe validée de la vidéo IMG_1077 pour la relation spatiale. Rangement réel avec séparateurs vierges, sans étiquette, texte ou tag inventé.",
  },
  {
    code: "R25", title: "Aucune communication", usage: "Compte", aspect: "4:3", anchorFile: "meuble-rouge-noir-et-orgue-img-1054.jpg", geometryFiles: [], detailFiles: [],
    remove: ["câbles", "objets existants"], additions: ["téléphone vintage", "carnet fermé", "stylo"], covers: [], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "Nature morte 4:3 avec téléphone vintage physiquement crédible, combiné posé, carnet fermé et stylo. Aucun message, bulle ou texte ; utilisable aussi pour Aucun commentaire.",
  },
  {
    code: "R26", title: "Recherche sans résultat", usage: "Pages", aspect: "4:3", anchorFile: "table-reunion-devant-fenetre-img-1079.jpg", geometryFiles: [], detailFiles: [],
    remove: ["documents", "personnes"], additions: [], covers: [], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "Vue 4:3 de la vraie table avec un vide central nettement lisible et les chaises conservées. Aucun texte, loupe ou interface.",
  },
  {
    code: "R27", title: "Similarité sans résultat", usage: "Pages", aspect: "4:3", anchorFile: "orgue-angle-droit-sans-pochettes-img-1045.jpg", geometryFiles: ["orgue-face-complete-img-1036.jpg"], detailFiles: ["orgue-commandes-claviers-detail-img-1044.jpg"],
    remove: ["câbles", "tour PC"], additions: [], covers: [], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "Orgue réel et commandes au repos en 4:3, sans écran inventé ni symbole d’IA. Conserver une zone calme pour le message de piste non indexée.",
  },
  {
    code: "R28", title: "Contact", usage: "Pages", aspect: "4:3", anchorFile: "espace-reunion-vers-entree-img-1080.jpg", geometryFiles: ["bureau-vue-depuis-entree-img-1072.jpg"], detailFiles: [],
    remove: ["personnes", "imprimante", "manteaux"], additions: ["téléphone années 70", "carnet"], covers: [], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "Vrai bureau près de l’entrée, cadré en 4:3, avec téléphone années 70 correctement posé et cordon crédible. Accueillant, sans texte ni faux logo.",
  },
  {
    code: "R29", title: "Licensing et synchronisation", usage: "Pages", aspect: "16:9", anchorFile: "plateau-bureau-vue-generale-img-1084.jpg", geometryFiles: ["plateau-bureau-perspective-large-img-1086.jpg"], detailFiles: [],
    remove: ["personnes", "désordre", "écrans multiples"], additions: ["casque", "carnet"], covers: [], exports: [{ width: 1920, height: 1080 }], status: "review",
    specific: "Plateau professionnel rangé en 16:9. Conserver un seul écran réel discret, éteint ou neutre, plus un casque et un carnet ; aucun timecode, waveform ou faux logiciel.",
  },
  {
    code: "R30", title: "404 et erreur globale", usage: "Pages", aspect: "16:9", anchorFile: "palier-vers-bureau-img-1051.jpg", geometryFiles: ["bureau-depuis-palier-plantes-img-1052.jpg"], detailFiles: [],
    remove: ["désordre", "câbles"], additions: [], covers: [], exports: [{ width: 1920, height: 1080 }, { width: 1600, height: 1200 }], status: "review",
    specific: "Passage réel vers le bureau en 16:9, légèrement assombri mais jamais inquiétant. Préserver une grande zone calme, toutes les ouvertures et le garde-corps ; aucune signalétique d’erreur.",
  },
  {
    code: "R31", title: "Mur de pochettes Parigo", usage: "Pochettes & mosaïques", aspect: "16:9", anchorFile: "orgue-face-contexte-bureau-img-1047.jpg", geometryFiles: ["orgue-plan-large-piece-img-1048.jpg"], detailFiles: ["orgue-face-complete-img-1036.jpg"],
    remove: ["câbles", "tour PC", "désordre"], additions: ["quatre cadres fins sur mur blanc"], covers: ["Acid Body Music", "Egocentric Visuo-Spatial Perspective", "Hand Funktion", "Velodrome"],
    exports: [{ width: 1920, height: 1080 }, { width: 1200, height: 1500 }, { width: 1080, height: 1920 }], status: "review",
    specific: "Plan 16:9 depuis IMG_1047. Ajouter quatre cadres fins sur le vrai mur blanc, sans boiserie fictive, avec les quatre pochettes HD exactes. Préserver intégralement l’orgue et la pièce.",
  },
  {
    code: "R32", title: "Table éditoriale, pochettes et trophées", usage: "Pochettes & mosaïques", aspect: "4:3", anchorFile: "table-reunion-devant-fenetre-img-1079.jpg", geometryFiles: ["espace-reunion-vers-entree-img-1080.jpg"], detailFiles: ["trophee-metal-01-face-img-1055.jpg"],
    remove: ["personnes", "documents"], additions: ["quatre pochettes", "un trophée maximum"], covers: ["Videoclub", "Une Dernière Fois", "Ny Parigo", "The Trip"],
    exports: [{ width: 1600, height: 1200 }, { width: 1920, height: 1005 }], status: "review",
    specific: "Vue 4:3 de la vraie table éditoriale. Disposer quatre pochettes HD à l’échelle et un seul trophée réel, avec contacts et ombres crédibles ; composition aérée et aucun autre accessoire dominant.",
  },
  {
    code: "R33", title: "Orgue — plan moyen avec pochette", usage: "Studio", aspect: "4:5", anchorFile: "orgue-pochettes-face-portrait-img-1030.jpg", geometryFiles: ["orgue-face-complete-img-1036.jpg", "orgue-pochettes-face-contexte-img-1093.jpg"], detailFiles: ["orgue-commandes-claviers-detail-img-1044.jpg"],
    remove: ["tour PC", "câbles en paquet"], additions: ["casque discret"], covers: ["Acid Body Music"], exports: [{ width: 1200, height: 1500 }], status: "review",
    specific: "Variante verticale plus éloignée de l’orgue réel, avec son vrai large banc brun chromé. Poser une unique pochette Acid Body Music sur le haut de l’orgue et conserver une grande respiration murale.",
  },
  {
    code: "R34", title: "Orgue — close-up avec pochette", usage: "Studio", aspect: "4:3", anchorFile: "orgue-pochettes-face-rapprochee-img-1031.jpg", geometryFiles: ["orgue-claviers-vue-plongeante-img-1039.jpg"], detailFiles: ["orgue-commandes-claviers-detail-img-1044.jpg"],
    remove: ["reflets parasites", "poussière superficielle"], additions: [], covers: ["Hand Funktion"], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "Close-up 4:3 légèrement plus large que R05. Poser une unique pochette Hand Funktion sur le pupitre supérieur sans masquer les commandes et préserver chaque détail technique.",
  },
  {
    code: "R35", title: "Close-up bureau et vinyles", usage: "Pochettes & mosaïques", aspect: "4:3", anchorFile: "table-reunion-devant-fenetre-img-1079.jpg", geometryFiles: ["plateau-bureau-perspective-longue-img-1085.jpg"], detailFiles: ["trophee-metal-02-angle-img-1058.jpg"],
    remove: ["documents temporaires", "câbles en paquet"], additions: ["MacBook Pro", "casque", "carnet", "stylo plume", "un trophée"], covers: ["Hand Funktion", "Videoclub", "Une Dernière Fois"], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "Gros plan vivant d’un vrai bureau Parigo. Disposer les trois pochettes distinctes légèrement en vrac mais soignées, avec ordinateur, casque, carnet, stylo et un seul trophée ; aucun orgue dans le cadrage.",
  },
  {
    code: "R36", title: "Close-up bureau, prix et Parigo", usage: "Pochettes & mosaïques", aspect: "4:3", anchorFile: "plateau-bureau-vue-generale-img-1084.jpg", geometryFiles: ["table-reunion-devant-fenetre-img-1079.jpg"], detailFiles: ["trophees-metal-groupe-face-img-1061.jpg", "illustration-encadree-femme-chien-img-1096.jpg"],
    remove: ["documents temporaires", "câbles en paquet"], additions: ["MacBook Pro", "casque studio", "stylo plume", "deux trophées", "cadre Parigo"], covers: ["Egocentric Visuo-Spatial Perspective", "Mustang Force", "Velodrome"], exports: [{ width: 1600, height: 1200 }], status: "review",
    specific: "Gros plan éditorial plus institutionnel sur un vrai bureau Parigo. Montrer les trois pochettes distinctes, deux vrais trophées, ordinateur et casque ; aucun orgue et aucun doublon.",
  },
];

export const parigoRealProductionManifest: ParigoRealProductionItem[] = manifestSeed.map(
  ({ specific, ...item }) => ({
    ...item,
    status: Number(item.code.slice(1)) <= 5 ? "calibration" : "approved",
    prompt: prompt(`${specific}\n\nSUPPRESSIONS DEMANDÉES\n${item.remove.join(" ; ") || "Aucune."}\n\nAJOUTS AUTORISÉS\n${item.additions.join(" ; ") || "Aucun."}\n\nPOCHETTES HD AUTORISÉES\n${item.covers.length ? `${item.covers.join(" ; ")}. Une seule occurrence de chaque.` : "Aucune pochette."}`),
  }),
);

const sourceRoot = "/images/editorial/parigo-real-sources";
const outputRoot = "/images/editorial/parigo-real";

function source(filename: string) {
  return `${sourceRoot}/${filename.replace(/\.jpg$/, ".webp")}`;
}

function reference(filename: string, label: string, role: ParigoGalleryReference["role"]): ParigoGalleryReference {
  return { src: source(filename), label, role };
}

export const parigoRealAssetSlugs: Record<string, string> = {
  R01: "hero-orgue", R02: "plateau-editorial", R03: "facade-angle", R04: "login-entree", R05: "orgue-commandes",
  R06: "a-propos-orgue-pochettes", R07: "salle-reunion-fenetres", R08: "palier-escalier", R09: "bureau-depuis-entree", R10: "meuble-rouge-noir",
  R11: "orgue-selection-pochettes", R12: "trophees-parigo", R13: "register-place", R14: "forgot-password", R15: "reset-password",
  R16: "verification-reussie", R17: "lien-expire", R18: "aucune-playlist", R19: "aucun-favori", R20: "aucun-telechargement",
  R21: "aucun-historique", R22: "shortlist-vide", R23: "recherche-sauvegardee-vide", R24: "aucun-tag", R25: "aucune-communication",
  R26: "recherche-sans-resultat", R27: "similarite-sans-resultat", R28: "contact", R29: "licensing-synchronisation", R30: "404-erreur-globale",
  R31: "mur-pochettes-parigo", R32: "table-editoriale-pochettes-trophees", R33: "orgue-plan-moyen-avec-pochette", R34: "orgue-closeup-avec-pochette",
  R35: "closeup-bureau-vinyles", R36: "closeup-bureau-prix-parigo",
};

const coverSlugs: Record<string, string> = {
  "Acid Body Music": "acid-body-music", "Egocentric Visuo-Spatial Perspective": "egocentric-visuo-spatial-perspective",
  "Hand Funktion": "hand-funktion", "Mustang Force": "mustang-force", "Ny Parigo": "ny-parigo", "The Trip": "the-trip",
  "Une Dernière Fois": "une-derniere-fois", Velodrome: "velodrome", Videoclub: "videoclub",
};

function exportLabel(width: number, height: number) {
  if (width === 1080 && height === 1920) return "Story";
  if (width === 1920 && height === 1005) return "Open Graph";
  if (width === 2100 && height === 900) return "Panoramique";
  if (width / height > 1.5) return "Horizontal";
  if (height > width) return "Portrait";
  return "Format 4:3";
}

function itemExports(item: ParigoRealProductionItem): NonNullable<ParigoGalleryImage["exports"]> {
  const slug = parigoRealAssetSlugs[item.code];
  return item.exports.map(({ width, height }) => ({
    src: `${outputRoot}/${item.code.toLowerCase()}-${slug}-${width}x${height}.avif`,
    label: exportLabel(width, height), width, height,
  }));
}

function itemReferences(item: ParigoRealProductionItem): ParigoGalleryReference[] {
  const refs: ParigoGalleryReference[] = [reference(item.anchorFile, "Photo d’ancrage", "ancrage")];
  refs.push(...item.geometryFiles.map((file) => reference(file, "Référence de géométrie", "géométrie")));
  refs.push(...item.detailFiles.map((file) => reference(file, "Référence de détail", "détail")));
  refs.push(...item.covers.map((cover) => ({
    src: `/images/editorial/parigo-real-covers/${coverSlugs[cover]}.webp`,
    label: `Pochette HD — ${cover}`,
    role: "décoration" as const,
  })));
  return refs.slice(0, 10);
}

export const parigoRealGallery: ParigoGalleryImage[] = parigoRealProductionManifest.map((item, index) => {
  const exports = itemExports(item);
  return ({
    id: 101 + index,
    code: item.code,
    title: item.title,
    src: exports[0].src,
    aspect: item.aspect,
    category: item.usage,
    usage: item.usage,
    prompt: item.prompt,
    collection: "real",
    sourceAnchor: source(item.anchorFile),
    references: itemReferences(item),
    changeNotes: [
      item.remove.length ? `Nettoyage : ${item.remove.join(", ")}` : "Nettoyage éditorial léger",
      item.additions.length ? `Mise en scène : ${item.additions.join(", ")}` : "Aucun accessoire dominant ajouté",
      item.covers.length ? `Pochettes HD distinctes : ${item.covers.join(", ")}` : "Architecture et mobilier réel préservés",
    ],
    status: item.status,
    exports,
  });
});

export const PARIGO_REAL_TARGET_COUNT = parigoRealProductionManifest.length;
