"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";

import { applicationsService } from "@/services/applications.service";
import { StatutBadge, type StatutCandidature } from "@/components/shared/status-badge";
import {
  PipelineProgress,
  type ConfigEtape,
  type EtapeCandidature,
} from "@/components/shared/pipeline-progress";
import { PageHeader } from "@/components/shared/page-header";
import { StatePanel } from "@/components/shared/state-panel";
import { Skeleton } from "@/components/ui/skeleton";
import type { CandidatureAPI } from "@/types/domain";

const ETAPES: EtapeCandidature[] = ["POSTULE", "PREEVALUATION", "ENTRETIEN", "OFFRE", "EMBAUCHE"];

/* Les étapes renvoyées par le serveur sont en minuscules. */
const ETAPE_SERVEUR: Record<string, EtapeCandidature> = {
  applied: "POSTULE",
  screening: "PREEVALUATION",
  interview: "ENTRETIEN",
  offer: "OFFRE",
  hired: "EMBAUCHE",
  rejected: "POSTULE",
};

const MESSAGE_ETAPE: Record<string, string> = {
  interview: "Un entretien est programmé avec l'équipe recrutement.",
  offer: "Une proposition vous a été adressée, elle attend votre réponse.",
  hired: "Félicitations, votre candidature a été retenue.",
  rejected: "La candidature n'a pas été retenue pour ce poste.",
};

function dateRelative(iso: string | null): string | null {
  if (!iso) return null;
  const jours = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (jours <= 0) return "Mise à jour aujourd'hui";
  if (jours === 1) return "Mise à jour hier";
  if (jours < 7) return `Mise à jour il y a ${jours} jours`;
  return `Mise à jour le ${new Date(iso).toLocaleDateString("fr-FR")}`;
}

function pipeline(etapeActuelle: EtapeCandidature, rejetee: boolean): ConfigEtape[] {
  const indexCourante = ETAPES.indexOf(etapeActuelle);
  return ETAPES.map((etape, index) => {
    let statut: ConfigEtape["statut"] = "en_attente";
    if (rejetee) statut = index >= indexCourante ? "rejetee" : "terminee";
    else if (index < indexCourante) statut = "terminee";
    else if (index === indexCourante) statut = "active";
    return { etape, statut };
  });
}

export default function CandidaturesPage() {
  const [candidatures, setCandidatures] = useState<CandidatureAPI[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      setCandidatures(await applicationsService.getMesCandidatures());
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const lignes = useMemo(
    () =>
      candidatures.map((app) => {
        const rejetee = app.stage === "rejected";
        const statut: StatutCandidature = rejetee
          ? "ARCHIVEE"
          : app.stage === "offer"
            ? "ACTION_REQUISE"
            : "ACTIVE";
        return {
          ...app,
          rejetee,
          statut,
          etape: ETAPE_SERVEUR[app.stage] ?? "POSTULE",
        };
      }),
    [candidatures]
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Mes candidatures"
        description="Suivez chaque candidature, de l'envoi à la décision finale."
      />

      {chargement ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : erreur ? (
        <StatePanel
          tone="error"
          title="Vos candidatures sont indisponibles"
          description="La connexion au serveur a échoué. Réessayez dans un instant."
          actionLabel="Réessayer"
          onAction={charger}
        />
      ) : lignes.length === 0 ? (
        <StatePanel
          title="Aucune candidature pour l'instant"
          description="Parcourez les offres, postulez, puis suivez ici l'avancement de chaque dossier."
        />
      ) : (
        <ul className="space-y-3">
          {lignes.map((app) => (
            <li key={app.id} className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatutBadge statut={app.statut} />
                    {dateRelative(app.updated_at ?? app.created_at) && (
                      <span className="text-xs text-muted-foreground">
                        {dateRelative(app.updated_at ?? app.created_at)}
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{app.job_title ?? "Poste sans intitulé"}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {app.company_name ?? "Entreprise non renseignée"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {app.matching_score != null && (
                      <span>Correspondance {Math.round(app.matching_score)} %</span>
                    )}
                    <Link
                      href={`/jobs/${app.job_id}`}
                      className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Voir l&apos;offre
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <div className="w-full shrink-0 space-y-4 lg:w-[420px]">
                  <PipelineProgress etapes={pipeline(app.etape, app.rejetee)} />
                  {MESSAGE_ETAPE[app.stage] && (
                    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
                      <Calendar size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {MESSAGE_ETAPE[app.stage]}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
