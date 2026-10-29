import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, XCircle, Clock } from "lucide-react";

export type EtapeCandidature =
  "POSTULE" | "PREEVALUATION" | "ENTRETIEN" | "OFFRE" | "EMBAUCHE";

export type StatutEtape = "terminee" | "active" | "en_attente" | "rejetee";

export interface ConfigEtape {
  etape: EtapeCandidature;
  statut: StatutEtape;
  date?: string;
  libelle?: string;
}

/* Libellés par défaut de chaque étape du pipeline */
const LIBELLES_ETAPES: Record<EtapeCandidature, string> = {
  POSTULE: "Postulé",
  PREEVALUATION: "Pré-évaluation",
  ENTRETIEN: "Entretien",
  OFFRE: "Offre",
  EMBAUCHE: "Embauché",
};

/* Couleurs par statut - mapping vers les tokens sémantiques ATS */
const COULEURS_STATUT: Record<StatutEtape, string> = {
  terminee: "var(--stage-hired)",
  active: "var(--stage-interview)",
  en_attente: "var(--stage-applied)",
  rejetee: "var(--stage-rejected)",
};

interface ProgressionPipelineProps {
  etapes: ConfigEtape[];
  className?: string;
  variant?: "horizontal" | "vertical";
}

function IconeEtape({ statut }: { statut: StatutEtape }) {
  const couleur = COULEURS_STATUT[statut];
  
  if (statut === "terminee") {
    return (
      <div 
        className="relative flex h-6 w-6 items-center justify-center rounded-full bg-background border-2"
        style={{ borderColor: couleur }}
      >
        <CheckCircle2 className="h-[14px] w-[14px] text-foreground" style={{ color: couleur }} />
      </div>
    );
  }
  
  if (statut === "active") {
    return (
      <div className="relative flex h-6 w-6 items-center justify-center">
        <div 
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ backgroundColor: couleur }}
        />
        <div 
          className="relative h-5 w-5 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: couleur }}
        >
          <div 
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: couleur }}
          />
        </div>
      </div>
    );
  }
  
  if (statut === "rejetee") {
    return (
      <div 
        className="flex h-6 w-6 items-center justify-center rounded-full bg-background border-2"
        style={{ borderColor: couleur }}
      >
        <XCircle className="h-[14px] w-[14px] text-foreground" style={{ color: couleur }} />
      </div>
    );
  }
  
  return (
    <div 
      className="flex h-6 w-6 items-center justify-center rounded-full bg-background border-2"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <Circle className="h-[14px] w-[14px] text-muted-foreground" />
    </div>
  );
}

/* Barre de progression du pipeline de recrutement */
export function PipelineProgress({ 
  etapes, 
  className,
  variant = "horizontal" 
}: ProgressionPipelineProps) {
  if (variant === "vertical") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {etapes.map((item, idx) => {
          const connecteurActif = item.statut === "terminee" || (item.statut === "active" && idx > 0);

          return (
            <div key={item.etape} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <IconeEtape statut={item.statut} />
                {idx < etapes.length - 1 && (
                  <div
                    className={cn(
                      "w-px flex-1 mt-2 transition-colors duration-300",
                      connecteurActif ? "bg-foreground/30" : "bg-foreground/10"
                    )}
                    style={{ height: "1.5rem" }}
                  />
                )}
              </div>
              
              <div className="flex-1 py-1">
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wide",
                    item.statut === "active" && "text-primary",
                    item.statut === "terminee" && "text-foreground",
                    item.statut === "en_attente" && "text-muted-foreground",
                    item.statut === "rejetee" && "text-destructive"
                  )}
                >
                  {item.libelle ?? LIBELLES_ETAPES[item.etape]}
                </span>
                {item.date && (
                  <span className="mt-0.5 text-[10px] text-muted-foreground block">
                    {item.date}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex items-start", className)}>
      {etapes.map((item, idx) => {
        const estDernier = idx === etapes.length - 1;
        const connecteurActif = item.statut === "terminee" || (item.statut === "active" && idx > 0);

        return (
          <div key={item.etape} className="flex flex-1 flex-col items-center">
            {/* Ligne de connexion + icône */}
            <div className="flex w-full items-center">
              {idx > 0 && (
                <div
                  className={cn(
                    "h-px flex-1 transition-colors duration-300",
                    connecteurActif ? "bg-foreground/30" : "bg-foreground/10"
                  )}
                />
              )}
              <IconeEtape statut={item.statut} />
              {!estDernier && (
                <div
                  className={cn(
                    "h-px flex-1 transition-colors duration-300",
                    item.statut === "terminee" ? "bg-foreground/30" : "bg-foreground/10"
                  )}
                />
              )}
            </div>

            {/* Libellé et date */}
            <div className="mt-2 flex flex-col items-center text-center">
              <span
                className={cn(
                  "text-[10px] font-semibold tracking-wider uppercase transition-colors",
                  item.statut === "active" && "text-primary",
                  item.statut === "terminee" && "text-foreground",
                  item.statut === "en_attente" && "text-muted-foreground",
                  item.statut === "rejetee" && "text-destructive"
                )}
              >
                {item.libelle ?? LIBELLES_ETAPES[item.etape]}
              </span>
              {item.date && (
                <span className="mt-0.5 text-[9px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-[8px] w-[8px]" />
                  {item.date}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
