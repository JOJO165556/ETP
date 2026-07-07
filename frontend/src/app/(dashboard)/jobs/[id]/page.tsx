"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Bookmark,
  Share2,
  MapPin,
  Clock,
  Banknote,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { jobsService } from "@/services/jobs.service";
import { TechBadge } from "@/components/shared/tech-badge";
import { MatchScoreRing } from "@/components/shared/match-score-ring";
import { SkillBar } from "@/components/shared/skill-bar";
import { JobCard } from "@/components/shared/job-card";
import type { DetailOffre } from "@/types/domain";

export default function DetailOffrePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;

  const [offre, setOffre] = useState<DetailOffre | null>(null);
  const [chargement, setChargement] = useState(true);
  const [postulant, setPostulant] = useState(false);

  useEffect(() => {
    async function chargerOffre() {
      try {
        const data = await jobsService.getOffreParId(id);
        setOffre(data);
      } catch (erreur) {
        console.error("Erreur de chargement de l'offre", erreur);
        // Fallback mock
        setOffre({
          id: id as any,
          title: "Senior Frontend Engineer",
          company_name: "NexusTech Innovations",
          company_id: "c1" as any,
          location: "San Francisco, CA (Hybrid)",
          salary_range: "$150k - $190k",
          contract_type: "CDI",
          tags: ["React", "TypeScript", "Three.js"],
          match_score: 85,
          posted_at: "Il y a 2 jours",
          applicants_count: 45,
          is_active: true,
          overview:
            "NexusTech recherche un ingénieur frontend senior pour diriger le développement de notre plateforme de visualisation de données nouvelle génération.",
          responsibilities: [
            "Architecturer et construire des applications frontend scalables avec React et Next.js.",
            "Développer des composants de visualisation de données complexes avec D3.js et Three.js.",
            "Mentorer les développeurs juniors et mener des revues de code.",
          ],
          skill_analysis: [
            { libelle: "React / Next.js", statut: "validee" },
            { libelle: "TypeScript", statut: "validee" },
            {
              libelle: "Three.js / WebGL",
              statut: "manquante",
              note: "Nécessite 2+ ans d'expérience. Vous avez 6 mois.",
            },
          ],
          culture_perks: [
            "Hybride flexible (2 jours sur site)",
            "Couverture santé 100%",
            "Budget formation 2000$/an",
          ],
          hiring_manager: {
            nom: "Sarah Jenkins",
            titre: "VP of Engineering at NexusTech",
          },
          similar_jobs: [],
        });
      } finally {
        setChargement(false);
      }
    }
    chargerOffre();
  }, [id]);

  const handlePostuler = async () => {
    setPostulant(true);
    try {
      await jobsService.postuler(id);
      alert("Candidature envoyée avec succès !");
    } catch (e) {
      alert("Erreur lors de la candidature.");
    } finally {
      setPostulant(false);
    }
  };

  if (chargement) {
    return <div className="p-8 text-slate-500">Chargement des détails de l'offre...</div>;
  }

  if (!offre) {
    return <div className="p-8 text-red-500">Offre introuvable.</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:flex-row">
      {/* Contenu principal */}
      <div className="flex-1 space-y-8 p-6 lg:p-10 lg:pr-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/jobs" className="hover:text-white">
            Fil d'offres
          </Link>
          <ChevronRight size={14} />
          <span>Ingénierie</span>
          <ChevronRight size={14} />
          <span className="text-white">{offre.title}</span>
        </div>

        {/* En-tête de l'offre */}
        <div className="flex flex-col gap-6 rounded-2xl border border-white/5 bg-[#161b22] p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 to-slate-900 shadow-inner">
              <span className="text-xl font-bold text-white">
                {offre.company_name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">{offre.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="flex items-center gap-1.5 text-white">
                  <Building2 size={16} /> {offre.company_name}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} /> {offre.location}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Clock size={16} /> {offre.contract_type}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Banknote size={16} /> {offre.salary_range}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {offre.tags.map((tag) => (
                  <TechBadge key={tag} libelle={tag} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 border-t border-white/10 pt-6 md:border-t-0 md:pt-0">
            <div className="flex gap-2">
              <button className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
                <Bookmark size={20} />
              </button>
              <button className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
                <Share2 size={20} />
              </button>
            </div>
            <button
              onClick={handlePostuler}
              disabled={postulant}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-500 disabled:opacity-50"
            >
              <span className="text-lg">⚡</span>{" "}
              {postulant ? "Envoi..." : "Candidature Rapide"}
            </button>
            <p className="text-xs font-medium text-slate-500">
              Publiée {offre.posted_at.toLowerCase()} • {offre.applicants_count} candidats
            </p>
          </div>
        </div>

        {/* Section Match et Analyse */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Score globale */}
          <div className="flex items-center gap-6 rounded-2xl border border-white/5 bg-[#161b22] p-6">
            <MatchScoreRing score={offre.match_score || 0} />
            <div className="space-y-2">
              <h3 className="font-bold text-white">Excellente correspondance</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Votre profil s'aligne exceptionnellement bien avec les prérequis. Vous
                dépassez l'expérience nécessaire, bien qu'il y ait un léger écart
                technique détecté.
              </p>
            </div>
          </div>

          {/* Analyse des compétences */}
          <div className="rounded-2xl border border-white/5 bg-[#161b22] p-6">
            <h3 className="mb-5 flex items-center gap-2 font-bold text-white">
              <CheckCircle2 size={18} className="text-blue-500" /> Analyse des compétences
            </h3>
            <div className="space-y-5">
              {offre.skill_analysis?.map((skill, idx) => (
                <SkillBar
                  key={idx}
                  libelle={skill.libelle}
                  statut={skill.statut}
                  note={skill.note}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Contenu texte */}
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-xl font-bold text-white">À propos du poste</h2>
            <div className="text-sm leading-relaxed text-slate-300">
              <p>{offre.overview}</p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-white">Responsabilités</h2>
            <ul className="space-y-3">
              {offre.responsibilities.map((resp, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-blue-500" />
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Barre latérale droite */}
      <aside className="w-full space-y-6 border-l border-white/5 bg-[#0d1117] p-6 lg:w-[350px]">
        {/* Recruteur */}
        {offre.hiring_manager && (
          <div>
            <h3 className="mb-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Responsable du recrutement
            </h3>
            <div className="rounded-xl border border-white/5 bg-[#161b22] p-5 text-center">
              <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full bg-slate-800">
                {offre.hiring_manager.avatar_url ? (
                  <img
                    src={offre.hiring_manager.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xl text-white">
                    {offre.hiring_manager.nom.charAt(0)}
                  </div>
                )}
              </div>
              <h4 className="font-bold text-white">{offre.hiring_manager.nom}</h4>
              <p className="mb-4 text-xs text-slate-400">{offre.hiring_manager.titre}</p>
              <button className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-sm font-medium text-white transition hover:bg-white/10">
                Envoyer un message
              </button>
            </div>
          </div>
        )}

        {/* Culture et Avantages */}
        {offre.culture_perks && (
          <div>
            <h3 className="mb-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Culture & Avantages
            </h3>
            <div className="rounded-xl border border-white/5 bg-[#161b22] p-2">
              {offre.culture_perks.map((perk, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-400">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-sm font-medium text-slate-300">{perk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offres similaires */}
        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Rôles similaires
          </h3>
          <div className="space-y-3">
            <JobCard
              offre={{
                id: "2" as any,
                title: "Lead UI Engineer",
                company_name: "DataFlow Systems",
                company_id: "c2" as any,
                location: "San Francisco, CA",
                match_score: 92,
                tags: [],
                posted_at: "Il y a 3j",
                is_active: true,
              }}
              className="p-4"
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
