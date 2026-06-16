import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone per Docker
  output: "standalone",

  // Disabilita powered by header
  poweredByHeader: false,

  // Ottimizzazioni immagini.
  // Allowlist esplicita degli host: niente "**", che trasformerebbe l'Image
  // Optimizer in un open-proxy (vettore SSRF/DoS). Aggiungere qui eventuali
  // nuovi host immagine al bisogno.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "*.gstatic.com" },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // HSTS: forza HTTPS per 2 anni (il sito è sempre dietro TLS sul proxy).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Disabilita API potenti non usate dall'app.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Content-Security-Policy: ultima linea di difesa contro XSS/clickjacking.
          // Baseline compatibile con Next (script/style inline ammessi); immagini,
          // font, iframe e media solo via HTTPS. object/base-uri/form-action blindati.
          // NB: irrigidire a nonce per gli script inline è un hardening futuro.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-src 'self' https:",
              "media-src 'self' https: blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
