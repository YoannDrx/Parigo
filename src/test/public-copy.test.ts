import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const allowedPages = new Set([
  join(root, "src/app/legal/page.tsx"),
  join(root, "src/app/privacy/page.tsx"),
  join(root, "src/app/rights/page.tsx"),
  join(root, "src/app/terms/page.tsx"),
  // These catalogue pages expose provenance deliberately: raw composer
  // credits must remain traceable to the CMS source.
  join(root, "src/app/albums/[id]/page.tsx"),
  join(root, "src/app/talents/page.tsx"),
  join(root, "src/app/talents/[slug]/page.tsx"),
]);
const allowedSourceComponents = new Set([
  join(root, "src/components/catalog/ComposerDirectoryClient.tsx"),
  join(root, "src/components/search/SearchFilterPanel.tsx"),
]);

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "api" ? [] : filesIn(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("public Parigo copy", () => {
  it("does not expose the technical catalogue provider outside legal and source-inspection surfaces", () => {
    const files = [
      ...filesIn(join(root, "src/components")),
      ...filesIn(join(root, "src/content")),
      ...filesIn(join(root, "src/i18n")),
      ...filesIn(join(root, "src/app")).filter((file) => file.endsWith("page.tsx")),
    ].filter((file) => (
      !allowedPages.has(file)
      && !allowedSourceComponents.has(file)
    ));
    const violations = files.flatMap((file) => {
      const lines = readFileSync(file, "utf8").split("\n");
      return lines.flatMap((line, index) => {
        if (/^\s*(import|export .* from)\b/.test(line) || line.includes("@/lib/harvest")) return [];
        return /harvest/i.test(line) ? [`${file.replace(`${root}/`, "")}:${index + 1}`] : [];
      });
    });
    expect(violations).toEqual([]);
  });
});
