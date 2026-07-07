import { cn } from "@/lib/utils";

export type StatutCompetence = "validee" | "manquante" | "partielle";

/* Correspondance statut → libellé et couleurs de la barre */
const CONFIG_STATUTS: Record<
  StatutCompetence,
  { libelle: string; couleurBarre: string; couleurTexte: string; largeur: string }
> = {
  validee: {
    libelle: "Validée",
    couleurBarre: "bg-emerald-500",
    couleurTexte: "text-emerald-400",
    largeur: "w-full",
  },
  manquante: {
    libelle: "Écart détecté",
    couleurBarre: "bg-amber-500",
    couleurTexte: "text-amber-400",
    largeur: "w-1/3",
  },
  partielle: {
    libelle: "Partielle",
    couleurBarre: "bg-blue-500",
    couleurTexte: "text-blue-400",
    largeur: "w-3/4",
  },
};

interface BarreCompetenceProps {
  libelle: string;
  statut: StatutCompetence;
  note?: string;
  className?: string;
}

/* Barre de compétence avec indicateur de correspondance ou d'écart */
export function SkillBar({ libelle, statut, note, className }: BarreCompetenceProps) {
  const config = CONFIG_STATUTS[statut];

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-200">{libelle}</span>
        <span className={cn("text-xs font-semibold", config.couleurTexte)}>
          {config.libelle}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            config.couleurBarre,
            config.largeur
          )}
        />
      </div>
      {note && <p className="text-xs leading-snug text-slate-500">{note}</p>}
    </div>
  );
}
