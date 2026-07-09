import { cn } from "@/lib/utils";

export type StatutCandidature = "ACTIVE" | "ACTION_REQUISE" | "ARCHIVEE";

/* Correspondance statut → libellé et style visuel */
const CONFIG_STATUTS: Record<StatutCandidature, { libelle: string; className: string }> =
  {
    ACTIVE: {
      libelle: "ACTIVE",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
    ACTION_REQUISE: {
      libelle: "ACTION REQUISE",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    },
    ARCHIVEE: {
      libelle: "ARCHIVÉE",
      className: "border-slate-500/30 bg-slate-500/10 text-slate-400",
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
