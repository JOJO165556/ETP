import Link from "next/link";
import { MapPin, Clock, Building2, ArrowRight, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { TechBadge } from "./tech-badge";
import type { Job } from "@/types/domain";

interface JobCardProps {
  offre: Job;
  className?: string;
  variant?: "default" | "compact";
}

function formaterDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/* Carte d'offre d'emploi dense et aérée */
export function JobCard({ offre, className, variant = "default" }: JobCardProps) {
  const isCompact = variant === "compact";
  const competences = offre.required_skills ?? [];

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
          {/* En-tête : mode de travail et date */}
          <div className="flex items-center gap-2">
            {offre.is_remote && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                <Briefcase size={11} aria-hidden="true" />
                Télétravail
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formaterDate(offre.created_at)}
            </span>
          </div>

          {/* Titre et entreprise */}
          <div>
            <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-primary">
              {offre.title}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <Building2 size={14} className="text-muted-foreground/60" />
              {offre.company_name ?? "Entreprise"}
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
        {offre.formatted_address && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-[12px] w-[12px] text-muted-foreground/60" aria-hidden="true" />
            {offre.formatted_address}
          </span>
        )}
        {!offre.is_remote && offre.formatted_address && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-[12px] w-[12px] text-muted-foreground/60" aria-hidden="true" />
            Présentiel
          </span>
        )}
      </div>

      {/* Badges des compétences requises */}
      {competences.length > 0 && (
        <div className={cn(
          "flex flex-wrap gap-1.5",
          isCompact ? "mt-2" : "mt-3"
        )}>
          {competences.slice(0, isCompact ? 3 : 5).map((competence) => (
            <TechBadge key={competence} libelle={competence} />
          ))}
          {!isCompact && competences.length > 5 && (
            <span className="text-xs text-muted-foreground">
              +{competences.length - 5}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
