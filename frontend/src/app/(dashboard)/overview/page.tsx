"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Zap,
  ClipboardList,
  MapPin,
  LocateFixed,
  Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { jobsService } from "@/services/jobs.service";
import { analyticsService } from "@/services/analytics.service";
import { usersService } from "@/services/users.service";
import { JobCard } from "@/components/shared/job-card";
import { Button } from "@/components/ui/button";
import {
  useGeolocalisation,
  type PositionLocale,
} from "@/hooks/use-geolocation";
import type { Job } from "@/types/domain";

/* Page d'accueil (vue d'ensemble) du tableau de bord — données réelles du backend */
export default function OverviewPage() {
  const [prenom, setPrenom] = useState<string | null>(null);
  const [offresRecommandees, setOffresRecommandees] = useState<Job[]>([]);
  const [offresLocales, setOffresLocales] = useState<Job[]>([]);
  const [vuesProfil, setVuesProfil] = useState(0);
  const [evolutionVues, setEvolutionVues] = useState(0);
  const [nouveauxMatchs, setNouveauxMatchs] = useState(0);
  const [candidaturesActives, setCandidaturesActives] = useState(0);
  const [chargement, setChargement] = useState(true);

  const chargerOffresLocales = useCallback(async (position: PositionLocale) => {
    try {
      const offres = await jobsService.getOffresLocales(
        position.latitude,
        position.longitude
      );
      setOffresLocales(offres);
    } catch (erreur) {
      console.error("Erreur de chargement des offres locales", erreur);
      setOffresLocales([]);
    }
  }, []);

  const {
    enCours: localisationEnCours,
    erreur: erreurLocalisation,
    demander: demanderLocalisation,
  } = useGeolocalisation(chargerOffresLocales);

  useEffect(() => {
    async function chargerDonnees() {
      try {
        const [profil, resume, offres] = await Promise.all([
          usersService.getMonProfil(),
          analyticsService.getMonResume(),
          jobsService.getOffres({ limit: 3 }),
        ]);
        setPrenom(profil.profile?.first_name ?? null);
        setVuesProfil(resume.vues_profil);
        setEvolutionVues(resume.evolution_vues);
        setNouveauxMatchs(resume.nouveaux_matchs);
        setCandidaturesActives(resume.candidatures_actives);
        setOffresRecommandees(offres);
      } catch (erreur) {
        console.error("Erreur de chargement", erreur);
      } finally {
        setChargement(false);
      }
    }
    chargerDonnees();
  }, []);

  const STATS = [
    {
      title: "VUES DU PROFIL",
      value: vuesProfil,
      subtext:
        vuesProfil > 0 ? `+${evolutionVues} cette semaine` : "Aucune vue",
      icon: Eye,
      iconColor: "text-primary",
      bg: "bg-card",
    },
    {
      title: "NOUVEAUX MATCHS",
      value: nouveauxMatchs,
      subtext: nouveauxMatchs > 0 ? "Action requise" : "Aucun",
      icon: Zap,
      iconColor: "text-warning",
      bg: "bg-card",
    },
    {
      title: "CANDIDATURES ACTIVES",
      value: candidaturesActives,
      subtext: "En cours",
      icon: ClipboardList,
      iconColor: "text-muted-foreground",
      bg: "bg-card",
    },
  ];

  return (
    <div className="space-y-10 p-8 lg:p-12">
      {/* En-tête de la page */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--color-primary)]">Bon retour parmi nous</p>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            Bonjour, {prenom ?? "candidat"}
          </h1>
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition-colors duration-150 hover:bg-[var(--surface-popover)] active:scale-[0.98] @media/hover:hover:bg-[var(--surface-popover)]"
        >
          <Edit2 size={16} className="text-[var(--color-muted-foreground)]" />
          Mettre à jour le profil
        </Link>
      </div>

      {/* Cartes de statistiques (KPI) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STATS.map((stat) => (
          <div
            key={stat.title}
            className={cn(
              "relative flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--border-subtle)] p-6 bg-[var(--surface-card)] transition-shadow duration-200 hover:shadow-md",
              stat.bg
            )}
          >
            {/* Icône décorative en arrière-plan */}
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <stat.icon size={48} className={stat.iconColor} />
            </div>

            <div className="relative z-10 space-y-4">
              <p className="text-xs font-semibold tracking-wider text-[var(--color-muted-foreground)] uppercase">
                {stat.title}
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-[var(--color-foreground)]">{stat.value}</span>
                <span className="text-sm font-medium text-[var(--color-muted-foreground)]">
                  {stat.subtext}
                </span>
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
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Offres Recommandées</h2>
            <Link
              href="/jobs"
              className="text-sm font-medium text-[var(--color-primary)] hover:underline transition-colors duration-150"
            >
              Voir tout le fil
            </Link>
          </div>

          <div className="space-y-4">
            {chargement ? (
              <div className="py-8 text-[var(--color-muted-foreground)]">Recherche de correspondances...</div>
            ) : offresRecommandees.length === 0 ? (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
                Aucune offre publiée pour le moment.
              </div>
            ) : (
              offresRecommandees.map((job) => <JobCard key={job.id} offre={job} />)
            )}
          </div>
        </div>

        {/* Opportunités locales géolocalisées */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">Opportunités locales</h2>
            <MapPin size={20} className="text-[var(--color-muted-foreground)]" />
          </div>

          <div className="relative h-[300px] w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-canvas)]">
            {/* Motif de grille décoratif */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            <div className="relative z-10 flex h-full flex-col p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-popover)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] backdrop-blur-md">
                  <div className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                  Offres autour de chez vous
                </span>
                <LocateFixed size={18} className="text-[var(--color-muted-foreground)]" />
              </div>

              {offresLocales.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                  <MapPin size={40} className="opacity-40" />
                  <p className="max-w-[220px] text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                    {erreurLocalisation ??
                      "Autorisez la localisation pour voir les offres à proximité."}
                  </p>
                  {!erreurLocalisation && (
                    <Button
                      onClick={demanderLocalisation}
                      disabled={localisationEnCours}
                      variant="outline"
                      size="sm"
                    >
                      {localisationEnCours ? "Localisation..." : "Activer la localisation"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {offresLocales.map((offre) => (
                    <Link
                      key={offre.id}
                      href={`/jobs/${offre.id}`}
                      className="block rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 transition-colors duration-150 hover:border-[var(--color-primary)]/40 active:scale-[0.98] @media/hover:hover:border-[var(--color-primary)]/40"
                    >
                      <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                        {offre.title}
                      </p>
                      <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                        {offre.company_name} • {offre.location}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}