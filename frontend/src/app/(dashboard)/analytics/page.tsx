"use client";

import {
  Clock,
  RefreshCcw,
  ClipboardList,
  Zap,
  Calendar,
  Download,
  TrendingUp,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/progress-bar";

const KPIS = [
  {
    titre: "DÉLAI D'EMBAUCHE MOYEN",
    valeur: "18",
    unite: "jours",
    tendance: "+2j",
    statut: "hausse", // "hausse" = mauvais pour le délai, mais on mettra une icône de trend
    icone: Clock,
  },
  {
    titre: "TAUX DE CONVERSION",
    valeur: "24.5",
    unite: "%",
    tendance: "+3.2%",
    statut: "positif",
    icone: RefreshCcw,
  },
  {
    titre: "OFFRES ACTIVES",
    valeur: "42",
    unite: "",
    tendance: "Stable",
    statut: "neutre",
    icone: ClipboardList,
  },
  {
    titre: "SCORE D'EFFICACITÉ",
    valeur: "88",
    unite: "/100",
    tendance: "+12",
    statut: "positif",
    icone: Zap,
  },
];

const FUNNEL = [
  { etape: "Sourcing", valeur: 1240, dropout: null, pourcentage: 100 },
  { etape: "Sélectionnés", valeur: 580, dropout: "-53% Rejetés", pourcentage: 46 },
  { etape: "Entretiens", valeur: 142, dropout: "-75% Rejetés", pourcentage: 11 },
  { etape: "Offres", valeur: 38, dropout: "-73% Rejetés", pourcentage: 3 },
  {
    etape: "Embauches",
    valeur: 32,
    dropout: "84% Acceptation",
    pourcentage: 2.5,
    succes: true,
  },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 p-8 lg:p-12">
      {/* En-tête */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytiques & Performance</h1>
          <p className="mt-1 text-sm text-slate-400">
            Insights stratégiques pour l'acquisition de talents en entreprise.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-md border border-white/10 bg-[#161b22] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5">
            <Calendar size={16} className="text-slate-500" /> 30 Derniers Jours
          </button>
          <button className="flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/20">
            <Download size={16} /> Exporter
          </button>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <div
            key={kpi.titre}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/5 bg-[#161b22] p-6"
          >
            <div className="mb-6 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-800 text-slate-400">
                <kpi.icone size={20} />
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-300">
                {kpi.statut === "positif" ? (
                  <TrendingUp size={14} className="text-emerald-400" />
                ) : kpi.statut === "hausse" ? (
                  <TrendingUp size={14} className="text-orange-400" />
                ) : null}
                {kpi.tendance}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {kpi.titre}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">{kpi.valeur}</span>
                <span className="text-sm font-medium text-slate-400">{kpi.unite}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recruitment Funnel */}
      <section className="rounded-xl border border-white/5 bg-[#161b22] p-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Entonnoir de recrutement</h2>
            <p className="mt-1 text-sm text-slate-400">
              Taux de conversion des candidats sur cycle complet par étape.
            </p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-bold tracking-wider text-slate-500 uppercase">
              TOTAL SOURCÉ
            </p>
            <p className="text-2xl font-bold text-white">1,240</p>
          </div>
        </div>

        <div className="flex h-[280px] w-full items-end gap-2 lg:gap-4">
          {FUNNEL.map((etape, i) => (
            <div
              key={etape.etape}
              className="group relative flex h-full flex-1 flex-col justify-end"
            >
              {/* Barre */}
              <div
                className="relative w-full rounded-t-sm border border-b-0 border-white/5 bg-[#21262d] transition-colors group-hover:bg-[#30363d]"
                style={{ height: `${Math.max(15, (etape.valeur / 1240) * 100)}%` }}
              >
                <div className="absolute inset-x-0 bottom-4 px-2 text-center">
                  <p className="mb-1 hidden text-xs text-slate-400 sm:block">
                    {etape.etape}
                  </p>
                  <p className="text-sm font-bold text-white lg:text-xl">
                    {etape.valeur.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Ligne inférieure */}
              <div className="h-2 w-full bg-[#0d1117]" />

              {/* Barre de % remplissage visuel */}
              <div className="mt-1 h-3 w-full overflow-hidden rounded-sm bg-slate-800">
                <div
                  className={cn("h-full", i === 0 ? "bg-blue-400" : "bg-slate-500")}
                  style={{ width: `${etape.pourcentage}%` }}
                />
              </div>

              {/* Stat de Dropout */}
              <div className="mt-3 text-center">
                {etape.dropout ? (
                  <p
                    className={cn(
                      "text-xs font-medium",
                      etape.succes ? "text-emerald-400" : "text-orange-400"
                    )}
                  >
                    {etape.dropout}
                  </p>
                ) : (
                  <p className="text-xs font-medium text-slate-500">100%</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ligne du bas : Canaux, Time-to-hire, AI Insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Canaux de Sourcing */}
        <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
          <h2 className="mb-6 text-lg font-bold text-white">Performances des Canaux</h2>
          <div className="space-y-5">
            <div>
              <div className="mb-1.5 flex justify-between text-sm font-medium text-slate-300">
                <span>LinkedIn Recruiter</span>
                <span className="font-mono text-xs">42% (528)</span>
              </div>
              <ProgressBar
                valeur={42}
                couleurBarre="bg-indigo-400"
                couleurFond="bg-[#0d1117]"
              />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-sm font-medium text-slate-300">
                <span>Cooptation interne</span>
                <span className="font-mono text-xs">28% (347)</span>
              </div>
              <ProgressBar
                valeur={28}
                couleurBarre="bg-blue-400"
                couleurFond="bg-[#0d1117]"
              />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-sm font-medium text-slate-300">
                <span>Job Boards (Indeed/Welcome...)</span>
                <span className="font-mono text-xs">18% (223)</span>
              </div>
              <ProgressBar
                valeur={18}
                couleurBarre="bg-purple-400"
                couleurFond="bg-[#0d1117]"
              />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-sm font-medium text-slate-300">
                <span>Matching IA interne</span>
                <span className="font-mono text-xs">12% (150)</span>
              </div>
              <ProgressBar
                valeur={12}
                couleurBarre="bg-slate-400"
                couleurFond="bg-[#0d1117]"
              />
            </div>
          </div>
        </section>

        {/* Délai d'embauche par Dpt */}
        <section className="flex flex-col rounded-xl border border-white/5 bg-[#161b22] p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Délai d'embauche par Dpt</h2>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-slate-500" />
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                MOYENNE
              </span>
            </div>
          </div>

          <div className="relative flex h-[150px] flex-1 items-end justify-between gap-2 border-b border-white/10 px-4 pb-4">
            {/* Ligne moyenne simulée */}
            <div className="absolute top-[40%] right-0 left-0 border-t border-dashed border-slate-600/50" />

            <div className="flex w-1/4 flex-col items-center gap-2">
              <div className="h-[90%] w-8 rounded-t bg-blue-500" />
              <span className="text-xs text-slate-400">Tech</span>
            </div>
            <div className="flex w-1/4 flex-col items-center gap-2">
              <div className="h-[40%] w-8 rounded-t bg-slate-700" />
              <span className="text-xs text-slate-400">Produit</span>
            </div>
            <div className="flex w-1/4 flex-col items-center gap-2">
              <div className="h-[60%] w-8 rounded-t bg-slate-700" />
              <span className="text-xs text-slate-400">Vente</span>
            </div>
            <div className="flex w-1/4 flex-col items-center gap-2">
              <div className="h-[45%] w-8 rounded-t bg-slate-700" />
              <span className="text-xs text-slate-400">Design</span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-lg border border-white/5 bg-[#0d1117] p-3 text-sm text-slate-400 italic">
            <Info size={16} className="mt-0.5 shrink-0 text-blue-400" />
            <p>
              Les rôles techniques prennent systématiquement{" "}
              <strong className="text-white not-italic">30% plus de temps</strong> à être
              pourvus.
            </p>
          </div>
        </section>

        {/* Diversité & AI Insights */}
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
            <h2 className="mb-4 text-sm font-bold text-white">Indicateur de Diversité</h2>
            <div className="flex justify-between">
              <div>
                <p className="mb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  GENRE
                </p>
                <div className="mb-1 h-1 w-12 rounded-full bg-orange-400" />
                <p className="text-xs font-medium text-slate-300">48 / 52</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  ETHNIE
                </p>
                <div className="mb-1 h-1 w-12 rounded-full bg-orange-400" />
                <p className="text-xs font-medium text-slate-300">Élevé</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  ÉCART ÂGE
                </p>
                <div className="mb-1 h-1 w-12 rounded-full bg-slate-600" />
                <p className="text-xs font-medium text-slate-300">Minime</p>
              </div>
            </div>
          </section>

          <section className="flex-1 rounded-xl border border-blue-500/20 bg-gradient-to-br from-[#161b22] to-[#1a2333] p-6 shadow-[0_0_20px_rgba(59,130,246,0.05)]">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-white">
              <Sparkles size={16} className="text-blue-400" /> Insights IA
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              D'après le rythme actuel, vous atteindrez vos objectifs de recrutement Q3
              avec <strong>12 jours d'avance</strong>. Envisagez d'accélérer le
              remplacement des <strong>Développeurs Frontend</strong>.
            </p>
            <button className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-400 hover:underline">
              Voir le plan d'optimisation &rarr;
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
