"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  BarChart3,
  User,
  Settings,
  LogOut,
  HelpCircle,
  ChevronDown,
  Users,
  Building2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

/* Navigation par rôle */
interface NavSection {
  titre: string;
  items: Array<{
    libelle: string;
    href: string;
    icone: React.ComponentType<{ className?: string }>;
    roles?: string[];
  }>;
}

const NAVIGATION: Record<string, NavSection[]> = {
  CANDIDAT: [
    {
      titre: "Principal",
      items: [
        { libelle: "Tableau de bord", href: "/overview", icone: LayoutDashboard },
        { libelle: "Offres d'emploi", href: "/jobs", icone: Briefcase },
        { libelle: "Mes candidatures", href: "/applications", icone: ClipboardList },
      ],
    },
    {
      titre: "Profil",
      items: [
        { libelle: "Mon profil", href: "/settings", icone: User },
        { libelle: "Paramètres", href: "/settings", icone: Settings },
      ],
    },
  ],
  RECRUITER: [
    {
      titre: "Recrutement",
      items: [
        { libelle: "Tableau de bord", href: "/overview", icone: LayoutDashboard },
        { libelle: "Candidats", href: "/candidates", icone: Users },
        { libelle: "Offres d'emploi", href: "/jobs", icone: Briefcase },
        { libelle: "Entretiens", href: "/interviews", icone: ClipboardList },
      ],
    },
    {
      titre: "Analytics",
      items: [
        { libelle: "KPIs", href: "/analytics", icone: BarChart3 },
      ],
    },
    {
      titre: "Entreprise",
      items: [
        { libelle: "Paramètres", href: "/settings", icone: Settings },
      ],
    },
  ],
  ADMIN: [
    {
      titre: "Administration",
      items: [
        { libelle: "Tableau de bord", href: "/overview", icone: LayoutDashboard },
        { libelle: "Entreprises", href: "/companies", icone: Building2 },
        { libelle: "Utilisateurs", href: "/users", icone: Users },
        { libelle: "Analytics", href: "/analytics", icone: BarChart3 },
      ],
    },
    {
      titre: "Système",
      items: [
        { libelle: "Paramètres", href: "/settings", icone: Settings },
      ],
    },
  ],
};

const NAV_FOOTER = [
  { libelle: "Centre d'aide", href: "/help", icone: HelpCircle },
  { libelle: "Déconnexion", href: "/logout", icone: LogOut },
];

interface SidebarProps {
  role?: "CANDIDAT" | "RECRUITER" | "ADMIN";
  collapsed?: boolean;
  onToggle?: () => void;
}

/* Barre de navigation latérale avec navigation par rôle */
export function Sidebar({ role = "CANDIDAT", collapsed = false, onToggle }: SidebarProps) {
  const chemin = usePathname();
  const sections = NAVIGATION[role] || NAVIGATION.CANDIDAT;

  return (
    <aside
      className={cn(
        "border-border bg-sidebar text-sidebar-foreground flex flex-col border-r transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* En-tête : logo et nom de l'application */}
      <div className="border-sidebar-border flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <Image
            src="/etp_logo.webp"
            alt="ETP"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-cover"
          />
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                ETP
              </span>
              <span className="text-[10px] font-medium tracking-wider text-sidebar-foreground/50 uppercase">
                Enterprise Talent Platform
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onToggle}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            aria-label={collapsed ? "Déplier la sidebar" : "Replier la sidebar"}
          >
            <ChevronDown
              className={cn(
                "h-[18px] w-[18px] transition-transform duration-300",
                collapsed ? "-rotate-90" : "rotate-0"
              )}
            />
          </button>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.titre} className="space-y-1">
            {!collapsed && (
              <h3 className="px-3 text-[10px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase">
                {section.titre}
              </h3>
            )}
            {section.items.map((item) => {
              const actif = chemin === item.href || chemin.startsWith(item.href + "/");
              return (
                <Link
                  key={item.libelle}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    "hover:scale-[1.02] active:scale-[0.97]",
                    actif
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icone
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      actif
                        ? "text-primary-foreground"
                        : "text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground"
                    )}
                    aria-hidden="true"
                  />
                  {!collapsed && <span>{item.libelle}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Navigation footer */}
      <div className="border-sidebar-border space-y-1 border-t p-3">
        {NAV_FOOTER.map((item) => (
          <Link
            key={item.libelle}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
              "hover:scale-[1.02] active:scale-[0.97]",
              "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icone
              className="h-[18px] w-[18px] text-sidebar-foreground/40 group-hover:text-sidebar-accent-foreground shrink-0"
              aria-hidden="true"
            />
            {!collapsed && <span>{item.libelle}</span>}
          </Link>
        ))}
      </div>
    </aside>
  );
}
