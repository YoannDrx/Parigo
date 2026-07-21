import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/labels/page/all/1/a-z", destination: "/labels", permanent: true },
      { source: "/labels/profile/uncategorised/parigo", destination: "/labels/b9d701733704e2d7", permanent: true },
      { source: "/licensing/licensing", destination: "/licensing", permanent: true },
      { source: "/pages/terms-and-conditions", destination: "/terms", permanent: true },
      { source: "/lost-password/:token", destination: "/reset-password?token=:token", permanent: false },
      { source: "/member/reset-password/:token", destination: "/reset-password?token=:token", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
      {
        protocol: "https",
        hostname: "d3vy0pmxxxelni.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
