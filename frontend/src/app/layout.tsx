import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/components/theme-provider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ETP — Enterprise Talent Platform",
    template: "%s | ETP",
  },
  description:
    "Plateforme de gestion des talents, offres d'emploi et candidatures pour les entreprises.",
  keywords: ["ATS", "recrutement", "RH", "talents", "emploi"],
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/etp_logo.webp", type: "image/webp" },
    ],
    apple: "/etp_logo.webp",
  },
  // Plateforme SaaS privée : pas d'indexation moteur de recherche
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={cn(plusJakartaSans.variable, inter.variable, jetbrainsMono.variable)} suppressHydrationWarning>
      <head>
        {/* Applique le thème avant le premier paint pour éviter tout flash. Clair par défaut. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-dvh flex-col antialiased" style={{fontFamily: 'var(--font-body)'}}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
