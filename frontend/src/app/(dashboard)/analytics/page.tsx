"use client";

import { BarChart3, TrendingUp, Users, Target } from "lucide-react";

/* Page Analytiques (Placeholder en attendant la connexion à l'API) */
export default function AnalytiquesPage() {
  return (
    <div className="flex h-full flex-col p-6 lg:p-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">Analytiques</h1>
        <p className="mt-1 text-sm text-slate-400">
          Aperçu de vos performances et statistiques de recrutement.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Cartes KPI (Mocks temporaires) */}
        <div className="rounded-2xl border border-white/5 bg-[#161b22] p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Users size={24} />
          </div>
          <h3 className="text-sm font-medium text-slate-400">Vues du profil</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">1,248</span>
            <span className="text-sm font-medium text-emerald-400">+12%</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#161b22] p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Target size={24} />
          </div>
          <h3 className="text-sm font-medium text-slate-400">Taux de réponse</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">68%</span>
            <span className="text-sm font-medium text-emerald-400">+5%</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#161b22] p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-sm font-medium text-slate-400">Matchs premium</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">42</span>
            <span className="text-sm font-medium text-red-400">-2</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#161b22] p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <BarChart3 size={24} />
          </div>
          <h3 className="text-sm font-medium text-slate-400">Offres actives</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">3</span>
            <span className="text-sm font-medium text-slate-500">Même niveau</span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#161b22]/50 p-10 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-slate-400">
            <BarChart3 size={32} />
          </div>
          <h2 className="text-xl font-bold text-white">Graphiques détaillés à venir</h2>
          <p className="mt-2 text-sm text-slate-400">
            L'intégration avec l'API /api/v1/analytics est en cours de développement. Les
            visualisations de données complètes seront bientôt disponibles.
          </p>
        </div>
      </div>
    </div>
  );
}
