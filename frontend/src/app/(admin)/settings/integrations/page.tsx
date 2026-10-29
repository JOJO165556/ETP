"use client";

import { MessageSquare, Users, Video, Calendar, Leaf, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type StatutIntegration = "connected" | "available" | "pending";

const INTEGRATIONS: {
  nom: string;
  description: string;
  icone: typeof MessageSquare;
  bgIcone: string;
  colorIcone: string;
  statut: string;
  type: StatutIntegration;
}[] = [
  {
    nom: "Slack",
    description:
      "Notifications d'entretien en temps réel et retours candidats directement dans vos canaux.",
    icone: MessageSquare,
    bgIcone: "bg-purple-500/15",
    colorIcone: "text-purple-600 dark:text-purple-400",
    statut: "Connecté",
    type: "connected",
  },
  {
    nom: "LinkedIn Recruiter",
    description:
      "Synchronisez les candidats depuis Recruiter directement dans votre pipeline ETP en un clic.",
    icone: Users,
    bgIcone: "bg-blue-500/15",
    colorIcone: "text-blue-600 dark:text-blue-400",
    statut: "Déconnecté",
    type: "available",
  },
  {
    nom: "Microsoft Teams",
    description:
      "Coordonnez les comités de recrutement et planifiez les entretiens vidéo via MS Teams.",
    icone: Video,
    bgIcone: "bg-indigo-500/15",
    colorIcone: "text-indigo-600 dark:text-indigo-400",
    statut: "Connecté",
    type: "connected",
  },
  {
    nom: "Google Calendar",
    description:
      "Planification automatique des entretiens et gestion des réservations de salles.",
    icone: Calendar,
    bgIcone: "bg-blue-400/15",
    colorIcone: "text-blue-500",
    statut: "Déconnecté",
    type: "available",
  },
  {
    nom: "Zoom",
    description:
      "Générez automatiquement des liens de réunion Zoom sécurisés pour chaque entretien.",
    icone: Video,
    bgIcone: "bg-blue-600/15",
    colorIcone: "text-blue-600 dark:text-blue-500",
    statut: "Déconnecté",
    type: "available",
  },
  {
    nom: "Greenhouse",
    description:
      "Importez les données de pipeline existantes et synchronisez les offres d'emploi actuelles.",
    icone: Leaf,
    bgIcone: "bg-emerald-500/15",
    colorIcone: "text-emerald-600 dark:text-emerald-400",
    statut: "En attente",
    type: "pending",
  },
];

const CATEGORIES = ["Collaboration", "Communication", "Sourcing", "Productivité"];

const CONFIG_STATUT: Record<StatutIntegration, { etiquettes: string; variante: "success" | "warning" } | null> = {
  connected: { etiquettes: "Connecté", variante: "success" },
  pending: { etiquettes: "En attente", variante: "warning" },
  available: null,
};

export default function IntegrationsPage() {
  return (
    <div className="p-8 lg:p-12">
      {/* En-tête */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketplace d'Intégrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Propulsez votre flux de recrutement avec des outils de pointe et une
            synchronisation fluide.
          </p>
        </div>
        <div className="flex gap-3">
          <span className="bg-muted text-foreground rounded px-3 py-1.5 text-xs font-bold tracking-wider">
            6 ACTIVES
          </span>
          <span className="text-muted-foreground border-border rounded border px-3 py-1.5 text-xs font-bold tracking-wider">
            24 TOTAL
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Sidebar Catégories */}
        <aside className="space-y-6">
          <div className="space-y-1">
            <h3 className="mb-3 px-3 text-sm font-bold text-foreground">Catégories</h3>
            <button className="bg-primary text-primary-foreground flex w-full justify-between rounded px-3 py-2 text-sm font-medium">
              Toutes les applications <span className="text-primary-foreground/70">24</span>
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full justify-between rounded px-3 py-2 text-sm font-medium"
              >
                {cat} <span>8</span>
              </button>
            ))}
          </div>

          <div className="border-border bg-card rounded-xl border p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              Alpha Exclusive
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Obtenez un accès anticipé à notre nouvelle intégration de parsing de CV par IA
              générative.
            </p>
            <button className="text-primary text-xs font-bold hover:underline">
              En savoir plus &rarr;
            </button>
          </div>
        </aside>

        {/* Grille Intégrations */}
        <div className="space-y-6 lg:col-span-3">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((app) => {
              const cfgStatut = CONFIG_STATUT[app.type];
              return (
              <div
                key={app.nom}
                className="hover:bg-muted/40 border-border bg-card flex flex-col justify-between rounded-xl border p-6 transition-colors"
              >
                <div>
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl",
                        app.bgIcone
                      )}
                    >
                      <app.icone size={24} className={app.colorIcone} aria-hidden="true" />
                    </div>
                    {cfgStatut && (
                      <Badge variant={cfgStatut.variante}>
                        {cfgStatut.etiquettes}
                      </Badge>
                    )}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-foreground">{app.nom}</h3>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{app.description}</p>
                </div>

                <div className="mt-6 flex gap-2">
                  {app.type === "connected" ? (
                    <>
                      <Button variant="outline" className="flex-1">Gérer</Button>
                      <Button variant="outline" size="icon" aria-label={`Paramètres ${app.nom}`}>
                        <Settings size={16} />
                      </Button>
                    </>
                  ) : app.type === "pending" ? (
                    <Button variant="outline" className="w-full">Reprendre la config.</Button>
                  ) : (
                    <Button className="w-full">Connecter</Button>
                  )}
                </div>
              </div>
              );
            })}
          </div>

          {/* Missing Integration Banner */}
          <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
            <div className="bg-muted text-muted-foreground mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Plus size={24} aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Une intégration manque à l'appel ?
            </h3>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
              Notre plateforme développeur vous permet de construire des intégrations
              personnalisées ou d'en demander de nouvelles.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Button variant="secondary">Demander un service</Button>
              <Button variant="outline">Docs API</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}