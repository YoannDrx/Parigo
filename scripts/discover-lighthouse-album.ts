import { appendFileSync } from "node:fs";

const baseUrl = process.env.LIGHTHOUSE_BASE_URL;
if (!baseUrl) throw new Error("LIGHTHOUSE_BASE_URL is required.");

async function main() {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const response = await fetch(new URL("/albums", baseUrl), {
    headers: bypass ? { "x-vercel-protection-bypass": bypass } : undefined,
  });
  if (!response.ok) throw new Error(`/albums returned HTTP ${response.status}.`);

  const html = await response.text();
  const path = html.match(/href="(\/albums\/[^"?#]+)"/i)?.[1];
  if (!path) throw new Error("No public album URL found on /albums.");

  const albumUrl = new URL(path, baseUrl).toString();
  if (process.env.GITHUB_ENV) {
    appendFileSync(process.env.GITHUB_ENV, `LIGHTHOUSE_ALBUM_URL=${albumUrl}\n`);
  } else {
    console.log(albumUrl);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
