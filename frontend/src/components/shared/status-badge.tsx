import { cn } from "@/lib/utils";

export type StatutCandidature = "ACTIVE" | "ACTION_REQUISE" | "ARCHIVEE";

/* Correspondance statut → libellé et style visuel */
const CONFIG_STATUTS: Record<StatutCandidature, { libelle: string; className: string }> =
  {
    ACTIVE: {
      libelle: "ACTIVE",
      className: "border-success/30 bg-success/10 text-success",
    },
    ACTION_REQUISE: {
      libelle: "ACTION REQUISE",
      className: "border-warning/30 bg-warning/10 text-warning",
    },
    ARCHIVEE: {
      libelle: "ARCHIVÉE",
      className: "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
    },
  };

interface StatutBadgeProps {
  statut: StatutCandidature;
  className?: string;
}

/* Badge de statut pour les cartes de candidature */
export function StatutBadge({ statut, className }: StatutBadgeProps) {
  const config = CONFIG_STATUTS[statut];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
        config.className,
        className
      )}
    >
      {config.libelle}
    </span>
  );
}
