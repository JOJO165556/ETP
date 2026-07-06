"use client";

import {
  Eye,
  Zap,
  ClipboardList,
  Code,
  Compass,
  MapPin,
  Plus,
  Minus,
  Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* Données simulées pour les KPI */
const STATS = [
  {
    title: "VUES DU PROFIL",
    value: "12",
    subtext: "+3 cette semaine",
    icon: Eye,
    iconColor: "text-blue-500",
    bg: "bg-[#182138]",
  },
  {
    title: "NOUVEAUX MATCHS",
    value: "5",
    subtext: "Action requise",
    icon: Zap,
    iconColor: "text-orange-500",
    bg: "bg-[#182138]",
  },
  {
    title: "CANDIDATURES ACTIVES",
    value: "3",
    subtext: "En cours",
    icon: ClipboardList,
    iconColor: "text-gray-400",
    bg: "bg-[#182138]",
  },
];

/* Données simulées pour les offres recommandées */
const RECOMMENDED_JOBS = [
  {
    id: 1,
    role: "Ingénieur Frontend Senior",
    company: "TechCorp Inc.",
    location: "Paris, FR (Hybride)",
    match: "Match 98%",
    salary: "75k€ - 90k€",
    posted: "Publié il y a 2j",
    action: "Postuler",
    actionVariant: "primary",
    icon: Code,
  },
  {
    id: 2,
    role: "Architecte Logiciel",
    company: "Global Systems",
    location: "Remote",
    match: "Match 92%",
    salary: "85k€ - 110k€",
    posted: "Publié il y a 5j",
    action: "Examiner",
    actionVariant: "secondary",
    icon: Compass,
  },
];

/* Composant de la page d'accueil (Vue d'ensemble) du tableau de bord */
export default function OverviewPage() {
  return (
    <div className="space-y-10 p-8 lg:p-12">
      {/* En-tête de la page */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-primary text-sm font-medium">Bon retour parmi nous</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Bonjour, Thomas
          </h1>
        </div>
        <button className="bg-secondary/50 hover:bg-secondary flex items-center gap-2 rounded-md border border-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors">
          <Edit2 size={16} className="text-gray-400" />
          Mettre à jour le profil
        </button>
      </div>

      {/* Cartes de statistiques (KPI) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STATS.map((stat) => (
          <div
            key={stat.title}
            className={cn(
              "relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/5 p-6",
              stat.bg
            )}
          >
            {/* Icône décorative en arrière-plan */}
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <stat.icon size={48} className={stat.iconColor} />
            </div>

            <div className="relative z-10 space-y-4">
              <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                {stat.title}
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-white">{stat.value}</span>
                <span className="text-sm font-medium text-gray-500">{stat.subtext}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grille de contenu principal */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        {/* Liste des offres recommandées */}
        <div className="space-y-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Offres Recommandées</h2>
            <button className="text-primary text-sm font-medium hover:underline">
              Tout voir
            </button>
          </div>

          <div className="space-y-4">
            {RECOMMENDED_JOBS.map((job) => (
              <div
                key={job.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-white/5 bg-[#182138]/50 p-5 transition-colors hover:bg-[#182138] sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/5 text-gray-400">
                    <job.icon size={20} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-white">{job.role}</h3>
                    <p className="text-sm text-gray-400">
                      {job.company} &middot; {job.location}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="bg-primary/20 text-primary inline-flex items-center rounded px-2 py-0.5 text-xs font-medium">
                        {job.match}
                      </span>
                      <span className="inline-flex items-center rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-gray-300">
                        {job.salary}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex h-full flex-col justify-between gap-3 sm:items-end">
                  <p className="text-xs font-medium text-gray-500">{job.posted}</p>
                  <button
                    className={cn(
                      "rounded-md px-5 py-2 text-sm font-semibold transition-colors",
                      job.actionVariant === "primary"
                        ? "bg-primary text-white hover:bg-blue-600"
                        : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    {job.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emplacement carte des offres géolocalisées */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Offres près de chez vous</h2>
            <MapPin size={20} className="text-gray-400" />
          </div>

          <div className="relative h-[300px] w-full overflow-hidden rounded-xl border border-white/5 bg-[#0b1021]">
            {/* Motif de grille */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            {/* Points sur la carte */}
            <div className="bg-primary/20 absolute top-1/3 left-1/3 flex h-8 w-8 items-center justify-center rounded-full">
              <div className="bg-primary h-4 w-4 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
            </div>

            <div className="bg-primary/20 absolute top-1/2 right-1/3 flex h-6 w-6 items-center justify-center rounded-full">
              <div className="border-primary h-3 w-3 rounded-full border-2 bg-transparent" />
            </div>

            {/* Badge Localisation */}
            <div className="absolute top-4 left-4 flex items-center gap-2 rounded-md border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
              <div className="bg-primary h-2 w-2 rounded-full" />
              Région Parisienne
            </div>

            {/* Contrôles de zoom */}
            <div className="absolute right-4 bottom-4 flex flex-col overflow-hidden rounded-md border border-white/10 bg-black/50 backdrop-blur-md">
              <button className="border-b border-white/10 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
                <Plus size={16} />
              </button>
              <button className="p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
                <Minus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
