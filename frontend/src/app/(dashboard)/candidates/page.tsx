"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Download, MapPin, Mail, FileText, Eye, UserCheck, Briefcase, GraduationCap, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usersService } from "@/services/users.service";
import type { CandidatVivier, FormationResume } from "@/types/domain";

type ViewMode = "list" | "kanban";

/* Page Vivier de Talents (Vue Recruteur) — données réelles du backend */
export default function TalentPoolPage() {
  const [candidats, setCandidats] = useState<CandidatVivier[]>([]);
  const [candidatActif, setCandidatActif] = useState<CandidatVivier | null>(null);
  const [recherche, setRecherche] = useState("");
  const [chargement, setChargement] = useState(true);
  const [telechargement, setTelechargement] = useState<string | null>(null);
  const [vueMode, setVueMode] = useState<ViewMode>("list");

  useEffect(() => {
    let vivant = true;
    usersService
      .getCandidats({ limit: 50 })
      .then((data) => {
        if (vivant) {
          setCandidats(data);
          setCandidatActif(data[0] ?? null);
        }
      })
      .catch((erreur) =>
        console.error("Erreur de chargement du vivier", erreur)
      )
      .finally(() => vivant && setChargement(false));
    return () => {
      vivant = false;
    };
  }, []);

  const candidatsFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return candidats;
    return candidats.filter((c) =>
      [
        c.nom_complet ?? "",
        c.email,
        ...(c.skills ?? []),
        ...(c.experiences ?? []).map((e) => `${e.poste} ${e.entreprise}`),
        ...(c.formations ?? []).map((f) => `${f.diplome} ${f.etablissement}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(terme)
    );
  }, [candidats, recherche]);

  const telechargerCV = async (candidat: CandidatVivier) => {
    if (!candidat.has_cv) return;
    setTelechargement(candidat.id);
    try {
      const { download_url } = await usersService.getLienCV(candidat.id);
      window.open(download_url, "_blank", "noopener,noreferrer");
    } catch (erreur) {
      console.error("Erreur de téléchargement du CV", erreur);
    } finally {
      setTelechargement(null);
    }
  };

  const formaterPeriode = (debut: string | null, fin: string | null, enCours: boolean): string => {
    const fmt = (iso: string | null) => {
      if (!iso) return "";
      return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "short" });
    };
    const debutFmt = fmt(debut);
    if (!debutFmt) return fin ? `${fmt(fin)} (antérieur)` : "";
    return `${debutFmt} — ${enCours ? "Aujourd'hui" : fin ? fmt(fin) : "à ce jour"}`;
  };

  if (chargement) {
    return (
      <div className="p-10 text-[var(--color-muted-foreground)]">
        <div className="h-8 w-56 animate-pulse rounded-md bg-[var(--surface-popover)]" />
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-[var(--surface-popover)]/70" />
      </div>
    );
  }

  if (candidats.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <div className="text-center text-[var(--color-muted-foreground)]">
          <Search size={40} className="mx-auto mb-4 opacity-40" aria-hidden="true" />
          <p>Aucun candidat pour le moment.</p>
        </div>
      </div>
    );
  }

  if (vueMode === "kanban") {
    // Vue Kanban du pipeline ATS
    const KANBAN_COLUMNS = [
      { id: "applied", label: "Postulé", color: "var(--stage-applied)" },
      { id: "screening", label: "Présélection", color: "var(--stage-screening)" },
      { id: "interview", label: "Entretien", color: "var(--stage-interview)" },
      { id: "offer", label: "Offre", color: "var(--stage-offer)" },
      { id: "hired", label: "Embauché", color: "var(--stage-hired)" },
    ];

    return (
      <div className="flex h-full flex-col p-6 lg:p-10">
        {/* En-tête Kanban */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
              Pipeline ATS
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Vue Kanban des candidatures par étape.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setVueMode("list")}
              className="transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100"
            >
              Liste
            </Button>
            <Button
              variant="default"
              onClick={() => setVueMode("kanban")}
              className="transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100"
            >
              <Columns size={16} className="mr-2" />
              Kanban
            </Button>
          </div>
        </header>

        {/* Grille Kanban */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 h-full min-w-max">
            {KANBAN_COLUMNS.map((col) => (
              <div
                key={col.id}
                className="w-80 flex flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)]"
              >
                {/* En-tête de colonne */}
                <div className="border-b border-[var(--border-subtle)] p-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <h3 className="font-bold text-[var(--color-foreground)]">{col.label}</h3>
                    <Badge variant="secondary" className="ml-auto">
                      0
                    </Badge>
                  </div>
                </div>

                {/* Contenu de la colonne */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <p className="text-center text-sm text-[var(--color-muted-foreground)] py-8">
                    Aucune candidature
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Liste des candidats (Gauche) */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <div className="border-b border-[var(--border-subtle)] p-4">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3 py-2">
            <Search size={16} className="shrink-0 text-[var(--color-muted-foreground)]" aria-hidden="true" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher des talents..."
              className="w-full bg-transparent text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 rounded transition-colors duration-150"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {candidatsFiltres.length === 0 ? (
            <p className="p-4 text-center text-sm text-[var(--color-muted-foreground)]">
              Aucun résultat pour votre recherche.
            </p>
          ) : (
            candidatsFiltres.map((candidat) => (
              <button
                key={candidat.id}
                onClick={() => setCandidatActif(candidat)}
                className={`mb-2 w-full rounded-lg border p-3 text-left transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100 ${
                  candidatActif?.id === candidat.id
                    ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10"
                    : "border-[var(--border-subtle)] bg-[var(--surface-canvas)] hover:border-[var(--color-foreground)]/15"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-popover)] text-sm font-bold text-[var(--color-foreground)]">
                    {(candidat.nom_complet ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                      {candidat.nom_complet ?? "Candidat"}
                    </p>
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">{candidat.email}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Profil du candidat (Centre) */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Vivier de talents <span className="text-[var(--color-foreground)]/30">&gt;</span>{" "}
            <span className="text-[var(--color-foreground)]">{candidatActif?.nom_complet}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => setVueMode("list")}
              size="sm"
              className="transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100"
            >
              Liste
            </Button>
            <Button
              variant="outline"
              onClick={() => setVueMode("kanban")}
              size="sm"
              className="transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100"
            >
              <Columns size={16} className="mr-2" />
              Kanban
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => candidatActif && telechargerCV(candidatActif)}
              disabled={!candidatActif?.has_cv || telechargement === candidatActif?.id}
              className="gap-2 transition-colors duration-150 active:scale-[0.98] @media/hover:hover:scale-100"
            >
              <Download size={16} aria-hidden="true" />
              {candidatActif?.has_cv
                ? telechargement === candidatActif?.id
                  ? "Génération du lien..."
                  : "Télécharger le CV"
                : "Pas de CV"}
            </Button>
          </div>
        </div>

        {candidatActif && (
          <>
            {/* Carte profil */}
            <div className="mb-6 flex flex-col gap-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 sm:flex-row transition-shadow duration-200 hover:shadow-md">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-popover)] text-4xl font-bold text-[var(--color-foreground)]">
                {(candidatActif.nom_complet ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 space-y-3">
                <h1 className="text-3xl font-bold text-[var(--color-foreground)]">
                  {candidatActif.nom_complet ?? "Candidat"}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm">
                  {candidatActif.localisation && (
                    <span className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                      <MapPin size={16} aria-hidden="true" /> {candidatActif.localisation}
                    </span>
                  )}
                  <span className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                    <Mail size={16} aria-hidden="true" /> {candidatActif.email}
                  </span>
                </div>

                {candidatActif.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {candidatActif.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Indicateurs */}
            <div className="mb-8 grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 transition-shadow duration-200 hover:shadow-md">
                <div className="mb-2 flex items-center gap-2 text-[var(--color-muted-foreground)]">
                  <FileText size={16} aria-hidden="true" />
                  <span className="text-xs font-semibold tracking-wider uppercase">CV déposé</span>
                </div>
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  {candidatActif.has_cv ? "Disponible" : "Non téléversé"}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 transition-shadow duration-200 hover:shadow-md">
                <div className="mb-2 flex items-center gap-2 text-[var(--color-muted-foreground)]">
                  <Eye size={16} aria-hidden="true" />
                  <span className="text-xs font-semibold tracking-wider uppercase">Profil public</span>
                </div>
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  {candidatActif.profil_public ? "Visible" : "Masqué"}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 transition-shadow duration-200 hover:shadow-md">
                <div className="mb-2 flex items-center gap-2 text-[var(--color-muted-foreground)]">
                  <UserCheck size={16} aria-hidden="true" />
                  <span className="text-xs font-semibold tracking-wider uppercase">Recherchable</span>
                </div>
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  {candidatActif.recherchable ? "Oui" : "Non"}
                </p>
              </div>
            </div>

            {/* Parcours professionnel */}
            <section className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-[var(--color-foreground)]">
                <Briefcase size={20} className="text-[var(--color-muted-foreground)]" aria-hidden="true" /> Parcours professionnel
              </h2>
              {(candidatActif.experiences ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
                  Aucune expérience renseignée.
                </div>
              ) : (
                <div className="space-y-3">
                  {(candidatActif.experiences ?? []).map((exp, idx) => (
                    <div key={`${exp.poste}-${exp.entreprise}-${idx}`} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 transition-shadow duration-200 hover:shadow-md">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-[var(--color-foreground)]">{exp.poste}</span>
                        {exp.type_contrat && <Badge variant="secondary">{exp.type_contrat}</Badge>}
                        {exp.en_cours && <Badge variant="success">En cours</Badge>}
                      </div>
                      <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]/80">{exp.entreprise}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                        {formaterPeriode(exp.date_debut, exp.date_fin ?? null, exp.en_cours)}
                      </p>
                      {exp.description && (
                        <p className="mt-2 text-sm leading-relaxed text-[var(--color-foreground)]/70">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Formations */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-[var(--color-foreground)]">
                <GraduationCap size={20} className="text-[var(--color-muted-foreground)]" aria-hidden="true" /> Formations
              </h2>
              {(candidatActif.formations ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
                  Aucune formation renseignée.
                </div>
              ) : (
                <div className="space-y-3">
                  {(candidatActif.formations ?? []).map((formation: FormationResume, idx) => (
                    <div key={`${formation.diplome}-${formation.etablissement}-${idx}`} className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5 transition-shadow duration-200 hover:shadow-md">
                      <div className="space-y-1">
                        <div className="text-base font-bold text-[var(--color-foreground)]">{formation.diplome}</div>
                        <p className="text-sm font-medium text-[var(--color-foreground)]/80">
                          {formation.etablissement}
                        </p>
                        {formation.domaine && (
                          <p className="text-xs text-[var(--color-muted-foreground)]">{formation.domaine}</p>
                        )}
                      </div>
                      <Badge variant="outline">{formation.annee}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}