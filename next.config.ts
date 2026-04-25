import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400, // 24h
    deviceSizes: [320, 480, 640, 750, 1080, 1920],
    imageSizes: [64, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  typescript: {
    // Le dice a Vercel que ignore los errores de tipos y permita el despliegue
    ignoreBuildErrors: true,
  },
  // @ts-ignore
  eslint: {
    // Le dice a Vercel que ignore warnings de ESLint
    ignoreDuringBuilds: true,
  },
  // Optimizaciones del compilador SWC
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      {
        // Cache de fuentes externas (woff/woff2)
        source: "/fonts/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
