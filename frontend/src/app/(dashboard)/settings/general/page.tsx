"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";

import { ApiRequestError } from "@/lib/api";
import { companiesService } from "@/services/companies.service";
import { usersService } from "@/services/users.service";
import { PageHeader } from "@/components/shared/page-header";
import { StatePanel } from "@/components/shared/state-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { CompanyResponse } from "@/types/domain";

/* Paramètres de l'entreprise du recruteur connecté (GET + PATCH /companies/{id}). */
export default function ParametresEntreprisePage() {
  const [entreprise, setEntreprise] = useState<CompanyResponse | null>(null);
  const [nom, setNom] = useState("");
  const [siret, setSiret] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [sansEntreprise, setSansEntreprise] = useState(false);

  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const profil = await usersService.getMonProfil();
        if (!profil.company_id) {
          if (actif) setSansEntreprise(true);
          return;
        }
        const data = await companiesService.getEntreprise(profil.company_id);
        if (!actif) return;
        setEntreprise(data);
        setNom(data.name);
        setSiret(data.siret ?? "");
      } catch {
        if (actif) setErreur("Les informations de l'entreprise n'ont pas pu être chargées.");
      } finally {
        if (actif) setChargement(false);
      }
    })();
    return () => {
      actif = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entreprise || !nom.trim()) return;
    setEnCours(true);
    setErreur(null);
    setSauvegarde(false);
    try {
      const maj = await companiesService.mettreAJourEntreprise(entreprise.id, {
        name: nom.trim(),
        siret: siret.trim() || null,
      });
      setEntreprise(maj);
      setSauvegarde(true);
    } catch (err) {
      setErreur(
        err instanceof ApiRequestError && err.status === 403
          ? "Vous n'êtes pas autorisé à modifier cette entreprise."
          : err instanceof Error
            ? err.message
            : "La mise à jour a échoué. Réessayez."
      );
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6 lg:p-10">
      <PageHeader
        title="Entreprise"
        description="Les informations de votre entreprise, visibles sur vos offres d'emploi."
      />

      {chargement ? (
        <div className="space-y-3">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      ) : sansEntreprise ? (
        <StatePanel
          title="Aucune entreprise associée"
          description="Votre compte n'est rattaché à aucune entreprise. Contactez un administrateur."
        />
      ) : entreprise ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Building2 size={17} className="text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-foreground">
                {entreprise.name}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="company-name" className="text-xs font-semibold text-foreground">
                  Nom de l'entreprise
                </label>
                <Input
                  id="company-name"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="company-siret" className="text-xs font-semibold text-foreground">
                  SIRET <span className="font-normal text-muted-foreground">(optionnel)</span>
                </label>
                <Input
                  id="company-siret"
                  value={siret}
                  onChange={(e) => setSiret(e.target.value)}
                  placeholder="14 chiffres"
                  inputMode="numeric"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Identifiant interne : <code>{entreprise.slug}</code>
              </p>
            </div>
          </div>

          {erreur && (
            <p role="alert" className="text-sm text-destructive">
              {erreur}
            </p>
          )}
          {sauvegarde && (
            <p className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 size={15} aria-hidden="true" />
              Informations enregistrées.
            </p>
          )}

          <Button type="submit" disabled={enCours || !nom.trim()} className="gap-2">
            {enCours && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            Enregistrer
          </Button>
        </form>
      ) : null}
    </div>
  );
}
