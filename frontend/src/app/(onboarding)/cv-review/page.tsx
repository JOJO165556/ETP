"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ZoomIn,
  ZoomOut,
  User,
  Lightbulb,
  Briefcase,
  Plus,
  X,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

/* Page de validation des données extraites du CV (Étape 3 de l'onboarding) */
export default function CVReviewPage() {
  const router = useRouter();

  // Données factices simulant les résultats du parsing
  const [skills, setSkills] = useState([
    "React",
    "TypeScript",
    "Architecture Système",
    "GraphQL",
  ]);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    // Récupération des données extraites par le backend lors du CV upload
    const storedData = sessionStorage.getItem("cv_profile_data");
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setProfileData(parsed);
        if (parsed.skills && Array.isArray(parsed.skills) && parsed.skills.length > 0) {
          setSkills(parsed.skills);
        }
      } catch (e) {
        console.error("Erreur de parsing des données du profil", e);
      }
    }
  }, []);

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleComplete = async () => {
    try {
      await api.patch("/users/me", {
        profile: {
          skills: skills,
        },
      });
      router.push("/overview");
    } catch (e) {
      console.error("Erreur lors de la sauvegarde du profil", e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto w-full max-w-6xl space-y-8"
    >
      {/* En-tête de validation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Vérification du Profil Parsé</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-primary flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white">
              ✓
            </div>
            <span className="text-primary text-xs font-medium">Upload</span>
          </div>
          <div className="h-px w-8 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="bg-primary flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white">
              ✓
            </div>
            <span className="text-primary text-xs font-medium">Analyse</span>
          </div>
          <div className="h-px w-8 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="border-primary text-primary flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold">
              3
            </div>
            <span className="text-xs font-medium text-white">Vérification</span>
          </div>
        </div>
      </div>

      <div className="flex h-[750px] flex-col gap-6 lg:flex-row">
        {/* Colonne de gauche : Document original (PDF simulé) */}
        <div className="flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#13192f] lg:w-[45%]">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <Search size={16} className="text-gray-400" />
              <h2 className="text-sm font-bold">Document Original</h2>
            </div>
            <div className="flex items-center gap-1">
              <button className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
                <ZoomOut size={16} />
              </button>
              <button className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white">
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
          <div className="relative flex-1 p-6">
            <div className="absolute inset-6 overflow-hidden rounded-md border border-white/10 bg-white/5 p-8 opacity-50 blur-[1px]">
              {/* Squelette simulant le contenu du document */}
              <div className="mb-8 h-10 w-1/2 rounded bg-white/20" />
              <div className="mb-8 space-y-4">
                <div className="h-5 w-full rounded bg-white/10" />
                <div className="h-5 w-5/6 rounded bg-white/10" />
                <div className="h-5 w-4/6 rounded bg-white/10" />
              </div>
              <div className="mb-4 h-8 w-1/3 rounded bg-white/20" />
              <div className="mb-8 space-y-4">
                <div className="h-5 w-full rounded bg-white/10" />
                <div className="h-5 w-3/4 rounded bg-white/10" />
              </div>
              <div className="mb-4 h-8 w-1/3 rounded bg-white/20" />
              <div className="space-y-4">
                <div className="h-5 w-full rounded bg-white/10" />
                <div className="h-5 w-4/5 rounded bg-white/10" />
              </div>
            </div>

            {/* Badge d'analyse terminée */}
            <div className="bg-primary/5 pointer-events-none absolute inset-0" />
            <div className="border-primary/30 text-primary absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded border bg-black/80 px-4 py-2 font-mono text-xs backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                <span className="bg-primary relative inline-flex h-2 w-2 rounded-full"></span>
              </span>
              Analyse du document terminée
            </div>
          </div>
        </div>

        {/* Colonne de droite : Données extraites éditables */}
        <div className="flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b1021] lg:w-[55%]">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-white">Données du Profil Parsé</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Veuillez vérifier et corriger les informations extraites ci-dessous.
              </p>
            </div>
            <div className="bg-primary/20 border-primary/30 text-primary flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
              ✨ Extrait par IA
            </div>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto p-6">
            {/* Informations de base */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-white">
                <User size={18} className="text-gray-400" />
                <h3 className="text-sm font-bold">Informations de base</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    defaultValue="Thomas Dupont"
                    className="focus:border-primary focus:ring-primary w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white transition-colors focus:ring-1 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue="thomas.dupont@exemple.com"
                      className="focus:border-primary focus:ring-primary w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white transition-colors focus:ring-1 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      defaultValue={profileData?.phone || "+33 6 12 34 56 78"}
                      className="focus:border-primary focus:ring-primary w-full rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white transition-colors focus:ring-1 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Compétences extraites */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2 text-white">
                  <Lightbulb size={18} className="text-gray-400" />
                  <h3 className="text-sm font-bold">Compétences Extraites</h3>
                </div>
                <button className="text-primary flex items-center gap-1 text-xs font-medium hover:underline">
                  <Plus size={12} /> Ajouter une compétence
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <div
                    key={skill}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-white/20"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="rounded-full p-0.5 text-gray-500 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Expérience */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2 text-white">
                  <Briefcase size={18} className="text-gray-400" />
                  <h3 className="text-sm font-bold">Expérience</h3>
                </div>
                <button className="text-primary flex items-center gap-1 text-xs font-medium hover:underline">
                  <Plus size={12} /> Ajouter un poste
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
                  <input
                    type="text"
                    defaultValue="Ingénieur Frontend Senior"
                    className="w-full bg-transparent text-sm font-bold text-white focus:outline-none"
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      defaultValue="TechCorp Inc."
                      className="focus:border-primary flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-300 focus:outline-none"
                    />
                    <input
                      type="text"
                      defaultValue="2020 - Présent"
                      className="focus:border-primary flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-300 focus:outline-none"
                    />
                  </div>
                  <textarea
                    defaultValue="Développement du dashboard principal en utilisant React et Tailwind CSS. Encadrement d'une équipe de 3 développeurs juniors."
                    className="focus:border-primary h-20 w-full resize-none rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-400 focus:outline-none"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 bg-[#0b1021] p-6">
            <button
              onClick={() => router.back()}
              className="rounded-md border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/5"
            >
              Retour
            </button>
            <button
              onClick={handleComplete}
              className="bg-primary flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-600"
            >
              Confirmer et Terminer <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
