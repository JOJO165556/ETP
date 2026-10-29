"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  isFirebaseConfigured,
  signInWithGoogle,
  signInWithFacebook,
  signInWithEmail,
  exchangeFirebaseSession,
} from "@/lib/firebase";
import { api } from "@/lib/api";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import type { AuthTokens } from "@/types";

/* Partage la logique post-auth : exchange + cookie + redirection selon rôle. */
async function completeLogin(redirectTo: string | null): Promise<boolean> {
  const me = await api
    .get<{ role: string; profile_complete: boolean }>("/auth/me")
    .catch(() => null);
  if (me?.role === "candidate" && !me.profile_complete) {
    window.location.href = "/cv-upload";
  } else {
    window.location.href = redirectTo ?? "/overview";
  }
  return true;
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [socialBusy, setSocialBusy] = useState<"google" | "facebook" | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const firebaseReady = isFirebaseConfigured();

  /* Soumission email/mot de passe : Firebase si configuré, sinon la session classique. */
  const onSubmit = async (data: LoginValues) => {
    setError(null);
    try {
      if (firebaseReady) {
        const user = await signInWithEmail(data.email, data.password);
        const ok = await exchangeFirebaseSession(user);
        if (!ok) throw new Error("session");
        await completeLogin(null);
      } else {
        // Mode dégradé : avant la migration Firebase, on garde le flux /auth/login
        const formData = new URLSearchParams();
        formData.append("username", data.email);
        formData.append("password", data.password);
        const tokens = await api.post<AuthTokens>("/auth/login", formData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        const res = await fetch("/api/auth/set-cookie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tokens),
        });
        if (!res.ok) throw new Error("session");
        await completeLogin(null);
      }
      router.refresh();
    } catch {
      setError("Email ou mot de passe incorrect.");
    }
  };

  const handleSocial = async (kind: "google" | "facebook") => {
    if (!firebaseReady) {
      setError("Connexion sociale indisponible : Firebase n'est pas configuré.");
      return;
    }
    setError(null);
    setSocialBusy(kind);
    try {
      const user = kind === "google"
        ? await signInWithGoogle()
        : await signInWithFacebook();
      const ok = await exchangeFirebaseSession(user);
      if (!ok) throw new Error("session");
      await completeLogin(null);
    } catch (err) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code?: unknown }).code)
          : "";
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        // L'utilisateur a fermé le popup : pas d'erreur à afficher.
        return;
      }
      setError(
        code === "auth/unauthorized-domain"
          ? "Domaine non autorisé par Firebase. Ajoutez cette adresse aux domaines autorisés puis réessayez."
          : "Connexion sociale annulée ou échouée."
      );
    } finally {
      setSocialBusy(null);
    }
  };

  return (
    <div className="w-full max-w-[400px] space-y-7">
      {/* En-tête */}
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          Bon retour
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          Se connecter à ETP
        </h1>
        <p className="text-sm text-muted-foreground">
          Entrez vos identifiants pour accéder à votre espace.
        </p>
      </div>

      {/* Boutons SSO — gérés par Firebase (popup) */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={socialBusy !== null}
          onClick={() => void handleSocial("google")}
          className="gap-2 px-4 py-2.5 text-sm font-medium"
        >
          {socialBusy === "google" ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.2 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.4 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.4 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 10-1.9 13.6-5.1l-6.3-5.4C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.4 38.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.4C41.2 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-4z" />
            </svg>
          )}
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={socialBusy !== null}
          onClick={() => void handleSocial("facebook")}
          className="gap-2 px-4 py-2.5 text-sm font-medium"
        >
          {socialBusy === "facebook" ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          Facebook
        </Button>
      </div>

      {/* Séparateur */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          ou continuer avec l'email
        </span>
        <div className="flex-1 border-t border-border" />
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

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
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
              placeholder="vous@exemple.com"
              {...register("email")}
              className="h-auto py-2.5 pr-4 pl-9"
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        {/* Mot de passe */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Mot de passe
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Oublié ?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
              className="h-auto py-2.5 pr-10 pl-4"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={
                showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
              }
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Bouton principal */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full gap-2 px-4 py-3 text-sm font-semibold"
        >
          {isSubmitting && (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          )}
          Se connecter
        </Button>
      </form>

      {/* Pied de page */}
      <div className="space-y-3 text-center">
        <p className="text-sm text-muted-foreground">Nouveau sur ETP ?</p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/register?role=candidate"
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:border-border hover:bg-muted"
          >
            Je suis candidat
          </Link>
          <Link
            href="/register?role=recruiter"
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:border-border hover:bg-muted"
          >
            Je recrute
          </Link>
        </div>
      </div>
    </div>
  );
}