"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import * as z from "zod";

/* Schéma de validation pour l'adresse email */
const schema = z.object({
  email: z.string().email("Adresse email invalide"),
});

type FormValues = z.infer<typeof schema>;

/* Formulaire principal de réinitialisation du mot de passe */
function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      /* On affiche toujours le message de succès même si l'email n'existe pas
         (sécurité : éviter l'énumération d'emails) */
      if (res.ok || res.status === 404) {
        setSent(true);
      } else {
        throw new Error("Erreur lors de l'envoi");
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  /* Confirmation d'envoi */
  if (sent) {
    return (
      <div className="w-full max-w-[400px] space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Vérifiez votre boîte mail
          </h1>
          <p className="text-sm leading-relaxed text-gray-500">
            Si un compte est associé à cette adresse, vous recevrez un lien de
            réinitialisation dans les prochaines minutes.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#1d40d9] hover:underline"
        >
          <ArrowLeft size={14} />
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] space-y-7">
      {/* En-tête */}
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-widest text-[#1d40d9] uppercase">
          Sécurité du compte
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Mot de passe oublié ?
        </h1>
        <p className="text-sm text-gray-500">
          Saisissez votre adresse email et nous vous enverrons un lien de
          réinitialisation.
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {/* Champ Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Adresse email
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              {...register("email")}
              className="block w-full rounded-lg border border-gray-200 bg-white py-2.5 pr-4 pl-9 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-[#1d40d9] focus:ring-2 focus:ring-[#1d40d9]/20 focus:outline-none"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Bouton de soumission */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1d40d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? "Envoi en cours..." : "Envoyer le lien"}
        </button>
      </form>

      {/* Lien retour */}
      <p className="text-center text-sm text-gray-500">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-medium text-[#1d40d9] hover:underline"
        >
          <ArrowLeft size={14} />
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-[400px] animate-pulse" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
