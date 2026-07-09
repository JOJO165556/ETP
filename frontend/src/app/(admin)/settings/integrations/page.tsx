"use client";

import { MessageSquare, Users, Video, Calendar, Leaf, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const INTEGRATIONS = [
  {
    nom: "Slack",
    description:
      "Notifications d'entretien en temps réel et retours candidats directement dans vos canaux.",
    icone: MessageSquare,
    bgIcone: "bg-purple-500/20",
    colorIcone: "text-purple-400",
    statut: "Connecté",
    type: "connected",
  },
  {
    nom: "LinkedIn Recruiter",
    description:
      "Synchronisez les candidats depuis Recruiter directement dans votre pipeline ETP en un clic.",
    icone: Users,
    bgIcone: "bg-blue-500/20",
    colorIcone: "text-blue-400",
    statut: "Déconnecté",
    type: "available",
  },
  {
    nom: "Microsoft Teams",
    description:
      "Coordonnez les comités de recrutement et planifiez les entretiens vidéo via MS Teams.",
    icone: Users, // Simplification pour Teams
    bgIcone: "bg-indigo-500/20",
    colorIcone: "text-indigo-400",
    statut: "Connecté",
    type: "connected",
  },
  {
    nom: "Google Calendar",
    description:
      "Planification automatique des entretiens et gestion des réservations de salles.",
    icone: Calendar,
    bgIcone: "bg-blue-400/20",
    colorIcone: "text-blue-300",
    statut: "Déconnecté",
    type: "available",
  },
  {
    nom: "Zoom",
    description:
      "Générez automatiquement des liens de réunion Zoom sécurisés pour chaque entretien.",
    icone: Video,
    bgIcone: "bg-blue-600/20",
    colorIcone: "text-blue-500",
    statut: "Déconnecté",
    type: "available",
  },
  {
    nom: "Greenhouse",
    description:
      "Importez les données de pipeline existantes et synchronisez les offres d'emploi actuelles.",
    icone: Leaf,
    bgIcone: "bg-emerald-500/20",
    colorIcone: "text-emerald-400",
    statut: "En attente",
    type: "pending",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="p-8 lg:p-12">
      {/* En-tête */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace d'Intégrations</h1>
          <p className="mt-1 text-sm text-slate-400">
            Propulsez votre flux de recrutement avec des outils de pointe et une
            synchronisation fluide.
          </p>
        </div>
        <div className="flex gap-3">
          <span className="rounded bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wider text-white">
            6 ACTIVES
          </span>
          <span className="rounded border border-white/10 px-3 py-1.5 text-xs font-bold tracking-wider text-slate-400">
            24 TOTAL
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Sidebar Catégories */}
        <aside className="space-y-6">
          <div className="space-y-1">
            <h3 className="mb-3 px-3 text-sm font-bold text-white">Catégories</h3>
            <button className="flex w-full justify-between rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white">
              Toutes les applications <span className="text-blue-200">24</span>
            </button>
            <button className="flex w-full justify-between rounded px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">
              Collaboration <span>8</span>
            </button>
            <button className="flex w-full justify-between rounded px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">
              Communication <span>5</span>
            </button>
            <button className="flex w-full justify-between rounded px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">
              Sourcing <span>4</span>
            </button>
            <button className="flex w-full justify-between rounded px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">
              Productivité <span>7</span>
            </button>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#161b22] p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              Alpha Exclusive
            </div>
            <p className="mb-4 text-xs text-slate-400">
              Obtenez un accès anticipé à notre nouvelle intégration de parsing de CV par
              IA générative.
            </p>
            <button className="text-xs font-bold text-blue-400 hover:underline">
              En savoir plus &rarr;
            </button>
          </div>
        </aside>

        {/* Grille Intégrations */}
        <div className="space-y-6 lg:col-span-3">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((app) => (
              <div
                key={app.nom}
                className="flex flex-col justify-between rounded-xl border border-white/5 bg-[#161b22] p-6 transition-colors hover:bg-[#1c222b]"
              >
                <div>
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl",
                        app.bgIcone
                      )}
                    >
                      <app.icone size={24} className={app.colorIcone} />
                    </div>
                    {app.type === "connected" && (
                      <span className="rounded bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 uppercase">
                        Connecté
                      </span>
                    )}
                    {app.type === "pending" && (
                      <span className="rounded bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-400 uppercase">
                        En attente
                      </span>
                    )}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-white">{app.nom}</h3>
                  <p className="line-clamp-3 text-sm text-slate-400">{app.description}</p>
                </div>

                <div className="mt-6 flex gap-2">
                  {app.type === "connected" ? (
                    <>
                      <button className="flex-1 rounded border border-white/10 bg-[#0d1117] py-2 text-sm font-bold text-slate-300 hover:bg-white/5">
                        Gérer
                      </button>
                      <button className="rounded border border-white/10 bg-[#0d1117] p-2 text-slate-400 hover:bg-white/5 hover:text-white">
                        <Settings size={20} />
                      </button>
                    </>
                  ) : app.type === "pending" ? (
                    <button className="w-full rounded border border-white/10 bg-[#0d1117] py-2 text-sm font-bold text-slate-300 hover:bg-white/5">
                      Reprendre la config.
                    </button>
                  ) : (
                    <button className="w-full rounded bg-blue-600 py-2 text-sm font-bold text-white hover:bg-blue-500">
                      Connecter
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Missing Integration Banner */}
          <div className="mt-8 rounded-xl border border-dashed border-white/20 bg-transparent p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-slate-400">
              <PlusIcon />
            </div>
            <h3 className="text-lg font-bold text-white">
              Une intégration manque à l'appel ?
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Notre plateforme développeur vous permet de construire des intégrations
              personnalisées ou d'en demander de nouvelles.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <button className="rounded bg-slate-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-600">
                Demander un service
              </button>
              <button className="rounded border border-white/10 bg-transparent px-5 py-2.5 text-sm font-bold text-slate-300 hover:bg-white/5">
                Docs API
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
