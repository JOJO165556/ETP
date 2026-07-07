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
        "flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-[#161b22] px-4 py-3",
        className
      )}
    >
      {/* Déclencheurs (boutons de filtre, menus déroulants…) */}
      {children}

      {/* Chips de filtres actifs */}
      {chips.map((chip) => (
        <span
          key={chip.cle}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300"
        >
          {chip.libelle}
          <button
            type="button"
            onClick={() => onSupprimer(chip.cle)}
            aria-label={`Supprimer le filtre : ${chip.libelle}`}
            className="text-slate-500 transition-colors hover:text-white"
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
          className="ml-auto text-xs font-medium text-slate-500 transition-colors hover:text-white"
        >
          Tout effacer
        </button>
      )}
    </div>
  );
}
