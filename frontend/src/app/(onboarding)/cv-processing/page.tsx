"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cpu, CheckCircle2, Clock, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* Configuration des étapes du pipeline d'extraction IA */
const STEPS = [
  {
    id: 1,
    title: "Ingestion du Document",
    subtitle: "OCR Terminé • Réduction de bruit appliquée",
    delay: 0,
    duration: 2000,
  },
  {
    id: 2,
    title: "Extraction d'Entités Sémantiques",
    subtitle: "Mappage vers la taxonomie organisationnelle...",
    delay: 2000,
    duration: 3000,
  },
  {
    id: 3,
    title: "Synthèse du Profil",
    subtitle: "En attente de la fin de l'extraction.",
    delay: 5000,
    duration: 1500,
  },
];

/* Page d'animation du traitement du CV (Étape 2 de l'onboarding) */
export default function CVProcessingPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  /* Simulation asynchrone du processus d'extraction pour l'UX */
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    STEPS.forEach((step) => {
      const startTimer = setTimeout(() => {
        setActiveStep(step.id);
      }, step.delay);

      const endTimer = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, step.id]);
        if (step.id === STEPS.length) {
          // Fin de toutes les étapes, on passe à l'écran de validation
          setTimeout(() => router.push("/cv-review"), 1000);
        }
      }, step.delay + step.duration);

      timers.push(startTimer, endTimer);
    });

    return () => timers.forEach(clearTimeout);
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto flex w-full max-w-5xl flex-col gap-12 lg:flex-row"
    >
      {/* Colonne de gauche : Aperçu flou du document original */}
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Document Source</h2>
            <p className="text-xs text-gray-500">mon_cv_2024.pdf</p>
          </div>
          <span className="text-primary rounded border border-white/5 bg-white/5 px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
            Données Brutes
          </span>
        </div>

        <div className="relative h-[500px] flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-8">
          {/* Lignes simulant le document scanné */}
          <div className="absolute inset-0 space-y-6 p-8 opacity-70 blur-[3px]">
            <div className="h-8 w-1/2 rounded bg-white/20" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-white/10" />
              <div className="h-4 w-5/6 rounded bg-white/10" />
              <div className="h-4 w-4/6 rounded bg-white/10" />
            </div>
            <div className="mt-8 h-6 w-1/3 rounded bg-white/15" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-white/10" />
              <div className="h-4 w-full rounded bg-white/10" />
              <div className="h-4 w-3/4 rounded bg-white/10" />
            </div>
          </div>

          {/* Faisceau de scan (Laser IA) */}
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="bg-primary absolute right-0 left-0 z-10 h-1 shadow-[0_0_20px_rgba(59,130,246,1)]"
          />
        </div>
      </div>

      {/* Colonne de droite : Pipeline de traitement IA */}
      <div className="flex w-full flex-col justify-center space-y-10 lg:w-1/2">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-white">
            <Cpu className="text-primary animate-pulse" size={28} />
            <h1 className="text-3xl font-bold tracking-tight">
              Extraction Neurale Active
            </h1>
          </div>
          <p className="text-sm text-gray-400">
            Structuration des données non-structurées selon la taxonomie ETP.
          </p>
        </div>

        <div className="relative space-y-6 pl-6">
          {/* Ligne verticale de progression globale */}
          <div className="absolute top-5 bottom-5 left-3.5 w-px bg-white/10" />

          {/* Ligne bleue de progression animée */}
          <motion.div
            className="bg-primary absolute top-5 left-3.5 w-px origin-top"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: activeStep / STEPS.length }}
            transition={{ duration: 0.5 }}
          />

          {STEPS.map((step) => {
            const isCompleted = completedSteps.includes(step.id);
            const isActive = activeStep === step.id && !isCompleted;

            return (
              <div key={step.id} className="relative">
                {/* Icône de statut de l'étape */}
                <div className="absolute top-4 -left-10">
                  {isCompleted ? (
                    <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-full text-white">
                      <CheckCircle2 size={16} />
                    </div>
                  ) : isActive ? (
                    <div className="border-primary flex h-7 w-7 items-center justify-center rounded-full border-2 bg-[#0f1423]">
                      <div className="bg-primary h-2.5 w-2.5 animate-ping rounded-full" />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-[#0f1423] text-gray-500">
                      <Clock size={14} />
                    </div>
                  )}
                </div>

                {/* Carte de description de l'étape */}
                <div
                  className={cn(
                    "rounded-xl border p-5 transition-all duration-300",
                    isCompleted
                      ? "border-white/5 bg-white/5 opacity-60"
                      : isActive
                        ? "border-primary/30 bg-primary/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                        : "border-transparent opacity-30"
                  )}
                >
                  <div className="mb-1 flex items-start justify-between">
                    <h3
                      className={cn(
                        "text-base font-bold",
                        isActive ? "text-white" : "text-gray-300"
                      )}
                    >
                      {step.title}
                    </h3>
                    {isCompleted && (
                      <span className="font-mono text-xs text-gray-500">100%</span>
                    )}
                    {isActive && (
                      <span className="text-primary animate-pulse font-mono text-xs">
                        EN COURS
                      </span>
                    )}
                  </div>
                  <p className="mb-3 text-xs text-gray-400">{step.subtitle}</p>

                  {/* Squelettes de chargement (seulement pour l'étape 2) */}
                  {step.id === 2 && isActive && (
                    <div className="mt-4 space-y-2">
                      <div className="flex gap-2">
                        <div className="h-6 w-24 animate-pulse rounded bg-white/10" />
                        <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
                      </div>
                      <div className="h-6 w-full animate-pulse rounded bg-white/10" />
                      <div className="flex gap-2">
                        <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
                        <div className="h-6 w-20 animate-pulse rounded-full bg-white/10" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pied de page et bouton inactif en attente */}
        <div className="flex items-center justify-between border-t border-white/5 pt-8">
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-gray-500 uppercase">
            <Lock size={12} />
            Chiffrement de bout en bout
          </div>
          <button
            disabled
            className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-6 py-2.5 text-sm font-semibold text-gray-500"
          >
            Examiner le Profil
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7h8M8 4l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
