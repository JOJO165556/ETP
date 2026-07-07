"use client";

import { useState, useEffect } from "react";
import { FilterBar, type ChipFiltre } from "@/components/shared/filter-bar";
import { JobCard } from "@/components/shared/job-card";
import { jobsService } from "@/services/jobs.service";
import type { Job } from "@/types/domain";
import { Search, Map as MapIcon, List, Filter } from "lucide-react";

/* Page du fil d'offres d'emploi (Job Feed) */
export default function OffresPage() {
  const [offres, setOffres] = useState<Job[]>([]);
  const [chargement, setChargement] = useState(true);
  const [vue, setVue] = useState<"liste" | "carte">("liste");
  const [filtresActifs, setFiltresActifs] = useState<ChipFiltre[]>([
    { cle: "remote", libelle: "Remote Only" },
    { cle: "salary", libelle: "$140k - $190k" },
    { cle: "tech", libelle: "PostgreSQL" },
  ]);

  useEffect(() => {
    async function chargerOffres() {
      try {
        const response = await jobsService.getOffres();
        setOffres(response.items);
      } catch (erreur) {
        console.error("Erreur de chargement des offres", erreur);
        // Fallback mock temporaire pour l'UI si l'API n'est pas prête
        setOffres([
          {
            id: "1" as any,
            title: "Senior Geospatial Engineer",
            company_name: "Stellar Mapping Corp.",
            company_id: "c1" as any,
            location: "Hybrid (Seattle, WA)",
            salary_range: "$160k - $190k",
            tags: ["PostGIS", "Python", "AWS"],
            match_score: 98,
            posted_at: "Il y a 2h",
            is_active: true,
          },
          {
            id: "2" as any,
            title: "Data Engineer - Spatial Analytics",
            company_name: "Urban Logistics Inc.",
            company_id: "c2" as any,
            location: "Remote (US)",
            salary_range: "$140k - $175k",
            tags: ["SQL", "BigQuery"],
            match_score: 92,
            posted_at: "Il y a 5h",
            is_active: true,
          },
        ]);
      } finally {
        setChargement(false);
      }
    }
    chargerOffres();
  }, []);

  const supprimerFiltre = (cle: string) => {
    setFiltresActifs((prev) => prev.filter((f) => f.cle !== cle));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Barre supérieure : recherche et filtres */}
      <header className="border-border bg-background border-b px-6 py-4">
        <div className="flex flex-col gap-4">
          <div className="relative max-w-2xl">
            <Search
              className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Rechercher des rôles, compétences, ou entreprises..."
              className="w-full rounded-lg border border-white/10 bg-[#161b22] py-2.5 pr-4 pl-10 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <FilterBar chips={filtresActifs} onSupprimer={supprimerFiltre}>
              <button className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/10">
                <Filter size={14} /> Filtres
              </button>
            </FilterBar>

            <div className="flex overflow-hidden rounded-lg border border-white/10 bg-white/5 p-0.5">
              <button
                onClick={() => setVue("liste")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  vue === "liste"
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <List size={16} /> Liste
              </button>
              <button
                onClick={() => setVue("carte")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  vue === "carte"
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white"
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
          className={`flex flex-col overflow-y-auto ${vue === "carte" ? "border-border w-[450px] border-r" : "w-full"} p-6`}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">
              Affichage de {offres.length} résultats
            </span>
            <select className="bg-transparent text-sm font-medium text-white focus:outline-none">
              <option>Meilleure correspondance (IA)</option>
              <option>Plus récent</option>
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
              <div className="py-10 text-center text-sm text-slate-500">
                Chargement des offres...
              </div>
            ) : (
              offres.map((offre) => <JobCard key={offre.id} offre={offre} />)
            )}
          </div>
        </div>

        {/* Vue Carte (Espace réservé) */}
        {vue === "carte" && (
          <div className="relative flex-1 bg-slate-900">
            {/* Simulation de la carte pour l'instant */}
            <div
              className="absolute inset-0 opacity-40 mix-blend-screen"
              style={{
                backgroundImage:
                  "radial-gradient(circle at center, #1e293b 2px, transparent 2px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-slate-500">
              <MapIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p>Intégration Leaflet à venir</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
