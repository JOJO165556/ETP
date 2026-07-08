"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

/* Intercepte les tokens JWT renvoyés par le backend après un Social Login OAuth.
   Sécurise les cookies HttpOnly via l'endpoint interne Next.js avant de rediriger. */
function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const next = searchParams.get("next") || "/overview";

    if (!accessToken) {
      // Aucun token : retour à la page de connexion
      router.replace("/login?error=oauth_failed");
      return;
    }

    // Définition des cookies HttpOnly sécurisés via la route interne Next.js
    fetch("/api/auth/set-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erreur de cookie");
        router.replace(next);
      })
      .catch(() => {
        router.replace("/login?error=session_failed");
      });
  }, [router, searchParams]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white">
      {/* Logo ETP */}
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d40d9] text-sm font-bold text-white">
        E
      </div>

      {/* Spinner de chargement */}
      <div className="flex flex-col items-center gap-2 text-center">
        <Loader2 size={24} className="animate-spin text-[#1d40d9]" />
        <p className="text-sm font-medium text-gray-700">
          Connexion en cours, veuillez patienter...
        </p>
        <p className="text-xs text-gray-400">
          Nous sécurisons votre session.
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#1d40d9]" />
        </div>
      }
    >
      <AuthCallbackHandler />
    </Suspense>
  );
}
