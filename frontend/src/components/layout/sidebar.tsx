"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  User,
  Settings,
  LogOut,
  HelpCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* Liens de navigation principale */
const NAV_ITEMS = [
  { libelle: "Tableau de bord", href: "/overview", icone: LayoutDashboard },
  { libelle: "Offres d'emploi", href: "/jobs", icone: Briefcase },
  { libelle: "Mes candidatures", href: "/applications", icone: ClipboardList },
  { libelle: "Profil", href: "/settings", icone: User },
];

/* Liens de navigation secondaire (bas de sidebar) */
const NAV_BAS = [
  { libelle: "Centre d'aide", href: "/help", icone: HelpCircle },
  { libelle: "Paramètres", href: "/settings", icone: Settings },
  { libelle: "Déconnexion", href: "/logout", icone: LogOut },
];

/* Barre de navigation latérale du tableau de bord */
export function Sidebar() {
  const chemin = usePathname();

  return (
    <aside className="border-border bg-sidebar text-sidebar-foreground flex w-56 flex-col border-r">
      {/* En-tête : logo et nom de l'application */}
      <div className="border-sidebar-border flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
          TP
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-tight text-white">TalentPulse</span>
          <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
            Niveau Entreprise
          </span>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
        {NAV_ITEMS.map((item) => {
          const actif = chemin === item.href || chemin.startsWith(item.href + "/");
          return (
            <Link
              key={item.libelle}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                actif
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icone
                size={17}
                className={cn(
                  "shrink-0",
                  actif
                    ? "text-primary-foreground"
                    : "text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground"
                )}
                aria-hidden="true"
              />
              {item.libelle}
            </Link>
          );
        })}
      </nav>

      {/* Navigation secondaire */}
      <div className="border-sidebar-border space-y-0.5 border-t p-3">
        {NAV_BAS.map((item) => (
          <Link
            key={item.libelle}
            href={item.href}
            className="group text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            <item.icone
              size={17}
              className="text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground shrink-0"
              aria-hidden="true"
            />
            {item.libelle}
          </Link>
        ))}
      </div>
    </aside>
  );
}
