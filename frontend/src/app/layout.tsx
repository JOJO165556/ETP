import type { Metadata, Viewport } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "ETP — Enterprise Talent Platform",
    template: "%s | ETP",
  },
  description:
    "Plateforme de gestion des talents, offres d'emploi et candidatures pour les entreprises.",
  keywords: ["ATS", "recrutement", "RH", "talents", "emploi"],
  // Plateforme SaaS privée : pas d'indexation moteur de recherche
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
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
    <html lang="fr" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
