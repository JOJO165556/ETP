"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import * as z from "zod";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isFirebaseConfigured,
  createAccountWithEmail,
  exchangeFirebaseSession,
} from "@/lib/firebase";
import type { AuthTokens } from "@/types";

/* Schéma de validation Zod pour l'étape de création de compte */
const accountSchema = z.object({
  first_name: z.string().min(2, "Au moins 2 caractères."),
  last_name: z.string().min(2, "Au moins 2 caractères."),
  email: z.string().email("Adresse email invalide."),
  password: z
    .string()
    .min(6, "Au moins 6 caractères.")
    .regex(/[A-Za-z]/, "Doit contenir une lettre.")
    .regex(/[0-9]/, "Doit contenir un chiffre."),
});

type AccountValues = z.infer<typeof accountSchema>;

/* Composant affichant l'indicateur de progression des étapes d'inscription */
interface StepIndicatorProps {
  steps: string[];
  current: number;
}

function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex items-center gap-1.5">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                i < current
                  ? "bg-primary text-primary-foreground"
                  : i === current
                    ? "border-2 border-primary bg-background text-primary"
                    : "border border-border bg-background text-muted-foreground"
              }`}
            >
              {i < current ? (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 5l2 2 4-4"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                i === current ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mx-2 h-px w-8 transition-colors ${
                i < current ? "bg-primary" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* Composant interne — nécessite useSearchParams() donc doit être dans un Suspense */
function RegisterForm() {
  const router = useRouter();
  // Politique de rôles : l'inscription publique crée toujours un compte CANDIDATE.
  // Les comptes recruteur / entreprise sont créés par un superadmin.
  const steps = ["Compte", "Résumé", "Localisation"];

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { first_name: "", last_name: "", email: "", password: "" },
  });

  /* Valide l'étape actuelle et passe à la suivante */
  const handleNextStep = handleSubmit(() => {
    setStep((s) => s + 1);
  });

  /* Soumission finale : création du compte dans Firebase puis échange de session */
  const onSubmit = async () => {
    setError(null);
    const data = getValues();
    try {
      const intendedRole = "candidate";
      if (isFirebaseConfigured()) {
        // 100% Firebase : le compte et le mot de passe sont gérés par Firebase
        const user = await createAccountWithEmail(data.email, data.password);
        const ok = await exchangeFirebaseSession(user, {
          first_name: data.first_name,
          last_name: data.last_name,
          role: intendedRole,
        });
        if (!ok) throw new Error("Echange de session Firebase échoué.");
      } else {
        // Mode dégradé : avant la migration Firebase
        const tokens = await api.post<AuthTokens>("/auth/register", {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          password: data.password,
          role: intendedRole,
        });

        const res = await fetch("/api/auth/set-cookie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tokens),
        });
        if (!res.ok) throw new Error("Erreur de session.");
      }

      router.push("/cv-upload");
      router.refresh();
    } catch {
      setError(
        "Une erreur est survenue. Vérifiez vos informations ou tentez de vous connecter."
      );
      setStep(0);
    }
  };

  /* Rendu du formulaire de l'étape 0 : Informations de base du compte */
  const renderStepAccount = () => (
    <div className="space-y-4">
      {/* Prénom + Nom */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="first_name"
            className="block text-sm font-medium text-foreground"
          >
            Prénom
          </label>
          <Input
            id="first_name"
            type="text"
            autoComplete="given-name"
            placeholder="Jean"
            {...register("first_name")}
            className="h-auto px-3.5 py-2.5"
          />
          {errors.first_name && (
            <p className="text-xs text-destructive">{errors.first_name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="last_name"
            className="block text-sm font-medium text-foreground"
          >
            Nom
          </label>
          <Input
            id="last_name"
            type="text"
            autoComplete="family-name"
            placeholder="Dupont"
            {...register("last_name")}
            className="h-auto px-3.5 py-2.5"
          />
          {errors.last_name && (
            <p className="text-xs text-destructive">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          {...register("email")}
          className="h-auto px-3.5 py-2.5"
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      {/* Mot de passe */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Mot de passe
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Au moins 6 caractères"
            {...register("password")}
            className="h-auto py-2.5 pr-10 pl-3.5"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Masquer" : "Afficher"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">6+ caractères avec lettres et chiffres.</p>
        )}
      </div>
    </div>
  );
  /* Rendu générique pour les étapes futures (CV, Localisation, etc.) */
  const renderStepPlaceholder = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-border bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {step === 1
            ? "Ajout du CV et des compétences — disponible après la création du compte."
            : "Localisation et préférences de mobilité — disponible après la création du compte."}
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[440px] space-y-7">
      {/* En-tête */}
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          Inscription candidat
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Créez votre profil talent
        </h1>
        <p className="text-sm text-muted-foreground">
          Étape {step + 1} sur {steps.length} — prend environ deux minutes.
        </p>
      </div>

      {/* Indicateur d'étapes */}
      <StepIndicator steps={steps} current={step} />

      {/* Erreur globale */}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {error}
        </div>
      )}

      {/* Contenu de l'étape */}
      <form
        onSubmit={
          step === 0
            ? handleNextStep
            : (e) => {
                e.preventDefault();
                if (step < steps.length - 1) {
                  setStep((s) => s + 1);
                } else {
                  onSubmit();
                }
              }
        }
        noValidate
      >
        {step === 0 ? renderStepAccount() : renderStepPlaceholder()}

        {/* Bouton principal */}
        <div className="mt-6">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full gap-2 px-4 py-3 text-sm font-semibold"
          >
            {isSubmitting && (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            )}
            {step < steps.length - 1 ? "Continuer" : "Créer mon compte"}
            {!isSubmitting && step < steps.length - 1 && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 7h8M8 4l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </Button>
        </div>
      </form>

      {/* Lien connexion */}
      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}

/* Export de la page avec Suspense boundary requis pour useSearchParams() */
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-[440px] animate-pulse space-y-7" />}>
      <RegisterForm />
    </Suspense>
  );
}
