"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Share2, MapPin, Briefcase, Building2, CheckCircle2 } from "lucide-react";
import { jobsService } from "@/services/jobs.service";
import { usersService } from "@/services/users.service";
import { JobFormModal } from "@/components/shared/job-form-modal";
import { JobApplicationsPanel } from "@/components/recruiter/job-applications-panel";
import { TechBadge } from "@/components/shared/tech-badge";
import { SkillBar } from "@/components/shared/skill-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatePanel } from "@/components/shared/state-panel";
import type { AnalyseCompetence, Job, UserResponse } from "@/types/domain";

const LIBELLES_STATUT: Record<Job["status"], string> = {
  draft: "Brouillon",
  active: "Active",
  closed: "Clôturée",
  archived: "Archivée",
};

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

export default function DetailOffrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;

  const [offre, setOffre] = useState<Job | null>(null);
  const [profil, setProfil] = useState<UserResponse | null>(null);
  const [skillsUtilisateur, setSkillsUtilisateur] = useState<string[]>([]);
  const [chargement, setChargement] = useState(true);
  const [postulant, setPostulant] = useState(false);
  const [messageCandidature, setMessageCandidature] = useState<string | null>(null);
  const [modaleEdition, setModaleEdition] = useState(false);

  useEffect(() => {
    async function chargerOffre() {
      try {
        const [data, profil] = await Promise.all([
          jobsService.getOffreParId(id),
          usersService.getMonProfil().catch(() => null),
        ]);
        setOffre(data);
        setProfil(profil);
        setSkillsUtilisateur((profil?.profile?.skills ?? []).map((s) => s.toLowerCase()));
      } catch (erreur) {
        console.error("Erreur de chargement de l'offre", erreur);
      } finally {
        setChargement(false);
      }
    }
    chargerOffre();
  }, [id]);

  const competences = offre?.required_skills ?? [];

  const estProprietaire = Boolean(
    offre &&
      profil &&
      (profil.role === "recruiter" || profil.role === "company_admin") &&
      profil.company_id != null &&
      String(profil.company_id) === offre.company_id
  );

  const handleStatut = async (statut: Job["status"]) => {
    if (!offre) return;
    try {
      const maj = await jobsService.mettreAJourOffre(offre.id, { status: statut });
      setOffre(maj);
      setMessageCandidature(
        statut === "active" ? "Offre publiée." : "Offre dépubliée."
      );
    } catch {
      setMessageCandidature("Le changement de statut a échoué.");
    }
  };

  const analyse = useMemo<AnalyseCompetence[]>(() => {
    return competences.map((competence) => {
      const possedee = skillsUtilisateur.includes(competence.toLowerCase());
      return {
        libelle: competence,
        statut: possedee ? "validee" : "manquante",
        note: possedee
          ? "Compétence présente dans votre profil."
          : "Ajoutez cette compétence à votre profil pour améliorer votre score.",
      };
    });
  }, [competences, skillsUtilisateur]);

  // Le backend fournit la description brute : les lignes deviennent des responsabilités.
  const responsabilites = useMemo(() => {
    if (!offre?.description) return [];
    return offre.description
      .split("\n")
      .map((ligne) => ligne.trim())
      .filter((ligne) => ligne.length > 0 && !/^[-•*]\s*$/.test(ligne))
      .map((ligne) => ligne.replace(/^[-•*]\s*/, ""));
  }, [offre]);

  const handlePostuler = async () => {
    setPostulant(true);
    setMessageCandidature(null);
    try {
      const reponse = await jobsService.postuler(id);
      setMessageCandidature(
        reponse.task_status === "PENDING"
          ? "Candidature envoyée ! L'analyse de votre CV est en cours."
          : "Candidature envoyée avec succès !"
      );
    } catch (e) {
      console.error(e);
      setMessageCandidature("Erreur lors de l'envoi de la candidature.");
    } finally {
      setPostulant(false);
    }
  };

  const handlePartager = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: offre?.title, url: window.location.href });
      } catch {
        /* partage annulé */
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setMessageCandidature("Lien copié dans le presse-papiers.");
      } catch {
        /* presse-papiers indisponible */
      }
    }
  };

  if (chargement) {
    return (
      <div className="space-y-4 p-6 lg:p-10">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!offre) {
    return (
      <div className="p-6 lg:p-10">
        <StatePanel
          tone="error"
          title="Cette offre est introuvable"
          description="Elle a peut-être été retirée ou son adresse a changé."
        />
        <div className="mt-4 text-center">
          <Button variant="outline" render={<Link href="/jobs" />}>
            Revenir aux offres
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row">
      {/* Contenu principal */}
      <div className="flex-1 space-y-8 p-6 lg:p-10 lg:pr-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Link href="/jobs" className="hover:text-[var(--text-primary)] transition-colors duration-150">
            Fil d'offres
          </Link>
          <ChevronRight size={14} />
          <span className="text-[var(--text-primary)]">{offre.title}</span>
        </div>

        {/* En-tête de l'offre */}
        <div className="flex flex-col gap-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 md:flex-row md:items-center md:justify-between transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
              <span className="text-xl font-semibold text-foreground">
                {(offre.company_name ?? "?").substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{offre.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5 text-[var(--text-primary)]">
                  <Building2 size={16} /> {offre.company_name ?? "Entreprise"}
                </span>
                {offre.formatted_address && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={16} /> {offre.formatted_address}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Briefcase size={16} /> {offre.is_remote ? "Télétravail" : "Présentiel"}
                </span>
                <span>•</span>
                <span>{LIBELLES_STATUT[offre.status]}</span>
              </div>
              {competences.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {competences.map((competence) => (
                    <TechBadge key={competence} libelle={competence} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 border-t border-[var(--border-subtle)] pt-6 md:border-t-0 md:pt-0">
            <div className="flex gap-2">
              <Button
                onClick={handlePartager}
                aria-label="Partager l'offre"
                variant="outline"
                size="icon"
                className="h-11 w-11 transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100"
              >
                <Share2 size={20} />
              </Button>
            </div>
            {!estProprietaire && (
              <Button
                onClick={handlePostuler}
                disabled={postulant || offre.status !== "active"}
                className="min-w-[190px]"
              >
                {postulant ? "Envoi en cours..." : "Postuler à cette offre"}
              </Button>
            )}
            {estProprietaire && profil && (
              <div className="flex flex-col gap-2">
                <Button onClick={() => setModaleEdition(true)}>
                  Modifier l&apos;offre
                </Button>
                {offre.status !== "active" ? (
                  <Button variant="outline" onClick={() => void handleStatut("active")}>
                    Publier l&apos;offre
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => void handleStatut("closed")}>
                    Dépublier l&apos;offre
                  </Button>
                )}
              </div>
            )}
            {messageCandidature && (
              <p className="max-w-[260px] text-right text-xs font-medium text-[var(--text-muted)]">
                {messageCandidature}
              </p>
            )}
            <p className="text-xs font-medium text-[var(--text-muted)]">
              {offre.created_at ? `Publiée le ${formaterDate(offre.created_at)}` : "Publication récente"}
            </p>
          </div>
        </div>

        {/* Panneau recruteur : candidatures, évaluation, entretiens */}
        {estProprietaire && profil && (
          <JobApplicationsPanel jobId={offre.id} currentUser={profil} />
        )}

        {/* Analyse des compétences */}
        {analyse.length > 0 && skillsUtilisateur.length > 0 && (
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 transition-shadow duration-200 hover:shadow-md">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
              <CheckCircle2 size={18} className="text-[var(--brand-primary)]" /> Analyse des compétences
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              {analyse.map((skill, idx) => (
                <SkillBar
                  key={idx}
                  libelle={skill.libelle}
                  statut={skill.statut}
                  note={skill.note}
                />
              ))}
            </div>
          </section>
        )}

        {/* Contenu texte */}
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">À propos du poste</h2>
            <div className="text-sm leading-relaxed text-[var(--text-primary)]/85">
              {offre.description ? (
                <p className="whitespace-pre-line">{offre.description}</p>
              ) : (
                <p className="text-[var(--text-muted)]">Aucune description disponible pour cette offre.</p>
              )}
            </div>
          </section>

          {responsabilites.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">Responsabilités</h2>
              <ul className="space-y-3">
                {responsabilites.map((resp, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-[var(--text-primary)]/85">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--brand-primary)]" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Barre latérale droite */}
      <aside className="border-[var(--border-subtle)] bg-[var(--surface-canvas)] w-full space-y-6 border-l p-6 lg:w-[350px]">
        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase">
            Détails de l&apos;offre
          </h3>
          <dl className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Statut</dt>
              <dd className="font-medium text-foreground">{LIBELLES_STATUT[offre.status]}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Mode de travail</dt>
              <dd className="font-medium text-foreground">
                {offre.is_remote ? "Télétravail" : "Présentiel"}
              </dd>
            </div>
            {offre.formatted_address && (
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground">Localisation</dt>
                <dd className="text-right font-medium text-foreground">{offre.formatted_address}</dd>
              </div>
            )}
            {offre.created_at && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Publiée le</dt>
                <dd className="font-medium text-foreground">{formaterDate(offre.created_at)}</dd>
              </div>
            )}
            {competences.length > 0 && (
              <div>
                <dt className="mb-2 text-muted-foreground">Compétences requises</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {competences.map((competence) => (
                    <TechBadge key={competence} libelle={competence} />
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </aside>

      <JobFormModal
        isOpen={modaleEdition}
        onClose={() => setModaleEdition(false)}
        offre={offre}
        onSaved={(maj) => setOffre(maj)}
      />
    </div>
  );
}
