"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChipFiltre {
  cle: string;
  libelle: string;
}

interface BarreFiltresProps {
  chips: ChipFiltre[];
  onSupprimer: (cle: string) => void;
  onToutEffacer?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/* Barre de filtres actifs avec chips supprimables */
export function FilterBar({
  chips,
  onSupprimer,
  onToutEffacer,
  className,
  children,
}: BarreFiltresProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3",
        className
      )}
    >
      {/* Déclencheurs (boutons de filtre, menus déroulants…) */}
      {children}

      {/* Chips de filtres actifs */}
      {chips.map((chip) => (
        <span
          key={chip.cle}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground/85"
        >
          {chip.libelle}
          <button
            type="button"
            onClick={() => onSupprimer(chip.cle)}
            aria-label={`Supprimer le filtre : ${chip.libelle}`}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={12} />
          </button>
        </span>
      ))}

      {/* Bouton tout effacer */}
      {chips.length > 1 && onToutEffacer && (
        <button
          type="button"
          onClick={onToutEffacer}
          className="ml-auto text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tout effacer
        </button>
      )}
    </div>
  );
}
