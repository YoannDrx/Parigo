const { existsSync } = require("node:fs");
const { loadEnvFile } = require("node:process");

if (existsSync(".env")) loadEnvFile(".env");

const baseUrl = process.env.LIGHTHOUSE_BASE_URL;
const albumUrl = process.env.LIGHTHOUSE_ALBUM_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const productionAudit = process.env.LIGHTHOUSE_EXPECT_PRODUCTION === "1";

if (!baseUrl) throw new Error("LIGHTHOUSE_BASE_URL is required.");
if (!albumUrl) throw new Error("LIGHTHOUSE_ALBUM_URL is required.");

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      url: [
        new URL("/", baseUrl).toString(),
        new URL("/albums", baseUrl).toString(),
        albumUrl,
      ],
      settings: {
        formFactor: "mobile",
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2 },
        throttlingMethod: "simulate",
        maxWaitForLoad: 90000,
        extraHeaders: JSON.stringify(bypass ? { "x-vercel-protection-bypass": bypass } : {}),
      },
    },
    assert: {
      assertions: {
        // Protected Vercel Previews add an authentication hop and force
        // X-Robots-Tag: noindex. Preview therefore validates a narrow
        // performance tolerance while the promoted public artifact is checked
        // against the final production targets below.
        "categories:performance": ["error", { minScore: productionAudit ? 0.9 : 0.89, aggregationMethod: "median" }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        ...(productionAudit ? { "categories:seo": ["error", { minScore: 1 }] } : {}),
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "largest-contentful-paint": ["error", { maxNumericValue: productionAudit ? 3000 : 4000, aggregationMethod: "median" }],
        "total-blocking-time": ["error", { maxNumericValue: 200, aggregationMethod: "median" }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1, aggregationMethod: "median" }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
