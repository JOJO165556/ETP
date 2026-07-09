import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, XCircle } from "lucide-react";

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

interface ProgressionPipelineProps {
  etapes: ConfigEtape[];
  className?: string;
}

function IconeEtape({ statut }: { statut: StatutEtape }) {
  if (statut === "terminee") return <CheckCircle2 size={20} className="text-blue-500" />;
  if (statut === "active")
    return (
      <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-blue-500">
        <div className="h-2 w-2 rounded-full bg-blue-500" />
      </div>
    );
  if (statut === "rejetee") return <XCircle size={20} className="text-red-500" />;
  return <Circle size={20} className="text-slate-600" />;
}

/* Barre de progression horizontale du parcours de candidature */
export function PipelineProgress({ etapes, className }: ProgressionPipelineProps) {
  return (
    <div className={cn("flex items-start", className)}>
      {etapes.map((item, idx) => {
        const estDernier = idx === etapes.length - 1;
        const connecteurActif =
          item.statut === "terminee" || (item.statut === "active" && idx > 0);

        return (
          <div key={item.etape} className="flex flex-1 flex-col items-center">
            {/* Ligne de connexion + icône */}
            <div className="flex w-full items-center">
              {idx > 0 && (
                <div
                  className={cn(
                    "h-px flex-1 transition-colors",
                    connecteurActif ? "bg-blue-500" : "bg-slate-700"
                  )}
                />
              )}
              <IconeEtape statut={item.statut} />
              {!estDernier && (
                <div
                  className={cn(
                    "h-px flex-1 transition-colors",
                    item.statut === "terminee" ? "bg-blue-500" : "bg-slate-700"
                  )}
                />
              )}
            </div>

            {/* Libellé et date */}
            <div className="mt-1.5 flex flex-col items-center text-center">
              <span
                className={cn(
                  "text-[10px] font-semibold tracking-wider uppercase",
                  item.statut === "active" && "text-blue-400",
                  item.statut === "terminee" && "text-slate-300",
                  item.statut === "en_attente" && "text-slate-600",
                  item.statut === "rejetee" && "text-red-400"
                )}
              >
                {item.libelle ?? LIBELLES_ETAPES[item.etape]}
              </span>
              {item.date && (
                <span className="mt-0.5 text-[9px] text-slate-500">{item.date}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
