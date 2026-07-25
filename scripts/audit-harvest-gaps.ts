import { readFile } from "node:fs/promises";
import path from "node:path";

const requiredGapIds = [
  "H-001", "H-002", "H-003", "H-004", "H-005",
  "H-006", "H-007", "H-008", "H-009", "H-010",
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
    rightHolders: /getrightholders/i.test(inventory),
    webContent: /getwebcontent/i.test(inventory),
    videoEndpointObserved: /(?:^|[,/])(?:get)?videos?(?:[,/?]|$)/im.test(inventory),
  };
  process.stdout.write(`${JSON.stringify({
    auditedAt: new Date().toISOString(),
    documentedGaps: requiredGapIds.length,
    capabilities,
    conclusion: capabilities.videoEndpointObserved
      ? "Un endpoint vidéo est présent dans l’inventaire et doit être qualifié."
      : "Aucun endpoint vidéo structuré n’est identifié dans l’inventaire fourni.",
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
