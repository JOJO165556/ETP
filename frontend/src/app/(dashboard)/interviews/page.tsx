"use client";

import { useEffect, useState } from "react";
import { Calendar, Video, Clock, User, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type InterviewStatus = "scheduled" | "completed" | "cancelled";

interface Interview {
  id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  company_name: string;
  interviewer_id: string;
  interviewer_name: string;
  scheduled_at: string;
  duration_minutes: number;
  status: InterviewStatus;
  video_link: string | null;
}

/* Page Agenda des Entretiens — Vue Recruteur */
export default function InterviewsPage() {
  const [interviews] = useState<Interview[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState<InterviewStatus | "all">("all");
  const [menuFiltreOuvert, setMenuFiltreOuvert] = useState(false);

  useEffect(() => {
    // TODO: Intégrer avec le service backend réel
    setChargement(false);
  }, []);

  const interviewsFiltres = interviews.filter((int) => {
    if (filtreStatut !== "all" && int.status !== filtreStatut) return false;
    return true;
  });

  const formaterDate = (iso: string): string => {
    try {
      const date = new Date(iso);
      return date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const formaterHeure = (iso: string): string => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const STATUT_LABELS: Record<InterviewStatus, { label: string; variant: "success" | "warning" | "destructive" }> = {
    scheduled: { label: "Planifié", variant: "success" },
    completed: { label: "Terminé", variant: "warning" },
    cancelled: { label: "Annulé", variant: "destructive" },
  };

  return (
    <div className="flex h-full flex-col p-6 lg:p-10">
      {/* En-tête */}
      <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            Agenda des Entretiens
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Gérez et suivez tous vos entretiens planifiés.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtre Statut */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setMenuFiltreOuvert(!menuFiltreOuvert)}
              className="gap-2 transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100"
            >
              <Filter size={16} />
              {filtreStatut === "all" ? "Tous les statuts" : STATUT_LABELS[filtreStatut].label}
              <ChevronDown size={16} />
            </Button>

            {menuFiltreOuvert && (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-2 shadow-lg">
                <button
                  onClick={() => {
                    setFiltreStatut("all");
                    setMenuFiltreOuvert(false);
                  }}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                    filtreStatut === "all"
                      ? "bg-[var(--surface-popover)] text-[var(--color-foreground)]"
                      : "text-[var(--color-muted-foreground)] hover:bg-[var(--surface-popover)]"
                  )}
                >
                  Tous les statuts
                </button>
                {(Object.keys(STATUT_LABELS) as InterviewStatus[]).map((statut) => (
                  <button
                    key={statut}
                    onClick={() => {
                      setFiltreStatut(statut);
                      setMenuFiltreOuvert(false);
                    }}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                      filtreStatut === statut
                        ? "bg-[var(--surface-popover)] text-[var(--color-foreground)]"
                        : "text-[var(--color-muted-foreground)] hover:bg-[var(--surface-popover)]"
                    )}
                  >
                    {STATUT_LABELS[statut].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button className="transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100">
            <Calendar size={16} className="mr-2" />
            Nouvel Entretien
          </Button>
        </div>
      </header>

      {/* Liste des entretiens */}
      <div className="flex-1 overflow-y-auto">
        {chargement ? (
          <div className="py-12 text-center text-[var(--color-muted-foreground)]">
            Chargement de l'agenda...
          </div>
        ) : interviewsFiltres.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Calendar size={48} className="mx-auto mb-4 text-[var(--color-muted-foreground)] opacity-40" />
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {interviews.length === 0
                  ? "Aucun entretien planifié pour le moment."
                  : "Aucun entretien ne correspond à vos filtres."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {interviewsFiltres.map((interview) => (
              <div
                key={interview.id}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 transition-shadow duration-200 hover:shadow-md"
              >
                {/* En-tête de la carte */}
                <div className="mb-4 flex items-start justify-between">
                  <Badge variant={STATUT_LABELS[interview.status].variant}>
                    {STATUT_LABELS[interview.status].label}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                    <Clock size={14} />
                    {interview.duration_minutes} min
                  </div>
                </div>

                {/* Candidat */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-[var(--color-foreground)]">
                    {interview.candidate_name}
                  </h3>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {interview.candidate_email}
                  </p>
                </div>

                {/* Poste */}
                <div className="mb-4 rounded-lg bg-[var(--surface-popover)] p-3">
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    {interview.job_title}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {interview.company_name}
                  </p>
                </div>

                {/* Date et Heure */}
                <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                  <Calendar size={16} />
                  <span>{formaterDate(interview.scheduled_at)}</span>
                  <span>•</span>
                  <span>{formaterHeure(interview.scheduled_at)}</span>
                </div>

                {/* Recruteur */}
                <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                  <User size={16} />
                  <span>{interview.interviewer_name}</span>
                </div>

                {/* Actions */}
                {interview.status === "scheduled" && interview.video_link && (
                  <Button
                    className="w-full gap-2 transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100"
                    onClick={() => interview.video_link && window.open(interview.video_link, "_blank", "noopener,noreferrer")}
                  >
                    <Video size={16} />
                    Rejoindre la visio
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
