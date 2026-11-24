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
import { usersService } from "@/services/users.service";
import { JobsManager } from "@/components/recruiter/jobs-manager";
import { normaliserRecherche } from "@/lib/utils";
import { MOCK_OFFRES } from "@/lib/mock-data";
import type { Job } from "@/types/domain";

export default function OffresPage() {
  const [offres, setOffres] = useState<Job[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [offresLocales, setOffresLocales] = useState<Job[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [profilCharge, setProfilCharge] = useState(false);

  useEffect(() => {
    usersService
      .getMonProfil()
      .then((profil) => {
        setRole(profil.role);
        setCompanyId(profil.company_id ?? null);
      })
      .catch(() => setRole("candidate"))
      .finally(() => setProfilCharge(true));
  }, []);

  const estRecruteur =
    (role?.toLowerCase() === "recruiter" || role?.toLowerCase() === "company_admin") &&
    companyId !== null;

  const charger = useCallback(async () => {
    if (!profilCharge || estRecruteur) {
      setChargement(false);
      return;
    }
    setChargement(true);
    setErreur(false);
    try {
      const data = await jobsService.getOffres();
      setOffres(data.length > 0 ? data : MOCK_OFFRES);
    } catch {
      setOffres(MOCK_OFFRES);
    } finally {
      setChargement(false);
    }
  }, [profilCharge, estRecruteur]);

  useEffect(() => {
    charger();
  }, [charger]);

  const chargerOffresLocales = useCallback(async (position: PositionLocale) => {
    try {
      const data = await jobsService.getOffresLocales(position.latitude, position.longitude);
      setOffresLocales(data.length > 0 ? data : MOCK_OFFRES.slice(0, 2));
    } catch {
      setOffresLocales(MOCK_OFFRES.slice(0, 2));
    }
  }, []);

  const {
    enCours: localisationEnCours,
    erreur: erreurLocalisation,
    demander: demanderLocalisation,
  } = useGeolocalisation(chargerOffresLocales);

  const resultats = useMemo(() => {
    const terme = normaliserRecherche(recherche);
    const liste = terme
      ? offres.filter((offre) =>
          normaliserRecherche(
            [
              offre.title,
              offre.company_name ?? "",
              offre.formatted_address ?? "",
              ...(offre.required_skills ?? []),
            ].join(" ")
          ).includes(terme)
        )
      : offres;

    return [...liste].sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    );
  }, [offres, recherche]);

  if (!profilCharge) {
    return (
      <div className="space-y-4 p-6 lg:p-10">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (estRecruteur && companyId) {
    return <JobsManager companyId={companyId} />;
  }

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
                      {offre.company_name} · {offre.formatted_address}
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
