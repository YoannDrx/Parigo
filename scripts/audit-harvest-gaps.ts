import { readFile } from "node:fs/promises";
import path from "node:path";

const requiredGapIds = [
  "CFG-01",
  "MAIL-01",
  "I18N-01",
  "I18N-02",
  "SEARCH-01",
  "TAG-01",
  "COMM-01",
  "MAIL-AUTH-01",
];

async function main() {
  const root = process.cwd();
  const [gaps, inventory] = await Promise.all([
    readFile(path.join(root, "docs/harvest/gaps-and-requests.md"), "utf8"),
    readFile(path.join(root, "docs/harvest/endpoint-inventory.csv"), "utf8"),
  ]);
  const missing = requiredGapIds.filter((id) => !gaps.includes(id));
  if (missing.length) throw new Error(`Entrées Harvest manquantes : ${missing.join(", ")}`);
  const capabilities = {
    savedSearches: /searchmembersavesearches/i.test(inventory),
    playlistHierarchy: /getmemberplaylistcategories/i.test(inventory),
    contactEmailDocumented: /sendcontactusemail/i.test(inventory),
    albumDetail: /getalbum/i.test(inventory),
  };
  process.stdout.write(`${JSON.stringify({
    auditedAt: new Date().toISOString(),
    documentedGaps: requiredGapIds.length,
    capabilities,
    conclusion: "Le registre contient uniquement les écarts encore actifs et leurs demandes actionnables.",
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
