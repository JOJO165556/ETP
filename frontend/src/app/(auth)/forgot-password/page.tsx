"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import * as z from "zod";

import { isFirebaseConfigured, sendPasswordReset } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      if (isFirebaseConfigured()) {
        // Le lien de réinitialisation est géré par Firebase (sendPasswordResetEmail)
        await sendPasswordReset(data.email);
        setSent(true);
      } else {
        // Mode dégradé : avant la migration Firebase
        const res = await fetch("/api/v1/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email }),
        });
        if (res.ok || res.status === 404) {
          setSent(true);
        } else {
          throw new Error("Erreur lors de l'envoi");
        }
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
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle size={28} className="text-success" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Vérifiez votre boîte mail
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Si un compte est associé à cette adresse, vous recevrez un lien de
            réinitialisation dans les prochaines minutes.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
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
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          Sécurité du compte
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Mot de passe oublié ?
        </h1>
        <p className="text-sm text-muted-foreground">
          Saisissez votre adresse email et nous vous enverrons un lien de
          réinitialisation.
        </p>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {error}
          </div>
        )}

        {/* Champ Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground"
          >
            Adresse email
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute top-1/2 left-3 z-10 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              {...register("email")}
              className="h-auto py-2.5 pr-4 pl-9"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Bouton de soumission */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full gap-2 px-4 py-2.5 text-sm font-semibold"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? "Envoi en cours..." : "Envoyer le lien"}
        </Button>
      </form>

      {/* Lien retour */}
      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
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
