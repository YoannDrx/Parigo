import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const allowedPages = new Set([
  join(root, "src/app/legal/page.tsx"),
  join(root, "src/app/privacy/page.tsx"),
]);

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "api" ? [] : filesIn(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("public Parigo copy", () => {
  it("does not expose the technical catalogue provider outside legal pages", () => {
    const files = [
      ...filesIn(join(root, "src/components")),
      ...filesIn(join(root, "src/content")),
      ...filesIn(join(root, "src/i18n")),
      ...filesIn(join(root, "src/app")).filter((file) => file.endsWith("page.tsx")),
    ].filter((file) => !allowedPages.has(file));
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
