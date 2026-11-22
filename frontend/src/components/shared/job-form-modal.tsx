"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { ApiRequestError } from "@/lib/api";
import { jobsService } from "@/services/jobs.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Job, JobStatus } from "@/types/domain";

const STATUTS: { value: JobStatus; label: string }[] = [
  { value: "draft", label: "Brouillon" },
  { value: "active", label: "Publiée" },
  { value: "closed", label: "Clôturée" },
];

function analyserCompetences(brut: string): string[] {
  return [
    ...new Set(
      brut
        .split(/[\n,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}

interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Offre existante → mode édition (PATCH), sinon création (POST). */
  offre?: Job | null;
  onSaved: (offre: Job) => void;
}

/* Modale de création / édition d'une offre d'emploi (recruteur). */
export function JobFormModal({ isOpen, onClose, offre, onSaved }: JobFormModalProps) {
  const edition = Boolean(offre);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [adresse, setAdresse] = useState("");
  const [teletravail, setTeletravail] = useState(false);
  const [competences, setCompetences] = useState("");
  const [statut, setStatut] = useState<JobStatus>("active");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitre(offre?.title ?? "");
    setDescription(offre?.description ?? "");
    setAdresse(offre?.formatted_address ?? "");
    setTeletravail(offre?.is_remote ?? false);
    setCompetences((offre?.required_skills ?? []).join(", "));
    setStatut(offre?.status ?? "active");
    setErreur(null);
  }, [isOpen, offre]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim() || !description.trim()) {
      setErreur("Le titre et la description sont obligatoires.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const payload = {
        title: titre.trim(),
        description: description.trim(),
        is_remote: teletravail,
        formatted_address: adresse.trim() || null,
        required_skills: analyserCompetences(competences),
        status: statut,
      };
      const sauvegardee = edition
        ? await jobsService.mettreAJourOffre(offre!.id, payload)
        : await jobsService.creerOffre(payload);
      onSaved(sauvegardee);
      onClose();
    } catch (err) {
      setErreur(
        err instanceof ApiRequestError && err.status === 403
          ? "Vous n'êtes pas autorisé à gérer les offres de cette entreprise."
          : err instanceof Error
            ? err.message
            : "Une erreur est survenue. Réessayez."
      );
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={edition ? "Modifier l'offre" : "Publier une offre"}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold text-foreground">
          {edition ? "Modifier l'offre" : "Publier une offre"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {edition
            ? "Mettez à jour les informations visibles par les candidats."
            : "L'offre sera visible par les candidats dès sa publication."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="job-title" className="text-xs font-semibold text-foreground">
              Intitulé du poste *
            </label>
            <Input
              id="job-title"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex. : Développeur Full-Stack Senior"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="job-description" className="text-xs font-semibold text-foreground">
              Description *
            </label>
            <Textarea
              id="job-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Missions, profil recherché, avantages…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="job-address" className="text-xs font-semibold text-foreground">
                Adresse / ville
              </label>
              <Input
                id="job-address"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Paris, Lyon…"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="job-status" className="text-xs font-semibold text-foreground">
                Statut
              </label>
              <select
                id="job-status"
                value={statut}
                onChange={(e) => setStatut(e.target.value as JobStatus)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                {STATUTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="job-skills" className="text-xs font-semibold text-foreground">
              Compétences requises
            </label>
            <Input
              id="job-skills"
              value={competences}
              onChange={(e) => setCompetences(e.target.value)}
              placeholder="React, Python, SQL (séparées par des virgules)"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={teletravail}
              onChange={(e) => setTeletravail(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Télétravail autorisé
          </label>

          {erreur && (
            <p role="alert" className="text-sm text-destructive">
              {erreur}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={enCours}>
              Annuler
            </Button>
            <Button type="submit" disabled={enCours} className="gap-2">
              {enCours && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
              {edition ? "Enregistrer" : "Publier l'offre"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
