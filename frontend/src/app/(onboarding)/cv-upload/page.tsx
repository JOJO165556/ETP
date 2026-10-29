"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Lock, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { API_V1 } from "@/lib/api";
import { Button } from "@/components/ui/button";

/* Page d'upload du CV (Étape 1 de l'onboarding) */
export default function CVUploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  /* Gère le dépôt (drag & drop) du fichier */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  /* Passe à l'étape suivante du traitement */
  const handleContinue = async () => {
    if (file) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_V1}/users/profile/upload-cv`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Erreur lors de l'upload");
        }

        const data = await res.json();
        // Stocker le task_id Celery pour le polling de la page suivante
        if (data.task_id) {
          sessionStorage.setItem("cv_task_id", data.task_id);
        }
        sessionStorage.setItem("cv_profile_data", JSON.stringify(data));
        sessionStorage.setItem("cv_filename", file.name);

        // Passage à l'étape de traitement IA (processing)
        router.push("/cv-processing");
      } catch (error) {
        console.error(error);
        alert("Une erreur est survenue lors du téléchargement du CV.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-2xl flex-col items-center space-y-12 text-center"
    >
      {/* Indicateur de progression */}
      <div className="flex w-full flex-col items-center space-y-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary h-1 w-12 rounded-full" />
          <div className="h-1 w-12 rounded-full bg-muted" />
          <div className="h-1 w-12 rounded-full bg-muted" />
        </div>
        <p className="text-primary text-xs font-bold tracking-widest uppercase">
          Étape 1 sur 3
        </p>
      </div>

      {/* En-tête */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Téléchargez votre Curriculum Vitae
        </h1>
        <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground">
          Pour construire votre profil entreprise, commencez par uploader votre dernier
          CV. Nous analyserons automatiquement votre expérience.
        </p>
      </div>

      {/* Zone de Drag & Drop */}
      <div className="group relative w-full">
        {/* Effet lumineux au survol */}
        <div
          className={cn(
            "absolute -inset-1 rounded-2xl opacity-0 blur-md transition-opacity duration-500",
            isDragging
              ? "bg-primary/30 opacity-100"
              : "group-hover:bg-muted group-hover:opacity-100"
          )}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-2xl border border-dashed bg-background/50 p-16 backdrop-blur-sm transition-all duration-300",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-border",
            file ? "border-success/50 bg-success/5" : ""
          )}
        >
          <div
            className={cn(
              "mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors duration-300",
              isDragging ? "text-primary" : "",
              file ? "bg-success/10 text-success" : ""
            )}
          >
            <UploadCloud size={28} />
          </div>

          {!file ? (
            <>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                Glissez & déposez votre fichier ici
              </h3>
              <p className="mb-8 text-sm text-muted-foreground">
                ou{" "}
                <button className="text-primary hover:underline">
                  cliquez pour parcourir
                </button>{" "}
                votre appareil
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                  PDF
                </span>
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                  DOCX
                </span>
                <span className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                  Max 10MB
                </span>
              </div>
            </>
          ) : (
            <>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{file.name}</h3>
              <p className="mb-8 text-sm text-success">
                Prêt pour l'analyse ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Supprimer le fichier
              </button>
            </>
          )}
        </div>
      </div>

      {/* Actions (Passer ou Continuer) */}
      <div className="flex w-full items-center justify-between pt-4">
        <button
          onClick={() => router.push("/overview")}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Passer pour le moment <ArrowRight size={16} />
        </button>
        <Button
          variant="secondary"
          onClick={handleContinue}
          disabled={!file || isUploading}
          className="gap-2 px-8 py-3 text-sm font-semibold"
        >
          {isUploading && <Loader2 size={16} className="animate-spin" />}
          {isUploading ? "Envoi en cours..." : "Continuer"}
        </Button>
      </div>

      {/* Pied de page de sécurité */}
      <div className="flex items-center gap-2 pt-8 text-xs font-medium text-muted-foreground">
        <Lock size={12} />
        Stockage chiffré de bout en bout. Nous ne partageons jamais vos données.
      </div>
    </motion.div>
  );
}
