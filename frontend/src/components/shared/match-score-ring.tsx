"use client";

import { cn } from "@/lib/utils";

interface MatchScoreRingProps {
  score: number; // valeur entre 0 et 100
  taille?: number;
  epaisseur?: number;
  className?: string;
  showLabel?: boolean;
}

/* Anneau SVG animé avec gradient dynamique et compteur fluide */
export function MatchScoreRing({
  score,
  taille = 120,
  epaisseur = 8,
  className,
  showLabel = true,
}: MatchScoreRingProps) {
  const rayon = (taille - epaisseur) / 2;
  const circonference = 2 * Math.PI * rayon;
  const decalage = circonference - (score / 100) * circonference;
  const centre = taille / 2;

  // Couleur dynamique selon le score
  const getGradientColor = () => {
    if (score >= 80) return { start: "#10b981", end: "#059669" }; // Emerald
    if (score >= 60) return { start: "#6366f1", end: "#4f46e5" }; // Indigo
    return { start: "#f59e0b", end: "#d97706" }; // Amber
  };

  const colors = getGradientColor();
  const gradientId = `gradient-${score}`;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: taille, height: taille }}
      role="img"
      aria-label={`Score de correspondance : ${score}%`}
    >
      <svg width={taille} height={taille} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>
        
        {/* Piste de fond */}
        <circle
          cx={centre}
          cy={centre}
          r={rayon}
          fill="none"
          stroke="currentColor"
          className="text-muted opacity-20"
          strokeWidth={epaisseur}
        />
        
        {/* Arc de progression avec gradient */}
        <circle
          cx={centre}
          cy={centre}
          r={rayon}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={decalage}
          style={{
            transition: "stroke-dashoffset 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className="text-2xl leading-none font-bold text-foreground"
          style={{
            transition: "all 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
            fontFamily: 'var(--font-mono)'
          }}
        >
          {score}%
        </span>
        {showLabel && (
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mt-0.5">
            Match
          </span>
        )}
      </div>
    </div>
  );
}
