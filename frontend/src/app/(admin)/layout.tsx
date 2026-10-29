"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Shield, Puzzle, Sparkles, HelpCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ADMIN = [
  { libelle: "Général", href: "/settings/general", icone: Settings },
  { libelle: "Sécurité", href: "/settings/security", icone: Shield },
  { libelle: "Intégrations", href: "/settings/integrations", icone: Puzzle },
  { libelle: "Configuration IA", href: "/settings/ai-config", icone: Sparkles },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();

  return (
    <div className="bg-background text-foreground flex h-screen w-full overflow-hidden">
      {/* Sidebar Spécifique Admin */}
      <aside className="flex w-64 flex-col border-r border-border bg-card transition-all duration-300">
        <div className="flex h-20 items-center border-b border-border px-6">
          <Link href="/overview" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
              <div className="h-4 w-4 rounded-full border-2 border-primary-foreground bg-transparent" />
            </div>
            <div className="flex flex-col">
              <span className="text-base leading-tight font-bold text-foreground">
                Talent Platform
              </span>
              <span className="text-xs text-muted-foreground">Enterprise Admin</span>
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
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icone
                  size={18}
                  className={cn(
                    "shrink-0",
                    actif
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
                {item.libelle}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-border p-4">
          <Link
            href="/help"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HelpCircle size={18} className="text-muted-foreground" /> Aide
          </Link>
          <Link
            href="/logout"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut size={18} className="text-muted-foreground" /> Déconnexion
          </Link>
          <div className="mt-4 px-3">
            <Button variant="secondary" className="w-full">
              Portail de Support
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-hidden bg-background">
        {/* Top Header Admin */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-8">
          <div className="flex w-full max-w-2xl items-center gap-6">
            <h2 className="shrink-0 text-sm font-bold text-foreground">
              Tableau de Bord Paramètres
            </h2>
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="Rechercher des paramètres..."
                className="border-input bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring w-full rounded border px-3 py-1.5 text-sm text-foreground focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="bg-muted h-8 w-8 rounded-full" />
          </div>
        </header>

        {/* Child Routes */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}