"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";
import * as z from "zod";

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
        <p className="text-sm text-red-600 font-medium">
          Lien de réinitialisation invalide ou expiré.
        </p>
        <Link href="/forgot-password" className="text-sm text-[#1d40d9] hover:underline">
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
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Mot de passe mis à jour
          </h1>
          <p className="text-sm text-gray-500">
            Votre mot de passe a été réinitialisé avec succès.
          </p>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="w-full rounded-lg bg-[#1d40d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] space-y-7">
      {/* En-tête */}
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-widest text-[#1d40d9] uppercase">
          Nouveau mot de passe
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Réinitialiser votre mot de passe
        </h1>
        <p className="text-sm text-gray-500">
          Choisissez un nouveau mot de passe sécurisé (minimum 8 caractères).
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Nouveau mot de passe */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <Lock size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("password")}
              className="block w-full rounded-lg border border-gray-200 bg-white py-2.5 pr-10 pl-9 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-[#1d40d9] focus:ring-2 focus:ring-[#1d40d9]/20 focus:outline-none"
            />
            <button
              type="button"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>

        {/* Confirmation */}
        <div className="space-y-1.5">
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <Lock size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              id="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("confirm")}
              className="block w-full rounded-lg border border-gray-200 bg-white py-2.5 pr-4 pl-9 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-[#1d40d9] focus:ring-2 focus:ring-[#1d40d9]/20 focus:outline-none"
            />
          </div>
          {errors.confirm && <p className="text-xs text-red-600">{errors.confirm.message}</p>}
        </div>

        {/* Bouton de soumission */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1d40d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? "Mise à jour..." : "Enregistrer le nouveau mot de passe"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        <Link href="/login" className="inline-flex items-center gap-1 font-medium text-[#1d40d9] hover:underline">
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
