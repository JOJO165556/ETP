"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* Schéma de validation : mot de passe robuste, confirmation obligatoire */
const schema = z
  .object({
    password: z.string().min(8, "Minimum 8 caractères"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

/* Formulaire de création du nouveau mot de passe (consomme le token depuis l'URL) */
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  /* Aucun token dans l'URL : lien invalide */
  if (!token) {
    return (
      <div className="w-full max-w-[400px] space-y-4 text-center">
        <p className="text-sm font-medium text-destructive">
          Lien de réinitialisation invalide ou expiré.
        </p>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: FormValues) => {
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: data.password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.detail || "Une erreur est survenue.");
        return;
      }
      setDone(true);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  /* Confirmation de succès */
  if (done) {
    return (
      <div className="w-full max-w-[400px] space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle size={28} className="text-success" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Mot de passe mis à jour
          </h1>
          <p className="text-sm text-muted-foreground">
            Votre mot de passe a été réinitialisé avec succès.
          </p>
        </div>
        <Button
          onClick={() => router.push("/login")}
          className="w-full px-4 py-2.5 text-sm font-semibold"
        >
          Se connecter
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] space-y-7">
      {/* En-tête */}
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          Nouveau mot de passe
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Réinitialiser votre mot de passe
        </h1>
        <p className="text-sm text-muted-foreground">
          Choisissez un nouveau mot de passe sécurisé (minimum 8 caractères).
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        {/* Nouveau mot de passe */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <Lock size={16} className="absolute top-1/2 left-3 z-10 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("password")}
              className="h-auto py-2.5 pr-10 pl-9"
            />
            <button
              type="button"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {/* Confirmation */}
        <div className="space-y-1.5">
          <label htmlFor="confirm" className="block text-sm font-medium text-foreground">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <Lock size={16} className="absolute top-1/2 left-3 z-10 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("confirm")}
              className="h-auto py-2.5 pr-4 pl-9"
            />
          </div>
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
        </div>

        {/* Bouton de soumission */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full gap-2 px-4 py-2.5 text-sm font-semibold"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? "Mise à jour..." : "Enregistrer le nouveau mot de passe"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <ArrowLeft size={14} />
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-[400px] animate-pulse" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
