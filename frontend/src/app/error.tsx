"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur d'affichage", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-16 text-foreground">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle size={22} aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Une erreur est survenue
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          La page n&apos;a pas pu s&apos;afficher. Réessayez, puis revenez à votre espace si le
          problème persiste.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={reset}>Réessayer</Button>
          <Button variant="outline" render={<Link href="/overview" />}>
            Retour à mon espace
          </Button>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-muted-foreground">Référence : {error.digest}</p>
        )}
      </div>
    </div>
  );
}
