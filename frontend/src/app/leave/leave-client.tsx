"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

const DELAI_SECONDES = 5;

function normaliserCible(valeur: string | null): URL | null {
  if (!valeur) return null;
  try {
    const url = new URL(valeur);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

export function LeaveClient({ cible }: { cible: string | null }) {
  const url = useMemo(() => normaliserCible(cible), [cible]);
  const [compteur, setCompteur] = useState(DELAI_SECONDES);

  useEffect(() => {
    if (!url) return;

    const interval = setInterval(() => {
      setCompteur((c) => {
        if (c <= 1) {
          clearInterval(interval);
          window.location.href = url.toString();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [url]);

  const progression = url ? (compteur / DELAI_SECONDES) * 100 : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-16 items-center border-b border-border px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
          ETP
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-warning/10 text-warning">
            <ShieldAlert size={20} aria-hidden="true" />
          </span>

          <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
            Vous quittez ETP
          </h1>

          {url ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Ce lien vous conduit vers un site externe. Son contenu et ses règles de
                confidentialité ne dépendent pas d&apos;ETP.
              </p>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
                {/* Favicon destination */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${url.origin}/favicon.ico`}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  width={16}
                  height={16}
                  alt=""
                  className="shrink-0"
                />
                <span className="font-mono text-xs break-all text-foreground">{url.host}</span>
              </div>

              {/* Barre de progression + compte à rebours */}
              <div className="mt-5 space-y-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
                    style={{ width: `${progression}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Redirection dans {compteur} s…
                </p>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Le lien demandé est invalide ou incomplet. Revenez à votre espace pour
              reprendre votre navigation.
            </p>
          )}

          <div className="mt-7 flex flex-col gap-2">
            {url && (
              <Button
                render={
                  <a href={url.toString()} target="_blank" rel="noopener noreferrer nofollow" />
                }
                className="w-full gap-2"
              >
                Continuer vers {url.host}
                <ExternalLink size={15} aria-hidden="true" />
              </Button>
            )}
            <Button variant="outline" render={<Link href="/overview" />} className="w-full gap-2">
              <ArrowLeft size={15} aria-hidden="true" />
              Revenir à mon espace
            </Button>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Conseil : vérifiez l&apos;adresse avant de saisir des informations personnelles.
          </p>
        </div>
      </main>
    </div>
  );
}
