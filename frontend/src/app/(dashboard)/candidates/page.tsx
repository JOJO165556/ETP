"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Search,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/shared/state-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { usersService } from "@/services/users.service";
import { cn } from "@/lib/utils";
import type { CandidatVivier, FormationResume } from "@/types/domain";

function periode(debut: string | null, fin: string | null, enCours: boolean): string {
  const format = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "short" });
  };
  const debutFmt = format(debut);
  if (!debutFmt) return fin ? `${format(fin)} (antérieur)` : "";
  return `${debutFmt} à ${enCours ? "aujourd'hui" : fin ? format(fin) : "ce jour"}`;
}

export default function CandidatsPage() {
  const [candidats, setCandidats] = useState<CandidatVivier[]>([]);
  const [actif, setActif] = useState<CandidatVivier | null>(null);
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [telechargement, setTelechargement] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      const data = await usersService.getCandidats({ limit: 50 });
      setCandidats(data);
      setActif(data[0] ?? null);
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const filtres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return candidats;
    return candidats.filter((candidat) =>
      [
        candidat.nom_complet ?? "",
        candidat.email,
        ...(candidat.skills ?? []),
        ...(candidat.experiences ?? []).map((e) => `${e.poste} ${e.entreprise}`),
        ...(candidat.formations ?? []).map((f) => `${f.diplome} ${f.etablissement}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(terme)
    );
  }, [candidats, recherche]);

  const telechargerCv = async (candidat: CandidatVivier) => {
    if (!candidat.has_cv) return;
    setTelechargement(candidat.id);
    try {
      const { download_url } = await usersService.getLienCV(candidat.id);
      window.open(`/leave?to=${encodeURIComponent(download_url)}`, "_blank", "noopener,noreferrer");
    } catch {
      setErreur(true);
    } finally {
      setTelechargement(null);
    }
  };

  if (chargement) {
    return (
      <div className="grid gap-6 p-6 lg:grid-cols-[320px_1fr] lg:p-10">
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="p-6 lg:p-10">
        <StatePanel
          tone="error"
          title="Le vivier de talents est indisponible"
          description="La connexion au serveur a échoué. Réessayez dans un instant."
          actionLabel="Réessayer"
          onAction={charger}
        />
      </div>
    );
  }

  if (candidats.length === 0) {
    return (
      <div className="p-6 lg:p-10">
        <StatePanel
          title="Aucun candidat pour le moment"
          description="Les profils apparaissent ici dès qu'un candidat rejoint votre entreprise."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-border bg-card lg:w-80 lg:border-r lg:border-b-0">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-ring">
            <Search size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
              placeholder="Rechercher un nom, une compétence..."
              aria-label="Rechercher un candidat"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {filtres.length} candidat{filtres.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="max-h-[45vh] flex-1 overflow-y-auto p-3 lg:max-h-none">
          {filtres.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Aucun résultat pour cette recherche.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filtres.map((candidat) => (
                <li key={candidat.id}>
                  <button
                    type="button"
                    onClick={() => setActif(candidat)}
                    aria-current={actif?.id === candidat.id ? "true" : undefined}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      actif?.id === candidat.id
                        ? "border-primary/40 bg-primary/5"
                        : "border-transparent hover:border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                        {(candidat.nom_complet ?? "?").charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {candidat.nom_complet ?? "Candidat"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {candidat.email}
                        </span>
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto p-6 lg:p-10">
        {!actif ? (
          <StatePanel title="Sélectionnez un candidat" description="Son parcours s'affichera ici." />
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl font-semibold text-foreground">
                  {(actif.nom_complet ?? "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 space-y-2">
                  <h1 className="text-xl font-semibold text-foreground">
                    {actif.nom_complet ?? "Candidat"}
                  </h1>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {actif.localisation && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={14} aria-hidden="true" />
                        {actif.localisation}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Mail size={14} aria-hidden="true" />
                      {actif.email}
                    </span>
                  </div>
                  {(actif.skills ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(actif.skills ?? []).map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => telechargerCv(actif)}
                disabled={!actif.has_cv || telechargement === actif.id}
                className="shrink-0 gap-2"
              >
                <Download size={15} aria-hidden="true" />
                {!actif.has_cv
                  ? "Aucun CV"
                  : telechargement === actif.id
                    ? "Préparation..."
                    : "Télécharger le CV"}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { Icone: FileText, libelle: "CV", valeur: actif.has_cv ? "Disponible" : "Non déposé" },
                { Icone: Eye, libelle: "Profil", valeur: actif.profil_public ? "Visible" : "Masqué" },
                { Icone: UserCheck, libelle: "Recherche", valeur: actif.recherchable ? "Ouvert" : "Fermé" },
              ].map(({ Icone, libelle, valeur }) => (
                <div key={libelle} className="rounded-xl border border-border bg-card p-4">
                  <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <Icone size={14} aria-hidden="true" />
                    {libelle}
                  </span>
                  <p className="mt-2 text-sm font-medium text-foreground">{valeur}</p>
                </div>
              ))}
            </div>

            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Briefcase size={18} className="text-muted-foreground" aria-hidden="true" />
                Expériences
              </h2>
              {(actif.experiences ?? []).length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Aucune expérience renseignée.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(actif.experiences ?? []).map((experience, index) => (
                    <li
                      key={`${experience.poste}-${experience.entreprise}-${index}`}
                      className="rounded-xl border border-border bg-card p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-foreground">
                          {experience.poste}
                        </span>
                        {experience.type_contrat && (
                          <Badge variant="secondary">{experience.type_contrat}</Badge>
                        )}
                        {experience.en_cours && <Badge variant="success">En cours</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-foreground/80">{experience.entreprise}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {periode(experience.date_debut, experience.date_fin ?? null, experience.en_cours)}
                      </p>
                      {experience.description && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {experience.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <GraduationCap size={18} className="text-muted-foreground" aria-hidden="true" />
                Formations
              </h2>
              {(actif.formations ?? []).length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Aucune formation renseignée.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(actif.formations ?? []).map((formation: FormationResume, index) => (
                    <li
                      key={`${formation.diplome}-${formation.etablissement}-${index}`}
                      className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-5"
                    >
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">{formation.diplome}</p>
                        <p className="text-sm text-foreground/80">{formation.etablissement}</p>
                        {formation.domaine && (
                          <p className="text-xs text-muted-foreground">{formation.domaine}</p>
                        )}
                      </div>
                      <Badge variant="outline">{formation.annee}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
