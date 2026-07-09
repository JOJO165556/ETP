"use client";

import { useState } from "react";
import { ShieldCheck, Key, Lock, Eye, LogIn, RefreshCcw } from "lucide-react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ProgressBar } from "@/components/ui/progress-bar";

export default function SecuritySettingsPage() {
  const [mfaRequire, setMfaRequire] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(true);
  const [rotatePass, setRotatePass] = useState(true);

  return (
    <div className="p-8 lg:p-12">
      {/* En-tête */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Sécurité & Authentification</h1>
          <p className="mt-1 text-sm text-slate-400">
            Panneau de confiance Enterprise : gérez le SSO, le MFA et les politiques
            d'accès.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5">
            Exporter la politique
          </button>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-500">
            Appliquer les changements
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne de gauche (SSO, MFA, Passwords) */}
        <div className="space-y-6 lg:col-span-2">
          {/* SSO */}
          <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Key size={20} className="text-slate-500" /> Authentification Unique
                  (SSO)
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Gérez les configurations SAML 2.0 et OpenID Connect pour les
                  fournisseurs d'identité.
                </p>
              </div>
              <span className="rounded bg-emerald-500/10 px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                Opérationnel
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-white">Azure AD / Microsoft Entra</h3>
                  <ToggleSwitch actif={true} onChange={() => {}} />
                </div>
                <p className="mb-4 text-xs text-slate-400">
                  Dernière synchro : Il y a 14 mins
                </p>
                <button className="w-full rounded border border-white/10 bg-[#0d1117] py-2 text-xs font-bold tracking-wider text-slate-300 uppercase hover:bg-white/5">
                  Configurer Metadata
                </button>
              </div>

              <div className="rounded-lg border border-white/5 bg-[#0d1117] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-slate-300">Intégration Okta</h3>
                  <ToggleSwitch actif={false} onChange={() => {}} />
                </div>
                <p className="mb-4 text-xs text-slate-500">Déconnecté</p>
                <button className="w-full rounded border border-white/10 bg-transparent py-2 text-xs font-bold tracking-wider text-slate-400 uppercase hover:bg-white/5">
                  Configurer Endpoint
                </button>
              </div>
            </div>
          </section>

          {/* MFA & Password */}
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
              <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
                <ShieldCheck size={20} className="text-slate-500" /> Auth Multi-Facteurs
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">
                    Exiger le MFA pour tous
                  </span>
                  <ToggleSwitch actif={mfaRequire} onChange={setMfaRequire} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">
                    Auth Biométrique (WebAuthn)
                  </span>
                  <ToggleSwitch actif={biometricAuth} onChange={setBiometricAuth} />
                </div>
                <div className="rounded bg-[#0d1117] p-3 text-xs text-slate-400">
                  Le MFA est appliqué au niveau de l'organisation via SSO.
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
              <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
                <Lock size={20} className="text-slate-500" /> Politique de mot de passe
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-300">Longueur Min.</span>
                    <span className="text-white">14 Caractères</span>
                  </div>
                  <ProgressBar valeur={60} couleurBarre="bg-indigo-500" />
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="text-sm font-medium text-slate-300">
                    Rotation tous les 90 jours
                  </span>
                  <ToggleSwitch actif={rotatePass} onChange={setRotatePass} />
                </div>
              </div>
            </section>
          </div>

          {/* Security Logs */}
          <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Journaux de sécurité</h2>
              <div className="flex gap-3">
                <select className="rounded border border-white/10 bg-transparent px-3 py-1.5 text-sm text-slate-300">
                  <option>Sévérité : Toutes</option>
                </select>
                <button className="rounded border border-white/10 bg-transparent p-1.5 text-slate-400 hover:text-white">
                  <RefreshCcw size={16} />
                </button>
              </div>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                <tr>
                  <th className="pb-3">Type d'événement</th>
                  <th className="pb-3">Utilisateur</th>
                  <th className="pb-3">Adresse IP</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Horodatage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/5">
                  <td className="flex items-center gap-2 py-4 text-emerald-400">
                    <LogIn size={14} /> Login SSO Réussi
                  </td>
                  <td className="py-4 text-slate-300">sarah.j@enterprise.com</td>
                  <td className="py-4 font-mono text-xs text-slate-400">192.168.1.45</td>
                  <td className="py-4">
                    <span className="rounded bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 uppercase">
                      Success
                    </span>
                  </td>
                  <td className="py-4 text-xs text-slate-500">Oct 24, 2023 10:42:15</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="flex items-center gap-2 py-4 text-red-400">
                    <Lock size={14} /> Échec MFA - Timeout
                  </td>
                  <td className="py-4 text-slate-300">david.m@enterprise.com</td>
                  <td className="py-4 font-mono text-xs text-slate-400">45.22.10.112</td>
                  <td className="py-4">
                    <span className="rounded bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 uppercase">
                      Failed
                    </span>
                  </td>
                  <td className="py-4 text-xs text-slate-500">Oct 24, 2023 10:38:02</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        {/* Colonne de droite (Access Control) */}
        <div className="space-y-6">
          <section className="rounded-xl border border-white/5 bg-[#161b22] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Contrôle d'accès</h2>
              <button className="text-sm font-medium text-blue-400 hover:underline">
                Gérer tout
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-[#0d1117] p-4">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-bold text-white">Administrateur Système</h4>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-300">
                    12 USERS
                  </span>
                </div>
                <p className="mb-3 text-xs text-slate-400">
                  Accès total à l'environnement
                </p>
                <ProgressBar valeur={100} hauteur="h-1" couleurBarre="bg-blue-500" />
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0d1117] p-4">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-bold text-white">Lead Recrutement</h4>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-300">
                    45 USERS
                  </span>
                </div>
                <p className="mb-3 text-xs text-slate-400">
                  Gestion des pipelines talents
                </p>
                <ProgressBar valeur={60} hauteur="h-1" couleurBarre="bg-indigo-400" />
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0d1117] p-4">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-bold text-white">Panel d'Entretien</h4>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-300">
                    152 USERS
                  </span>
                </div>
                <p className="mb-3 text-xs text-slate-400">
                  Accès candidat en lecture seule
                </p>
                <ProgressBar valeur={30} hauteur="h-1" couleurBarre="bg-slate-400" />
              </div>
            </div>

            <button className="mt-6 w-full rounded-lg border border-dashed border-white/20 bg-transparent py-3 text-sm font-bold text-slate-300 hover:bg-white/5 hover:text-white">
              + Créer un rôle personnalisé
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
