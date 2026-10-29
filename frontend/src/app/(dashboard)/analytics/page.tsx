"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Eye,
  Sparkles,
  TrendingUp,
  UserCheck,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analyticsService } from "@/services/analytics.service";
import { applicationsService } from "@/services/applications.service";
import type { CandidatureAPI, ResumeAnalytiques } from "@/types/domain";

const ETAPES_PIPELINE = [
  { cle: "applied", libelle: "Postulé" },
  { cle: "screening", libelle: "Pré-évaluation" },
  { cle: "interview", libelle: "Entretien" },
  { cle: "offer", libelle: "Offre" },
  { cle: "hired", libelle: "Embauché" },
  { cle: "rejected", libelle: "Refusé" },
] as const;

const VARIANTE_STAGE: Record<string, "secondary" | "info" | "brand" | "warning" | "success" | "destructive"> = {
  applied: "secondary",
  screening: "info",
  interview: "brand",
  offer: "warning",
  hired: "success",
  rejected: "destructive",
};

function formaterDateRelie(iso: string | null): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    const diffJours = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffJours < 1) return "aujourd'hui";
    if (diffJours === 1) return "hier";
    if (diffJours < 7) return `il y a ${diffJours}j`;
    return date.toLocaleDateString("fr-FR");
  } catch {
    return "—";
  }
}

function CarteKPI({
  Icone,
  titre,
  valeur,
  unite,
  note,
  accent,
}: {
  Icone: React.ComponentType<{ size?: number; className?: string }>;
  titre: string;
  valeur: number | string;
  unite?: string;
  note?: string;
  accent: string;
}) {
  return (
    <Card className="p-0">
      <CardContent className="flex flex-col justify-between gap-6">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              accent
            )}
          >
            <Icone size={20} />
          </div>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            {titre}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-foreground">{valeur}</span>
            {unite && (
              <span className="text-sm font-medium text-muted-foreground">
                {unite}
              </span>
            )}
          </div>
          {note && <p className="mt-1 text-xs leading-snug text-muted-foreground">{note}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [resume, setResume] = useState<ResumeAnalytiques | null>(null);
  const [candidatures, setCandidatures] = useState<CandidatureAPI[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let annule = false;
    Promise.all([analyticsService.getMonResume(), applicationsService.getMesCandidatures()])
      .then(([r, apps]) => {
        if (annule) return;
        setResume(r);
        setCandidatures(apps);
      })
      .catch(() => {
        if (annule) return;
        setErreur(true);
      })
      .finally(() => {
        if (annule) return;
        setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, []);

  const distribution = useMemo(() => {
    const comptes: Record<string, number> = {};
    for (const app of candidatures) {
      comptes[app.stage] = (comptes[app.stage] ?? 0) + 1;
    }
    const total = Math.max(candidatures.length, 1);
    return ETAPES_PIPELINE.map((etape) => ({
      ...etape,
      count: comptes[etape.cle] ?? 0,
      pourcent: Math.round(((comptes[etape.cle] ?? 0) / total) * 100),
    }));
  }, [candidatures]);

  const recentes = useMemo(
    () => [...candidatures].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 5),
    [candidatures]
  );

  if (chargement) {
    return (
      <div className="space-y-6 p-8 lg:p-12">
        <div className="h-8 w-72 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted/70" />
          ))}
        </div>
      </div>
    );
  }

  if (erreur || !resume) {
    return (
      <div className="p-8 lg:p-12">
        <Card className="border-destructive/20 p-0">
          <CardContent>
            <p className="text-sm text-destructive">
              Impossible de charger vos statistiques pour le moment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 lg:p-12">
      {/* En-tête */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Mon activité</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Indicateurs de votre recherche calculés à partir de vos données réelles.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <TrendingUp size={12} aria-hidden="true" /> En direct
        </Badge>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <CarteKPI
          Icone={Briefcase}
          titre="Candidatures actives"
          valeur={resume.candidatures_actives}
          note="Candidatures en cours, hors refus."
          accent="bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
        />
        <CarteKPI
          Icone={Sparkles}
          titre="Nouveaux matchs"
          valeur={resume.nouveaux_matchs}
          note="Offres actives partageant au moins une de vos compétences."
          accent="bg-[var(--color-info)]/15 text-[var(--color-info)]"
        />
        <CarteKPI
          Icone={Eye}
          titre="Vues de profil"
          valeur={resume.vues_profil}
          note={
            resume.evolution_vues > 0
              ? `+${resume.evolution_vues} par rapport à la veille.`
              : "Le suivi des vues arrive bientôt."
          }
          accent="bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
        />
        <CarteKPI
          Icone={UserCheck}
          titre="Taux d'entretien"
          valeur={resume.taux_entretien}
          unite="%"
          note={`Taux d'offre reçue : ${resume.taux_offre}%`}
          accent="bg-[var(--color-success)]/15 text-[var(--color-success)]"
        />
      </div>

      {/* Pipeline réel */}
      <section>
        <CardHeader className="gap-0">
          <CardTitle className="text-lg font-bold text-[var(--color-foreground)]">Répartition de mes candidatures</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Position de vos candidatures dans le processus de recrutement.
          </p>
        </CardHeader>
        <CardContent>
          {candidatures.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-10 text-center">
              <FileText size={28} className="text-[var(--color-muted-foreground)]" aria-hidden="true" />
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Aucune candidature pour l'instant. Postulez à une offre pour alimenter
                ces statistiques.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
              {distribution.map((etape) => (
                <div key={etape.cle} className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 transition-shadow duration-200 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--color-foreground)]/85">{etape.libelle}</span>
                    <span className="text-lg font-bold text-[var(--color-foreground)]">{etape.count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-popover)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-700"
                      style={{ width: `${Math.max(4, etape.pourcent)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold tracking-wider text-[var(--color-muted-foreground)] uppercase">
                    {etape.pourcent}% du total
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </section>

      {/* Dernières candidatures */}
      <section>
        <CardHeader className="gap-0">
          <CardTitle className="text-lg font-bold text-[var(--color-foreground)]">Dernières candidatures</CardTitle>
        </CardHeader>
        <CardContent>
          {recentes.length === 0 ? (
            <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 text-sm text-[var(--color-muted-foreground)]">
              Vos candidatures apparaîtront ici dès que vous en aurez.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {recentes.map((app) => (
                <li key={app.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                      {app.job_title ?? "Poste sans intitulé"}
                    </p>
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                      {app.company_name ?? "Entreprise inconnue"} · modifiée {formaterDateRelie(app.updated_at ?? app.created_at)}
                    </p>
                  </div>
                  <Badge variant={VARIANTE_STAGE[app.stage] ?? "secondary"}>
                    {ETAPES_PIPELINE.find((e) => e.cle === app.stage)?.libelle ?? app.stage}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </section>
    </div>
  );
}