import { cn } from "@/lib/utils";

interface TechBadgeProps {
  libelle: string;
  className?: string;
}

/* Badge technologique affiché sur les cartes d'offres et fiches de poste */
export function TechBadge({ libelle, className }: TechBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        "border border-white/10 bg-white/5 text-slate-300",
        className
      )}
    >
      {libelle}
    </span>
  );
}
