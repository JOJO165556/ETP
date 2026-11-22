"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  Plug,
  ShieldCheck,
  SlidersHorizontal,
  User,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { notificationsService } from "@/services/notifications.service";
import type { NotificationResponse } from "@/types/domain";

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
        { libelle: "Entreprise", href: "/settings/general", icone: Building2 },
        { libelle: "Mon profil", href: "/settings", icone: User },
      ],
    },
  ],
  ADMIN: [
    {
      titre: "Administration",
      items: [
        { libelle: "Vue d'ensemble", href: "/overview", icone: LayoutDashboard },
        { libelle: "Indicateurs", href: "/analytics", icone: BarChart3 },
      ],
    },
    {
      titre: "Configuration",
      items: [
        {
          libelle: "Règles de présélection",
          href: "/settings/ai-config",
          icone: SlidersHorizontal,
        },
        { libelle: "Sécurité", href: "/settings/security", icone: ShieldCheck },
        { libelle: "Connexions", href: "/settings/integrations", icone: Plug },
        { libelle: "Entreprise", href: "/settings/general", icone: Building2 },
      ],
    },
    {
      titre: "Compte",
      items: [{ libelle: "Mon profil", href: "/settings", icone: User }],
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
  if (valeur.includes("ADMIN")) return "ADMIN";
  if (valeur.includes("RECRUIT")) return "RECRUITER";
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

function formaterDateNotification(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* Cloche de notifications : liste, marquage individuel et « tout marquer comme lu ». */
function NotificationsBell() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [nonLues, setNonLues] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [marquageGlobal, setMarquageGlobal] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await notificationsService.getMesNotifications();
      setNotifications(res.notifications);
      setNonLues(res.unread_count);
    } catch {
      // ignore
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    if (ouvert) void charger();
  }, [ouvert, charger]);

  useEffect(() => {
    if (!ouvert) return;
    const fermer = (event: MouseEvent) => {
      if (conteneur.current && !conteneur.current.contains(event.target as Node)) {
        setOuvert(false);
      }
    };
    const echap = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  const handleOuvrir = async (notification: NotificationResponse) => {
    if (!notification.is_read) {
      try {
        await notificationsService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
        setNonLues((prev) => Math.max(0, prev - 1));
      } catch {
        // ignore
      }
    }
    setOuvert(false);
    if (notification.link) router.push(notification.link);
  };

  const handleToutMarquer = async () => {
    setMarquageGlobal(true);
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setNonLues(0);
    } catch {
      // ignore
    } finally {
      setMarquageGlobal(false);
    }
  };

  return (
    <div className="relative" ref={conteneur}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label={
          nonLues > 0 ? `Notifications (${nonLues} non lues)` : "Notifications"
        }
        className="relative rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell size={16} aria-hidden="true" />
        {nonLues > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-border bg-popover shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold text-popover-foreground">Notifications</p>
            {nonLues > 0 && (
              <button
                type="button"
                onClick={() => void handleToutMarquer()}
                disabled={marquageGlobal}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                {marquageGlobal ? (
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCheck size={12} aria-hidden="true" />
                )}
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {chargement ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Chargement…
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Aucune notification.
              </p>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleOuvrir(notification)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-muted",
                        !notification.is_read && "bg-primary/5"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {!notification.is_read && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                            aria-hidden="true"
                          />
                        )}
                        <span className="truncate text-sm font-medium text-popover-foreground">
                          {notification.title}
                        </span>
                      </span>
                      <span className="line-clamp-2 pl-3.5 text-xs text-muted-foreground">
                        {notification.message}
                      </span>
                      <span className="pl-3.5 text-[10px] text-muted-foreground/70">
                        {formaterDateNotification(notification.created_at)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
        <NotificationsBell />
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
