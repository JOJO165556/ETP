"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Share2, MapPin, Clock, Banknote, Building2, CheckCircle2 } from "lucide-react";
import { jobsService } from "@/services/jobs.service";
import { usersService } from "@/services/users.service";
import { TechBadge } from "@/components/shared/tech-badge";
import { MatchScoreRing } from "@/components/shared/match-score-ring";
import { SkillBar } from "@/components/shared/skill-bar";
import { JobCard } from "@/components/shared/job-card";
import { Button } from "@/components/ui/button";
import type { AnalyseCompetence, Job } from "@/types/domain";

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
  const [offresSimilaires, setOffresSimilaires] = useState<Job[]>([]);
  const [skillsUtilisateur, setSkillsUtilisateur] = useState<string[]>([]);
  const [chargement, setChargement] = useState(true);
  const [postulant, setPostulant] = useState(false);
  const [messageCandidature, setMessageCandidature] = useState<string | null>(null);

  useEffect(() => {
    async function chargerOffre() {
      try {
        const [data, similaires, profil] = await Promise.all([
          jobsService.getOffreParId(id),
          jobsService.getOffresSimilaires(id),
          usersService.getMonProfil().catch(() => null),
        ]);
        setOffre(data);
        setOffresSimilaires(similaires);
        setSkillsUtilisateur((profil?.profile?.skills ?? []).map((s) => s.toLowerCase()));
      } catch (erreur) {
        console.error("Erreur de chargement de l'offre", erreur);
      } finally {
        setChargement(false);
      }
    }
    chargerOffre();
  }, [id]);

  const analyse = useMemo<AnalyseCompetence[]>(() => {
    if (!offre?.tags) return [];
    return offre.tags.map((tag) => {
      const possedee = skillsUtilisateur.includes(tag.toLowerCase());
      return {
        libelle: tag,
        statut: possedee ? "validee" : "manquante",
        note: possedee
          ? "Compétence présente dans votre profil."
          : "Ajoutez cette compétence à votre profil pour améliorer votre score.",
      };
    });
  }, [offre, skillsUtilisateur]);

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
      <div className="p-8 text-muted-foreground">Chargement des détails de l'offre...</div>
    );
  }

  if (!offre) {
    return <div className="p-8 text-destructive">Offre introuvable.</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row">
      {/* Contenu principal */}
      <div className="flex-1 space-y-8 p-6 lg:p-10 lg:pr-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <Link href="/jobs" className="hover:text-[var(--color-foreground)] transition-colors duration-150">
            Fil d'offres
          </Link>
          <ChevronRight size={14} />
          <span className="text-[var(--color-foreground)]">{offre.title}</span>
        </div>

        {/* En-tête de l'offre */}
        <div className="flex flex-col gap-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 md:flex-row md:items-center md:justify-between transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-start gap-5">
            <div className="bg-gradient-to-br from-[var(--color-slate-900)] to-[var(--color-neutral-900)] flex h-16 w-16 items-center justify-center rounded-xl shadow-inner">
              <span className="text-xl font-bold text-[var(--color-foreground)]">
                {(offre.company_name ?? "?").substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[var(--color-foreground)]">{offre.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
                <span className="flex items-center gap-1.5 text-[var(--color-foreground)]">
                  <Building2 size={16} /> {offre.company_name}
                </span>
                {offre.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={16} /> {offre.location}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-[var(--color-muted-foreground)]">
                {offre.contract_type && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Clock size={16} /> {offre.contract_type}
                    </span>
                    <span>•</span>
                  </>
                )}
                {offre.salary_range && (
                  <span className="flex items-center gap-1.5 text-[var(--color-success)]">
                    <Banknote size={16} /> {offre.salary_range}
                  </span>
                )}
              </div>
              {offre.tags && offre.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {offre.tags.map((tag) => (
                    <TechBadge key={tag} libelle={tag} />
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
            <Button
              onClick={handlePostuler}
              disabled={postulant}
              className="shadow-lg transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100"
            >
              <span className="text-lg">⚡</span>{" "}
              {postulant ? "Envoi..." : "Candidature Rapide"}
            </Button>
            {messageCandidature && (
              <p className="max-w-[260px] text-right text-xs font-medium text-[var(--color-muted-foreground)]">
                {messageCandidature}
              </p>
            )}
            <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
              {offre.posted_at ? `Publiée le ${formaterDate(offre.posted_at)}` : "Publication récente"}{" "}
              • {offre.applicants_count ?? 0} candidats
            </p>
          </div>
        </div>

        {/* Section Match et Analyse */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Score global */}
          <div className="flex items-center gap-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 transition-shadow duration-200 hover:shadow-md">
            <MatchScoreRing score={offre.match_score ?? 0} />
            <div className="space-y-2">
              <h3 className="font-bold text-[var(--color-foreground)]">
                {offre.match_score != null ? `${Math.round(offre.match_score)}% de correspondance` : "Score non disponible"}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {offre.match_score != null && offre.match_score >= 70
                  ? "Votre profil s'aligne bien avec les prérequis de cette offre."
                  : "Votre profil ne couvre pas encore l'essentiel des compétences demandées."}
              </p>
            </div>
          </div>

          {/* Analyse des compétences */}
          {analyse.length > 0 && (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 transition-shadow duration-200 hover:shadow-md">
              <h3 className="mb-5 flex items-center gap-2 font-bold text-[var(--color-foreground)]">
                <CheckCircle2 size={18} className="text-[var(--color-primary)]" /> Analyse des compétences
              </h3>
              <div className="space-y-5">
                {analyse.map((skill, idx) => (
                  <SkillBar
                    key={idx}
                    libelle={skill.libelle}
                    statut={skill.statut}
                    note={skill.note}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contenu texte */}
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-xl font-bold text-[var(--color-foreground)]">À propos du poste</h2>
            <div className="text-sm leading-relaxed text-[var(--color-foreground)]/85">
              {offre.description ? (
                <p>{offre.description}</p>
              ) : (
                <p className="text-[var(--color-muted-foreground)]">Aucune description disponible pour cette offre.</p>
              )}
            </div>
          </section>

          {responsabilites.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold text-[var(--color-foreground)]">Responsabilités</h2>
              <ul className="space-y-3">
                {responsabilites.map((resp, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-[var(--color-foreground)]/85">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
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
        {/* Offres similaires */}
        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-wider text-[var(--color-muted-foreground)] uppercase">
            Rôles similaires
          </h3>
          {offresSimilaires.length === 0 ? (
            <p className="border-[var(--border-subtle)] bg-[var(--surface-card)] rounded-xl border p-5 text-sm text-[var(--color-muted-foreground)]">
              Aucune offre similaire pour le moment.
            </p>
          ) : (
            <div className="space-y-3">
              {offresSimilaires.map((similaire) => (
                <JobCard key={similaire.id} offre={similaire} className="p-4" />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}