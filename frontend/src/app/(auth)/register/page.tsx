"use client";

import React, { Suspense, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Loader2,
  User,
  Building2,
  Check,
  Mail,
  Lock,
  ArrowRight,
} from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isFirebaseConfigured,
  createAccountWithEmail,
  signInWithGoogle,
  signInWithFacebook,
  signInWithGithub,
  exchangeFirebaseSession,
} from "@/lib/firebase";
import { registerSchema, type RegisterValues } from "@/lib/validations/auth";
import type { AuthTokens } from "@/types";

/* Composant mémoïsé haute performance pour l'animation de robustesse du mot de passe */
const PasswordStrengthIndicator = React.memo(function PasswordStrengthIndicator({
  password = "",
}: {
  password?: string;
}) {
  const criteria = useMemo(
    () => ({
      hasLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    }),
    [password]
  );

  const score = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (criteria.hasLength) s++;
    if (criteria.hasUpper) s++;
    if (criteria.hasNumber) s++;
    if (criteria.hasSpecial || password.length >= 12) s++;
    return s;
  }, [password, criteria]);

  if (!password) return null;

  const color =
    score >= 3 ? "bg-emerald-500" : score === 2 ? "bg-amber-500" : "bg-red-500";
  const label =
    score === 1
      ? "Trop court (8+ car. requis)"
      : score === 2
        ? "Moyen (ajoutez majuscule ou chiffre)"
        : score === 3
          ? "Fort"
          : "Excellente robustesse";

  return (
    <div className="space-y-2 pt-1.5 transition-opacity duration-200">
      {/* 4 segments animés à 60 FPS sans reflow */}
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((step) => {
          const isActive = score >= step;
          return (
            <div key={step} className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${isActive ? color : "bg-transparent"}`}
                style={{ width: isActive ? "100%" : "0%" }}
              />
            </div>
          );
        })}
      </div>

      {/* Libellé de robustesse */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-medium">Robustesse :</span>
        <span
          className={`font-semibold ${
            score >= 3
              ? "text-emerald-500"
              : score === 2
                ? "text-amber-500"
                : "text-destructive"
          }`}
        >
          {label}
        </span>
      </div>

      {/* Critères interactifs */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
        <div
          className={`flex items-center gap-1.5 transition-colors ${
            criteria.hasLength ? "text-emerald-500 font-medium" : "text-muted-foreground"
          }`}
        >
          {criteria.hasLength ? (
            <Check size={12} strokeWidth={3} className="text-emerald-500" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mx-0.5 inline-block" />
          )}
          <span>8+ caractères</span>
        </div>
        <div
          className={`flex items-center gap-1.5 transition-colors ${
            criteria.hasUpper ? "text-emerald-500 font-medium" : "text-muted-foreground"
          }`}
        >
          {criteria.hasUpper ? (
            <Check size={12} strokeWidth={3} className="text-emerald-500" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mx-0.5 inline-block" />
          )}
          <span>1 majuscule</span>
        </div>
        <div
          className={`flex items-center gap-1.5 transition-colors ${
            criteria.hasNumber ? "text-emerald-500 font-medium" : "text-muted-foreground"
          }`}
        >
          {criteria.hasNumber ? (
            <Check size={12} strokeWidth={3} className="text-emerald-500" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mx-0.5 inline-block" />
          )}
          <span>1 chiffre</span>
        </div>
        <div
          className={`flex items-center gap-1.5 transition-colors ${
            criteria.hasSpecial ? "text-emerald-500 font-medium" : "text-muted-foreground"
          }`}
        >
          {criteria.hasSpecial ? (
            <Check size={12} strokeWidth={3} className="text-emerald-500" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mx-0.5 inline-block" />
          )}
          <span>1 symbole (!@#$)</span>
        </div>
      </div>
    </div>
  );
});

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get("role");

  // Rôle choisi : 'candidate' ou 'recruiter'
  const [role, setRole] = useState<"candidate" | "recruiter">(
    initialRoleParam === "recruiter" ? "recruiter" : "candidate"
  );
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [socialBusy, setSocialBusy] = useState<"google" | "facebook" | "github" | null>(null);

  // mode "onBlur" : validation uniquement au changement de champ pour garantir une frappe instantanée sans freeze
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: { first_name: "", last_name: "", email: "", password: "" },
  });

  const currentPassword = watch("password");

  /* Redirection adaptée au profil — navigation dure pour éviter la boucle de redirect OAuth */
  const handlePostAuthRedirect = (selectedRole: "candidate" | "recruiter") => {
    if (selectedRole === "candidate") {
      window.location.href = "/cv-upload";
    } else {
      window.location.href = "/overview";
    }
  };

  /* Connexion / Inscription via provider OAuth (Google, GitHub ou Facebook) */
  const handleOAuthSignup = async (provider: "google" | "facebook" | "github") => {
    if (!isFirebaseConfigured()) {
      setError("Le service OAuth n'est pas encore configuré.");
      return;
    }
    setError(null);
    setSocialBusy(provider);
    try {
      const user =
        provider === "google"
          ? await signInWithGoogle()
          : provider === "github"
            ? await signInWithGithub()
            : await signInWithFacebook();
      await exchangeFirebaseSession(user, { role });
      handlePostAuthRedirect(role);
    } catch (err: unknown) {
      console.error("[handleOAuthSignup Error]", err);
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code?: unknown }).code)
          : "";
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      if (code === "auth/popup-blocked") {
        setError(
          "La fenêtre de connexion a été bloquée par votre navigateur. Veuillez autoriser les fenêtres pop-up pour ce site."
        );
        return;
      }
      if (code === "auth/unauthorized-domain") {
        setError("Ce domaine n'est pas encore autorisé dans la console Firebase.");
        return;
      }
      const message = err instanceof Error ? err.message : "";
      const providerLabel =
        provider === "google" ? "Google" : provider === "github" ? "GitHub" : "Facebook";
      setError(
        message || `Connexion avec ${providerLabel} annulée ou indisponible.`
      );
    } finally {
      setSocialBusy(null);
    }
  };

  /* Soumission email/mot de passe */
  const onSubmit = async (data: RegisterValues) => {
    setError(null);
    try {
      if (isFirebaseConfigured()) {
        const user = await createAccountWithEmail(data.email, data.password);
        const ok = await exchangeFirebaseSession(user, {
          first_name: data.first_name,
          last_name: data.last_name,
          role,
        });
        if (!ok) {
          throw new Error("Échec lors de la création de la session.");
        }
      } else {
        // Enregistrement direct via API FastAPI
        const tokens = await api.post<AuthTokens>("/auth/register", {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          password: data.password,
        });

        const res = await fetch("/api/auth/set-cookie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tokens),
        });
        if (!res.ok) throw new Error("Erreur de session.");
      }

      handlePostAuthRedirect(role);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'inscription.";
      setError(
        message.includes("existe deja")
          ? "Un compte avec cette adresse email existe déjà. Veuillez vous connecter."
          : "Une erreur est survenue lors de l'inscription. Veuillez réessayer."
      );
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* En-tête */}
      <div className="space-y-1.5 text-center">
        <h1
          className="text-2xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {role === "candidate" ? "Créer un compte Candidat" : "Créer un compte Recruteur"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {role === "candidate"
            ? "Accédez aux offres et faites matcher votre profil par IA."
            : "Recrutez et suivez chaque candidature avec votre équipe."}
        </p>
      </div>

      {/* Sélecteur de parcours UX (Candidat vs Recruteur) avec animation fluide */}
      <div className="relative grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 border border-border/80">
        <button
          type="button"
          onClick={() => setRole("candidate")}
          className={`relative z-10 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
            role === "candidate" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {role === "candidate" && (
            <motion.div
              layoutId="roleToggleIndicator"
              className="absolute inset-0 rounded-lg bg-background shadow-sm ring-1 ring-border"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <User size={15} />
            Espace Candidat
          </span>
        </button>
        <button
          type="button"
          onClick={() => setRole("recruiter")}
          className={`relative z-10 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
            role === "recruiter" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {role === "recruiter" && (
            <motion.div
              layoutId="roleToggleIndicator"
              className="absolute inset-0 rounded-lg bg-background shadow-sm ring-1 ring-border"
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Building2 size={15} />
            Espace Recruteur
          </span>
        </button>
      </div>

      {/* Boutons SSO — Google + GitHub + Facebook */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        <Button
          type="button"
          variant="outline"
          disabled={socialBusy !== null || isSubmitting}
          onClick={() => void handleOAuthSignup("google")}
          className="h-11 gap-2 rounded-xl border-border/80 px-2 text-xs sm:text-sm font-medium transition hover:bg-muted/60"
        >
          {socialBusy === "google" ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.2 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.4 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.4 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 10-1.9 13.6-5.1l-6.3-5.4C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.4 38.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.4C41.2 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-4z" />
            </svg>
          )}
          <span>Google</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={socialBusy !== null || isSubmitting}
          onClick={() => void handleOAuthSignup("github")}
          className="h-11 gap-2 rounded-xl border-border/80 px-2 text-xs sm:text-sm font-medium transition hover:bg-muted/60"
        >
          {socialBusy === "github" ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          )}
          <span>GitHub</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={socialBusy !== null || isSubmitting}
          onClick={() => void handleOAuthSignup("facebook")}
          className="h-11 gap-2 rounded-xl border-border/80 px-2 text-xs sm:text-sm font-medium transition hover:bg-muted/60"
        >
          {socialBusy === "facebook" ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true" className="shrink-0">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          <span>Facebook</span>
        </Button>
      </div>

      {/*
       * Parcours recruteur : le formulaire email est masqué.
       * Le backend (/auth/register) force CANDIDATE sur tous les comptes email.
       * Seul le chemin OAuth (Firebase) transmet le rôle recruteur.
       */}
      {role === "candidate" && (
        <>
          {/* Séparateur */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/70" />
            </div>
            <span className="relative bg-card px-3 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              ou avec votre adresse email
            </span>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive leading-relaxed"
            >
              {error}
            </div>
          )}

          {/* Formulaire email/mot de passe, candidats uniquement */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="first_name" className="block text-xs font-semibold text-foreground">
                  Prénom
                </label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="Alexandre"
                  {...register("first_name")}
                  className="h-11 rounded-xl text-sm border-border/80 focus-visible:ring-primary/20"
                />
                {errors.first_name && (
                  <p className="text-xs text-destructive">{errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="last_name" className="block text-xs font-semibold text-foreground">
                  Nom
                </label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Martin"
                  {...register("last_name")}
                  className="h-11 rounded-xl text-sm border-border/80 focus-visible:ring-primary/20"
                />
                {errors.last_name && (
                  <p className="text-xs text-destructive">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-foreground">
                Adresse email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="alexandre.martin@exemple.com"
                  {...register("email")}
                  className="h-11 rounded-xl pr-4 pl-10 text-sm border-border/80 focus-visible:ring-primary/20"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold text-foreground">
                  Mot de passe
                </label>
                <span className="text-[11px] text-muted-foreground">8 caractères minimum</span>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                  {...register("password")}
                  className="h-11 rounded-xl pr-10 pl-10 text-sm border-border/80 focus-visible:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Jauge isolée mémoïsée */}
              <PasswordStrengthIndicator password={currentPassword} />

              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full gap-2 rounded-xl text-sm font-semibold shadow-sm transition hover:shadow"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
            </div>
          </form>
        </>
      )}

      {/* Parcours recruteur : message d'erreur OAuth affiché ici si besoin */}
      {role === "recruiter" && error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive leading-relaxed"
        >
          {error}
        </div>
      )}

      {/* Pied de formulaire */}
      <div className="pt-2 text-center text-xs text-muted-foreground">
        Vous avez déjà un compte ?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Se connecter
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
