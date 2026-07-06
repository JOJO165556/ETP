"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/* Page d'upload du CV (Étape 1 de l'onboarding) */
export default function CVUploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
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
  const handleContinue = () => {
    if (file) {
      // Simulation du passage à l'étape de traitement IA (processing)
      router.push("/cv-processing");
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
          <div className="h-1 w-12 rounded-full bg-white/10" />
          <div className="h-1 w-12 rounded-full bg-white/10" />
        </div>
        <p className="text-primary text-xs font-bold tracking-widest uppercase">
          Étape 1 sur 3
        </p>
      </div>

      {/* En-tête */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Téléchargez votre Curriculum Vitae
        </h1>
        <p className="mx-auto max-w-lg text-base leading-relaxed text-gray-400">
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
              : "group-hover:bg-white/5 group-hover:opacity-100"
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
            "relative flex flex-col items-center justify-center rounded-2xl border border-dashed bg-[#13192f]/50 p-16 backdrop-blur-sm transition-all duration-300",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-white/10 hover:border-white/20",
            file ? "border-green-500/50 bg-green-500/5" : ""
          )}
        >
          <div
            className={cn(
              "mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-white/5 text-gray-400 transition-colors duration-300",
              isDragging ? "text-primary" : "",
              file ? "bg-green-400/10 text-green-400" : ""
            )}
          >
            <UploadCloud size={28} />
          </div>

          {!file ? (
            <>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Glissez & déposez votre fichier ici
              </h3>
              <p className="mb-8 text-sm text-gray-500">
                ou{" "}
                <button className="text-primary hover:underline">
                  cliquez pour parcourir
                </button>{" "}
                votre appareil
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-gray-400">
                  PDF
                </span>
                <span className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-gray-400">
                  DOCX
                </span>
                <span className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-gray-400">
                  Max 10MB
                </span>
              </div>
            </>
          ) : (
            <>
              <h3 className="mb-2 text-lg font-semibold text-white">{file.name}</h3>
              <p className="mb-8 text-sm text-green-400">
                Prêt pour l'analyse ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-xs text-gray-500 transition-colors hover:text-white"
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
          className="flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
        >
          Passer pour le moment <ArrowRight size={16} />
        </button>
        <button
          onClick={handleContinue}
          disabled={!file}
          className="rounded-lg border border-white/5 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continuer
        </button>
      </div>

      {/* Pied de page de sécurité */}
      <div className="flex items-center gap-2 pt-8 text-xs font-medium text-gray-500">
        <Lock size={12} />
        Stockage chiffré de bout en bout. Nous ne partageons jamais vos données.
      </div>
    </motion.div>
  );
}
