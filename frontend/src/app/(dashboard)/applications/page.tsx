"use client";

import { useState, useEffect } from "react";
import {
  Filter,
  ExternalLink,
  Calendar,
  Mail,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { applicationsService } from "@/services/applications.service";
import { StatutBadge } from "@/components/shared/status-badge";
import {
  PipelineProgress,
  type ConfigEtape,
} from "@/components/shared/pipeline-progress";
import type { Candidature } from "@/types/domain";

/* Page de suivi des candidatures (My Applications) */
export default function CandidaturesPage() {
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function chargerCandidatures() {
      try {
        const response = await applicationsService.getMesCandidatures();
        setCandidatures(response.items);
      } catch (erreur) {
        console.error("Erreur de chargement des candidatures", erreur);
        // Fallback mock
        setCandidatures([
          {
            id: "app1",
            intitule_poste: "Senior Product Designer",
            nom_entreprise: "Stark Industries",
            statut: "ACTIVE",
            etape_actuelle: "ENTRETIEN",
            etapes_completees: ["POSTULE", "PREEVALUATION"],
            mise_a_jour: "Mis à jour il y a 2h",
            lieu: "Remote (US)",
            salaire: "$ 140k - 180k",
            prochain_evenement: {
              libelle: "Entretien Technique",
              date_heure: "Demain, 10:00 AM PST",
            },
            prochaine_action: { libelle: "Rejoindre l'appel", variante: "secondaire" },
          },
          {
            id: "app2",
            intitule_poste: "Staff Frontend Engineer",
            nom_entreprise: "Wayne Enterprises",
            statut: "ACTION_REQUISE",
            etape_actuelle: "OFFRE",
            etapes_completees: ["POSTULE", "PREEVALUATION", "ENTRETIEN"],
            mise_a_jour: "Mis à jour il y a 1j",
            lieu: "Gotham (Hybride)",
            prochain_evenement: {
              libelle: "Lettre d'offre reçue",
              date_heure: "Date limite d'acceptation : 30 Oct",
            },
            prochaine_action: { libelle: "Examiner l'offre", variante: "primaire" },
          },
          {
            id: "app3",
            intitule_poste: "UI Developer",
            nom_entreprise: "Oscorp",
            statut: "ARCHIVEE",
            etape_actuelle: "ENTRETIEN",
            etapes_completees: ["POSTULE", "PREEVALUATION"],
            mise_a_jour: "Mis à jour il y a 2 sem",
            motif_rejet: "Rejeté",
          },
        ]);
      } finally {
        setChargement(false);
      }
    }
    chargerCandidatures();
  }, []);

  // Fonction utilitaire pour générer la configuration du pipeline
  const genererPipeline = (app: Candidature): ConfigEtape[] => {
    const toutesLesEtapes = [
      "POSTULE",
      "PREEVALUATION",
      "ENTRETIEN",
      "OFFRE",
      "EMBAUCHE",
    ] as const;

    return toutesLesEtapes.map((etape) => {
      let statutEtape: "terminee" | "active" | "en_attente" | "rejetee" = "en_attente";

      if (app.statut === "ARCHIVEE" && app.etape_actuelle === etape) {
        statutEtape = "rejetee";
      } else if (app.etapes_completees.includes(etape)) {
        statutEtape = "terminee";
      } else if (app.etape_actuelle === etape) {
        statutEtape = "active";
      }

      let dateEtape;
      if (statutEtape === "terminee" && etape === "POSTULE") dateEtape = "OCT 12";
      if (statutEtape === "terminee" && etape === "PREEVALUATION") dateEtape = "OCT 15";

      return { etape, statut: statutEtape, date: dateEtape };
    });
  };

  return (
    <div className="flex h-full flex-col p-6 lg:p-10">
      {/* En-tête de page */}
      <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Mes Candidatures
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Suivez l'évolution de vos candidatures actives au sein des organisations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#161b22] px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
            <Filter size={16} /> Filtres
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500">
            <ExternalLink size={16} /> App Externe
          </button>
        </div>
      </header>

      {/* Liste des candidatures */}
      <div className="space-y-4">
        {chargement ? (
          <div className="py-12 text-center text-slate-500">
            Chargement de vos candidatures...
          </div>
        ) : (
          candidatures.map((app) => (
            <div
              key={app.id}
              className="flex flex-col gap-6 rounded-2xl border border-white/5 bg-[#161b22] p-6 lg:flex-row lg:items-center"
            >
              {/* Informations principales de la candidature */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between lg:justify-start lg:gap-6">
                  <StatutBadge statut={app.statut} />
                  <span className="text-xs text-slate-500">{app.mise_a_jour}</span>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white">{app.intitule_poste}</h2>
                  <div className="mt-1 flex items-center gap-2 text-slate-400">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-white">
                      {app.nom_entreprise.charAt(0)}
                    </div>
                    <span className="text-sm font-medium">{app.nom_entreprise}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {app.lieu && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-slate-600" /> {app.lieu}
                    </span>
                  )}
                  {app.salaire && (
                    <span className="flex items-center gap-1">
                      <Banknote size={14} className="text-slate-600" /> {app.salaire}
                    </span>
                  )}
                </div>
              </div>

              {/* Pipeline et Actions */}
              <div className="w-full shrink-0 space-y-6 lg:w-[500px] xl:w-[600px]">
                <PipelineProgress etapes={genererPipeline(app)} />

                {app.prochain_evenement && (
                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-slate-400">
                        {app.statut === "ACTION_REQUISE" ? (
                          <Mail size={18} className="text-emerald-500" />
                        ) : (
                          <Calendar size={18} />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {app.prochain_evenement.libelle}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {app.prochain_evenement.date_heure}
                        </p>
                      </div>
                    </div>

                    {app.prochaine_action && (
                      <button
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                          app.prochaine_action.variante === "primaire"
                            ? "bg-emerald-500 text-white hover:bg-emerald-400"
                            : "border border-white/20 bg-transparent text-white hover:bg-white/10"
                        }`}
                      >
                        {app.prochaine_action.libelle}
                      </button>
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
