"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { JobCard } from "@/components/shared/job-card";
import { jobsService } from "@/services/jobs.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useGeolocalisation,
  type PositionLocale,
} from "@/hooks/use-geolocation";
import type { Job } from "@/types/domain";
import {
  Search,
  Map as MapIcon,
  List,
  MapPin,
  LocateFixed,
} from "lucide-react";

type Tri = "correspondance" | "recent";

/* Page du fil d'offres d'emploi (Job Feed) — données réelles */
export default function OffresPage() {
  const [offres, setOffres] = useState<Job[]>([]);
  const [chargement, setChargement] = useState(true);
  const [vue, setVue] = useState<"liste" | "carte">("liste");
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<Tri>("correspondance");
  const [offresLocales, setOffresLocales] = useState<Job[]>([]);

  const chargerOffresLocales = async (position: PositionLocale) => {
    try {
      const list = await jobsService.getOffresLocales(
        position.latitude,
        position.longitude
      );
      setOffresLocales(list);
    } catch (erreur) {
      console.error("Erreur de chargement des offres locales", erreur);
      setOffresLocales([]);
    }
  };
  const {
    enCours: localisationEnCours,
    erreur: erreurLocalisation,
    demander: demanderLocalisation,
  } = useGeolocalisation(chargerOffresLocales);

  useEffect(() => {
    let vivant = true;
    jobsService
      .getOffres()
      .then((data) => vivant && setOffres(data))
      .catch((erreur) => console.error("Erreur de chargement des offres", erreur))
      .finally(() => vivant && setChargement(false));
    return () => {
      vivant = false;
    };
  }, []);

  const offresFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    let liste = offres;
    if (terme) {
      liste = offres.filter((o) =>
        [o.title, o.company_name ?? "", o.location ?? "", ...(o.tags ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(terme)
      );
    }
    if (tri === "correspondance") {
      liste = [...liste].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
    } else {
      liste = [...liste].sort(
        (a, b) =>
          new Date(b.posted_at ?? 0).getTime() - new Date(a.posted_at ?? 0).getTime()
      );
    }
    return liste;
  }, [offres, recherche, tri]);

  return (
    <div className="flex h-full flex-col">
      {/* Barre supérieure : recherche et tri */}
      <header className="border-[var(--border-subtle)] bg-[var(--surface-canvas)] border-b px-6 py-4">
        <div className="flex flex-col gap-4">
          <div className="relative max-w-2xl">
            <Search
              className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              size={18}
            />
            <Input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher des rôles, compétences, ou entreprises..."
              className="h-auto border-[var(--border-subtle)] bg-[var(--surface-card)] py-2.5 pr-4 pl-10 text-sm shadow-none placeholder:text-[var(--color-muted-foreground)] focus-visible:border-[var(--color-primary)] focus-visible:ring-[var(--color-primary)]/30 transition-colors duration-150"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="border-[var(--border-subtle)] bg-[var(--surface-card)] flex overflow-hidden rounded-lg border p-0.5">
              <button
                onClick={() => setVue("liste")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100 ${
                  vue === "liste"
                    ? "bg-[var(--surface-popover)] text-[var(--color-foreground)]"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                }`}
              >
                <List size={16} /> Liste
              </button>
              <button
                onClick={() => setVue("carte")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100 ${
                  vue === "carte"
                    ? "bg-[var(--surface-popover)] text-[var(--color-foreground)]"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                }`}
              >
                <MapIcon size={16} /> Carte
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Liste des offres */}
        <div
          className={`flex flex-col overflow-y-auto ${vue === "carte" ? "border-[var(--border-subtle)] w-[450px] border-r" : "w-full"} p-6`}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Affichage de {offresFiltrees.length} résultats
            </span>
            <select
              value={tri}
              onChange={(e) => setTri(e.target.value as Tri)}
              className="bg-transparent text-sm font-medium text-[var(--color-foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 rounded transition-colors duration-150"
            >
              <option value="correspondance">Meilleure correspondance</option>
              <option value="recent">Plus récent</option>
            </select>
          </div>

          <div
            className={
              vue === "liste"
                ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col gap-4"
            }
          >
            {chargement ? (
              <div className="py-10 text-center text-sm text-[var(--color-muted-foreground)]">
                Chargement des offres...
              </div>
            ) : offresFiltrees.length === 0 ? (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10 text-center text-sm text-[var(--color-muted-foreground)]">
                Aucune offre ne correspond à votre recherche.
              </div>
            ) : (
              offresFiltrees.map((offre) => (
                <JobCard key={offre.id} offre={offre} />
              ))
            )}
          </div>
        </div>

        {/* Vue Carte — offres géolocalisées réelles */}
        {vue === "carte" && (
          <div className="relative flex-1 bg-[var(--surface-card)]">
            <div
              className="absolute inset-0 opacity-40 mix-blend-screen"
              style={{
                backgroundImage:
                  "radial-gradient(circle at center, #1e293b 2px, transparent 2px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="absolute inset-0 z-10 flex flex-col p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--surface-popover)] px-3 py-1.5 text-xs font-medium text-[var(--color-foreground)] backdrop-blur-md">
                  <div className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                  Autour de votre position
                </span>
                <LocateFixed size={18} className="text-[var(--color-muted-foreground)]" />
              </div>

              {offresLocales.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="border-[var(--border-subtle)] bg-[var(--surface-popover)] flex max-w-xs flex-col items-center gap-3 rounded-xl border p-8 text-center backdrop-blur-md">
                    <MapIcon size={40} className="opacity-40" />
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {erreurLocalisation ??
                        "Autorisez la localisation pour afficher les offres à proximité."}
                    </p>
                    {!erreurLocalisation && (
                      <Button
                        onClick={demanderLocalisation}
                        disabled={localisationEnCours}
                        size="sm"
                      >
                        {localisationEnCours ? "Localisation..." : "Activer la localisation"}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {offresLocales.map((offre) => (
                    <Link
                      key={offre.id}
                      href={`/jobs/${offre.id}`}
                      className="border-[var(--border-subtle)] bg-[var(--surface-popover)] flex items-center gap-3 rounded-lg border p-3 backdrop-blur-md transition-colors duration-150 hover:border-[var(--color-primary)]/40 active:scale-[0.98] @media/hover:hover:border-[var(--color-primary)]/40"
                    >
                      <MapPin size={16} className="shrink-0 text-[var(--color-primary)]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                          {offre.title}
                        </p>
                        <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                          {offre.company_name} • {offre.location}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}