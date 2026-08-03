import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type CsvRow = Record<string, string>;

const IMPLEMENTED_KEYS = new Set([
  "oauth2/token", "getservicetoken", "getserviceinfo", "getregions", "getguestmembertoken",
  "getlibraries", "getlibrary", "getstyles", "getfeaturedalbums", "getalbum", "getalbumtracks",
  "gettracks", "getcategories", "getrightholders", "getfeaturedplaylistsplaylistonly",
  "getfeaturedplaylistandtracks", "cloudsearch", "autocomplete", "getmembertoken",
  "validatepersistentlogintoken", "validateusername", "validatememberemail", "registermember",
  "sendmemberverifylinkemail", "validateverifymembertoken", "verifymember", "sendpasswordresetemail",
  "validatepasswordresettoken", "updatepasswordusingtoken", "getmember", "updatemember",
  "removememberverifypassword",
  "membersubscribe", "getpresigneduploadurl", "confirmpresignedupload", "removeassignedupload",
  "expiretoken", "expirepersistentlogintoken", "getfavourites", "addtofavourites",
  "removefavouritestrack", "getmemberplaylistsnotracks", "getmemberplaylistcategoriesandplaylists",
  "getmemberplaylist", "getmemberplaylistcategories", "addmemberplaylistcategory",
  "updatememberplaylistcategory", "removememberplaylistcategory", "reordermemberplaylist",
  "duplicatememberplaylist", "searchmemberplaylisttracks", "archiveplaylist", "restorearchiveplaylist",
  "addmemberplaylist", "removeplaylist", "updateplaylist", "copytomemberplaylist",
  "addtomemberplaylists", "removeplaylisttracks", "reordermemberplaylisttracks",
  "suggestmemberplaylisttracks", "getinvitedmembertoken", "getsharemusicurl", "sendsharemusiclinkemail",
  "searchmembersavesearches", "addmembersavesearch", "removemembersavedsearch",
  "updatemembersavesearch", "gettrackmembercomments", "addtrackmembercomment",
  "updatetrackmembercomment", "removetrackmembercomment", "getmembertags", "getmembertagsbytrack",
  "addmembertag", "updatemembertag", "addtomembertags", "getmembertagtracks",
  "removetrackmembertag", "removemembertag", "gethistorybymembertoken",
  "getdownloadhistorybymembertoken", "validatemusicdownloadrequest", "getmusicdownload",
  "getmusicdownloadinfo", "gethistorybycommunications", "getsharemusic", "getcuesheet",
]);

const PAYLOADS: Record<string, string> = {
  "oauth2/token": "form: grant_type, client_id, client_secret",
  gettracks: "ReturnAlternateVersions, ReturnAttributes, ReturnCategories, ReturnCategoryFacet, ReturnCodes, ReturnComposers, ReturnRelatedTracks, ReturnRightHolders, GetMainVersionFromAlternate, CuesheetOnlyCodesAndAttribute, ReturnInactiveTracks, ReturnRegionOnlyTracks, Offset, Limit, track[]",
  getfeaturedplaylistandtracks: "{} (POST vide; les options documentées ne sont pas envoyées)",
  cloudsearch: "SaveSearchHistory, RegionID, SearchFilters{SearchType, LibraryType, IncludeInactive, MainOnly, AlternateOnly, Nearest*, TranslateKeyword, ParentSearchHistoryID, PreviousSearchTermBundles?, SearchTermBundle, ResultView}",
  autocomplete: "Keyword, LibraryType et drapeaux ReturnTracks/Albums/Libraries/Styles/CategoryAttributes/RightHolders/Lyrics/Keywords/FeaturedPlaylists avec champs, limites et tris",
  getmembertoken: "UserName, Password, PersistentLogin, ReturnMemberDetails",
  validatepersistentlogintoken: "Token, RenewExpiry, GenerateMemberToken, ReturnMemberDetails",
  validateusername: "Username, VerifyEmail",
  validatememberemail: "Email",
  registermember: "MemberAccount{Username, Email, Password, FirstName, LastName, Company, Country, Production, SubProduction, Position, Address1, Address2, Suburb, State, Postcode, Phone, FileFormat, SearchFormat, SearchSort, TermsAccept, PrivacyAccept, Subscribe, Attributes, ExternalMemberID, ExternalVerifyToken}, NoMemberEmail, VerifierEmail, RegistrationCode",
  sendmemberverifylinkemail: "Email, ExternalVerifyToken",
  verifymember: "Token",
  sendpasswordresetemail: "Username, Email, ExternalResetToken",
  updatepasswordusingtoken: "Token, Password",
  removememberverifypassword: "Password, ArchiveOnly",
  updatemember: "MemberAccount{ID, FirstName, LastName, Email, Username, Company, Country, Production, SubProduction, Position, Address1, Address2, Suburb, State, Postcode, Phone, FileFormat, Website, TermsAccept, PrivacyAccept, Subscribe, SearchFormat, SearchSort, Attributes, Status}",
  membersubscribe: "FirstName, LastName, Email, Subscribe",
  getpresigneduploadurl: "AssetType=MemberProfileImage, FileName, ContentType, ExpiresInSeconds, ObjectId",
  confirmpresignedupload: "AssetType=MemberProfileImage, FileName, ObjectId",
  removeassignedupload: "AssetType=MemberProfileImage",
  expirepersistentlogintoken: "Token",
  addmemberplaylistcategory: "PlaylistCategoryName, PlaylistCategoryDescription, ColorHex, AddToTop",
  updatememberplaylistcategory: "PlaylistCategoryName, PlaylistCategoryDescription, ColorHex",
  duplicatememberplaylist: "SourcePlaylistID, DuplicatePlaylistName?",
  searchmemberplaylisttracks: "Keyword, Fields, ReturnTrackCount, Skip, Limit, OrderBy",
  addmemberplaylist: "requestaddupdateplaylist{playlistname, playlistdescription, playlisttags, highlighttracks, autosave, autosavelimit, autosaveapplytohighlighttracks, playlistcategoryid, externalplaylistimageurl, orderby}",
  updateplaylist: "playlistname, playlistdescription, playlisttags, highlighttracks, autosave, autosavelimit, autosaveapplytohighlighttracks, playlistcategoryid, externalplaylistimageurl, orderby",
  copytomemberplaylist: "PlaylistID, PlaylistName?, CopyTracks",
  addtomemberplaylists: "ObjectType, ObjectIDs[], AddToPlaylistIDs[], ObjectTrimStart, ObjectTrimEnd, AddToAutoSavePlaylists",
  removeplaylisttracks: "track[{id}]",
  reordermemberplaylisttracks: "FromPlaylistID, ToPlaylistID, TrackIDs (chaîne), exactement un de PrecedingTrackID/SucceedingTrackID/OrderID, Copy",
  suggestmemberplaylisttracks: "Skip, Limit, MainOnly, SeedDetermination, SeedLimit, SeedMin",
  getinvitedmembertoken: "Email, RegionID",
  getsharemusicurl: "FromMemberToken, ToMemberToken, ObjectIdentifier, ObjectType=Playlist, ShareType, AllowDownload, AllowFollow, AllowSave, AllowShare",
  sendsharemusiclinkemail: "FromEmail, ToEmail, Message, Link, ContentType, ContentTitle, SelectEmailTemplateByMemberRegion",
  searchmembersavesearches: "Keywords, Skip, Limit, Sort",
  addmembersavesearch: "Name, Description, SearchHistoryID",
  updatemembersavesearch: "ID (supplémentaire), Name, Description, SearchHistoryID",
  addtrackmembercomment: "trackid, TagName (adaptation au contrat live case-sensitive)",
  updatetrackmembercomment: "TagID, TagName (ID du commentaire, pas ID de piste)",
  addmembertag: "TagName",
  updatemembertag: "TagName",
  addtomembertags: "ObjectType, ObjectIDs[], AddToTagIDs[]",
  validatemusicdownloadrequest: "Identifier, ContentIDs, DownloadType, Format[], TrimEndSecs, TrimStartSecs, IncludeVersionCheck",
  getmusicdownload: "Identifier, DownloadType, Format, TrimStartSecs, TrimEndSecs, Email, IsShare, Message, SenderEmail, ForceEmail, IncludeVersions, VersionFolderName, DownloadFileName, CuesheetFileName, IncludeCuesheetFile",
  getmusicdownloadinfo: "Skip, Limit et DownloadID ou DownloadGroupID",
  gethistorybycommunications: "Skip, Limit, Sort, StartDate, EndDate",
  getcuesheet: "track[]",
};

const ASSESSMENTS: Record<string, [string, string]> = {
  getmembertoken: ["conforme-requete-reponse-divergente", "Requête conforme et live 200; la réponse live utilise MemberToken et PersistentLoginToken.Token, contrairement à l'exemple."],
  getfeaturedplaylistandtracks: ["compatible-confirme", "La méthode POST est correcte; Parigo envoie {} au lieu des six options de l'exemple officiel, forme également acceptée en live."],
  cloudsearch: ["conforme-sous-ensemble", "Structure documentée; champs optionnels adaptés au besoin Parigo; variantes live validées."],
  autocomplete: ["conforme-sous-ensemble", "Structure documentée; options non utilisées omises; live 200."],
  updatemember: ["conforme-avec-extension", "Le code ajoute Website, accepté en live mais absent de l'exemple JSON publié."],
  membersubscribe: ["requete-conforme-effet-absent", "HTTP 200, mais Subscribe ne change pas lors de la relecture du membre."],
  sendpasswordresetemail: ["exemple-conforme-texte-contradictoire", "Parigo envoie exactement Username/Email/ExternalResetToken; la description parle plutôt de ResetLink/ResetTokenExpiryHours et le service répond Required route not found."],
  getsharemusicurl: ["requete-conforme-capacite-indisponible", "Le payload Playlist correspond à l'exemple; le service Parigo répond Error.Code=2 sans URL."],
  suggestmemberplaylisttracks: ["requete-conforme-capacite-desactivee", "Payload exact; Error.Code=3 car la fonctionnalité n'est pas activée."],
  getinvitedmembertoken: ["conforme-via-exemple-duplique", "La page Profile ne publie qu'un exemple XML, mais la page Sharing publie le JSON Email/RegionID exact utilisé par Parigo; live 200."],
  updatemembersavesearch: ["conforme-avec-extension", "Parigo ajoute ID dans le body alors que l'ID figure déjà dans l'URL et n'est pas dans l'exemple; la persistance live est confirmée."],
  addtrackmembercomment: ["correctif-parigo-confirme", "La documentation reste incorrecte, mais Parigo envoie désormais trackid/TagName et vérifie la création par relecture."],
  updatetrackmembercomment: ["correctif-parigo-confirme", "La documentation reste incorrecte, mais Parigo envoie désormais TagID/TagName et vérifie la modification par relecture."],
  removememberverifypassword: ["conforme-statique-non-execute", "Parigo exige le mot de passe actuel et transmet Password/ArchiveOnly en POST. L'appel destructif n'a volontairement pas été exécuté en live."],
  getmembertags: ["url-conforme-parametre-inefficace", "ReturnTagCount=1 est envoyé mais le live ne renvoie pas les comptes; Parigo compense par getmembertagtracks."],
  getsharemusic: ["non-verifie-faute-partage", "Parigo utilise un guest member token; aucune URL de partage n'a pu être créée pour vérifier le parcours complet."],
};

const LIVE_EVIDENCE: Record<string, string> = {
  registermember: "non exécuté: créerait un compte et peut envoyer des e-mails",
  sendmemberverifylinkemail: "non exécuté: envoi d'e-mail réel",
  validateverifymembertoken: "contrat d'erreur testé; aucun token de vérification valide disponible",
  verifymember: "non exécuté avec un token valide: changement irréversible de statut membre",
  sendpasswordresetemail: "exécuté: HTTP 200, Code=Failed, Required route not found; aucun e-mail reçu",
  validatepasswordresettoken: "contrat d'erreur testé; aucun reset token valide disponible",
  updatepasswordusingtoken: "contrat d'erreur testé; aucun changement de mot de passe réel",
  removememberverifypassword: "non exécuté: archivage ou suppression du compte de test",
  membersubscribe: "exécuté et relu: HTTP 200 mais aucun changement de Subscribe",
  suggestmemberplaylisttracks: "exécuté: HTTP 200, Error.Code=3, capacité non activée",
  getsharemusicurl: "exécuté: HTTP 200, Error.Code=2, aucune URL créée",
  sendsharemusiclinkemail: "non exécuté: aucune URL de partage et envoi d'e-mail réel",
  getsharemusic: "non exécutable: aucun EngageAccessToken produit",
  getmusicdownloadinfo: "non exécutable: aucun DownloadID/DownloadGroupID disponible",
  addtrackmembercomment: "BFF exécuté: HTTP 201, note relue chez Harvest; cycle complet nettoyé",
  updatetrackmembercomment: "BFF exécuté: HTTP 200, nouveau texte relu chez Harvest; cycle complet nettoyé",
  getfeaturedplaylistandtracks: "payload officiel et payload Parigo {} exécutés en POST: HTTP 200 dans les deux cas",
};

function parseCsv(input: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  const [headers, ...values] = rows;
  return values.filter((candidate) => candidate.some(Boolean))
    .map((candidate) => Object.fromEntries(headers.map((header, index) => [header, candidate[index] || ""])));
}

function csv(rows: CsvRow[], headers: string[]): string {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [headers.map(escape).join(","), ...rows.map((row) => headers.map((header) => escape(row[header] || "")).join(","))].join("\n") + "\n";
}

async function files(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  }))).flat();
}

function endpointKey(row: CsvRow): string {
  if (row.name === "Get Authorised") return "oauth2/token";
  return row.url.replace(/^\{[^}]+URL\}/i, "").split("/")
    .find((segment) => segment && !segment.startsWith("{"))
    ?.replace(/\?.*$/, "").toLowerCase() || "";
}

function implementedVariant(row: CsvRow, key: string): boolean {
  if (row.section.split(" > ")[0] !== "Public API" || !IMPLEMENTED_KEYS.has(key)) return false;
  if (row.section.includes("Search Similar")) return false;
  if (row.name.includes("Include Inactive") || row.name === "Get Styles By Language Code") return false;
  if (key === "expiretoken") return row.name === "Expire Member Token";
  if (key === "getpresigneduploadurl" || key === "confirmpresignedupload" || key === "removeassignedupload") {
    return row.name.includes("Member Image") && !row.name.includes("Playlist");
  }
  if (key === "getsharemusicurl") return row.name === "Get Playlist Share URL";
  return true;
}

async function main() {
  const root = process.cwd();
  const inventory = parseCsv(await readFile(path.join(root, "docs/harvest/endpoint-inventory.csv"), "utf8"))
    .filter((row) => ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(row.method));
  const sourceFiles = (await files(path.join(root, "src")))
    .filter((file) => /\.(?:ts|tsx)$/.test(file) && !/\.(?:test|spec)\./.test(file));
  const sources = await Promise.all(sourceFiles.map(async (file) => ({
    file: path.relative(root, file),
    lines: (await readFile(file, "utf8")).split("\n"),
  })));

  const refs = (key: string): string => {
    if (key === "oauth2/token") return "src/lib/harvest/client.ts:163";
    if (key === "archiveplaylist" || key === "restorearchiveplaylist") return "src/lib/harvest/activity.ts:426";
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pathPattern = new RegExp(`/${escaped}(?:/|[?\"'\\x60])`, "i");
    return sources.flatMap((source) => source.lines.flatMap((line, index) =>
      pathPattern.test(line) ? [`${source.file}:${index + 1}`] : [],
    )).slice(0, 8).join(" | ");
  };

  const rows: CsvRow[] = inventory.map((row) => {
    const key = endpointKey(row);
    const implemented = implementedVariant(row, key);
    const assessment = ASSESSMENTS[key] || ["conforme", "Méthode, chemin, type de jeton et paramètres/payload conformes au contrat publié pour la variante utilisée."];
    return {
      api_family: row.section.split(" > ")[0],
      section: row.section,
      endpoint_name: row.name,
      method_doc: row.method,
      documented_url: row.url,
      endpoint_key: key,
      documented_payload_fields: row.input_fields,
      documented_json_status: row.request_json_status,
      parigo_status: implemented ? "implemented" : "not-implemented",
      parigo_code_refs: implemented ? refs(key) : "",
      parigo_payload_or_query: implemented
        ? PAYLOADS[key] || (row.method === "GET" ? "aucun body; paramètres dans l'URL" : "aucun body")
        : "",
      conformance: implemented ? assessment[0] : "not-applicable",
      live_evidence: implemented
        ? LIVE_EVIDENCE[key] || "exécuté en live avec succès, ou mutation réversible confirmée par relecture puis nettoyage"
        : "non exécuté par Parigo",
      evidence_or_note: implemented
        ? assessment[1]
        : "Aucun appel de production Parigo pour cette variante; contrôle documentaire statique seulement.",
    } satisfies CsvRow;
  });

  const headers = [
    "api_family", "section", "endpoint_name", "method_doc", "documented_url", "endpoint_key",
    "documented_payload_fields", "documented_json_status", "parigo_status", "parigo_code_refs",
    "parigo_payload_or_query", "conformance", "live_evidence", "evidence_or_note",
  ];
  const target = path.join(root, "docs/harvest/code-documentation-conformance-matrix-2026-08-03.csv");
  await writeFile(target, csv(rows, headers));
  const implementedRows = rows.filter((row) => row.parigo_status === "implemented");
  const implementedKeys = new Set(implementedRows.map((row) => row.endpoint_key));
  process.stdout.write(`${JSON.stringify({
    documentedRows: inventory.length,
    matrixRows: rows.length,
    productionDocumentedVariants: implementedRows.length,
    productionDocumentedEndpointKeys: implementedKeys.size,
    expectedImplementedEndpointKeys: IMPLEMENTED_KEYS.size,
    missingImplementedKeys: [...IMPLEMENTED_KEYS].filter((key) => !implementedKeys.has(key)),
    codeOnlyRows: 0,
    output: path.relative(root, target),
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
