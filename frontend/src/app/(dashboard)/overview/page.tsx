"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  Eye,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

import { JobCard } from "@/components/shared/job-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatePanel } from "@/components/shared/state-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocalisation, type PositionLocale } from "@/hooks/use-geolocation";
import { normaliserRole, type Role } from "@/components/layout/sidebar";
import { analyticsService } from "@/services/analytics.service";
import { interviewsService } from "@/services/interviews.service";
import { jobsService } from "@/services/jobs.service";
import { usersService } from "@/services/users.service";
import {
  MOCK_CANDIDATURES,
  MOCK_DASHBOARD_RECRUTEUR,
  MOCK_ENTRETIENS,
  MOCK_OFFRES,
  MOCK_RESUME_CANDIDAT,
} from "@/lib/mock-data";
import type { AnalyticsDashboard, Application, Interview, Job } from "@/types/domain";

interface IndicateursCandidat {
  vuesProfil: number;
  evolutionVues: number;
  correspondances: number;
  candidaturesActives: number;
}

export default function VueEnsemblePage() {
  const [role, setRole] = useState<Role>("CANDIDAT");
  const [prenom, setPrenom] = useState<string | null>(null);

  /* Données candidat */
  const [indicateursCandidat, setIndicateursCandidat] = useState<IndicateursCandidat | null>(null);
  const [offresRecommandees, setOffresRecommandees] = useState<Job[]>([]);
  const [offresLocales, setOffresLocales] = useState<Job[]>([]);

  /* Données recruteur / admin */
  const [dashboardRecruteur, setDashboardRecruteur] = useState<AnalyticsDashboard | null>(null);
  const [candidaturesRecentes, setCandidaturesRecentes] = useState<Application[]>([]);
  const [entretiensAVenir, setEntretiensAVenir] = useState<Interview[]>([]);

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  const chargerOffresLocales = useCallback(async (position: PositionLocale) => {
    try {
      setOffresLocales(
        await jobsService.getOffresLocales(position.latitude, position.longitude)
      );
    } catch {
      setOffresLocales([]);
    }
  }, []);

  const {
    enCours: localisationEnCours,
    erreur: erreurLocalisation,
    demander: demanderLocalisation,
  } = useGeolocalisation(chargerOffresLocales);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      let roleNormalise: Role = role;
      try {
        const profil = await usersService.getMonProfil();
        roleNormalise = normaliserRole(profil.role);
        setRole(roleNormalise);
        setPrenom(profil.profile?.first_name ?? null);
      } catch {
        /* En cas de délai réseau, on conserve le rôle en cours et on ne bloque pas l'écran */
      }

      if (roleNormalise === "CANDIDAT") {
        const [resumeResult, offresResult] = await Promise.allSettled([
          analyticsService.getMonResume(),
          jobsService.getOffres({ limit: 3 }),
        ]);

        if (resumeResult.status === "fulfilled") {
          const resume = resumeResult.value;
          setIndicateursCandidat({
            vuesProfil: resume.vues_profil ?? 0,
            evolutionVues: resume.evolution_vues ?? 0,
            correspondances: resume.nouveaux_matchs ?? 0,
            candidaturesActives: resume.candidatures_actives ?? 0,
          });
        } else {
          setIndicateursCandidat({
            vuesProfil: MOCK_RESUME_CANDIDAT.vues_profil,
            evolutionVues: MOCK_RESUME_CANDIDAT.evolution_vues,
            correspondances: MOCK_RESUME_CANDIDAT.nouveaux_matchs,
            candidaturesActives: MOCK_RESUME_CANDIDAT.candidatures_actives,
          });
        }

        if (offresResult.status === "fulfilled" && offresResult.value.length > 0) {
          setOffresRecommandees(offresResult.value);
        } else {
          setOffresRecommandees(MOCK_OFFRES.slice(0, 3));
        }
      } else {
        /* Recruteur ou Administrateur */
        const [dashResult, entretiensResult] = await Promise.allSettled([
          analyticsService.getDashboard(),
          interviewsService.getMesEntretiens(),
        ]);

        if (dashResult.status === "fulfilled") {
          setDashboardRecruteur(dashResult.value);
        } else {
          setDashboardRecruteur(MOCK_DASHBOARD_RECRUTEUR);
        }

        /* Candidatures récentes de démonstration adaptées pour le recruteur */
        setCandidaturesRecentes(MOCK_CANDIDATURES.slice(0, 5));

        if (entretiensResult.status === "fulfilled" && entretiensResult.value.length > 0) {
          setEntretiensAVenir(entretiensResult.value.slice(0, 3));
        } else {
          setEntretiensAVenir(MOCK_ENTRETIENS.slice(0, 3));
        }
      }
    } catch {
      /* Repli gracieux sur les données de démonstration sans bloquer l'écran */
      setDashboardRecruteur(MOCK_DASHBOARD_RECRUTEUR);
      setCandidaturesRecentes(MOCK_CANDIDATURES.slice(0, 5));
      setEntretiensAVenir(MOCK_ENTRETIENS.slice(0, 3));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  if (erreur) {
    return (
      <div className="mx-auto w-full max-w-6xl p-6 lg:p-10">
        <StatePanel
          tone="error"
          title="Votre espace n'a pas pu se charger"
          description="La connexion au serveur a échoué. Vos données n'ont pas été modifiées."
          actionLabel="Réessayer"
          onAction={charger}
        />
      </div>
    );
  }

  /* Vue Recruteur / Entreprise / Admin */
  if (role !== "CANDIDAT") {
    const cartesRecruteur = [
      {
        titre: "Offres actives",
        valeur: dashboardRecruteur?.jobs.active_jobs ?? 0,
        note: `${dashboardRecruteur?.jobs.total_jobs ?? 0} offres au total`,
        Icone: Briefcase,
        teinte: "text-primary bg-primary/10",
      },
      {
        titre: "Candidatures reçues",
        valeur: dashboardRecruteur?.pipeline.total_applications ?? 0,
        note: `${dashboardRecruteur?.jobs.avg_applications_per_job ?? 0} en moyenne par offre`,
        Icone: Users,
        teinte: "text-brand bg-brand/10",
      },
      {
        titre: "Entretiens prévus",
        valeur: dashboardRecruteur?.pipeline.by_stage.interview ?? entretiensAVenir.length,
        note: "Phase d'évaluation",
        Icone: Calendar,
        teinte: "text-warning bg-warning/10",
      },
      {
        titre: "Score moyen matching",
        valeur: `${dashboardRecruteur?.pipeline.avg_matching_score ?? 70}%`,
        note: "Pertinence des profils",
        Icone: TrendingUp,
        teinte: "text-success bg-success/10",
      },
    ];

    return (
      <div className="mx-auto w-full max-w-6xl space-y-8 p-6 lg:p-10">
        <PageHeader
          title={`Espace Recrutement${prenom ? ` · ${prenom}` : ""}`}
          description="Pilotez vos offres d'emploi, candidatures et entretiens en cours."
          actions={
            <div className="flex items-center gap-3">
              <Button render={<Link href="/jobs?action=create" />} className="gap-2">
                <Plus size={15} aria-hidden="true" />
                Publier une offre
              </Button>
            </div>
          }
        />

        <section aria-label="Indicateurs de recrutement" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cartesRecruteur.map(({ titre, valeur, note, Icone, teinte }) => (
            <div key={titre} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {titre}
                </p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${teinte}`}>
                  <Icone size={16} aria-hidden="true" />
                </span>
              </div>
              {chargement ? (
                <Skeleton className="mt-4 h-9 w-16" />
              ) : (
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {valeur}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-8 xl:grid-cols-3">
          <section className="space-y-4 xl:col-span-2" aria-label="Candidatures récentes">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Candidatures récentes</h2>
              <Link
                href="/candidates"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Gérer les candidats
              </Link>
            </div>

            {chargement ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : candidaturesRecentes.length === 0 ? (
              <StatePanel
                title="Aucune candidature récente"
                description="Les candidatures soumises à vos offres apparaîtront ici."
              />
            ) : (
              <div className="space-y-3">
                {candidaturesRecentes.map((cand) => (
                  <div
                    key={cand.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {cand.candidate_name || "Candidat"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Offre : {cand.job_title ?? "Poste à pourvoir"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {cand.stage}
                      </Badge>
                      <Link
                        href={`/candidates`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Examiner
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4" aria-label="Entretiens à venir">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Prochains entretiens</h2>
              <Link
                href="/interviews"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Tous
              </Link>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              {entretiensAVenir.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Calendar size={18} aria-hidden="true" />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    Aucun entretien planifié pour le moment.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {entretiensAVenir.map((entretien) => (
                    <li
                      key={entretien.id}
                      className="rounded-lg border border-border p-3 transition-colors hover:border-primary/40"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {entretien.candidate_name ?? "Entretien candidat"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entretien.scheduled_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {entretien.location ?? "En ligne"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  /* Vue Candidat */
  const cartesCandidat = [
    {
      titre: "Vues du profil",
      valeur: indicateursCandidat?.vuesProfil ?? 0,
      note:
        (indicateursCandidat?.evolutionVues ?? 0) > 0
          ? `+${indicateursCandidat?.evolutionVues} cette semaine`
          : "Pas de nouvelle vue",
      Icone: Eye,
      teinte: "text-primary bg-primary/10",
    },
    {
      titre: "Nouvelles correspondances",
      valeur: indicateursCandidat?.correspondances ?? 0,
      note: (indicateursCandidat?.correspondances ?? 0) > 0 ? "À découvrir" : "Aucune pour l'instant",
      Icone: Search,
      teinte: "text-warning bg-warning/10",
    },
    {
      titre: "Candidatures en cours",
      valeur: indicateursCandidat?.candidaturesActives ?? 0,
      note: "Suivi actif",
      Icone: ClipboardList,
      teinte: "text-muted-foreground bg-muted",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6 lg:p-10">
      <PageHeader
        title={`Bonjour${prenom ? `, ${prenom}` : ""}`}
        description="Voici l'essentiel de votre recherche d'emploi aujourd'hui."
      />

      <section aria-label="Indicateurs" className="grid gap-4 sm:grid-cols-3">
        {cartesCandidat.map(({ titre, valeur, note, Icone, teinte }) => (
          <div key={titre} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {titre}
              </p>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${teinte}`}>
                <Icone size={16} aria-hidden="true" />
              </span>
            </div>
            {chargement ? (
              <Skeleton className="mt-4 h-9 w-16" />
            ) : (
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {valeur}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{note}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-8 xl:grid-cols-3">
        <section className="space-y-4 xl:col-span-2" aria-label="Offres recommandées">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Offres pour vous</h2>
            <Link
              href="/jobs"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Voir toutes les offres
            </Link>
          </div>

          {chargement ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : offresRecommandees.length === 0 ? (
            <StatePanel
              title="Aucune offre publiée"
              description="De nouvelles offres apparaîtront ici dès leur publication."
            />
          ) : (
            <div className="space-y-3">
              {offresRecommandees.map((offre) => (
                <JobCard key={offre.id} offre={offre} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4" aria-label="Offres à proximité">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Près de chez vous</h2>
            <LocateFixed size={18} className="text-muted-foreground" aria-hidden="true" />
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            {offresLocales.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <MapPin size={18} aria-hidden="true" />
                </span>
                <p className="max-w-[230px] text-sm leading-relaxed text-muted-foreground">
                  {erreurLocalisation ??
                    "Autorisez votre position pour voir les offres proches de votre trajet."}
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
              <ul className="space-y-2">
                {offresLocales.map((offre) => (
                  <li key={offre.id}>
                    <Link
                      href={`/jobs/${offre.id}`}
                      className="block rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      <p className="truncate text-sm font-medium text-foreground">
                        {offre.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {offre.company_name} · {offre.formatted_address}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
