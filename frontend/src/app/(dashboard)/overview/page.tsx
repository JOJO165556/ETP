"use client";

import { useEffect, useState } from "react";
import { Eye, Zap, ClipboardList, MapPin, Plus, Minus, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { jobsService } from "@/services/jobs.service";
import { applicationsService } from "@/services/applications.service";
import type { Job } from "@/types/domain";
import { JobCard } from "@/components/shared/job-card";
import Link from "next/link";

/* Composant de la page d'accueil (Vue d'ensemble) du tableau de bord */
export default function OverviewPage() {
  const [offresRecommandees, setOffresRecommandees] = useState<Job[]>([]);
  const [candidaturesActives, setCandidaturesActives] = useState(0);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function chargerDonnees() {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          jobsService.getOffres({ size: 3 }),
          applicationsService.getMesCandidatures(),
        ]);

        setOffresRecommandees(jobsRes.items);
        setCandidaturesActives(
          appsRes.items.filter((app) => app.statut !== "ARCHIVEE").length
        );
      } catch (erreur) {
        console.error("Erreur de chargement", erreur);
        // Fallback pour la démo
        setOffresRecommandees([
          {
            id: "1" as any,
            title: "Senior Geovisualization Engineer",
            company_name: "Carto Systems",
            company_id: "c1" as any,
            location: "Hybride (Paris, FR)",
            salary_range: "75k€ - 95k€",
            tags: ["React", "Mapbox", "WebGL"],
            match_score: 98,
            posted_at: "Il y a 1h",
            is_active: true,
          },
          {
            id: "2" as any,
            title: "Lead Frontend Engineer",
            company_name: "FinFlow",
            company_id: "c2" as any,
            location: "Remote (Europe)",
            salary_range: "80k€ - 110k€",
            tags: ["TypeScript", "Next.js"],
            match_score: 91,
            posted_at: "Il y a 12h",
            is_active: true,
          },
        ]);
        setCandidaturesActives(2);
      } finally {
        setChargement(false);
      }
    }
    chargerDonnees();
  }, []);

  const STATS = [
    {
      title: "VUES DU PROFIL",
      value: "45",
      subtext: "+12 cette semaine",
      icon: Eye,
      iconColor: "text-blue-500",
      bg: "bg-[#182138]",
    },
    {
      title: "NOUVEAUX MATCHS",
      value: "8",
      subtext: "Action requise",
      icon: Zap,
      iconColor: "text-orange-500",
      bg: "bg-[#182138]",
    },
    {
      title: "CANDIDATURES ACTIVES",
      value: candidaturesActives.toString(),
      subtext: "En cours",
      icon: ClipboardList,
      iconColor: "text-slate-400",
      bg: "bg-[#182138]",
    },
  ];

  return (
    <div className="space-y-10 p-8 lg:p-12">
      {/* En-tête de la page */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-400">Bon retour parmi nous</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Bonjour, Jane</h1>
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          <Edit2 size={16} className="text-slate-400" />
          Mettre à jour le profil
        </Link>
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
              <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                {stat.title}
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-white">{stat.value}</span>
                <span className="text-sm font-medium text-slate-500">{stat.subtext}</span>
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
            <Link
              href="/jobs"
              className="text-sm font-medium text-blue-400 hover:underline"
            >
              Voir tout le fil
            </Link>
          </div>

          <div className="space-y-4">
            {chargement ? (
              <div className="py-8 text-slate-500">Recherche de correspondances...</div>
            ) : (
              offresRecommandees.map((job) => <JobCard key={job.id} offre={job} />)
            )}
          </div>
        </div>

        {/* Emplacement carte des offres géolocalisées */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Opportunités locales</h2>
            <MapPin size={20} className="text-slate-400" />
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
            <div className="absolute top-1/3 left-1/3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
              <div className="h-4 w-4 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
            </div>

            <div className="absolute top-1/2 right-1/3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20">
              <div className="h-3 w-3 rounded-full border-2 border-blue-500 bg-transparent" />
            </div>

            {/* Badge Localisation */}
            <div className="absolute top-4 left-4 flex items-center gap-2 rounded-md border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              San Francisco, CA
            </div>

            {/* Contrôles de zoom */}
            <div className="absolute right-4 bottom-4 flex flex-col overflow-hidden rounded-md border border-white/10 bg-black/50 backdrop-blur-md">
              <button className="border-b border-white/10 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                <Plus size={16} />
              </button>
              <button className="p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                <Minus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
