"use client";

import { Building2, Globe, ShieldCheck, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function GeneralSettingsPage() {
  return (
    <div className="p-8 lg:p-12">
      {/* En-tête */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Paramètres de l'organisation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez l'espace de travail de votre entreprise, l'accès de l'équipe et les
            protocoles d'identité.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Annuler</Button>
          <Button>Tout enregistrer</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne de Gauche : Company Profile & Team Management */}
        <div className="space-y-6 lg:col-span-2">
          {/* Company Profile */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-foreground">
              <Building2 size={20} className="text-muted-foreground" /> Profil de l'entreprise
            </h2>
            <div className="flex flex-col gap-8 md:flex-row">
              <div className="flex-1 space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Nom de l'organisation
                  </label>
                  <Input
                    type="text"
                    defaultValue="Acme Global Solutions"
                    className="h-auto bg-muted px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Site Web Corporate
                  </label>
                  <div className="flex rounded-lg border border-border bg-muted">
                    <span className="flex items-center rounded-l-lg border-r border-border px-3 text-sm text-muted-foreground">
                      https://
                    </span>
                    <Input
                      type="text"
                      defaultValue="acme-global.io"
                      className="h-auto border-0 bg-transparent px-3 py-2.5 shadow-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Secteur d'activité
                  </label>
                  <select className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none">
                    <option>Services Technologiques</option>
                  </select>
                </div>
              </div>
              <div className="flex w-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted p-6 text-center">
                <div className="mb-4 h-16 w-16 rounded bg-muted" />
                <h3 className="text-sm font-bold text-foreground">Changer le logo</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  SVG, PNG ou JPG (max. 800x800px)
                </p>
              </div>
            </div>
          </section>

          {/* Team Management */}
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <ShieldCheck size={20} className="text-muted-foreground" /> Gestion de l'équipe
              </h2>
              <div className="flex gap-3">
                <select className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm text-foreground/85">
                  <option>Tous les rôles</option>
                </select>
                <Button size="sm">Inviter</Button>
              </div>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                <tr>
                  <th className="pb-3 pl-2">Membre</th>
                  <th className="pb-3">Rôle d'accès</th>
                  <th className="pb-3 text-center">Domaine Match</th>
                  <th className="pb-3">Dernière act.</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted">
                  <td className="py-4 pl-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted font-bold text-foreground">
                        ES
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Elena Soros</div>
                        <div className="text-xs text-muted-foreground">
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
                  <td className="py-4 text-center text-success">
                    <ShieldCheck size={16} className="mx-auto" />
                  </td>
                  <td className="py-4 text-muted-foreground">Il y a 2 min</td>
                  <td className="py-4 text-xs font-medium text-success">• Actif</td>
                  <td className="py-4 text-right">
                    <MoreVertical size={16} className="text-muted-foreground" />
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Archive Organization */}
          <section className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 p-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-destructive/10 text-destructive">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Archiver l'organisation</h3>
                <p className="text-sm text-muted-foreground">
                  Cette action gèlera toutes les activités de recrutement. Réversible
                  uniquement par un Super Admin.
                </p>
              </div>
            </div>
            <button className="rounded border border-destructive/20 bg-transparent px-4 py-2 text-sm font-bold text-destructive hover:bg-destructive/10">
              Archiver Acme Global
            </button>
          </section>
        </div>

        {/* Colonne de Droite : Domain Security */}
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Globe size={20} className="text-muted-foreground" /> Sécurité du domaine
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-success/20 bg-success/5 p-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">acme-global.io</h4>
                  <p className="text-xs text-success">Primaire • Vérifié</p>
                </div>
                <Trash2
                  size={16}
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-warning/20 bg-warning/5 p-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground">acme-internal.com</h4>
                  <p className="text-xs text-warning">Vérification DNS en attente</p>
                </div>
                <Trash2
                  size={16}
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                />
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-muted p-4 text-xs text-muted-foreground">
              <strong className="text-foreground">Note de sécurité :</strong> Seuls les
              utilisateurs avec des domaines d'e-mail vérifiés peuvent être provisionnés
              automatiquement via SSO.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
