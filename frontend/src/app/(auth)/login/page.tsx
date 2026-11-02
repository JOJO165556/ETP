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
  signInWithGithub,
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
  const [socialBusy, setSocialBusy] = useState<"google" | "facebook" | "github" | null>(null);

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

  const handleSocial = async (kind: "google" | "facebook" | "github") => {
    if (!firebaseReady) {
      setError("Connexion sociale indisponible : Firebase n'est pas configuré.");
      return;
    }
    setError(null);
    setSocialBusy(kind);
    try {
      const user =
        kind === "google"
          ? await signInWithGoogle()
          : kind === "github"
            ? await signInWithGithub()
            : await signInWithFacebook();
      await exchangeFirebaseSession(user);
      await completeLogin(null);
    } catch (err) {
      console.error("[handleSocial Error]", err);
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
      if (code === "auth/popup-blocked") {
        setError(
          "La fenêtre de connexion a été bloquée par votre navigateur. Veuillez autoriser les fenêtres pop-up pour ce site."
        );
        return;
      }
      if (code === "auth/unauthorized-domain") {
        setError(
          "Domaine non autorisé par Firebase. Ajoutez cette adresse aux domaines autorisés puis réessayez."
        );
        return;
      }
      const message = err instanceof Error ? err.message : "";
      setError(message || "Connexion sociale annulée ou échouée.");
    } finally {
      setSocialBusy(null);
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

      {/* Boutons SSO — Google + GitHub + Facebook */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        <Button
          type="button"
          variant="outline"
          disabled={socialBusy !== null}
          onClick={() => void handleSocial("google")}
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
          disabled={socialBusy !== null}
          onClick={() => void handleSocial("github")}
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
          disabled={socialBusy !== null}
          onClick={() => void handleSocial("facebook")}
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

      {/* Séparateur */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/70" />
        </div>
        <span className="relative bg-card px-3 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
          ou par email
        </span>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive leading-relaxed"
          >
            {error}
          </div>
        )}

        {/* Email */}
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

        {/* Mot de passe */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-semibold text-foreground">
              Mot de passe
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
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
          className="h-11 w-full gap-2 rounded-xl text-sm font-semibold shadow-sm transition hover:shadow"
        >
          {isSubmitting && (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          )}
          Se connecter
        </Button>
      </form>

      {/* Pied de carte */}
      <div className="pt-2 text-center text-xs text-muted-foreground">
        Nouveau sur ETP ?{" "}
        <Link
          href="/register?role=candidate"
          className="font-semibold text-primary hover:underline"
        >
          Créer un compte
        </Link>
      </div>
    </div>
  );
}