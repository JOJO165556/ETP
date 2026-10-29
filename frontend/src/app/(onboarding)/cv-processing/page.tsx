"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cpu, CheckCircle2, Clock, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

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
  const [nomFichier, setNomFichier] = useState("CV.pdf");

  useEffect(() => {
    setNomFichier(sessionStorage.getItem("cv_filename") ?? "CV.pdf");
  }, []);

  /* Polling de l'API pour vérifier si la tâche asynchrone a complété l'extraction */
  useEffect(() => {
    let isCancelled = false;
    let pollInterval: NodeJS.Timeout;

    const taskId = sessionStorage.getItem("cv_task_id");

    const checkStatus = async () => {
      try {
        if (taskId) {
          // Polling ciblé sur le statut de la tâche Celery
          const res = await api.get<{
            task_id: string;
            application_id: string;
            status: string;
            result?: Record<string, unknown>;
          }>(`/applications/tasks/${taskId}/status`);

          if (res.status === "SUCCESS" || res.status === "FAILURE") {
            if (!isCancelled) {
              setCompletedSteps([1, 2, 3]);
              setActiveStep(3);
              clearInterval(pollInterval);
              sessionStorage.removeItem("cv_task_id");
              setTimeout(() => router.push("/cv-review"), 1000);
            }
          }
        } else {
          // Fallback : vérifier si le profil a des compétences extraites
          const res = await api.get<{
            role?: string;
            profile?: { skills?: string[] } | null;
          }>("/users/me");
          if (res.profile?.skills && res.profile.skills.length > 0) {
            if (!isCancelled) {
              setCompletedSteps([1, 2, 3]);
              setActiveStep(3);
              clearInterval(pollInterval);
              sessionStorage.setItem("cv_profile_data", JSON.stringify(res.profile));
              setTimeout(() => router.push("/cv-review"), 1000);
            }
          }
        }
      } catch (err) {
        console.error("Erreur lors de la vérification du statut:", err);
      }
    };

    // Première vérification après 2 secondes, puis toutes les 3 secondes
    const initialTimeout = setTimeout(() => {
      setActiveStep(2);
      checkStatus();
      pollInterval = setInterval(checkStatus, 3000);
    }, 2000);

    return () => {
      isCancelled = true;
      clearTimeout(initialTimeout);
      clearInterval(pollInterval);
    };
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
            <h2 className="text-sm font-bold text-foreground">Document Source</h2>
            <p className="text-xs text-muted-foreground">{nomFichier}</p>
          </div>
          <span className="text-primary rounded border border-border bg-muted px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
            Données Brutes
          </span>
        </div>

        <div className="relative h-[500px] flex-1 overflow-hidden rounded-xl border border-border bg-muted p-8">
          {/* Lignes simulant le document scanné */}
          <div className="absolute inset-0 space-y-6 p-8 opacity-70 blur-[3px]">
            <div className="h-8 w-1/2 rounded bg-foreground/20" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-foreground/10" />
              <div className="h-4 w-5/6 rounded bg-foreground/10" />
              <div className="h-4 w-4/6 rounded bg-foreground/10" />
            </div>
            <div className="mt-8 h-6 w-1/3 rounded bg-foreground/15" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-foreground/10" />
              <div className="h-4 w-full rounded bg-foreground/10" />
              <div className="h-4 w-3/4 rounded bg-foreground/10" />
            </div>
          </div>

          {/* Faisceau de scan (Laser IA) */}
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="bg-primary absolute right-0 left-0 z-10 h-1 shadow-[0_0_20px_var(--color-primary)]"
          />
        </div>
      </div>

      {/* Colonne de droite : Pipeline de traitement IA */}
      <div className="flex w-full flex-col justify-center space-y-10 lg:w-1/2">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-foreground">
            <Cpu className="text-primary animate-pulse" size={28} />
            <h1 className="text-3xl font-bold tracking-tight">
              Extraction Neurale Active
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Structuration des données non-structurées selon la taxonomie ETP.
          </p>
        </div>

        <div className="relative space-y-6 pl-6">
          {/* Ligne verticale de progression globale */}
          <div className="absolute top-5 bottom-5 left-3.5 w-px bg-border" />

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
                    <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-full text-primary-foreground">
                      <CheckCircle2 size={16} />
                    </div>
                  ) : isActive ? (
                    <div className="border-primary flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background">
                      <div className="bg-primary h-2.5 w-2.5 animate-ping rounded-full" />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                      <Clock size={14} />
                    </div>
                  )}
                </div>

                {/* Carte de description de l'étape */}
                <div
                  className={cn(
                    "rounded-xl border p-5 transition-all duration-300",
                    isCompleted
                      ? "border-border bg-muted opacity-60"
                      : isActive
                        ? "border-primary/30 bg-primary/5 shadow-[0_0_30px_color-mix(in_oklch,var(--color-primary)_10%,transparent)]"
                        : "border-transparent opacity-30"
                  )}
                >
                  <div className="mb-1 flex items-start justify-between">
                    <h3
                      className={cn(
                        "text-base font-bold",
                        isActive ? "text-foreground" : "text-foreground/85"
                      )}
                    >
                      {step.title}
                    </h3>
                    {isCompleted && (
                      <span className="font-mono text-xs text-muted-foreground">100%</span>
                    )}
                    {isActive && (
                      <span className="text-primary animate-pulse font-mono text-xs">
                        EN COURS
                      </span>
                    )}
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">{step.subtitle}</p>

                  {/* Squelettes de chargement (seulement pour l'étape 2) */}
                  {step.id === 2 && isActive && (
                    <div className="mt-4 space-y-2">
                      <div className="flex gap-2">
                        <div className="h-6 w-24 animate-pulse rounded bg-foreground/10" />
                        <div className="h-6 w-32 animate-pulse rounded bg-foreground/10" />
                      </div>
                      <div className="h-6 w-full animate-pulse rounded bg-foreground/10" />
                      <div className="flex gap-2">
                        <div className="h-6 w-16 animate-pulse rounded-full bg-foreground/10" />
                        <div className="h-6 w-20 animate-pulse rounded-full bg-foreground/10" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pied de page et bouton inactif en attente */}
        <div className="flex items-center justify-between border-t border-border pt-8">
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
            <Lock size={12} />
            Chiffrement de bout en bout
          </div>
          <button
            disabled
            className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-muted px-6 py-2.5 text-sm font-semibold text-muted-foreground"
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
