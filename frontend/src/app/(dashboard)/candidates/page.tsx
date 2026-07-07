"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Download,
  Plus,
  MapPin,
  Globe,
  Briefcase,
  ChevronRight,
  BarChart,
  Users,
  TrendingUp,
  Zap,
  Calendar,
} from "lucide-react";
import { usersService } from "@/services/users.service";
import { MatchScoreRing } from "@/components/shared/match-score-ring";
import type { CandidatVivier } from "@/types/domain";

/* Page Vivier de Talents (Vue Recruteur) */
export default function TalentPoolPage() {
  const [candidatActif, setCandidatActif] = useState<CandidatVivier | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function chargerCandidat() {
      try {
        // En mode démo on force la récupération d'un candidat ou un mock
        const data = await usersService.getCandidats();
        if (data.items.length > 0) {
          setCandidatActif(data.items[0]);
        } else {
          throw new Error("Empty list");
        }
      } catch (erreur) {
        console.error("Erreur de chargement du candidat", erreur);
        // Fallback mock
        setCandidatActif({
          id: "u1" as any,
          nom_complet: "Jane Doe",
          titre: "Senior Product Designer",
          localisation: "San Francisco, CA",
          annees_experience: 8,
          langues: ["English", "German"],
          score_correspondance: 94,
          libelle_correspondance: "Senior Product Designer",
          tags_correspondance: ["FINTECH EXP", "REACT CORE"],
          experiences: [
            {
              id: "e1",
              entreprise: "Stripe",
              poste: "Lead Product Designer",
              type_contrat: "Remote",
              date_debut: "JAN 2021",
              en_cours: true,
              description:
                "Dirige l'équipe design system pour les composants globaux de checkout. Migration réussie de plus de 400 instances d'UI historiques vers une architecture token-driven.",
            },
            {
              id: "e2",
              entreprise: "Airbnb",
              poste: "Senior Product Designer",
              type_contrat: "San Francisco",
              date_debut: "JUN 2018",
              date_fin: "DEC 2020",
              en_cours: false,
              description:
                "A mené la refonte de 'Host Experience' qui a conduit à une augmentation de 15% de la rétention des hôtes au cours des 6 premiers mois.",
            },
          ],
          competences: [
            { id: "s1", nom: "Product Strategy", niveau: "EXPERT" },
            { id: "s2", nom: "UI/Interaction Design", niveau: "EXPERT" },
            { id: "s3", nom: "Design Systems", niveau: "EXPERT" },
          ],
          activite_plateforme: {
            entretiens: 12,
            offres: 3,
          },
        });
      } finally {
        setChargement(false);
      }
    }
    chargerCandidat();
  }, []);

  if (chargement) return <div className="p-10 text-slate-500">Chargement...</div>;
  if (!candidatActif)
    return <div className="p-10 text-red-500">Candidat introuvable.</div>;

  return (
    <div className="flex h-full bg-[#0d1117]">
      {/* Sidebar Recruiter (Gauche) */}
      <aside className="hidden w-64 border-r border-white/5 bg-[#161b22] p-5 xl:flex xl:flex-col">
        <div className="mb-6 flex flex-col">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-600 text-white">
            <BarChart size={20} />
          </div>
          <h2 className="mt-3 font-bold text-white">Recruiter Hub</h2>
          <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
            Enterprise Edition
          </span>
        </div>

        <button className="mb-6 flex w-full items-center justify-center gap-2 rounded bg-blue-600/20 py-2.5 text-sm font-bold text-blue-500 hover:bg-blue-600/30">
          <Search size={16} /> Nouvelle recherche
        </button>

        <nav className="space-y-1">
          <button className="flex w-full items-center gap-3 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white">
            <Users size={18} className="text-white" /> Vivier de talents
          </button>
          <button className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">
            <TrendingUp size={18} /> Pipelines
          </button>
          <button className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">
            <Zap size={18} /> Match IA
          </button>
          <button className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">
            <Calendar size={18} /> Entretiens
          </button>
        </nav>
      </aside>

      {/* Contenu principal (Centre) */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        {/* Top Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex space-x-6 text-sm font-medium">
            <span className="border-b-2 border-blue-500 pb-1 text-white">
              Vivier de talents
            </span>
            <span className="text-slate-400 hover:text-slate-300">Pipelines</span>
            <span className="text-slate-400 hover:text-slate-300">Entretiens</span>
          </div>
          <div className="flex w-64 items-center gap-2 rounded-lg border border-white/10 bg-[#161b22] px-3 py-2">
            <Search size={16} className="text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher des talents..."
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>
        </div>

        {/* Action Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-400">
            Vivier de talents &gt; Design &gt;{" "}
            <span className="text-white">{candidatActif.nom_complet}</span>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 rounded-lg border border-white/20 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/5">
              <Download size={16} /> Télécharger le CV
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200">
              <Plus size={16} /> Ajouter au Pipeline
            </button>
          </div>
        </div>

        {/* Profil Carte */}
        <div className="mb-6 flex flex-col gap-6 rounded-2xl border border-white/5 bg-[#161b22] p-8 md:flex-row">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-800">
            {candidatActif.avatar_url ? (
              <img
                src={candidatActif.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
                {candidatActif.nom_complet.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl font-bold text-white">{candidatActif.nom_complet}</h1>
            <p className="text-lg text-slate-300">{candidatActif.titre}</p>
            <div className="flex flex-wrap gap-6 pt-2 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <MapPin size={16} /> {candidatActif.localisation}
              </span>
              <span className="flex items-center gap-2">
                <Briefcase size={16} /> {candidatActif.annees_experience}+ Années
                d'expérience
              </span>
              <span className="flex items-center gap-2">
                <Globe size={16} /> {candidatActif.langues?.join(", ")}
              </span>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <button className="w-48 rounded bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500">
              Planifier un entretien
            </button>
            <div className="flex gap-2">
              <button className="flex flex-1 justify-center rounded border border-white/10 bg-white/5 py-2 text-white hover:bg-white/10">
                <ChevronRight size={18} />
              </button>
              <button className="flex flex-1 justify-center rounded border border-white/10 bg-white/5 py-2 text-white hover:bg-white/10">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Expérience */}
          <section className="rounded-2xl border border-white/5 bg-[#161b22] p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
              Expérience Professionnelle
            </h2>
            <div className="space-y-6">
              {candidatActif.experiences.map((exp) => (
                <div
                  key={exp.id}
                  className="relative pl-10 before:absolute before:top-2 before:bottom-0 before:left-[19px] before:w-px before:bg-white/10"
                >
                  <div className="absolute top-2 left-2 h-4 w-4 rounded-full border-2 border-white/20 bg-[#161b22]" />
                  <div className="mb-1 flex items-start justify-between">
                    <h3 className="font-bold text-white">{exp.poste}</h3>
                    <span className="font-mono text-xs text-slate-500">
                      {exp.date_debut} — {exp.en_cours ? "PRÉSENT" : exp.date_fin}
                    </span>
                  </div>
                  <p className="mb-2 text-sm font-medium text-slate-400">
                    {exp.entreprise} • {exp.type_contrat}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {exp.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Compétences techniques */}
          <section className="rounded-2xl border border-white/5 bg-[#161b22] p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
              Maîtrise Technique
            </h2>
            <div className="space-y-4">
              {candidatActif.competences.map((comp) => (
                <div key={comp.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-white">{comp.nom}</span>
                    <span className="text-slate-400">{comp.niveau}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: comp.niveau === "EXPERT" ? "95%" : "70%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Sidebar Analytique (Droite) */}
      <aside className="hidden w-80 overflow-y-auto border-l border-white/5 bg-[#0d1117] p-6 lg:block">
        {/* Match IA */}
        <div className="mb-6 rounded-2xl border border-white/5 bg-[#161b22] p-6 text-center">
          <div className="mx-auto mb-4 w-24">
            <MatchScoreRing
              score={candidatActif.score_correspondance || 0}
              taille={100}
              epaisseur={6}
            />
          </div>
          <h3 className="mb-2 font-bold text-white">
            {candidatActif.libelle_correspondance}
          </h3>
          <p className="mb-4 text-xs leading-relaxed text-slate-400">
            Alignement exceptionnel avec la réflexion systémique et les flux de travail
            design-to-code.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {candidatActif.tags_correspondance?.map((tag) => (
              <span
                key={tag}
                className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Notes recruteur */}
        <div className="mb-6 rounded-2xl border border-white/5 bg-[#161b22] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-white">Notes du recruteur</h3>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
              PRIVÉ
            </span>
          </div>
          <div className="mb-4 rounded-lg bg-slate-900/50 p-4 text-sm text-slate-300 italic">
            "Jane possède une combinaison incroyablement rare de design visuel haut de
            gamme et d'une compréhension profonde de l'ingénierie front-end. Recommandée
            par notre CTO."
            <div className="mt-2 flex justify-between text-xs text-slate-500 not-italic">
              <span>— Marcus (Recruiting Mgr)</span>
              <span>Il y a 2j</span>
            </div>
          </div>
          <textarea
            placeholder="Ajouter une nouvelle note d'évaluation..."
            className="mb-3 w-full rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
            rows={3}
          />
          <button className="w-full rounded-lg bg-white/10 py-2 text-sm font-bold text-white hover:bg-white/20">
            Enregistrer la note
          </button>
        </div>

        {/* Activité */}
        <div className="rounded-2xl border border-white/5 bg-[#161b22] p-6">
          <h3 className="mb-4 flex items-center justify-between font-bold text-white">
            Activité sur la plateforme <BarChart size={16} className="text-slate-400" />
          </h3>
          <div className="flex gap-4">
            <div className="flex-1 rounded-xl bg-slate-900/50 p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {candidatActif.activite_plateforme?.entretiens}
              </div>
              <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Entretiens
              </div>
            </div>
            <div className="flex-1 rounded-xl bg-slate-900/50 p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {candidatActif.activite_plateforme?.offres}
              </div>
              <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Offres
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
