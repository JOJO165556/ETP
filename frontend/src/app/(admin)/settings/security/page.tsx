"use client";

import { useState } from "react";
import { ShieldCheck, Key, Lock, LogIn, RefreshCcw } from "lucide-react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SecuritySettingsPage() {
  const [mfaRequire, setMfaRequire] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(true);
  const [rotatePass, setRotatePass] = useState(true);

  return (
    <div className="p-8 lg:p-12">
      {/* En-tête */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sécurité & Authentification</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Panneau de confiance Enterprise : gérez le SSO, le MFA et les politiques
            d'accès.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Exporter la politique</Button>
          <Button>Appliquer les changements</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne de gauche (SSO, MFA, Passwords) */}
        <div className="space-y-6 lg:col-span-2">
          {/* SSO */}
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Key size={20} className="text-muted-foreground" /> Authentification Unique
                  (SSO)
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Gérez les configurations SAML 2.0 et OpenID Connect pour les
                  fournisseurs d'identité.
                </p>
              </div>
              <Badge variant="success">Opérationnel</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-foreground">Azure AD / Microsoft Entra</h3>
                  <ToggleSwitch actif={true} onChange={() => {}} />
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  Dernière synchro : Il y a 14 mins
                </p>
                <button className="w-full rounded border border-border bg-muted py-2 text-xs font-bold tracking-wider text-foreground/85 uppercase hover:bg-secondary">
                  Configurer Metadata
                </button>
              </div>

              <div className="rounded-lg border border-border bg-muted p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-foreground/85">Intégration Okta</h3>
                  <ToggleSwitch actif={false} onChange={() => {}} />
                </div>
                <p className="mb-4 text-xs text-muted-foreground">Déconnecté</p>
                <button className="w-full rounded border border-border bg-transparent py-2 text-xs font-bold tracking-wider text-muted-foreground uppercase hover:bg-secondary">
                  Configurer Endpoint
                </button>
              </div>
            </div>
          </section>

          {/* MFA & Password */}
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-foreground">
                <ShieldCheck size={20} className="text-muted-foreground" /> Auth Multi-Facteurs
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground/85">
                    Exiger le MFA pour tous
                  </span>
                  <ToggleSwitch actif={mfaRequire} onChange={setMfaRequire} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground/85">
                    Auth Biométrique (WebAuthn)
                  </span>
                  <ToggleSwitch actif={biometricAuth} onChange={setBiometricAuth} />
                </div>
                <div className="rounded bg-muted p-3 text-xs text-muted-foreground">
                  Le MFA est appliqué au niveau de l'organisation via SSO.
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-foreground">
                <Lock size={20} className="text-muted-foreground" /> Politique de mot de passe
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground/85">Longueur Min.</span>
                    <span className="text-foreground">14 Caractères</span>
                  </div>
                  <ProgressBar valeur={60} couleurBarre="bg-indigo-500" />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-sm font-medium text-foreground/85">
                    Rotation tous les 90 jours
                  </span>
                  <ToggleSwitch actif={rotatePass} onChange={setRotatePass} />
                </div>
              </div>
            </section>
          </div>

          {/* Security Logs */}
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Journaux de sécurité</h2>
              <div className="flex gap-3">
                <select className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm text-foreground/85">
                  <option>Sévérité : Toutes</option>
                </select>
                <Button variant="ghost" size="icon" className="rounded border border-border text-muted-foreground hover:text-foreground">
                  <RefreshCcw size={16} />
                </Button>
              </div>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                <tr>
                  <th className="pb-3">Type d'événement</th>
                  <th className="pb-3">Utilisateur</th>
                  <th className="pb-3">Adresse IP</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Horodatage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted">
                  <td className="flex items-center gap-2 py-4 text-success">
                    <LogIn size={14} /> Login SSO Réussi
                  </td>
                  <td className="py-4 text-foreground/85">sarah.j@enterprise.com</td>
                  <td className="py-4 font-mono text-xs text-muted-foreground">192.168.1.45</td>
                  <td className="py-4">
                    <Badge variant="success" className="uppercase">Success</Badge>
                  </td>
                  <td className="py-4 text-xs text-muted-foreground">Oct 24, 2023 10:42:15</td>
                </tr>
                <tr className="hover:bg-muted">
                  <td className="flex items-center gap-2 py-4 text-destructive">
                    <Lock size={14} /> Échec MFA - Timeout
                  </td>
                  <td className="py-4 text-foreground/85">david.m@enterprise.com</td>
                  <td className="py-4 font-mono text-xs text-muted-foreground">45.22.10.112</td>
                  <td className="py-4">
                    <Badge variant="destructive" className="uppercase">Failed</Badge>
                  </td>
                  <td className="py-4 text-xs text-muted-foreground">Oct 24, 2023 10:38:02</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        {/* Colonne de droite (Access Control) */}
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Contrôle d'accès</h2>
              <button className="text-sm font-medium text-primary hover:underline">
                Gérer tout
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-bold text-foreground">Administrateur Système</h4>
                  <Badge variant="secondary" className="uppercase">12 USERS</Badge>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Accès total à l'environnement
                </p>
                <ProgressBar valeur={100} hauteur="h-1" couleurBarre="bg-primary" />
              </div>

              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-bold text-foreground">Lead Recrutement</h4>
                  <Badge variant="secondary" className="uppercase">45 USERS</Badge>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Gestion des pipelines talents
                </p>
                <ProgressBar valeur={60} hauteur="h-1" couleurBarre="bg-indigo-400" />
              </div>

              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-bold text-foreground">Panel d'Entretien</h4>
                  <Badge variant="secondary" className="uppercase">152 USERS</Badge>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Accès candidat en lecture seule
                </p>
                <ProgressBar valeur={30} hauteur="h-1" couleurBarre="bg-muted-foreground" />
              </div>
            </div>

            <button className="mt-6 w-full rounded-lg border border-dashed border-border bg-transparent py-3 text-sm font-bold text-foreground/85 hover:bg-muted hover:text-foreground">
              + Créer un rôle personnalisé
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
