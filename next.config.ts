import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isProduction = process.env.VERCEL_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

const publicPageSources = [
  "/",
  "/en",
  ...[
    "about",
    "albums",
    "clips",
    "compositeurs",
    "contact",
    "notre-label",
    "labels",
    "legal",
    "licensing",
    "playlists",
    "privacy",
    "rights",
    "selections",
    "synchronisations",
    "terms",
  ].flatMap((route) => [
    `/${route}`,
    `/${route}/:path*`,
    `/en/${route}`,
    `/en/${route}/:path*`,
  ]),
];

const publicPageCacheHeaders = [
  { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
  {
    key: "Vercel-CDN-Cache-Control",
    value: "public, max-age=300, stale-while-revalidate=600",
  },
];

// Next.js 16 can incorrectly promote an AppRender.fetch span to the root span
// in development. Local Sentry tracing is sampled at 0, so skip only those
// fetch spans locally while preserving full tracing in preview and production.
if (isDevelopment) {
  process.env.NEXT_OTEL_FETCH_DISABLED ??= "1";
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline' https://www.youtube.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://d3vy0pmxxxelni.cloudfront.net https://i.ytimg.com",
  "media-src 'self' blob: https://d3vy0pmxxxelni.cloudfront.net",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "connect-src 'self' https://*.ingest.sentry.io https://*.vercel-insights.com https://d3vy0pmxxxelni.cloudfront.net",
  "worker-src 'self' blob:",
  isProduction ? "upgrade-insecure-requests" : "",
].filter(Boolean).join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      ...publicPageSources.map((source) => ({
        source,
        headers: publicPageCacheHeaders,
      })),
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/labels/page/all/1/a-z", destination: "/labels", permanent: true },
      { source: "/labels/profile/uncategorised/parigo", destination: "/labels/b9d701733704e2d7", permanent: true },
      { source: "/licensing/licensing", destination: "/licensing", permanent: true },
      { source: "/pages/terms-and-conditions", destination: "/terms", permanent: true },
      { source: "/collections/:path*", destination: "/albums", permanent: true },
      { source: "/en/collections/:path*", destination: "/en/albums", permanent: true },
      { source: "/lost-password/:token", destination: "/reset-password?token=:token", permanent: false },
      { source: "/member/reset-password/:token", destination: "/reset-password?token=:token", permanent: false },
    ];
  },
  images: {
    // Harvest already resizes and caches artwork at the CDN edge. The custom
    // loader keeps Next.js responsive srcsets without consuming Vercel's
    // /_next/image allowance.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [640, 750, 800],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d3vy0pmxxxelni.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
};

const bundledConfig = withBundleAnalyzer(nextConfig);

const configuredNextConfig = isDevelopment ? bundledConfig : withSentryConfig(bundledConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  tunnelRoute: "/sentry-tunnel",
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
      removeTracing: true,
      excludeReplayIframe: true,
      excludeReplayShadowDOM: true,
      excludeReplayCompressionWorker: true,
    },
  },
});

export default configuredNextConfig;
