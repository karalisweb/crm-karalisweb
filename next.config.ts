import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone per Docker
  output: "standalone",

  // Disabilita powered by header
  poweredByHeader: false,

  // Ottimizzazioni immagini
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
