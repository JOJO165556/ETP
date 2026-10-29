import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // En développement sur le réseau local (accès via l'IP de la machine) et via
  // le tunnel HTTPS ngrok (test openid Facebook qui exige un contexte sécurisé)
  allowedDevOrigins: [
    "192.168.1.70",
    "43cd-2c0f-f0f8-690-4d00-9669-2b33-a20f-17e2.ngrok-free.app",
  ],

  // Proxy vers le backend FastAPI en développement pour éviter les CORS
  async rewrites() {
    let apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl || apiUrl === "undefined" || apiUrl === "null") {
      apiUrl = "http://localhost:8000";
    }
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
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
              "img-src 'self' data: blob: https://avatars.githubusercontent.com https://www.googleapis.com http://www.google.com",
              "connect-src 'self' http://localhost:8000 https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://firestore.googleapis.com https://securetoken.googleapis.com https://www.gstatic.com https://accounts.google.com https://oath.accounts.google.com",
            ].join("; "),
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },

};

export default nextConfig;
