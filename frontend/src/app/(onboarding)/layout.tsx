import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Configuration du profil",
  description: "Importez votre CV et vérifiez les informations de votre profil.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/etp_logo.webp"
            alt="ETP"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-cover"
          />
          <span className="text-sm font-semibold tracking-tight text-foreground">ETP</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Lock size={12} aria-hidden="true" />
            Connexion sécurisée
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-10 sm:px-6 lg:py-14">
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
