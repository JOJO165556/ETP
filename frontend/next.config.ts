import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // En développement sur le réseau local (accès via l'IP de la machine) et via
  // le tunnel HTTPS ngrok (test openid Facebook qui exige un contexte sécurisé)
  allowedDevOrigins: [
    "192.168.1.70",
    "43cd-2c0f-f0f8-690-4d00-9669-2b33-a20f-17e2.ngrok-free.app",
  ],

  // Proxy vers le backend FastAPI
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    // Si l'URL n'est pas définie ou pointe sur localhost hors mode développement,
    // on ne configure aucun rewrite pour éviter ROUTER_EXTERNAL_TARGET_ERROR sur Vercel.
    const isDev = process.env.NODE_ENV === "development";
    if (!apiUrl || apiUrl === "undefined" || apiUrl === "null" || apiUrl.includes("localhost")) {
      if (isDev) {
        return [
          {
            source: "/api/v1/:path*",
            destination: "http://localhost:8000/api/v1/:path*",
          },
        ];
      }
      return [];
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },

  // En-têtes de sécurité appliqués sur toutes les routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://accounts.google.com https://apis.google.com https://fonts.googleapis.com https://www.googleadservices.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://avatars.githubusercontent.com https://www.googleapis.com http://www.google.com https://lh3.googleusercontent.com https://*.googleusercontent.com https://*.facebook.com https://*.fbsbx.com",
              // Firebase Auth iframe (popup + redirect) — doit être autorisé explicitement
              "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://www.google.com https://www.facebook.com https://web.facebook.com https://*.facebook.com",
              "connect-src 'self' http://localhost:8000 https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://firestore.googleapis.com https://www.gstatic.com https://accounts.google.com https://oauth2.googleapis.com https://apis.google.com https://*.facebook.com https://graph.facebook.com",
            ].join("; "),
          },
        ],
      },
      {
        // Firebase signInWithPopup nécessite que la page parente puisse
        // communiquer avec la popup Google / Facebook via window.closed / postMessage.
        // COOP: same-origin isole le contexte et casse ce canal.
        // On désactive COOP uniquement sur les pages d'authentification.
        source: "/:path(login|register|forgot-password|reset-password)/:subpath*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
        ],
      },
      {
        source: "/:path(login|register|forgot-password|reset-password)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
        ],
      },
    ];
  },

  compress: true,
  poweredByHeader: false,

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 604800, // 7 jours de cache sur Vercel Edge Cache
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
