"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Shield, Puzzle, Sparkles, HelpCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ADMIN = [
  { libelle: "Général", href: "/settings/general", icone: Settings },
  { libelle: "Sécurité", href: "/settings/security", icone: Shield },
  { libelle: "Intégrations", href: "/settings/integrations", icone: Puzzle },
  { libelle: "Configuration IA", href: "/settings/ai-config", icone: Sparkles },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();

  return (
    <div className="bg-background text-foreground dark flex h-screen w-full overflow-hidden">
      {/* Sidebar Spécifique Admin */}
      <aside className="flex w-64 flex-col border-r border-white/5 bg-[#161b22] transition-all duration-300">
        <div className="flex h-20 items-center border-b border-white/5 px-6">
          <Link href="/overview" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600">
              <div className="h-4 w-4 rounded-full border-2 border-white bg-transparent" />
            </div>
            <div className="flex flex-col">
              <span className="text-base leading-tight font-bold text-white">
                Talent Platform
              </span>
              <span className="text-xs text-slate-400">Enterprise Admin</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {NAV_ADMIN.map((item) => {
            const actif = chemin === item.href;
            return (
              <Link
                key={item.libelle}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  actif
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icone
                  size={18}
                  className={cn(
                    "shrink-0",
                    actif ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                  )}
                  aria-hidden="true"
                />
                {item.libelle}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/5 p-4">
          <Link
            href="/help"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <HelpCircle size={18} className="text-slate-500" /> Aide
          </Link>
          <Link
            href="/logout"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} className="text-slate-500" /> Déconnexion
          </Link>
          <div className="mt-4 px-3">
            <button className="w-full rounded-lg bg-slate-800 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-700">
              Portail de Support
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-hidden bg-[#0d1117]">
        {/* Top Header Admin */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-8">
          <div className="flex w-full max-w-2xl items-center gap-6">
            <h2 className="shrink-0 text-sm font-bold text-white">
              Tableau de Bord Paramètres
            </h2>
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="Rechercher des paramètres..."
                className="w-full rounded border border-white/5 bg-[#161b22] px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-slate-800" />
          </div>
        </header>

        {/* Child Routes */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
