"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";

import { api } from "@/lib/api";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import type { AuthTokens } from "@/types";

/* Composant principal de la page de connexion */
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginValues) => {
    setError(null);
    try {
      const formData = new URLSearchParams();
      formData.append("username", data.email);
      formData.append("password", data.password);

      const tokens = await api.post<AuthTokens>("/auth/login", formData.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const res = await fetch("/api/auth/set-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokens),
      });

      if (res.ok) {
        router.push("/overview");
        router.refresh();
      } else {
        throw new Error("Erreur de session");
      }
    } catch {
      setError("Email ou mot de passe incorrect.");
    }
  };

  return (
    <div className="w-full max-w-[400px] space-y-7">
      {/* En-tête */}
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-widest text-[#1d40d9] uppercase">
          Bon retour
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Se connecter à ETP
        </h1>
        <p className="text-sm text-gray-500">
          Entrez vos identifiants pour accéder à votre espace.
        </p>
      </div>

      {/* Boutons SSO — redirections vers les endpoints OAuth du backend */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="http://localhost:8000/api/v1/auth/google/login"
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.2 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.4 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.4 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 10-1.9 13.6-5.1l-6.3-5.4C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.4 38.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.4C41.2 35.9 44 30.4 44 24c0-1.3-.1-2.7-.4-4z" />
          </svg>
          Google
        </a>
        <a
          href="http://localhost:8000/api/v1/auth/linkedin/login"
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          LinkedIn
        </a>
      </div>

      {/* Séparateur */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-xs font-medium tracking-wider text-gray-400 uppercase">
          ou continuer avec l'email
        </span>
        <div className="flex-1 border-t border-gray-200" />
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

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
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
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>

        {/* Mot de passe */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-[#1d40d9] hover:underline">
              Oublié ?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
              className="block w-full rounded-lg border border-gray-200 bg-white py-2.5 pr-10 pl-4 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-[#1d40d9] focus:ring-2 focus:ring-[#1d40d9]/20 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={
                showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
              }
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Bouton principal */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1d40d9] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1635c4] focus:ring-2 focus:ring-[#1d40d9]/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          )}
          Se connecter
        </button>
      </form>

      {/* Pied de page */}
      <div className="space-y-3 text-center">
        <p className="text-sm text-gray-500">Nouveau sur ETP ?</p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/register?role=candidate"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
          >
            Je suis candidat
          </Link>
          <Link
            href="/register?role=recruiter"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
          >
            Je recrute
          </Link>
        </div>
      </div>
    </div>
  );
}
