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
        "border border-border bg-muted text-foreground/85",
        className
      )}
    >
      {libelle}
    </span>
  );
}
