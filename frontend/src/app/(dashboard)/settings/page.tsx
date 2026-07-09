"use client";

import { useState, useEffect } from "react";
import {
  Edit2,
  MapPin,
  Mail,
  Plus,
  CheckCircle2,
  ChevronRight,
  Briefcase,
  Star,
  GraduationCap,
  Rocket,
  Eye,
  Users,
} from "lucide-react";
import { usersService } from "@/services/users.service";
import type { ProfilCandidat } from "@/types/domain";

/* Page de profil et paramètres du candidat (Candidate Profile Editor) */
export default function ProfilPage() {
  const [profil, setProfil] = useState<ProfilCandidat | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function chargerProfil() {
      try {
        const data = await usersService.getMonProfil();
        setProfil(data);
      } catch (erreur) {
        console.error("Erreur de chargement du profil", erreur);
        // Fallback mock
        setProfil({
          id: "u1" as any,
          nom_complet: "Jane Doe",
          titre: "Senior Product Designer & Systems Architect",
          localisation: "San Francisco, CA",
          email: "jane.doe@enterprise.ai",
          force_profil: 85,
          conseil_completion: "Historique de formation",
          profil_public: true,
          recherchable: true,
          experiences: [
            {
              id: "e1",
              entreprise: "Stripe",
              poste: "Senior Design Systems Architect",
              type_contrat: "Temps plein",
              date_debut: "2021",
              en_cours: true,
              description:
                "Diriger l'évolution des frameworks de design internes, en assurant une précision mathématique sur plus de 40 surfaces produits. Mentorat d'une équipe de 12 designers juniors.",
            },
            {
              id: "e2",
              entreprise: "Airbnb",
              poste: "Product Designer",
              type_contrat: "Contrat",
              date_debut: "2018",
              date_fin: "2021",
              en_cours: false,
              description:
                "Refonte du flux de réservation principal pour les séjours urbains à haute densité, entraînant une augmentation de 14% des taux de conversion pour la région EMEA.",
            },
          ],
          competences: [
            { id: "s1", nom: "Figma & UI Design", niveau: "EXPERT", est_verifiee: true },
            { id: "s2", nom: "Tailwind CSS", niveau: "AVANCE", est_verifiee: true },
            { id: "s3", nom: "React.js", niveau: "INTERMEDIAIRE", est_verifiee: false },
            {
              id: "s4",
              nom: "Enterprise AI Architect",
              niveau: "EXPERT",
              est_verifiee: true,
            },
            { id: "s5", nom: "Product Strategy", niveau: "AVANCE", est_verifiee: true },
          ],
          formations: [
            {
              id: "edu1",
              etablissement: "Rhode Island School of Design",
              diplome: "MFA in Interface Design",
              annee: 2018,
            },
            {
              id: "edu2",
              etablissement: "Coursera",
              diplome: "Google UX Professional Cert",
              annee: 2020,
            },
            {
              id: "edu3",
              etablissement: "Stanford University",
              diplome: "B.S. in Computer Science",
              annee: 2016,
            },
          ],
        });
      } finally {
        setChargement(false);
      }
    }
    chargerProfil();
  }, []);

  if (chargement) {
    return <div className="p-10 text-slate-500">Chargement de votre profil...</div>;
  }

  if (!profil) {
    return <div className="p-10 text-red-500">Erreur de chargement du profil.</div>;
  }

  return (
    <div className="flex h-full">
      {/* Contenu de la page */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        {/* Header avec bouton Save Changes */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex space-x-6 text-sm font-medium">
            <span className="text-white">Annuaire</span>
            <span className="text-slate-400 hover:text-slate-300">Analytiques</span>
            <span className="text-slate-400 hover:text-slate-300">Rapports</span>
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-blue-100 px-5 py-2 text-sm font-bold text-blue-900 transition hover:bg-blue-200">
            Enregistrer les modifications
          </button>
        </div>

        {/* Section Haute (Cartes Profil + Force Profil) */}
        <div className="mb-8 grid gap-6 xl:grid-cols-[1fr_350px]">
          {/* Carte d'identité */}
          <div className="flex flex-col gap-6 rounded-2xl border border-white/5 bg-[#161b22] p-6 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 rounded-xl bg-slate-800">
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-500">
                {profil.nom_complet.charAt(0)}
              </div>
              <button className="absolute -right-2 -bottom-2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-500 bg-slate-700 text-white shadow-lg transition hover:bg-slate-600">
                <Edit2 size={14} />
              </button>
            </div>

            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold text-white">{profil.nom_complet}</h1>
              <p className="text-lg text-slate-300">{profil.titre}</p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-slate-400">
                <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <MapPin size={14} /> {profil.localisation}
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <Mail size={14} /> {profil.email}
                </span>
              </div>
            </div>
          </div>

          {/* Force du profil */}
          <div className="flex flex-col justify-center rounded-2xl border border-white/5 bg-[#161b22] p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-white">Force du Profil</h3>
              <span className="font-mono text-xs text-slate-400">
                {profil.force_profil}% Complété
              </span>
            </div>
            <div className="mb-4 h-2 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-400 transition-all duration-1000"
                style={{ width: `${profil.force_profil}%` }}
              />
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Complétez votre{" "}
              <span className="cursor-pointer font-medium text-blue-400 hover:underline">
                {profil.conseil_completion}
              </span>{" "}
              pour atteindre 100% et débloquer les correspondances premium.
            </p>
          </div>
        </div>

        {/* Expérience Professionnelle */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <Briefcase size={20} className="text-slate-500" /> Expérience
              Professionnelle
            </h2>
            <button className="flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300">
              <Plus size={16} /> Ajouter une position
            </button>
          </div>

          <div className="space-y-4">
            {profil.experiences.map((exp) => (
              <div
                key={exp.id}
                className="group relative rounded-xl border border-white/5 bg-[#161b22] p-6 transition hover:border-white/10"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/5 font-bold text-slate-400">
                    {exp.entreprise.charAt(0)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">{exp.poste}</h3>
                        <p className="text-sm text-slate-400">
                          {exp.entreprise} • {exp.type_contrat}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-slate-400">
                          {exp.date_debut} — {exp.en_cours ? "Présent" : exp.date_fin}
                        </span>
                        <button className="text-slate-500 opacity-0 transition group-hover:opacity-100 hover:text-white">
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>
                    {exp.description && (
                      <p className="text-sm leading-relaxed text-slate-300">
                        {exp.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Compétences et Formations */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* Compétences */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                <Star size={20} className="text-slate-500" /> Compétences & Maîtrise
              </h2>
              <button className="text-xs font-medium text-blue-400 hover:underline">
                Tout gérer
              </button>
            </div>
            <div className="rounded-xl border border-white/5 bg-[#161b22] p-6">
              <div className="grid grid-cols-2 gap-3">
                {profil.competences.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{comp.nom}</div>
                      <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                        {comp.niveau}
                      </div>
                    </div>
                    {comp.est_verifiee ? (
                      <CheckCircle2 size={14} className="text-blue-500" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-slate-600" />
                    )}
                  </div>
                ))}
                <button className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-transparent px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">
                  <Plus size={16} /> Ajouter
                </button>
              </div>
            </div>
          </section>

          {/* Formations */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                <GraduationCap size={20} className="text-slate-500" /> Formations &
                Certifications
              </h2>
              <button className="text-xs font-medium text-blue-400 hover:underline">
                Historique
              </button>
            </div>
            <div className="space-y-3">
              {profil.formations.map((form) => (
                <div
                  key={form.id}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-[#161b22] p-4 transition hover:bg-white/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{form.diplome}</h4>
                      <p className="text-xs text-slate-400">
                        {form.etablissement} • {form.annee}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-600" />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Visibilité & Confidentialité */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
            <span className="text-slate-500">🔒</span> Visibilité & Confidentialité
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Toggles simples */}
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#161b22] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                  <Rocket size={16} />
                </div>
                <span className="text-sm font-medium text-white">Recherchable</span>
              </div>
              <div className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full bg-blue-500">
                <span className="inline-block h-4 w-4 translate-x-4 transform rounded-full bg-white transition" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#161b22] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400">
                  <Eye size={16} />
                </div>
                <span className="text-sm font-medium text-white">Profil Public</span>
              </div>
              <select className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white">
                <option>Public</option>
                <option>Privé</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-[#161b22] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400">
                  <Users size={16} />
                </div>
                <span className="text-sm font-medium text-white">Recruteurs</span>
              </div>
              <div className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full bg-slate-700">
                <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-white transition" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Sidebar Editor Tools (Bouton Publish) */}
      <div className="border-border hidden w-64 border-l bg-[#0d1117] p-6 lg:block">
        <h3 className="mb-6 text-sm font-bold text-white">
          ETP Workspace <br />
          <span className="text-xs font-normal text-slate-400">Éditeur de profil</span>
        </h3>

        <div className="mb-10 space-y-4">
          <button className="w-full rounded bg-white/5 px-3 py-2 text-left text-sm font-medium text-white">
            Profil
          </button>
          <button className="w-full rounded px-3 py-2 text-left text-sm font-medium text-slate-400 hover:bg-white/5">
            Expérience
          </button>
          <button className="w-full rounded px-3 py-2 text-left text-sm font-medium text-slate-400 hover:bg-white/5">
            Compétences
          </button>
          <button className="w-full rounded px-3 py-2 text-left text-sm font-medium text-slate-400 hover:bg-white/5">
            Formations
          </button>
        </div>

        <button className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-blue-500">
          Publier le Profil
        </button>
      </div>
    </div>
  );
}
