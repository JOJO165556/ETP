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

// OAuth désactivé temporairement : popup Firebase non stable
// import {
//   isFirebaseConfigured,
//   createAccountWithEmail,
//   signInWithGoogle,
//   signInWithFacebook,
//   signInWithGithub,
//   exchangeFirebaseSession,
// } from "@/lib/firebase";

import { registerSchema, type RegisterValues } from "@/lib/validations/auth";
import type { AuthTokens } from "@/types";

/* Jauge de robustesse du mot de passe */
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
      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
        {[
          { key: "hasLength", label: "8+ caractères" },
          { key: "hasUpper", label: "1 majuscule" },
          { key: "hasNumber", label: "1 chiffre" },
          { key: "hasSpecial", label: "1 symbole (!@#$)" },
        ].map(({ key, label: l }) => {
          const active = criteria[key as keyof typeof criteria];
          return (
            <div
              key={key}
              className={`flex items-center gap-1.5 transition-colors ${
                active ? "text-emerald-500 font-medium" : "text-muted-foreground"
              }`}
            >
              {active ? (
                <Check size={12} strokeWidth={3} className="text-emerald-500" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mx-0.5 inline-block" />
              )}
              <span>{l}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get("role");

  const [role, setRole] = useState<"candidate" | "recruiter">(
    initialRoleParam === "recruiter" ? "recruiter" : "candidate"
  );
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  /* Étape OTP */
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingTokens, setPendingTokens] = useState<AuthTokens | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  const currentPassword = watch("password");

  const handleRoleChange = (newRole: "candidate" | "recruiter") => {
    if (newRole !== role) {
      setRole(newRole);
      reset({ email: "", password: "" });
      setError(null);
    }
  };

  const handlePostAuthRedirect = (selectedRole: "candidate" | "recruiter") => {
    if (selectedRole === "candidate") {
      window.location.href = "/cv-upload";
    } else {
      window.location.href = "/overview";
    }
  };

  /* Inscription email/mot de passe : API FastAPI directe */
  const onSubmit = async (data: RegisterValues) => {
    setError(null);
    try {
      const tokens = await api.post<AuthTokens>("/auth/register", {
        email: data.email,
        password: data.password,
      });
      setPendingTokens(tokens);

      /* Envoyer l'OTP de vérification par email (tolérant aux aléas réseau) */
      try {
        await api.post("/auth/send-otp", { email: data.email });
      } catch (otpErr) {
        console.warn("send-otp non bloquant:", otpErr);
      }
      setPendingEmail(data.email);
      setOtpStep(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message.includes("existe deja")
          ? "Un compte avec cette adresse email existe déjà. Veuillez vous connecter."
          : "Une erreur est survenue lors de l'inscription. Veuillez réessayer."
      );
    }
  };

  /* Vérification OTP */
  const handleOtpVerify = async () => {
    setError(null);
    setOtpBusy(true);
    try {
      const resOtp = await api.post<{ access_token?: string; refresh_token?: string }>("/auth/verify-otp", {
        email: pendingEmail,
        code: otpCode,
      });

      const finalTokens =
        resOtp.access_token && resOtp.refresh_token
          ? {
              access_token: resOtp.access_token,
              refresh_token: resOtp.refresh_token,
              token_type: "bearer",
            }
          : pendingTokens;

      if (finalTokens) {
        await fetch("/api/auth/set-cookie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalTokens),
        });
      }

      handlePostAuthRedirect(role);
    } catch {
      setError("Code invalide ou expiré. Vérifiez votre email.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    try {
      await api.post("/auth/send-otp", { email: pendingEmail });
    } catch {
      setError("Impossible de renvoyer le code. Réessayez dans quelques instants.");
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
          {otpStep
            ? "Vérifiez votre email"
            : role === "candidate"
              ? "Créer un compte Candidat"
              : "Créer un compte Recruteur"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {otpStep
            ? `Code envoyé à ${pendingEmail}`
            : role === "candidate"
              ? "Accédez aux offres et faites matcher votre profil par IA."
              : "Recrutez et suivez chaque candidature avec votre équipe."}
        </p>
      </div>

      {/* Sélecteur candidat / recruteur (masqué en étape OTP) */}
      {!otpStep && (
        <div className="relative grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 border border-border/80">
          <button
            type="button"
            onClick={() => handleRoleChange("candidate")}
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
            onClick={() => handleRoleChange("recruiter")}
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
      )}

      {/* OAuth commenté : non fonctionnel en prod pour l'instant */}
      {/* <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" onClick={() => void handleOAuthSignup("google")}>Google</Button>
        <Button variant="outline" onClick={() => void handleOAuthSignup("github")}>GitHub</Button>
        <Button variant="outline" onClick={() => void handleOAuthSignup("facebook")}>Facebook</Button>
      </div> */}

      {/* Erreur */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive leading-relaxed"
        >
          {error}
        </div>
      )}

      {/* Étape 1 : formulaire inscription */}
      {!otpStep && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                placeholder={role === "candidate" ? "alexandre.martin@exemple.com" : "recrutement@entreprise.com"}
                {...register("email")}
                className="h-11 rounded-xl pr-4 pl-10 text-sm border-border/80 focus-visible:ring-primary/20"
              />
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
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
            <PasswordStrengthIndicator password={currentPassword} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
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
      )}

      {/* Étape 2 : saisie OTP */}
      {otpStep && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="otp" className="block text-xs font-semibold text-foreground">
              Code de vérification
            </label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              className="h-11 rounded-xl text-center text-lg tracking-widest font-mono border-border/80 focus-visible:ring-primary/20"
              autoFocus
            />
          </div>

          <Button
            type="button"
            disabled={otpBusy || otpCode.length < 6}
            onClick={handleOtpVerify}
            className="h-11 w-full gap-2 rounded-xl text-sm font-semibold shadow-sm transition hover:shadow"
          >
            {otpBusy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            Vérifier et continuer
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Pas reçu ?{" "}
            <button
              type="button"
              onClick={handleResendOtp}
              className="font-semibold text-primary hover:underline"
            >
              Renvoyer le code
            </button>
            {" "}ou{" "}
            <button
              type="button"
              onClick={() => { setOtpStep(false); setOtpCode(""); setError(null); }}
              className="font-semibold text-primary hover:underline"
            >
              modifier l&apos;email
            </button>
          </p>
        </div>
      )}

      {/* Pied */}
      {!otpStep && (
        <div className="pt-2 text-center text-xs text-muted-foreground">
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Se connecter
          </Link>
        </div>
      )}
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
