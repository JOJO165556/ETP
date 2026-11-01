"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Eye, LocateFixed, MapPin, Pencil, Search } from "lucide-react";

import { JobCard } from "@/components/shared/job-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatePanel } from "@/components/shared/state-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocalisation, type PositionLocale } from "@/hooks/use-geolocation";
import { analyticsService } from "@/services/analytics.service";
import { jobsService } from "@/services/jobs.service";
import { usersService } from "@/services/users.service";
import type { Job } from "@/types/domain";

interface Indicateurs {
  vuesProfil: number;
  evolutionVues: number;
  correspondances: number;
  candidaturesActives: number;
}

export default function VueEnsemblePage() {
  const [prenom, setPrenom] = useState<string | null>(null);
  const [indicateurs, setIndicateurs] = useState<Indicateurs | null>(null);
  const [offres, setOffres] = useState<Job[]>([]);
  const [offresLocales, setOffresLocales] = useState<Job[]>([]);
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
      const [profil, resume, recommandations] = await Promise.all([
        usersService.getMonProfil(),
        analyticsService.getMonResume(),
        jobsService.getOffres({ limit: 3 }),
      ]);
      setPrenom(profil.profile?.first_name ?? null);
      setIndicateurs({
        vuesProfil: resume.vues_profil,
        evolutionVues: resume.evolution_vues,
        correspondances: resume.nouveaux_matchs,
        candidaturesActives: resume.candidatures_actives,
      });
      setOffres(recommandations);
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const cartes = [
    {
      titre: "Vues du profil",
      valeur: indicateurs?.vuesProfil ?? 0,
      note:
        (indicateurs?.evolutionVues ?? 0) > 0
          ? `+${indicateurs?.evolutionVues} cette semaine`
          : "Pas de nouvelle vue",
      Icone: Eye,
      teinte: "text-primary bg-primary/10",
    },
    {
      titre: "Nouvelles correspondances",
      valeur: indicateurs?.correspondances ?? 0,
      note: (indicateurs?.correspondances ?? 0) > 0 ? "À découvrir" : "Aucune pour l'instant",
      Icone: Search,
      teinte: "text-warning bg-warning/10",
    },
    {
      titre: "Candidatures en cours",
      valeur: indicateurs?.candidaturesActives ?? 0,
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
        actions={
          <Button variant="outline" render={<Link href="/settings" />} className="gap-2">
            <Pencil size={15} aria-hidden="true" />
            Mettre à jour mon profil
          </Button>
        }
      />

      {erreur ? (
        <StatePanel
          tone="error"
          title="Votre espace n'a pas pu se charger"
          description="La connexion au serveur a échoué. Vos données n'ont pas été modifiées."
          actionLabel="Réessayer"
          onAction={charger}
        />
      ) : (
        <>
          <section aria-label="Indicateurs" className="grid gap-4 sm:grid-cols-3">
            {cartes.map(({ titre, valeur, note, Icone, teinte }) => (
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
              ) : offres.length === 0 ? (
                <StatePanel
                  title="Aucune offre publiée"
                  description="De nouvelles offres apparaîtront ici dès leur publication."
                />
              ) : (
                <div className="space-y-3">
                  {offres.map((offre) => (
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
                            {offre.company_name} · {offre.location}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
