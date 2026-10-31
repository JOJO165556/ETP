"use client";

import { Suspense, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Loader2,
  User,
  Building2,
  CheckCircle2,
  Check,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import * as z from "zod";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isFirebaseConfigured,
  createAccountWithEmail,
  signInWithGoogle,
  exchangeFirebaseSession,
} from "@/lib/firebase";
import { registerSchema, type RegisterValues } from "@/lib/validations/auth";
import type { AuthTokens } from "@/types";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get("role");

  // Rôle choisi : 'candidate' ou 'recruiter'
  const [role, setRole] = useState<"candidate" | "recruiter">(
    initialRoleParam === "recruiter" ? "recruiter" : "candidate"
  );
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [socialBusy, setSocialBusy] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { first_name: "", last_name: "", email: "", password: "" },
  });

  const currentPassword = watch("password") || "";

  // Critères détaillés et score du mot de passe
  const passwordCriteria = useMemo(() => {
    return {
      hasLength: currentPassword.length >= 8,
      hasUpper: /[A-Z]/.test(currentPassword),
      hasNumber: /[0-9]/.test(currentPassword),
      hasSpecial: /[^A-Za-z0-9]/.test(currentPassword),
    };
  }, [currentPassword]);

  const passwordScore = useMemo(() => {
    if (!currentPassword) return 0;
    let s = 0;
    if (passwordCriteria.hasLength) s++;
    if (passwordCriteria.hasUpper) s++;
    if (passwordCriteria.hasNumber) s++;
    if (passwordCriteria.hasSpecial || currentPassword.length >= 12) s++;
    return s;
  }, [currentPassword, passwordCriteria]);

  const strengthMeta = useMemo(() => {
    if (passwordScore === 0) return { label: "", color: "bg-muted" };
    if (passwordScore === 1) return { label: "Trop court (8+ car. requis)", color: "bg-red-500" };
    if (passwordScore === 2) return { label: "Moyen (ajoutez majuscule ou chiffre)", color: "bg-amber-500" };
    if (passwordScore === 3) return { label: "Fort", color: "bg-emerald-500" };
    return { label: "Excellente robustesse", color: "bg-emerald-600" };
  }, [passwordScore]);

  /* Redirection adaptée au profil */
  const handlePostAuthRedirect = (selectedRole: "candidate" | "recruiter") => {
    if (selectedRole === "candidate") {
      router.push("/cv-upload");
    } else {
      router.push("/overview");
    }
    router.refresh();
  };

  /* Connexion / Inscription Google */
  const handleGoogleSignup = async () => {
    if (!isFirebaseConfigured()) {
      setError("Le service Google OAuth n'est pas encore configuré.");
      return;
    }
    setError(null);
    setSocialBusy(true);
    try {
      const user = await signInWithGoogle();
      const ok = await exchangeFirebaseSession(user, {
        role,
      });
      if (!ok) {
        throw new Error("L'échange d'authentification a échoué.");
      }
      handlePostAuthRedirect(role);
    } catch (err: unknown) {
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
      setError(
        code === "auth/unauthorized-domain"
          ? "Ce domaine web n'est pas encore autorisé dans la console Firebase."
          : "Inscription avec Google annulée ou indisponible."
      );
    } finally {
      setSocialBusy(false);
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
          role,
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
          : message
      );
    }
  };

  return (
    <div className="w-full max-w-[440px] space-y-6">
      {/* En-tête avec titre dynamique */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          Création de compte ETP
        </p>
        <h1
          className="text-2xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {role === "candidate" ? "Rejoignez l'élite des talents" : "Recrutez les meilleurs profils"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {role === "candidate"
            ? "Accédez aux offres géolocalisées et faites matcher votre CV par IA."
            : "Pilotez vos recrutements avec scoring de pertinence et pipeline Kanban."}
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

      {/* Bouton SSO Google */}
      <Button
        type="button"
        variant="outline"
        disabled={socialBusy || isSubmitting}
        onClick={handleGoogleSignup}
        className="w-full h-11 gap-2.5 text-sm font-medium border-border hover:bg-muted/50"
      >
        {socialBusy ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20H24v8h11.3C33.6 33.2 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.4 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.4 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 10-1.9 13.6-5.1l-6.3-5.4C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.4 38.6 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.4C41.2 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-4z"
            />
          </svg>
        )}
        S'inscrire avec Google ({role === "candidate" ? "Candidat" : "Recruteur"})
      </Button>

      {/* Séparateur */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          ou avec votre adresse email
        </span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Message d'erreur */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {error}
        </div>
      )}

      {/* Formulaire complet */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="first_name" className="block text-sm font-medium text-foreground">
              Prénom
            </label>
            <Input
              id="first_name"
              type="text"
              placeholder="Alexandre"
              {...register("first_name")}
              className="h-10"
            />
            {errors.first_name && (
              <p className="text-xs text-destructive">{errors.first_name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="last_name" className="block text-sm font-medium text-foreground">
              Nom
            </label>
            <Input
              id="last_name"
              type="text"
              placeholder="Martin"
              {...register("last_name")}
              className="h-10"
            />
            {errors.last_name && (
              <p className="text-xs text-destructive">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Adresse email professionnelle ou personnelle
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="alexandre.martin@exemple.com"
              {...register("email")}
              className="h-10 pl-9"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Mot de passe sécurisé
            </label>
            <span className="text-[11px] text-muted-foreground">8 caractères minimum</span>
          </div>
          <div className="relative">
            <Lock
              size={16}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              {...register("password")}
              className="h-10 pr-10 pl-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Jauge animée de sécurité et d'efficacité du mot de passe */}
          {currentPassword.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-2 pt-1.5"
            >
              {/* 4 segments animés avec spring */}
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((step) => {
                  const isActive = passwordScore >= step;
                  return (
                    <div key={step} className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={`h-full ${isActive ? strengthMeta.color : "bg-transparent"}`}
                        initial={false}
                        animate={{
                          scaleX: isActive ? 1 : 0,
                          opacity: isActive ? 1 : 0,
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        style={{ originX: 0 }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Libellé d'efficacité */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">Robustesse :</span>
                <span
                  className={`font-semibold ${
                    passwordScore >= 3
                      ? "text-emerald-500"
                      : passwordScore === 2
                        ? "text-amber-500"
                        : "text-destructive"
                  }`}
                >
                  {strengthMeta.label}
                </span>
              </div>

              {/* Critères interactifs avec cochettes animées */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                <div
                  className={`flex items-center gap-1.5 transition-colors ${
                    passwordCriteria.hasLength ? "text-emerald-500 font-medium" : "text-muted-foreground"
                  }`}
                >
                  <motion.span
                    animate={{ scale: passwordCriteria.hasLength ? [0.8, 1.25, 1] : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {passwordCriteria.hasLength ? (
                      <Check size={12} strokeWidth={3} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mx-0.5 inline-block" />
                    )}
                  </motion.span>
                  <span>8+ caractères</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 transition-colors ${
                    passwordCriteria.hasUpper ? "text-emerald-500 font-medium" : "text-muted-foreground"
                  }`}
                >
                  <motion.span
                    animate={{ scale: passwordCriteria.hasUpper ? [0.8, 1.25, 1] : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {passwordCriteria.hasUpper ? (
                      <Check size={12} strokeWidth={3} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mx-0.5 inline-block" />
                    )}
                  </motion.span>
                  <span>1 majuscule</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 transition-colors ${
                    passwordCriteria.hasNumber ? "text-emerald-500 font-medium" : "text-muted-foreground"
                  }`}
                >
                  <motion.span
                    animate={{ scale: passwordCriteria.hasNumber ? [0.8, 1.25, 1] : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {passwordCriteria.hasNumber ? (
                      <Check size={12} strokeWidth={3} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mx-0.5 inline-block" />
                    )}
                  </motion.span>
                  <span>1 chiffre</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 transition-colors ${
                    passwordCriteria.hasSpecial ? "text-emerald-500 font-medium" : "text-muted-foreground"
                  }`}
                >
                  <motion.span
                    animate={{ scale: passwordCriteria.hasSpecial ? [0.8, 1.25, 1] : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {passwordCriteria.hasSpecial ? (
                      <Check size={12} strokeWidth={3} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mx-0.5 inline-block" />
                    )}
                  </motion.span>
                  <span>1 symbole (!@#$)</span>
                </div>
              </div>
            </motion.div>
          )}

          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 gap-2 text-sm font-semibold shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Créer mon compte {role === "candidate" ? "Candidat" : "Recruteur"}
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Pied de formulaire */}
      <div className="border-t border-border pt-4 text-center">
        <p className="text-sm text-muted-foreground">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Se connecter
          </Link>
        </p>
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
