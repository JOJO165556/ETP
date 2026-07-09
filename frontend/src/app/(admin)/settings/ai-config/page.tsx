"use client";

import { useState } from "react";
import {
  Sparkles,
  BarChart,
  Settings2,
  FileText,
  Bot,
  RefreshCw,
  History,
  User,
} from "lucide-react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ProgressBar } from "@/components/ui/progress-bar";

export default function AiConfigPage() {
  const [skillWeight, setSkillWeight] = useState(65);
  const [expWeight, setExpWeight] = useState(40);
  const [llmSensitivity, setLlmSensitivity] = useState(82);

  return (
    <div className="p-8 lg:p-12">
      {/* En-tête */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuration IA</h1>
          <p className="mt-1 text-sm text-slate-400">
            Ajustez les algorithmes de matching et les déclencheurs de flux de travail
            autonomes.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5">
            Réinitialiser par défaut
          </button>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-500">
            Déployer la config
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne de gauche (Settings) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Matching Sensitivity */}
          <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
              <BarChart size={20} className="text-slate-500" /> Sensibilité du Matching
            </h2>

            <div className="space-y-8">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-white">
                    Pondération des compétences
                  </label>
                  <span className="text-sm font-bold text-blue-400">{skillWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={skillWeight}
                  onChange={(e) => setSkillWeight(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Prioriser les mots-clés techniques et les compétences certifiées par
                  rapport à l'ancienneté historique.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-white">
                    Pondération de l'expérience
                  </label>
                  <span className="text-sm font-bold text-blue-400">{expWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={expWeight}
                  onChange={(e) => setExpWeight(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Ajuster l'importance de la longévité dans l'industrie et de la
                  profondeur de progression de carrière.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-white">
                    Similitude de niche (LLM)
                  </label>
                  <span className="text-sm font-bold text-blue-400">
                    {llmSensitivity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={llmSensitivity}
                  onChange={(e) => setLlmSensitivity(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Sensibilité du moteur sémantique aux traductions de compétences
                  adjacentes.
                </p>
              </div>
            </div>
          </section>

          {/* Engine & Workflows */}
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
              <h2 className="mb-6 flex items-center justify-between text-lg font-bold text-white">
                <span className="flex items-center gap-2">
                  <FileText size={20} className="text-slate-500" /> Moteur d'Analyse
                </span>
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0d1117] p-3">
                  <span className="text-sm font-medium text-slate-300">
                    Amélioration OCR
                  </span>
                  <ToggleSwitch actif={true} onChange={() => {}} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0d1117] p-3">
                  <span className="text-sm font-medium text-slate-300">
                    Indexation Github
                  </span>
                  <ToggleSwitch actif={false} onChange={() => {}} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0d1117] p-3">
                  <span className="text-sm font-medium text-slate-300">
                    Exploration Sociale
                  </span>
                  <ToggleSwitch actif={true} onChange={() => {}} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
              <h2 className="mb-6 flex items-center justify-between text-lg font-bold text-white">
                <span className="flex items-center gap-2">
                  <RefreshCw size={20} className="text-slate-500" /> Flux de Travail
                </span>
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-[#0d1117] p-3">
                  <span className="text-sm font-medium text-slate-300">
                    Rejet Automatique
                  </span>
                  <ToggleSwitch
                    actif={true}
                    onChange={() => {}}
                    className="!bg-red-500"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0d1117] p-3">
                  <span className="text-sm font-medium text-slate-300">
                    Tri Instantané
                  </span>
                  <ToggleSwitch actif={true} onChange={() => {}} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#0d1117] p-3">
                  <span className="text-sm font-medium text-slate-300">
                    Ping Recruteur
                  </span>
                  <ToggleSwitch actif={false} onChange={() => {}} />
                </div>
              </div>
            </section>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-[#161b22] p-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <History size={16} />
              <span>
                Dernière modification par{" "}
                <strong className="text-white">admin_root</strong> il y a 4 heures
                (Version 0.9.12)
              </span>
            </div>
            <button className="font-medium text-blue-400 hover:underline">
              Voir le journal d'audit
            </button>
          </div>
        </div>

        {/* Colonne de droite (Simulation Sandbox) */}
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-[#161b22] p-6 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
            <div className="absolute top-0 right-0 p-4">
              <span className="rounded bg-blue-600 px-2 py-1 text-[10px] font-bold tracking-widest text-white uppercase">
                BETA v2.4
              </span>
            </div>

            <h2 className="mb-1 text-lg font-bold text-white">Sandbox de Simulation</h2>
            <p className="mb-6 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Analyse de score en direct
            </p>

            <div className="mb-8 flex items-center gap-4 rounded-xl border border-white/5 bg-[#0d1117] p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                <User size={24} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Sarah J. Miller</h3>
                  <span className="font-mono text-[10px] text-blue-400">ID: #C-9021</span>
                </div>
                <p className="text-xs text-slate-400">
                  Senior Full Stack Engineer
                  <br />
                  (Node.js/React)
                </p>
              </div>
            </div>

            <div className="relative mb-8 flex justify-center">
              {/* Cercle SVG pour simuler le score */}
              <svg
                width="160"
                height="160"
                viewBox="0 0 160 160"
                className="-rotate-90 transform"
              >
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="transparent"
                  stroke="#1e293b"
                  strokeWidth="12"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="transparent"
                  stroke="url(#blue-gradient)"
                  strokeWidth="12"
                  strokeDasharray="439.8"
                  strokeDashoffset={439.8 - (439.8 * 67) / 100}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white">67</span>
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Match Score
                </span>
              </div>
            </div>

            <div className="mb-8 space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-xs font-bold tracking-wider uppercase">
                  <span className="text-slate-400">Attribution Compétences</span>
                  <span className="text-blue-400">+34.2pts</span>
                </div>
                <ProgressBar valeur={70} couleurBarre="bg-blue-500" hauteur="h-1" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs font-bold tracking-wider uppercase">
                  <span className="text-slate-400">Attribution Expérience</span>
                  <span className="text-emerald-400">+22.8pts</span>
                </div>
                <ProgressBar valeur={50} couleurBarre="bg-emerald-500" hauteur="h-1" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs font-bold tracking-wider uppercase">
                  <span className="text-slate-400">Pertinence LLM</span>
                  <span className="text-orange-400">+18.0pts</span>
                </div>
                <ProgressBar valeur={35} couleurBarre="bg-orange-500" hauteur="h-1" />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-[#0d1117] p-4 text-xs text-slate-400 italic">
              <span className="shrink-0 font-serif text-slate-500">ⓘ</span>
              Basé sur les paramètres actuels, ce candidat se situe dans les{" "}
              <strong className="text-white not-italic">top 4%</strong> du vivier pour les
              rôles de "Lead Developer".
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
