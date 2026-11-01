"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, Eye, Search, TrendingUp, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatePanel } from "@/components/shared/state-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsService } from "@/services/analytics.service";
import { applicationsService } from "@/services/applications.service";
import type { CandidatureAPI, ResumeAnalytiques } from "@/types/domain";

const ETAPES = [
  { cle: "applied", libelle: "Envoyée" },
  { cle: "screening", libelle: "Présélection" },
  { cle: "interview", libelle: "Entretien" },
  { cle: "offer", libelle: "Proposition" },
  { cle: "hired", libelle: "Recruté" },
  { cle: "rejected", libelle: "Écartée" },
] as const;

const VARIANTE: Record<string, "secondary" | "info" | "brand" | "warning" | "success" | "destructive"> = {
  applied: "secondary",
  screening: "info",
  interview: "brand",
  offer: "warning",
  hired: "success",
  rejected: "destructive",
};

function dateRelative(iso: string | null): string {
  if (!iso) return "date inconnue";
  const jours = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 7) return `il y a ${jours} jours`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function IndicateursPage() {
  const [resume, setResume] = useState<ResumeAnalytiques | null>(null);
  const [candidatures, setCandidatures] = useState<CandidatureAPI[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      const [r, apps] = await Promise.all([
        analyticsService.getMonResume(),
        applicationsService.getMesCandidatures(),
      ]);
      setResume(r);
      setCandidatures(apps);
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const repartition = useMemo(() => {
    const comptes: Record<string, number> = {};
    for (const candidature of candidatures) {
      comptes[candidature.stage] = (comptes[candidature.stage] ?? 0) + 1;
    }
    const total = Math.max(candidatures.length, 1);
    return ETAPES.map((etape) => ({
      ...etape,
      nombre: comptes[etape.cle] ?? 0,
      part: Math.round(((comptes[etape.cle] ?? 0) / total) * 100),
    }));
  }, [candidatures]);

  const recentes = useMemo(
    () =>
      [...candidatures]
        .sort((a, b) => (b.updated_at ?? b.created_at ?? "").localeCompare(a.updated_at ?? a.created_at ?? ""))
        .slice(0, 5),
    [candidatures]
  );

  if (chargement) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 p-6 lg:p-10">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (erreur || !resume) {
    return (
      <div className="mx-auto w-full max-w-6xl p-6 lg:p-10">
        <StatePanel
          tone="error"
          title="Vos indicateurs sont indisponibles"
          description="La connexion au serveur a échoué. Réessayez pour actualiser vos chiffres."
          actionLabel="Réessayer"
          onAction={charger}
        />
      </div>
    );
  }

  const cartes = [
    {
      titre: "Candidatures en cours",
      valeur: resume.candidatures_actives,
      note: "Hors candidatures écartées.",
      Icone: Briefcase,
      teinte: "bg-primary/10 text-primary",
    },
    {
      titre: "Nouvelles correspondances",
      valeur: resume.nouveaux_matchs,
      note: "Offres actives qui partagent vos compétences.",
      Icone: Search,
      teinte: "bg-info/10 text-info",
    },
    {
      titre: "Vues du profil",
      valeur: resume.vues_profil,
      note:
        resume.evolution_vues > 0
          ? `+${resume.evolution_vues} depuis hier.`
          : "Pas de nouvelle vue depuis hier.",
      Icone: Eye,
      teinte: "bg-warning/10 text-warning",
    },
    {
      titre: "Taux d'entretien",
      valeur: `${resume.taux_entretien}%`,
      note: `Taux de proposition : ${resume.taux_offre}%.`,
      Icone: UserCheck,
      teinte: "bg-success/10 text-success",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-6 lg:p-10">
      <PageHeader
        title="Mes indicateurs"
        description="Votre progression, calculée à partir de vos candidatures réelles."
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <TrendingUp size={12} aria-hidden="true" />
            À jour
          </Badge>
        }
      />

      <section aria-label="Chiffres clés" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cartes.map(({ titre, valeur, note, Icone, teinte }) => (
          <div key={titre} className="rounded-xl border border-border bg-card p-5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${teinte}`}>
              <Icone size={17} aria-hidden="true" />
            </span>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{valeur}</p>
            <p className="text-sm font-medium text-foreground">{titre}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4" aria-label="Répartition des candidatures">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Où en sont mes candidatures</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chaque candidature est comptée une seule fois, à son étape actuelle.
          </p>
        </div>

        {candidatures.length === 0 ? (
          <StatePanel
            title="Aucune candidature pour l'instant"
            description="Postulez à une offre pour voir votre progression apparaître ici."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {repartition.map((etape) => (
              <div key={etape.cle} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{etape.libelle}</span>
                  <span className="text-lg font-semibold text-foreground">{etape.nombre}</span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${etape.nombre === 0 ? 0 : Math.max(6, etape.part)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{etape.part} % du total</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4" aria-label="Dernières candidatures">
        <h2 className="text-lg font-semibold text-foreground">Dernières candidatures</h2>

        {recentes.length === 0 ? (
          <StatePanel
            title="Rien à afficher"
            description="Vos candidatures apparaîtront ici dès le premier envoi."
          />
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border bg-card">
            {recentes.map((candidature) => (
              <li
                key={candidature.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {candidature.job_title ?? "Poste sans intitulé"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {candidature.company_name ?? "Entreprise non renseignée"} · mise à jour{" "}
                    {dateRelative(candidature.updated_at ?? candidature.created_at)}
                  </p>
                </div>
                <Badge variant={VARIANTE[candidature.stage] ?? "secondary"}>
                  {ETAPES.find((etape) => etape.cle === candidature.stage)?.libelle ??
                    candidature.stage}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
