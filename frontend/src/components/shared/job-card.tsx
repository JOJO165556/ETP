import Link from "next/link";
import { MapPin, Banknote, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TechBadge } from "./tech-badge";
import type { Job } from "@/types/domain";

interface CarteOffreProps {
  offre: Job;
  className?: string;
}

/* Carte d'offre d'emploi réutilisable — utilisée dans le fil d'offres et la sidebar de détail */
export function JobCard({ offre, className }: CarteOffreProps) {
  return (
    <Link
      href={`/jobs/${offre.id}`}
      className={cn(
        "group block rounded-xl border border-white/5 bg-[#161b22] p-5",
        "transition-all duration-200 hover:border-white/10 hover:bg-[#1c2333]",
        className
      )}
    >
      {/* En-tête : score de correspondance et date de publication */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {offre.match_score != null && (
              <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-400">
                {offre.match_score}% de correspondance
              </span>
            )}
            <span className="text-xs text-slate-500">{offre.posted_at}</span>
          </div>

          {/* Titre du poste */}
          <h3 className="text-base font-bold text-white transition-colors group-hover:text-blue-400">
            {offre.title}
          </h3>

          {/* Nom de l'entreprise */}
          <p className="text-sm text-slate-400">{offre.company_name}</p>
        </div>
      </div>

      {/* Métadonnées : lieu, salaire, type de contrat */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <MapPin size={12} aria-hidden="true" />
          {offre.location}
        </span>
        {offre.salary_range && (
          <span className="flex items-center gap-1">
            <Banknote size={12} aria-hidden="true" />
            {offre.salary_range}
          </span>
        )}
        {offre.contract_type && (
          <span className="flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            {offre.contract_type}
          </span>
        )}
      </div>

      {/* Badges technologiques */}
      {offre.tags && offre.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {offre.tags.map((tag) => (
            <TechBadge key={tag} libelle={tag} />
          ))}
        </div>
      )}
    </Link>
  );
}
