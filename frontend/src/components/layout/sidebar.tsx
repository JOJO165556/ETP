"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  Settings,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* Configuration des liens de navigation principale */
const NAV_ITEMS = [
  { name: "Vue d'ensemble", href: "/overview", icon: LayoutDashboard },
  { name: "Offres", href: "/jobs", icon: Briefcase },
  { name: "Candidatures", href: "/applications", icon: FileText },
  { name: "Profil", href: "/profile", icon: User },
];

/* Configuration des liens du bas (paramètres, déconnexion) */
const BOTTOM_NAV_ITEMS = [
  { name: "Paramètres", href: "/settings", icon: Settings },
  { name: "Déconnexion", href: "/logout", icon: LogOut },
];

/* Composant de navigation latérale pour le Dashboard */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-border bg-sidebar text-sidebar-foreground flex w-64 flex-col border-r transition-all duration-300">
      {/* En-tête de la Sidebar */}
      <div className="border-sidebar-border flex h-16 items-center border-b px-6">
        <Link href="/overview" className="flex flex-col">
          <span className="text-lg font-bold tracking-tight text-white">ETP Core</span>
          <span className="text-sidebar-foreground/60 text-xs font-medium">
            Portail Candidat
          </span>
        </Link>
      </div>

      {/* Navigation Principale */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon
                size={18}
                className={cn(
                  "shrink-0",
                  isActive
                    ? "text-primary-foreground"
                    : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Navigation Inférieure */}
      <div className="border-sidebar-border space-y-1 border-t p-3">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="group text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors"
          >
            <item.icon
              size={18}
              className="text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground shrink-0"
              aria-hidden="true"
            />
            {item.name}
          </Link>
        ))}
      </div>
    </aside>
  );
}
