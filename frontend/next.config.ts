import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://localhost:4000";

export default function nextConfig(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    // Dev: proxy API ke backend NestJS agar same-origin (tanpa CORS).
    return {
      async rewrites() {
        return [
          {
            source: "/api/v1/:path*",
            destination: `${BACKEND_URL}/api/v1/:path*`,
          },
        ];
      },
    };
  }

  // Build: static export, disajikan oleh NestJS (deployment monolith).
  // trailingSlash: setiap route jadi folder/index.html sehingga resolusi
  // direktori express bekerja benar (mis. /locations/ ← out/locations/index.html).
  return {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
  };
}
