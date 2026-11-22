"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { ApiRequestError } from "@/lib/api";
import { interviewsService } from "@/services/interviews.service";
import { InterviewSlotPicker } from "@/components/shared/interview-slot-picker";
import { Button } from "@/components/ui/button";
import type { Application } from "@/types/domain";

interface Creneau {
  id: string;
  iso: string;
  date: string;
  time: string;
  duration: number;
  available: boolean;
}

const DUREE_MINUTES = 45;
const NB_JOURS = 10;

function formaterJour(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function genererCreneaux(): Creneau[] {
  const creneaux: Creneau[] = [];
  const maintenant = new Date();
  for (let jour = 1; jour <= NB_JOURS; jour++) {
    const journee = new Date(maintenant);
    journee.setDate(maintenant.getDate() + jour);
    if (journee.getDay() === 0 || journee.getDay() === 6) continue;
    for (let heure = 9; heure <= 16; heure++) {
      for (const minute of [0, 30]) {
        const debut = new Date(journee);
        debut.setHours(heure, minute, 0, 0);
        // Marge de 2 h minimum avant un entretien
        if (debut.getTime() <= maintenant.getTime() + 2 * 3600 * 1000) continue;
        creneaux.push({
          id: debut.toISOString(),
          iso: debut.toISOString(),
          date: formaterJour(debut),
          time: `${String(heure).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
          duration: DUREE_MINUTES,
          available: true,
        });
      }
    }
  }
  return creneaux;
}

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
  /** ID de l'utilisateur recruteur qui mène l'entretien. */
  interviewerId: string;
  onScheduled: () => void;
}

/* Modale de planification : choix d'un créneau puis POST /interviews.
   Un 409 (contrainte GiST de chevauchement) affiche un message explicite. */
export function ScheduleInterviewModal({
  isOpen,
  onClose,
  application,
  interviewerId,
  onScheduled,
}: ScheduleInterviewModalProps) {
  const [creneauChoisi, setCreneauChoisi] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const creneaux = useMemo(() => (isOpen ? genererCreneaux() : []), [isOpen]);
  const slots = useMemo(
    () =>
      creneaux.map(({ iso: _iso, ...slot }) => ({
        ...slot,
        conflict: false,
      })),
    [creneaux]
  );

  if (!isOpen || !application) return null;

  const creneauSelectionne = creneaux.find((c) => c.id === creneauChoisi);

  const handleConfirmer = async () => {
    if (!creneauSelectionne) return;
    setEnCours(true);
    setErreur(null);
    try {
      await interviewsService.creer({
        application_id: application.id,
        interviewer_id: interviewerId,
        scheduled_at: creneauSelectionne.iso,
        duration_minutes: DUREE_MINUTES,
        status: "scheduled",
      });
      onScheduled();
      onClose();
      setCreneauChoisi(null);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setErreur(
          "Ce créneau n'est plus disponible : il chevauche un entretien déjà planifié. Choisissez un autre horaire."
        );
      } else {
        setErreur(
          err instanceof Error ? err.message : "La planification a échoué. Réessayez."
        );
      }
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Planifier un entretien"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold text-foreground">Planifier un entretien</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {application.candidate_name ?? "Le candidat"} — choisissez un créneau dans les
          10 prochains jours ouvrés.
        </p>

        <div className="mt-4">
          <InterviewSlotPicker
            slots={slots}
            selectedSlot={creneauChoisi ?? undefined}
            onSelect={setCreneauChoisi}
          />
        </div>

        {erreur && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {erreur}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={enCours}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleConfirmer}
            disabled={!creneauChoisi || enCours}
            className="gap-2"
          >
            {enCours && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            Confirmer le créneau
          </Button>
        </div>
      </div>
    </div>
  );
}
