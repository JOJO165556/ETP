"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  Building2,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavItem {
  libelle: string;
  href: string;
  icone: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

interface NavSection {
  titre: string;
  items: NavItem[];
}

const NAVIGATION: Record<Role, NavSection[]> = {
  CANDIDAT: [
    {
      titre: "Espace candidat",
      items: [
        { libelle: "Vue d'ensemble", href: "/overview", icone: LayoutDashboard },
        { libelle: "Offres d'emploi", href: "/jobs", icone: Briefcase },
        { libelle: "Mes candidatures", href: "/applications", icone: ClipboardList },
        { libelle: "Mon profil", href: "/settings", icone: User },
      ],
    },
  ],
  RECRUITER: [
    {
      titre: "Recrutement",
      items: [
        { libelle: "Vue d'ensemble", href: "/overview", icone: LayoutDashboard },
        { libelle: "Candidats", href: "/candidates", icone: Users },
        { libelle: "Offres d'emploi", href: "/jobs", icone: Briefcase },
        { libelle: "Entretiens", href: "/interviews", icone: ClipboardList },
      ],
    },
    {
      titre: "Pilotage",
      items: [
        { libelle: "Indicateurs", href: "/analytics", icone: BarChart3 },
        { libelle: "Paramètres", href: "/settings", icone: Settings },
      ],
    },
  ],
  ADMIN: [
    {
      titre: "Administration",
      items: [
        { libelle: "Vue d'ensemble", href: "/overview", icone: LayoutDashboard },
        { libelle: "Entreprises", href: "/companies", icone: Building2 },
        { libelle: "Utilisateurs", href: "/users", icone: Users },
        { libelle: "Indicateurs", href: "/analytics", icone: BarChart3 },
        { libelle: "Paramètres", href: "/settings", icone: Settings },
      ],
    },
  ],
};

export function calculerInitiales(nomComplet?: string | null, email?: string | null): string {
  if (nomComplet && nomComplet.trim() && nomComplet !== email) {
    const parties = nomComplet.trim().split(/\s+/).filter(Boolean);
    if (parties.length >= 2) {
      return (parties[0][0] + parties[1][0]).toUpperCase();
    }
    return parties[0].slice(0, 2).toUpperCase();
  }
  if (email && email.includes("@")) {
    const partieLocale = email.split("@")[0];
    const sousParties = partieLocale.split(/[._-]+/).filter(Boolean);
    if (sousParties.length >= 2) {
      return (sousParties[0][0] + sousParties[1][0]).toUpperCase();
    }
    return partieLocale.slice(0, 2).toUpperCase();
  }
  return "U";
}

export type Role = "CANDIDAT" | "RECRUITER" | "ADMIN";

export function normaliserRole(role?: string | null): Role {
  const valeur = (role ?? "").toUpperCase();
  if (valeur.includes("RECRUIT") || valeur.includes("COMPANY")) return "RECRUITER";
  if (valeur.includes("ADMIN")) return "ADMIN";
  return "CANDIDAT";
}

const LIBELLE_ROLE: Record<Role, string> = {
  CANDIDAT: "Espace candidat",
  RECRUITER: "Espace recruteur",
  ADMIN: "Administration",
};

interface SidebarProps {
  role: Role;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
  nomComplet?: string | null;
  email?: string | null;
}

export function Sidebar({ role, collapsed, onToggle, onNavigate, mobile, nomComplet, email }: SidebarProps) {
  const chemin = usePathname();
  const sections = NAVIGATION[role];
  const initiales = calculerInitiales(nomComplet, email);

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground flex shrink-0 flex-col border-r border-sidebar-border transition-[width] duration-200",
        collapsed && !mobile ? "w-[76px]" : "w-[264px]",
        mobile && "h-full w-[280px]"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          collapsed && !mobile ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        <Link href="/overview" className="flex items-center gap-2.5" onClick={onNavigate}>
          <Image
            src="/etp_logo.webp"
            alt="ETP"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-cover"
          />
          {!(collapsed && !mobile) && (
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-foreground">ETP</span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {LIBELLE_ROLE[role]}
              </span>
            </span>
          )}
        </Link>

        {!(collapsed && !mobile) && (
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {!mobile && (
              <button
                type="button"
                onClick={onToggle}
                aria-label={collapsed ? "Déplier la navigation" : "Replier la navigation"}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                <ChevronDown
                  size={16}
                  className={cn("transition-transform duration-200", collapsed ? "-rotate-90" : "rotate-0")}
                />
              </button>
            )}
          </div>
        )}
      </div>

      {collapsed && !mobile && (
        <div className="flex justify-center border-b border-sidebar-border py-2">
          <button
            type="button"
            onClick={onToggle}
            aria-label="Déplier la navigation"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <ChevronDown size={16} className="-rotate-90" />
          </button>
        </div>
      )}

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.titre} className="space-y-1">
            {!(collapsed && !mobile) ? (
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {section.titre}
              </p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" aria-hidden="true" />
            )}
            {section.items.map((item) => {
              const actif = chemin === item.href || chemin.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={actif ? "page" : undefined}
                  title={collapsed && !mobile ? item.libelle : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors",
                    collapsed && !mobile ? "justify-center px-2" : "px-3",
                    actif
                      ? "bg-primary/8 text-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  )}
                >
                  {actif && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                    />
                  )}
                  <item.icone
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      actif ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                    aria-hidden={true}
                  />
                  {!(collapsed && !mobile) && <span>{item.libelle}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Pied de sidebar : Profil & Déconnexion en bas à gauche */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <Link
          href="/settings"
          onClick={onNavigate}
          title={collapsed && !mobile ? (nomComplet ?? email ?? "Mon profil") : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-sidebar-accent",
            collapsed && !mobile ? "justify-center" : "justify-start"
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initiales}
          </span>
          {!(collapsed && !mobile) && (
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-semibold text-foreground">
                {nomComplet && nomComplet !== email ? nomComplet : LIBELLE_ROLE[role]}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {email ?? LIBELLE_ROLE[role]}
              </p>
            </div>
          )}
        </Link>

        <Link
          href="/api/auth/logout"
          onClick={onNavigate}
          title={collapsed && !mobile ? "Se déconnecter" : undefined}
          className={cn(
            "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            collapsed && !mobile ? "justify-center" : "justify-start"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!(collapsed && !mobile) && <span>Se déconnecter</span>}
        </Link>
      </div>
    </aside>
  );
}

interface TopBarProps {
  title: string;
  onOpenMenu: () => void;
  nomComplet?: string | null;
  email?: string | null;
  role: Role;
}

export function TopBar({ title, onOpenMenu, nomComplet, email, role }: TopBarProps) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOuvert) return;
    const fermer = (event: MouseEvent) => {
      if (conteneur.current && !conteneur.current.contains(event.target as Node)) {
        setMenuOuvert(false);
      }
    };
    const echap = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOuvert(false);
    };
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("keydown", echap);
    };
  }, [menuOuvert]);

  const initiales = calculerInitiales(nomComplet, email);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Ouvrir la navigation"
          className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <span className="block h-0.5 w-4 rounded bg-current" />
          <span className="mt-1 block h-0.5 w-4 rounded bg-current" />
          <span className="mt-1 block h-0.5 w-4 rounded bg-current" />
        </button>
        <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
        <div className="relative" ref={conteneur}>
          <button
            type="button"
            onClick={() => setMenuOuvert((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOuvert}
            className="flex items-center gap-2 rounded-full border border-border py-1 pr-2 pl-1 transition-colors hover:bg-muted"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
              {initiales || "?"}
            </span>
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-foreground sm:block">
              {nomComplet ?? email ?? "Mon compte"}
            </span>
            <ChevronDown size={14} className="text-muted-foreground" aria-hidden="true" />
          </button>

          {menuOuvert && (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-60 rounded-lg border border-border bg-popover p-1.5 shadow-lg"
            >
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-semibold text-popover-foreground">
                  {nomComplet && nomComplet !== email ? nomComplet : LIBELLE_ROLE[role]}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {email ?? LIBELLE_ROLE[role]}
                </p>
              </div>
              <div className="my-1 h-px bg-border" aria-hidden="true" />
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setMenuOuvert(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-popover-foreground transition-colors hover:bg-muted"
              >
                <User size={15} aria-hidden="true" />
                Mon profil
              </Link>
              <Link
                href="/api/auth/logout"
                role="menuitem"
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-popover-foreground transition-colors hover:bg-muted"
              >
                <LogOut size={15} aria-hidden="true" />
                Se déconnecter
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileDrawer({
  open,
  onClose,
  role,
  nomComplet,
  email,
}: {
  open: boolean;
  onClose: () => void;
  role: Role;
  nomComplet?: string | null;
  email?: string | null;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Fermer la navigation"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40"
      />
      <div className="relative h-full w-[280px] bg-sidebar shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la navigation"
          className="absolute top-4 right-3 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <X size={18} />
        </button>
        <Sidebar
          role={role}
          collapsed={false}
          onToggle={() => {}}
          onNavigate={onClose}
          mobile
          nomComplet={nomComplet}
          email={email}
        />
      </div>
    </div>
  );
}
