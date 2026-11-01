"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LocateFixed, MapPin, Search } from "lucide-react";

import { JobCard } from "@/components/shared/job-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatePanel } from "@/components/shared/state-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocalisation, type PositionLocale } from "@/hooks/use-geolocation";
import { jobsService } from "@/services/jobs.service";
import type { Job } from "@/types/domain";

type Tri = "correspondance" | "recent";

export default function OffresPage() {
  const [offres, setOffres] = useState<Job[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<Tri>("correspondance");
  const [offresLocales, setOffresLocales] = useState<Job[]>([]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      setOffres(await jobsService.getOffres());
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

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

  const resultats = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    let liste = offres;

    if (terme) {
      liste = liste.filter((offre) =>
        [offre.title, offre.company_name ?? "", offre.location ?? "", ...(offre.tags ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(terme)
      );
    }

    return [...liste].sort((a, b) =>
      tri === "correspondance"
        ? (b.match_score ?? 0) - (a.match_score ?? 0)
        : new Date(b.posted_at ?? 0).getTime() - new Date(a.posted_at ?? 0).getTime()
    );
  }, [offres, recherche, tri]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Offres d'emploi"
        description="Parcourez les postes ouverts et repérez ceux qui correspondent à votre profil."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Poste, compétence ou entreprise"
            aria-label="Rechercher une offre"
            className="w-full rounded-lg border border-border bg-card py-2.5 pr-3 pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="tri" className="text-sm text-muted-foreground">
            Trier par
          </label>
          <select
            id="tri"
            value={tri}
            onChange={(event) => setTri(event.target.value as Tri)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-ring"
          >
            <option value="correspondance">Correspondance</option>
            <option value="recent">Plus récentes</option>
          </select>
        </div>
      </div>

      {chargement ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : erreur ? (
        <StatePanel
          tone="error"
          title="Les offres n'ont pas pu se charger"
          description="La connexion au serveur a échoué. Réessayez dans un instant."
          actionLabel="Réessayer"
          onAction={charger}
        />
      ) : resultats.length === 0 ? (
        <StatePanel
          title="Aucune offre ne correspond"
          description="Élargissez votre recherche ou revenez plus tard : de nouvelles offres sont publiées régulièrement."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {resultats.length} offre{resultats.length > 1 ? "s" : ""} disponible
            {resultats.length > 1 ? "s" : ""}
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resultats.map((offre) => (
              <JobCard key={offre.id} offre={offre} />
            ))}
          </div>
        </>
      )}

      <section className="rounded-xl border border-border bg-card p-5" aria-label="Offres à proximité">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Près de chez vous</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {erreurLocalisation ??
                "Activez votre position pour voir les offres les plus proches de votre trajet."}
            </p>
          </div>
          {!erreurLocalisation && (
            <Button
              variant="outline"
              onClick={demanderLocalisation}
              disabled={localisationEnCours}
              className="gap-2"
            >
              <LocateFixed size={15} aria-hidden="true" />
              {localisationEnCours ? "Localisation..." : "Utiliser ma position"}
            </Button>
          )}
        </div>

        {offresLocales.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {offresLocales.map((offre) => (
              <li key={offre.id}>
                <Link
                  href={`/jobs/${offre.id}`}
                  className="flex items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <MapPin size={15} className="shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {offre.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {offre.company_name} · {offre.location}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
