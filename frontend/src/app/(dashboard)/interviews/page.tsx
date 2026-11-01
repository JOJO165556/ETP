"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Clock, MapPin, Video, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatePanel } from "@/components/shared/state-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { interviewsService, type EntretienAPI, type StatutEntretien } from "@/services/interviews.service";
import { cn } from "@/lib/utils";

const STATUTS: Record<StatutEntretien, { libelle: string; variante: "success" | "secondary" | "destructive" | "warning" }> = {
  scheduled: { libelle: "Planifié", variante: "success" },
  completed: { libelle: "Terminé", variante: "secondary" },
  cancelled: { libelle: "Annulé", variante: "destructive" },
  no_show: { libelle: "Absence", variante: "warning" },
};

const FILTRES: Array<{ cle: StatutEntretien | "tous"; libelle: string }> = [
  { cle: "tous", libelle: "Tous" },
  { cle: "scheduled", libelle: "Planifiés" },
  { cle: "completed", libelle: "Terminés" },
  { cle: "cancelled", libelle: "Annulés" },
  { cle: "no_show", libelle: "Absences" },
];

function formaterJour(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formaterHeure(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function EntretiensPage() {
  const [entretiens, setEntretiens] = useState<EntretienAPI[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [filtre, setFiltre] = useState<StatutEntretien | "tous">("tous");
  const [annulation, setAnnulation] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      setEntretiens(await interviewsService.getAVenir());
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const filtres = useMemo(
    () => (filtre === "tous" ? entretiens : entretiens.filter((e) => e.status === filtre)),
    [entretiens, filtre]
  );

  const annuler = async (id: string) => {
    setAnnulation(id);
    try {
      const misAJour = await interviewsService.annuler(id);
      setEntretiens((liste) => liste.map((e) => (e.id === id ? misAJour : e)));
    } catch {
      setErreur(true);
    } finally {
      setAnnulation(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Entretiens"
        description="Vos prochains rendez-vous, avec la durée, le lieu et le lien de visioconférence."
        actions={
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
            {FILTRES.map((option) => (
              <button
                key={option.cle}
                type="button"
                onClick={() => setFiltre(option.cle)}
                aria-pressed={filtre === option.cle}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  filtre === option.cle
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {option.libelle}
              </button>
            ))}
          </div>
        }
      />

      {chargement ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : erreur ? (
        <StatePanel
          tone="error"
          title="Impossible de charger vos entretiens"
          description="La connexion au serveur a échoué. Réessayez dans un instant."
          actionLabel="Réessayer"
          onAction={charger}
        />
      ) : filtres.length === 0 ? (
        <StatePanel
          title={entretiens.length === 0 ? "Aucun entretien planifié" : "Aucun entretien pour ce filtre"}
          description={
            entretiens.length === 0
              ? "Les entretiens apparaissent ici dès qu'une date est fixée avec un candidat."
              : "Changez de filtre pour voir les autres rendez-vous."
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtres.map((entretien) => {
            const statut = STATUTS[entretien.status];
            return (
              <li
                key={entretien.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-border bg-muted/60 px-2 py-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {new Date(entretien.scheduled_at).toLocaleDateString("fr-FR", { month: "short" })}
                    </span>
                    <span className="text-xl font-semibold text-foreground">
                      {new Date(entretien.scheduled_at).getDate()}
                    </span>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground first-letter:uppercase">
                        {formaterJour(entretien.scheduled_at)}
                      </p>
                      <Badge variant={statut.variante}>{statut.libelle}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={14} aria-hidden="true" />
                        {formaterHeure(entretien.scheduled_at)} · {entretien.duration_minutes} min
                      </span>
                      {entretien.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={14} aria-hidden="true" />
                          {entretien.location}
                        </span>
                      )}
                      {!entretien.location && entretien.meeting_link && (
                        <span className="inline-flex items-center gap-1.5">
                          <Video size={14} aria-hidden="true" />
                          Visioconférence
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Référence candidature {entretien.application_id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  {entretien.meeting_link && entretien.status === "scheduled" && (
                    <Button
                      render={
                        <a
                          href={`/leave?to=${encodeURIComponent(entretien.meeting_link)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                      size="sm"
                      className="gap-1.5"
                    >
                      <Video size={14} aria-hidden="true" />
                      Rejoindre
                    </Button>
                  )}
                  {entretien.status === "scheduled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => annuler(entretien.id)}
                      disabled={annulation === entretien.id}
                      className="gap-1.5"
                    >
                      <X size={14} aria-hidden="true" />
                      {annulation === entretien.id ? "Annulation..." : "Annuler"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar size={13} aria-hidden="true" />
        Chaque entretien confirmé déclenche une notification par email aux personnes concernées.
      </p>
    </div>
  );
}
