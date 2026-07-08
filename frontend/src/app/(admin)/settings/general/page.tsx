"use client";

import { Building2, Globe, ShieldCheck, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GeneralSettingsPage() {
  return (
    <div className="p-8 lg:p-12">
      {/* En-tête */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Paramètres de l'organisation</h1>
          <p className="mt-1 text-sm text-slate-400">
            Gérez l'espace de travail de votre entreprise, l'accès de l'équipe et les
            protocoles d'identité.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5">
            Annuler
          </button>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-500">
            Tout enregistrer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne de Gauche : Company Profile & Team Management */}
        <div className="space-y-6 lg:col-span-2">
          {/* Company Profile */}
          <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
              <Building2 size={20} className="text-slate-500" /> Profil de l'entreprise
            </h2>
            <div className="flex flex-col gap-8 md:flex-row">
              <div className="flex-1 space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Nom de l'organisation
                  </label>
                  <input
                    type="text"
                    defaultValue="Acme Global Solutions"
                    className="w-full rounded border border-white/10 bg-[#0d1117] p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Site Web Corporate
                  </label>
                  <div className="flex rounded border border-white/10 bg-[#0d1117]">
                    <span className="flex items-center border-r border-white/10 px-3 text-sm text-slate-500">
                      https://
                    </span>
                    <input
                      type="text"
                      defaultValue="acme-global.io"
                      className="w-full bg-transparent p-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Secteur d'activité
                  </label>
                  <select className="w-full rounded border border-white/10 bg-[#0d1117] p-3 text-sm text-white focus:border-blue-500 focus:outline-none">
                    <option>Services Technologiques</option>
                  </select>
                </div>
              </div>
              <div className="flex w-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
                <div className="mb-4 h-16 w-16 rounded bg-slate-800" />
                <h3 className="text-sm font-bold text-white">Changer le logo</h3>
                <p className="mt-1 text-xs text-slate-500">
                  SVG, PNG ou JPG (max. 800x800px)
                </p>
              </div>
            </div>
          </section>

          {/* Team Management */}
          <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <ShieldCheck size={20} className="text-slate-500" /> Gestion de l'équipe
              </h2>
              <div className="flex gap-3">
                <select className="rounded border border-white/10 bg-transparent px-3 py-1.5 text-sm text-slate-300">
                  <option>Tous les rôles</option>
                </select>
                <button className="rounded bg-blue-100 px-4 py-1.5 text-sm font-bold text-blue-900 hover:bg-blue-200">
                  Inviter
                </button>
              </div>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="pb-3 pl-2">Membre</th>
                  <th className="pb-3">Rôle d'accès</th>
                  <th className="pb-3 text-center">Domaine Match</th>
                  <th className="pb-3">Dernière act.</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/5">
                  <td className="py-4 pl-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-700 font-bold text-white">
                        ES
                      </div>
                      <div>
                        <div className="font-medium text-white">Elena Soros</div>
                        <div className="text-xs text-slate-500">
                          e.soros@acme-global.io
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="rounded bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-400">
                      Admin
                    </span>
                  </td>
                  <td className="py-4 text-center text-emerald-500">
                    <ShieldCheck size={16} className="mx-auto" />
                  </td>
                  <td className="py-4 text-slate-400">Il y a 2 min</td>
                  <td className="py-4 text-xs font-medium text-emerald-400">• Actif</td>
                  <td className="py-4 text-right">
                    <MoreVertical size={16} className="text-slate-500" />
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Archive Organization */}
          <section className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 p-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-red-500/10 text-red-500">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white">Archiver l'organisation</h3>
                <p className="text-sm text-slate-400">
                  Cette action gèlera toutes les activités de recrutement. Réversible
                  uniquement par un Super Admin.
                </p>
              </div>
            </div>
            <button className="rounded border border-red-500/20 bg-transparent px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/10">
              Archiver Acme Global
            </button>
          </section>
        </div>

        {/* Colonne de Droite : Domain Security */}
        <div className="space-y-6">
          <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Globe size={20} className="text-slate-500" /> Sécurité du domaine
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div>
                  <h4 className="text-sm font-bold text-white">acme-global.io</h4>
                  <p className="text-xs text-emerald-400">Primaire • Vérifié</p>
                </div>
                <Trash2
                  size={16}
                  className="cursor-pointer text-slate-500 hover:text-white"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                <div>
                  <h4 className="text-sm font-bold text-white">acme-internal.com</h4>
                  <p className="text-xs text-amber-400">Vérification DNS en attente</p>
                </div>
                <Trash2
                  size={16}
                  className="cursor-pointer text-slate-500 hover:text-white"
                />
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-[#0d1117] p-4 text-xs text-slate-400">
              <strong className="text-white">Note de sécurité :</strong> Seuls les
              utilisateurs avec des domaines d'e-mail vérifiés peuvent être provisionnés
              automatiquement via SSO.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
