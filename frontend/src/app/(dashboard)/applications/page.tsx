"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Mail, Banknote } from "lucide-react";
import { applicationsService } from "@/services/applications.service";
import { StatutBadge, type StatutCandidature } from "@/components/shared/status-badge";
import {
  PipelineProgress,
  type ConfigEtape,
  type EtapeCandidature,
} from "@/components/shared/pipeline-progress";
import { Button } from "@/components/ui/button";
import type { CandidatureAPI } from "@/types/domain";

const ETAPES_ORDRE: EtapeCandidature[] = [
  "POSTULE",
  "PREEVALUATION",
  "ENTRETIEN",
  "OFFRE",
  "EMBAUCHE",
];

/* Position dans le pipeline associée à chaque étape backend */
const ETAPE_BACKEND: Record<string, EtapeCandidature> = {
  "APPLIED": "POSTULE",
  "SCREENING": "PREEVALUATION",
  "INTERVIEW": "ENTRETIEN",
  "OFFER": "OFFRE",
  "HIRED": "EMBAUCHE",
  "REJECTED": "POSTULE",
};

interface CandidatureAffichee {
  id: string;
  intitule_poste: string;
  nom_entreprise: string;
  statut: StatutCandidature;
  etape_actuelle: EtapeCandidature;
  correspondance: number | null;
  date: string | null;
  note_evenement: string | null;
  libelle_action: string | null;
}

function formaterDateRelative(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const jours = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (jours < 1) return "Mis à jour aujourd'hui";
    if (jours === 1) return "Mis à jour hier";
    if (jours < 7) return `Mis à jour il y a ${jours}j`;
    return `Mis à jour le ${date.toLocaleDateString("fr-FR")}`;
  } catch {
    return null;
  }
}

function mapperCandidature(app: CandidatureAPI): CandidatureAffichee {
  const etape = ETAPE_BACKEND[app.stage] ?? "POSTULE";
  const rejetee = app.stage === "REJECTED";
  const statut: StatutCandidature = rejetee
    ? "ARCHIVEE"
    : app.stage === "OFFER"
      ? "ACTION_REQUISE"
      : "ACTIVE";

  const noteEvenement = rejetee
    ? "Candidature refusée par l'entreprise."
    : app.stage === "INTERVIEW"
      ? "Entretien à venir avec l'équipe."
      : app.stage === "OFFER"
        ? "Lettre d'offre en attente de réponse."
        : null;

  return {
    id: app.id,
    intitule_poste: app.job_title ?? "Poste sans intitulé",
    nom_entreprise: app.company_name ?? "Entreprise inconnue",
    statut,
    etape_actuelle: etape,
    correspondance: app.matching_score,
    date: formaterDateRelative(app.updated_at ?? app.created_at),
    note_evenement: noteEvenement,
    libelle_action:
      app.stage === "OFFER"
        ? "Examiner l'offre"
        : app.stage === "INTERVIEW"
          ? "Se préparer"
          : null,
  };
}

function genererPipeline(app: CandidatureAffichee): ConfigEtape[] {
  const indexCourante = ETAPES_ORDRE.indexOf(app.etape_actuelle);
  return ETAPES_ORDRE.map((etape, idx) => {
    let statut: ConfigEtape["statut"] = "en_attente";
    if (app.statut === "ARCHIVEE") {
      statut = idx >= indexCourante ? "rejetee" : "terminee";
    } else if (idx < indexCourante) {
      statut = "terminee";
    } else if (idx === indexCourante) {
      statut = "active";
    }
    return { etape, statut };
  });
}

/* Page de suivi des candidatures (My Applications) — données réelles */
export default function CandidaturesPage() {
  const [candidatures, setCandidatures] = useState<CandidatureAPI[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let vivant = true;
    applicationsService
      .getMesCandidatures()
      .then((data) => vivant && setCandidatures(data))
      .catch((erreur) =>
        console.error("Erreur de chargement des candidatures", erreur)
      )
      .finally(() => vivant && setChargement(false));
    return () => {
      vivant = false;
    };
  }, []);

  const affichees = useMemo(() => candidatures.map(mapperCandidature), [candidatures]);

  return (
    <div className="flex h-full flex-col p-6 lg:p-10">
      {/* En-tête de page */}
      <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            Mes Candidatures
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Suivez l'évolution de vos candidatures au sein des organisations.
          </p>
        </div>
      </header>

      {/* Liste des candidatures */}
      <div className="space-y-4">
        {chargement ? (
          <div className="py-12 text-center text-[var(--color-muted-foreground)]">
            Chargement de vos candidatures...
          </div>
        ) : affichees.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-12 text-center">
            <Calendar size={40} className="mx-auto mb-4 text-[var(--color-muted-foreground)]" />
            <p className="text-sm text-[var(--color-muted-foreground)]">
Vous n'avez pas encore de candidatures. Explorez le{" "}
              <Link
                href="/jobs"
                className="font-medium text-[var(--color-primary)] hover:underline transition-colors duration-150"
              >
                fil d'offres
              </Link>{" "}
              pour commencer.
            </p>
          </div>
        ) : (
          affichees.map((app) => (
            <div
              key={app.id}
              className="flex flex-col gap-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 lg:flex-row lg:items-center transition-shadow duration-200 hover:shadow-md"
            >
              {/* Informations principales de la candidature */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between lg:justify-start lg:gap-6">
                  <StatutBadge statut={app.statut} />
                  {app.date && <span className="text-xs text-[var(--color-muted-foreground)]">{app.date}</span>}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[var(--color-foreground)]">{app.intitule_poste}</h2>
                  <div className="mt-1 flex items-center gap-2 text-[var(--color-muted-foreground)]">
                    <div className="bg-[var(--surface-popover)] flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-[var(--color-foreground)]">
                      {app.nom_entreprise.charAt(0)}
                    </div>
                    <span className="text-sm font-medium">{app.nom_entreprise}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-[var(--color-muted-foreground)]">
                  {app.correspondance != null && (
                    <span className="flex items-center gap-1">
                      <Banknote size={14} className="text-[var(--color-muted-foreground)]" />{" "}
                      Correspondance {Math.round(app.correspondance)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Pipeline et Actions */}
              <div className="w-full shrink-0 space-y-6 lg:w-[500px] xl:w-[600px]">
                <PipelineProgress etapes={genererPipeline(app)} />

                {app.note_evenement && (
                  <div className="border-[var(--border-subtle)] bg-[var(--surface-popover)] flex items-center justify-between rounded-xl border p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-[var(--color-muted-foreground)]">
                        {app.statut === "ACTION_REQUISE" ? (
                          <Mail size={18} className="text-[var(--color-success)]" />
                        ) : (
                          <Calendar size={18} />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[var(--color-foreground)]">
                          {app.etape_actuelle === "OFFRE" ? "Offre reçue" : "Étape suivante"}
                        </h4>
                        <p className="text-xs text-[var(--color-muted-foreground)]">{app.note_evenement}</p>
                      </div>
                    </div>

                    {app.libelle_action && (
                      <Button className="bg-[var(--color-success)] text-white hover:bg-[var(--color-success)]/90 transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100">
                        {app.libelle_action}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}