"use client";

import { useEffect, useState } from "react";
import { BarChart, FileText, RefreshCw, Users } from "lucide-react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usersService } from "@/services/users.service";
import type { CandidatVivier } from "@/types/domain";

type StatsVivier = {
  total: number;
  avecCv: number;
  profilPublic: number;
  rechercheActive: number;
  topCompetences: { nom: string; count: number }[];
};

function calculerStats(candidats: CandidatVivier[]): StatsVivier {
  const compteur = new Map<string, number>();
  for (const c of candidats) {
    for (const s of c.skills ?? []) {
      const key = s.toLowerCase();
      compteur.set(key, (compteur.get(key) ?? 0) + 1);
    }
  }
  const topCompetences = [...compteur.entries()]
    .map(([nom, count]) => ({ nom, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  return {
    total: candidats.length,
    avecCv: candidats.filter((c) => c.has_cv).length,
    profilPublic: candidats.filter((c) => c.profil_public).length,
    rechercheActive: candidats.filter((c) => c.recherchable).length,
    topCompetences,
  };
}

export default function AiConfigPage() {
  const [skillWeight, setSkillWeight] = useState(65);
  const [expWeight, setExpWeight] = useState(40);
  const [llmSensitivity, setLlmSensitivity] = useState(82);
  const [stats, setStats] = useState<StatsVivier | null>(null);

  useEffect(() => {
    let vivant = true;
    usersService
      .getCandidats({ limit: 100 })
      .then((candidats) => vivant && setStats(calculerStats(candidats)))
      .catch((e) => console.error("Erreur de chargement du vivier", e));
    return () => {
      vivant = false;
    };
  }, []);

  return (
    <div className="p-8 lg:p-12">
      {/* En-tête */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">Configuration IA</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Ajustez les algorithmes de matching et les déclencheurs de flux de travail
            autonomes.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setSkillWeight(65);
              setExpWeight(40);
              setLlmSensitivity(82);
            }}
            className="transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100"
          >
            Réinitialiser par défaut
          </Button>
          <Button className="transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100">Déployer la config</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne de gauche (Settings) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Matching Sensitivity */}
          <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 transition-shadow duration-200 hover:shadow-md">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-[var(--color-foreground)]">
              <BarChart size={20} className="text-[var(--color-muted-foreground)]" /> Sensibilité du Matching
            </h2>

            <div className="space-y-8">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--color-foreground)]">
                    Pondération des compétences
                  </label>
                  <span className="text-sm font-bold text-[var(--color-primary)]">{skillWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={skillWeight}
                  onChange={(e) => setSkillWeight(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--surface-popover)] accent-[var(--color-primary)]"
                />
                <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                  Prioriser les compétences déclarées et vérifiées des candidats par rapport
                  à l'ancienneté historique.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--color-foreground)]">
                    Pondération de l'expérience
                  </label>
                  <span className="text-sm font-bold text-[var(--color-primary)]">{expWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={expWeight}
                  onChange={(e) => setExpWeight(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--surface-popover)] accent-[var(--color-primary)]"
                />
                <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                  Ajuster l'importance de la longévité dans l'industrie et de la profondeur
                  de progression de carrière.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--color-foreground)]">
                    Sensibilité lexicale (moteur sémantique)
                  </label>
                  <span className="text-sm font-bold text-[var(--color-primary)]">{llmSensitivity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={llmSensitivity}
                  onChange={(e) => setLlmSensitivity(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--surface-popover)] accent-[var(--color-primary)]"
                />
                <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                  Tolérance du moteur sémantique aux formulations proches des compétences
                  recherchées.
                </p>
              </div>
            </div>
          </section>

          {/* Engine & Workflows */}
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 transition-shadow duration-200 hover:shadow-md">
              <h2 className="mb-6 flex items-center justify-between text-lg font-bold text-[var(--color-foreground)]">
                <span className="flex items-center gap-2">
                  <FileText size={20} className="text-[var(--color-muted-foreground)]" /> Moteur d'Analyse
                </span>
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-popover)] p-3">
                  <span className="text-sm font-medium text-[var(--color-foreground)]/85">
                    Amélioration OCR
                  </span>
                  <ToggleSwitch actif={true} onChange={() => {}} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-popover)] p-3">
                  <span className="text-sm font-medium text-[var(--color-foreground)]/85">
                    Indexation des profils en ligne
                  </span>
                  <ToggleSwitch actif={false} onChange={() => {}} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-popover)] p-3">
                  <span className="text-sm font-medium text-[var(--color-foreground)]/85">
                    Enrichissement de profils
                  </span>
                  <ToggleSwitch actif={true} onChange={() => {}} />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 transition-shadow duration-200 hover:shadow-md">
              <h2 className="mb-6 flex items-center justify-between text-lg font-bold text-[var(--color-foreground)]">
                <span className="flex items-center gap-2">
                  <RefreshCw size={20} className="text-[var(--color-muted-foreground)]" /> Flux de Travail
                </span>
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-[var(--color-destructive)]/20 bg-[var(--surface-popover)] p-3">
                  <span className="text-sm font-medium text-[var(--color-foreground)]/85">
                    Rejet Automatique
                  </span>
                  <ToggleSwitch actif={true} onChange={() => {}} className="!bg-[var(--color-destructive)]" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-popover)] p-3">
                  <span className="text-sm font-medium text-[var(--color-foreground)]/85">
                    Tri des candidatures
                  </span>
                  <ToggleSwitch actif={true} onChange={() => {}} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-popover)] p-3">
                  <span className="text-sm font-medium text-[var(--color-foreground)]/85">
                    Notification des recruteurs
                  </span>
                  <ToggleSwitch actif={false} onChange={() => {}} />
                </div>
              </div>
            </section>
          </div>

          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 text-sm text-[var(--color-muted-foreground)]">
            Configuration d'essai : ces réglages orchestrent la future version du moteur de
            matching. La persistance de ces paramètres côté API sera livrée dans une
            prochaine itération.
          </div>
        </div>

        {/* Colonne de droite (Vue d'ensemble du vivier) */}
        <div className="space-y-6">
          <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 transition-shadow duration-200 hover:shadow-md">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--color-foreground)]">
                <Users size={20} className="text-[var(--color-muted-foreground)]" /> Vivier de talents
              </h2>
              <Badge variant="secondary">En direct</Badge>
            </div>
            <p className="mb-6 text-xs text-[var(--color-muted-foreground)]">
              Statistiques recalculées en continu depuis les profils de la plateforme.
            </p>

            {!stats ? (
              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-lg bg-[var(--surface-popover)]/70" />
                <div className="h-20 animate-pulse rounded-lg bg-[var(--surface-popover)]/70" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-popover)] p-4">
                  <p className="text-2xl font-bold text-[var(--color-foreground)]">{stats.total}</p>
                  <p className="text-xs font-semibold tracking-wider text-[var(--color-muted-foreground)] uppercase">
                    Candidats
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-popover)] p-4">
                  <p className="text-2xl font-bold text-[var(--color-foreground)]">
                    {stats.total ? Math.round((stats.avecCv / stats.total) * 100) : 0}%
                  </p>
                  <p className="text-xs font-semibold tracking-wider text-[var(--color-muted-foreground)] uppercase">
                    Avec CV déposé
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-popover)] p-4">
                  <p className="text-2xl font-bold text-[var(--color-foreground)]">{stats.profilPublic}</p>
                  <p className="text-xs font-semibold tracking-wider text-[var(--color-muted-foreground)] uppercase">
                    Profils publics
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-popover)] p-4">
                  <p className="text-2xl font-bold text-[var(--color-foreground)]">{stats.rechercheActive}</p>
                  <p className="text-xs font-semibold tracking-wider text-[var(--color-muted-foreground)] uppercase">
                    Recherche active
                  </p>
                </div>
              </div>
            )}

            {stats && stats.topCompetences.length > 0 && (
              <div className="mt-6">
                <p className="mb-3 text-xs font-bold tracking-wider text-[var(--color-muted-foreground)] uppercase">
                  Compétences les plus présentes
                </p>
                <ul className="space-y-2">
                  {stats.topCompetences.map((c) => (
                    <li key={c.nom} className="flex items-center justify-between text-sm">
                      <span className="truncate text-[var(--color-foreground)]/85">{c.nom}</span>
                      <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
                        {c.count} profil{c.count > 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}