import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Onboarding Candidat | ETP",
  description: "Uploadez et analysez votre CV en toute sécurité.",
};

/* Layout principal pour le flux d'onboarding (Upload CV, Parsing, Validation) */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-foreground dark selection:bg-primary/30 flex min-h-screen flex-col bg-[#0f1423]">
      {/* En-tête de l'Onboarding */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-6 lg:px-10">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary flex h-6 w-6 items-center justify-center rounded-sm text-[10px] font-bold text-white">
              E
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              Enterprise Talent Platform
            </span>
          </Link>

          <div className="hidden h-5 w-px bg-white/10 sm:block" />

          <span className="hidden text-xs font-semibold tracking-widest text-gray-400 uppercase sm:block">
            Onboarding Candidat
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-wider text-gray-300 sm:flex">
            <ShieldCheck size={12} className="text-green-500" />
            SYS.SECURE
          </div>
          <button className="text-gray-400 transition-colors hover:text-white">
            <HelpCircle size={20} />
          </button>
        </div>
      </header>

      {/* Zone de contenu principal */}
      <main className="relative flex flex-1 flex-col items-center justify-center p-6 lg:p-10">
        {/* Lueur subtile en arrière-plan */}
        <div className="bg-primary/5 pointer-events-none absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />

        <div className="relative z-10 w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
