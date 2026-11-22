"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  Loader2,
  Star,
} from "lucide-react";

import { applicationsService } from "@/services/applications.service";
import { usersService } from "@/services/users.service";
import { CandidateRatingModal } from "@/components/shared/candidate-rating-modal";
import { ScheduleInterviewModal } from "@/components/shared/schedule-interview-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/shared/state-panel";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Application,
  ApplicationNote,
  ApplicationStage,
  UserResponse,
} from "@/types/domain";

const LIBELLES_ETAPE: Record<ApplicationStage, string> = {
  applied: "Candidature envoyée",
  screening: "Présélection",
  interview: "Entretien",
  offer: "Offre",
  hired: "Embauché",
  rejected: "Refusée",
};

const ETAPES: ApplicationStage[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
];

function formaterDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

interface JobApplicationsPanelProps {
  jobId: string;
  /** Recruteur connecté : auteur des notes et intervieweur. */
  currentUser: UserResponse;
}

/* Panneau recruteur : candidatures d'une offre, évaluation, entretien, CV. */
export function JobApplicationsPanel({ jobId, currentUser }: JobApplicationsPanelProps) {
  const [candidatures, setCandidatures] = useState<Application[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  const [notesOuvertes, setNotesOuvertes] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, ApplicationNote[]>>({});
  const [evaluationCible, setEvaluationCible] = useState<Application | null>(null);
  const [entretienCible, setEntretienCible] = useState<Application | null>(null);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      setCandidatures(await applicationsService.getJobApplications(jobId));
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, [jobId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const chargerNotes = async (applicationId: string) => {
    try {
      const liste = await applicationsService.getNotes(applicationId);
      setNotes((prev) => ({ ...prev, [applicationId]: liste }));
    } catch {
      setNotes((prev) => ({ ...prev, [applicationId]: [] }));
    }
  };

  const basculerNotes = (applicationId: string) => {
    if (notesOuvertes === applicationId) {
      setNotesOuvertes(null);
    } else {
      setNotesOuvertes(applicationId);
      if (!notes[applicationId]) void chargerNotes(applicationId);
    }
  };

  const handleNote = async (rating: number, content: string) => {
    if (!evaluationCible) return;
    const applicationId = evaluationCible.id;
    await applicationsService.addNote(applicationId, {
      content,
      rating,
    });
    setEvaluationCible(null);
    setMessage("Évaluation enregistrée.");
    void chargerNotes(applicationId);
  };

  const handleEtape = async (application: Application, stage: ApplicationStage) => {
    setActionEnCours(application.id);
    setMessage(null);
    try {
      await applicationsService.updateStage(application.id, stage);
      setCandidatures((prev) =>
        prev.map((c) => (c.id === application.id ? { ...c, stage } : c))
      );
    } catch {
      setMessage("Le changement d'étape a échoué.");
    } finally {
      setActionEnCours(null);
    }
  };

  const handleCv = async (candidatId: string) => {
    setActionEnCours(candidatId);
    setMessage(null);
    try {
      const { download_url } = await usersService.getLienCV(candidatId);
      window.open(download_url, "_blank", "noopener");
    } catch {
      setMessage("Le CV de ce candidat n'est pas disponible.");
    } finally {
      setActionEnCours(null);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <ClipboardList size={17} className="text-primary" aria-hidden="true" />
          Candidatures ({candidatures.length})
        </h2>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>

      {chargement ? (
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : erreur ? (
        <div className="mt-4">
          <StatePanel
            tone="error"
            title="Les candidatures n'ont pas pu se charger"
            actionLabel="Réessayer"
            onAction={charger}
          />
        </div>
      ) : candidatures.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Aucune candidature pour le moment. Les candidats verront cette offre
          dès qu'elle est publiée.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {candidatures.map((candidature) => (
            <li
              key={candidature.id}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {candidature.candidate_name ?? "Candidat"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {candidature.candidate_email} · postulé le{" "}
                    {formaterDate(candidature.created_at)}
                    {candidature.matching_score != null &&
                      ` · score ${Math.round(candidature.matching_score)}%`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{LIBELLES_ETAPE[candidature.stage]}</Badge>
                  <select
                    aria-label={`Étape de ${candidature.candidate_name ?? "la candidature"}`}
                    value={candidature.stage}
                    disabled={actionEnCours === candidature.id}
                    onChange={(e) =>
                      void handleEtape(candidature, e.target.value as ApplicationStage)
                    }
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                  >
                    {ETAPES.map((etape) => (
                      <option key={etape} value={etape}>
                        {LIBELLES_ETAPE[etape]}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCv(candidature.candidate_id)}
                    disabled={actionEnCours === candidature.candidate_id}
                    className="gap-1.5"
                  >
                    {actionEnCours === candidature.candidate_id ? (
                      <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Download size={13} aria-hidden="true" />
                    )}
                    CV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEntretienCible(candidature)}
                    className="gap-1.5"
                  >
                    <CalendarClock size={13} aria-hidden="true" />
                    Entretien
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEvaluationCible(candidature)}
                    className="gap-1.5"
                  >
                    <Star size={13} aria-hidden="true" />
                    Évaluer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => basculerNotes(candidature.id)}
                    aria-expanded={notesOuvertes === candidature.id}
                    className="gap-1"
                  >
                    Notes
                    {notesOuvertes === candidature.id ? (
                      <ChevronUp size={13} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={13} aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>

              {notesOuvertes === candidature.id && (
                <div className="mt-3 border-t border-border pt-3">
                  {notes[candidature.id] === undefined ? (
                    <p className="text-xs text-muted-foreground">Chargement…</p>
                  ) : notes[candidature.id].length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Aucune évaluation pour le moment.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {notes[candidature.id].map((note) => (
                        <li key={note.id} className="text-xs">
                          <span className="font-medium text-foreground">
                            {note.rating != null ? `${note.rating}/5 · ` : ""}
                          </span>
                          <span className="text-muted-foreground">{note.content}</span>
                          <span className="ml-2 text-muted-foreground/70">
                            {formaterDate(note.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <CandidateRatingModal
        isOpen={evaluationCible !== null}
        onClose={() => setEvaluationCible(null)}
        onSubmit={handleNote}
        candidateName={evaluationCible?.candidate_name ?? undefined}
      />

      <ScheduleInterviewModal
        isOpen={entretienCible !== null}
        onClose={() => setEntretienCible(null)}
        application={entretienCible}
        interviewerId={String(currentUser.id)}
        onScheduled={() => {
          setMessage("Entretien planifié. Le candidat a été notifié.");
        }}
      />
    </section>
  );
}
