"use client";

import { cn } from "@/lib/utils";

interface AnnuluScoreProps {
  score: number; // valeur entre 0 et 100
  taille?: number;
  epaisseur?: number;
  className?: string;
}

/* Anneau SVG animé affichant le pourcentage de correspondance candidat/offre */
export function MatchScoreRing({
  score,
  taille = 120,
  epaisseur = 8,
  className,
}: AnnuluScoreProps) {
  const rayon = (taille - epaisseur) / 2;
  const circonference = 2 * Math.PI * rayon;
  const decalage = circonference - (score / 100) * circonference;
  const centre = taille / 2;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: taille, height: taille }}
      role="img"
      aria-label={`Score de correspondance : ${score}%`}
    >
      <svg width={taille} height={taille} className="-rotate-90" aria-hidden="true">
        {/* Piste de fond */}
        <circle
          cx={centre}
          cy={centre}
          r={rayon}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={epaisseur}
        />
        {/* Arc de progression */}
        <circle
          cx={centre}
          cy={centre}
          r={rayon}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={decalage}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl leading-none font-bold text-white">{score}%</span>
        <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Correspondance
        </span>
      </div>
    </div>
  );
}
