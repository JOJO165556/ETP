"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import * as z from "zod";

import { api } from "@/lib/api";
import type { AuthTokens } from "@/types";

/* Schéma de validation Zod pour l'étape de création de compte */
const accountSchema = z.object({
  first_name: z.string().min(2, "Au moins 2 caractères."),
  last_name: z.string().min(2, "Au moins 2 caractères."),
  email: z.string().email("Adresse email invalide."),
  password: z
    .string()
    .min(8, "Au moins 8 caractères.")
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
                  ? "bg-[#1d40d9] text-white"
                  : i === current
                    ? "border-2 border-[#1d40d9] bg-white text-[#1d40d9]"
                    : "border border-gray-200 bg-white text-gray-400"
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
                i === current ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mx-2 h-px w-8 transition-colors ${
                i < current ? "bg-[#1d40d9]" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* Composant principal de la page d'inscription (gère les candidats et les recruteurs) */
export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "recruiter" ? "recruiter" : "candidate";

  const isRecruiter = role === "recruiter";
  const steps = isRecruiter
    ? ["Informations légales", "Profil entreprise"]
    : ["Compte", "Résumé", "Localisation"];

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

  /* Soumission finale des données vers l'API et création du cookie de session */
  const onSubmit = async () => {
    setError(null);
    const data = getValues();
    try {
      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        role: isRecruiter ? "recruiter" : "candidate",
      };

      const tokens = await api.post<AuthTokens>("/auth/register", payload);

      const res = await fetch("/api/auth/set-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokens),
      });

      if (res.ok) {
        router.push("/overview");
        router.refresh();
      } else {
        throw new Error("Erreur de session.");
      }
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
      {!isRecruiter && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="first_name"
              className="block text-sm font-medium text-gray-700"
            >
              Prénom
            </label>
            <input
              id="first_name"
              type="text"
              autoComplete="given-name"
              placeholder="Jean"
              {...register("first_name")}
              className="block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-[#1d40d9] focus:ring-2 focus:ring-[#1d40d9]/20 focus:outline-none"
            />
            {errors.first_name && (
              <p className="text-xs text-red-600">{errors.first_name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="last_name"
              className="block text-sm font-medium text-gray-700"
            >
              Nom
            </label>
            <input
              id="last_name"
              type="text"
              autoComplete="family-name"
              placeholder="Dupont"
              {...register("last_name")}
              className="block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-[#1d40d9] focus:ring-2 focus:ring-[#1d40d9]/20 focus:outline-none"
            />
            {errors.last_name && (
              <p className="text-xs text-red-600">{errors.last_name.message}</p>
            )}
          </div>
        </div>
      )}

      {isRecruiter && (
        <div className="space-y-1.5">
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
            Nom légal de l'entreprise
          </label>
          <input
            id="first_name"
            type="text"
            placeholder="Northwind Labs SAS"
            {...register("first_name")}
            className="block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-[#1d40d9] focus:ring-2 focus:ring-[#1d40d9]/20 focus:outline-none"
          />
          {errors.first_name && (
            <p className="text-xs text-red-600">{errors.first_name.message}</p>
          )}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          {isRecruiter ? "Email professionnel" : "Email"}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={isRecruiter ? "vous@entreprise.com" : "vous@exemple.com"}
          {...register("email")}
          className="block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-[#1d40d9] focus:ring-2 focus:ring-[#1d40d9]/20 focus:outline-none"
        />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      {/* Mot de passe */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Au moins 8 caractères"
            {...register("password")}
            className="block w-full rounded-lg border border-gray-200 bg-white py-2.5 pr-10 pl-3.5 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-[#1d40d9] focus:ring-2 focus:ring-[#1d40d9]/20 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? "Masquer" : "Afficher"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password ? (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        ) : (
          <p className="text-xs text-gray-400">8+ caractères avec lettres et chiffres.</p>
        )}
      </div>
    </div>
  );
  /* Rendu générique pour les étapes futures (CV, Localisation, etc.) */
  const renderStepPlaceholder = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">
          {step === 1 && !isRecruiter
            ? "Ajout du CV et des compétences — disponible après la création du compte."
            : step === 2 && !isRecruiter
              ? "Localisation et préférences de mobilité — disponible après la création du compte."
              : "Profil entreprise — disponible après la création du compte."}
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[440px] space-y-7">
      {/* En-tête */}
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-widest text-[#1d40d9] uppercase">
          {isRecruiter ? "Inscription entreprise" : "Inscription candidat"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {isRecruiter
            ? "Configurez votre espace recrutement"
            : "Créez votre profil talent"}
        </h1>
        <p className="text-sm text-gray-400">
          Étape {step + 1} sur {steps.length} — prend environ deux minutes.
        </p>
      </div>

      {/* Indicateur d'étapes */}
      <StepIndicator steps={steps} current={step} />

      {/* Erreur globale */}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
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
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1d40d9] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1635c4] focus:ring-2 focus:ring-[#1d40d9]/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
          </button>
        </div>
      </form>

      {/* Lien connexion */}
      <p className="text-center text-sm text-gray-500">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-[#1d40d9] hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
