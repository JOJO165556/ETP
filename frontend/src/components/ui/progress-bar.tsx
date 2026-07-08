import { cn } from "@/lib/utils";

interface ProgressBarProps {
  valeur: number; // Pourcentage 0-100
  couleurBarre?: string;
  couleurFond?: string;
  className?: string;
  hauteur?: string;
}

export function ProgressBar({
  valeur,
  couleurBarre = "bg-blue-500",
  couleurFond = "bg-white/10",
  className,
  hauteur = "h-1.5",
}: ProgressBarProps) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full",
        couleurFond,
        hauteur,
        className
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", couleurBarre)}
        style={{ width: `${Math.min(100, Math.max(0, valeur))}%` }}
      />
    </div>
  );
}
