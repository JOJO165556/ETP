"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { MobileDrawer, Sidebar, TopBar, normaliserRole, type Role } from "@/components/layout/sidebar";
import { usersService } from "@/services/users.service";

const TITRES: Array<{ motif: RegExp; titre: string }> = [
  { motif: /^\/overview/, titre: "Vue d'ensemble" },
  { motif: /^\/jobs\/[^/]+/, titre: "Détail de l'offre" },
  { motif: /^\/jobs/, titre: "Offres d'emploi" },
  { motif: /^\/applications/, titre: "Mes candidatures" },
  { motif: /^\/candidates/, titre: "Candidats" },
  { motif: /^\/interviews/, titre: "Entretiens" },
  { motif: /^\/analytics/, titre: "Indicateurs" },
  { motif: /^\/settings/, titre: "Paramètres" },
  { motif: /^\/companies/, titre: "Entreprises" },
  { motif: /^\/users/, titre: "Utilisateurs" },
];

function titreDepuisChemin(chemin: string): string {
  return TITRES.find((entree) => entree.motif.test(chemin))?.titre ?? "ETP";
}

/*
 * Coquille applicative : navigation persistante, barre supérieure et zone de
 * contenu. Le rôle et l'identité sont lus une seule fois, puis partagés par la
 * navigation et le menu du compte.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOuvert, setDrawerOuvert] = useState(false);
  const [role, setRole] = useState<Role>("CANDIDAT");
  const [nomComplet, setNomComplet] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    usersService
      .getMonProfil()
      .then((profil) => {
        if (!actif) return;
        setRole(normaliserRole(profil.role));
        setEmail(profil.email ?? null);
        const prenom = profil.profile?.first_name ?? "";
        const nom = profil.profile?.last_name ?? "";
        const complet = `${prenom} ${nom}`.trim();
        setNomComplet(complet || profil.email || null);
      })
      .catch(() => {
        /* Session absente : le middleware gère la redirection. */
      });
    return () => {
      actif = false;
    };
  }, []);

  useEffect(() => {
    setDrawerOuvert(false);
  }, [chemin]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <div className="hidden lg:flex">
        <Sidebar role={role} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      </div>
      <MobileDrawer open={drawerOuvert} onClose={() => setDrawerOuvert(false)} role={role} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={titreDepuisChemin(chemin)}
          onOpenMenu={() => setDrawerOuvert(true)}
          nomComplet={nomComplet}
          email={email}
          role={role}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
