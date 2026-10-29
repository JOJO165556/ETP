import Link from "next/link";
import { MapPin, Banknote, Clock, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TechBadge } from "./tech-badge";
import type { Job } from "@/types/domain";

interface JobCardProps {
  offre: Job;
  className?: string;
  variant?: "default" | "compact";
}

/* Carte d'offre d'emploi dense et aérée */
export function JobCard({ offre, className, variant = "default" }: JobCardProps) {
  const isCompact = variant === "compact";

  return (
    <Link
      href={`/jobs/${offre.id}`}
      className={cn(
        "group block rounded-xl border border-border bg-card p-5",
        "transition-all duration-200",
        "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
        "active:scale-[0.98]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* En-tête : badge score et date */}
          <div className="flex items-center gap-2">
            {offre.match_score != null && (
              <span 
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                  offre.match_score >= 80 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : offre.match_score >= 60 
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                )}
              >
                {offre.match_score}% match
              </span>
            )}
            <span className="text-xs text-muted-foreground">{offre.posted_at}</span>
          </div>

          {/* Titre et entreprise */}
          <div>
            <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-primary">
              {offre.title}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <Building2 size={14} className="text-muted-foreground/60" />
              {offre.company_name}
            </div>
          </div>
        </div>

        {/* Bouton rapide */}
        {!isCompact && (
          <div 
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border",
              "text-muted-foreground/60",
              "transition-all duration-200",
              "group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
            )}
          >
            <ArrowRight className="h-[16px] w-[16px]" />
          </div>
        )}
      </div>

      {/* Métadonnées */}
      <div className={cn(
        "flex flex-wrap items-center gap-3 text-xs text-muted-foreground",
        isCompact ? "mt-2" : "mt-3"
      )}>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-[12px] w-[12px] text-muted-foreground/60" aria-hidden="true" />
          {offre.location}
        </span>
        {offre.salary_range && (
          <span className="flex items-center gap-1.5">
            <Banknote className="h-[12px] w-[12px] text-muted-foreground/60" aria-hidden="true" />
            {offre.salary_range}
          </span>
        )}
        {offre.contract_type && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-[12px] w-[12px] text-muted-foreground/60" aria-hidden="true" />
            {offre.contract_type}
          </span>
        )}
      </div>

      {/* Badges technologiques */}
      {offre.tags && offre.tags.length > 0 && (
        <div className={cn(
          "flex flex-wrap gap-1.5",
          isCompact ? "mt-2" : "mt-3"
        )}>
          {offre.tags.slice(0, isCompact ? 3 : 5).map((tag) => (
            <TechBadge key={tag} libelle={tag} />
          ))}
          {!isCompact && offre.tags.length > 5 && (
            <span className="text-xs text-muted-foreground">
              +{offre.tags.length - 5}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
