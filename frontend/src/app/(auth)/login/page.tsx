"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// OAuth désactivé temporairement : popup Firebase non stable
// import {
//   signInWithGoogle,
//   signInWithFacebook,
//   signInWithGithub,
//   isFirebaseConfigured,
//   exchangeFirebaseSession,
// } from "@/lib/firebase";

import { api } from "@/lib/api";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import type { AuthTokens } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  /* Connexion email/mot de passe via API FastAPI */
  const onSubmit = async (data: LoginValues) => {
    setError(null);
    try {
      const formData = new URLSearchParams();
      formData.append("username", data.email);
      formData.append("password", data.password);
      const tokens = await api.post<AuthTokens>("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      await fetch("/api/auth/set-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokens),
      });

      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const from = params?.get("from");
      window.location.href = from && from.startsWith("/") ? from : "/overview";
    } catch {
      setError("Email ou mot de passe incorrect.");
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
          Se connecter à ETP
        </h1>
        <p className="text-sm text-muted-foreground">
          Entrez vos identifiants pour accéder à votre espace.
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive leading-relaxed"
        >
          {error}
        </div>
      )}

      {/* Formulaire de connexion direct */}
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
              placeholder="vous@exemple.com"
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
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
              className="h-11 rounded-xl pr-10 pl-4 text-sm border-border/80 focus-visible:ring-primary/20"
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
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full gap-2 rounded-xl text-sm font-semibold shadow-sm transition hover:shadow"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          Se connecter
        </Button>
      </form>

      {/* Pied de carte */}
      <div className="pt-2 text-center text-xs text-muted-foreground">
        Nouveau sur ETP ?{" "}
        <Link href="/register?role=candidate" className="font-semibold text-primary hover:underline">
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
