"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileText, Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/shared/state-panel";
import { api } from "@/lib/api";

type Etat = "attente" | "traitement" | "termine" | "echec";

interface StatutTache {
  task_id: string;
  application_id: string;
  status: string;
  result?: Record<string, unknown>;
}

const DELAI_MAX_MS = 120_000;

export default function TraitementCvPage() {
  const router = useRouter();
  const [nomFichier, setNomFichier] = useState("votre CV");
  const [etat, setEtat] = useState<Etat>("attente");
  const [termine, setTermine] = useState(false);
  const demarre = useRef(Date.now());

  useEffect(() => {
    setNomFichier(sessionStorage.getItem("cv_filename") ?? "votre CV");
  }, []);

  useEffect(() => {
    let annule = false;
    let minuterie: ReturnType<typeof setTimeout> | null = null;

    const terminer = () => {
      if (annule || termine) return;
      setTermine(true);
      setEtat("termine");
      sessionStorage.removeItem("cv_task_id");
    };

    const verifier = async () => {
      if (annule) return;

      if (Date.now() - demarre.current > DELAI_MAX_MS) {
        setEtat("echec");
        return;
      }

      const taskId = sessionStorage.getItem("cv_task_id");

      try {
        if (taskId) {
          const tache = await api.get<StatutTache>(`/applications/tasks/${taskId}/status`);
          if (annule) return;

          if (tache.status === "SUCCESS") {
            terminer();
            return;
          }
          if (tache.status === "FAILURE") {
            setEtat("echec");
            return;
          }
          setEtat("traitement");
        } else {
          const profil = await api.get<{
            role?: string;
            profile?: { skills?: string[] } | null;
          }>("/users/me");
          if (annule) return;

          if ((profil.profile?.skills ?? []).length > 0) {
            sessionStorage.setItem("cv_profile_data", JSON.stringify(profil.profile));
            terminer();
            return;
          }
          setEtat("traitement");
        }
      } catch {
        if (!annule) setEtat("echec");
        return;
      }

      minuterie = setTimeout(verifier, 3000);
    };

    verifier();

    return () => {
      annule = true;
      if (minuterie) clearTimeout(minuterie);
    };
  }, [termine]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <FileText size={24} aria-hidden="true" />
      </span>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
        Analyse de votre CV
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{nomFichier}</p>

      {etat === "echec" ? (
        <div className="mt-8 w-full">
          <StatePanel
            tone="error"
            title="L'analyse n'a pas abouti"
            description="Le document n'a pas pu être lu. Vérifiez qu'il s'agit bien d'un PDF ou d'un document texte, puis réessayez."
            actionLabel="Déposer un autre fichier"
            onAction={() => router.push("/cv-upload")}
          />
        </div>
      ) : etat === "termine" ? (
        <div className="mt-8 w-full space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 text-left">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-foreground">Analyse terminée</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Les informations de votre CV ont été reprises dans votre profil. Vérifiez-les
                avant de valider.
              </p>
            </div>
          </div>
          <Button onClick={() => router.push("/cv-review")} className="w-full">
            Vérifier mon profil
          </Button>
        </div>
      ) : (
        <div className="mt-8 w-full space-y-4">
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 text-left"
          >
            <Loader size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {etat === "attente" ? "Préparation du document" : "Lecture en cours"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Vous pouvez laisser cette page ouverte : elle passera automatiquement à la
                vérification du profil. Cela prend généralement moins d&apos;une minute.
              </p>
            </div>
          </div>
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle size={13} aria-hidden="true" />
            Ne fermez pas l&apos;onglet pendant le traitement.
          </p>
        </div>
      )}
    </div>
  );
}
