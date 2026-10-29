"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ZoomIn,
  ZoomOut,
  User,
  Lightbulb,
  Briefcase,
  Plus,
  X,
  ArrowRight,
  Save,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { usersService } from "@/services/users.service";
import type { UserProfil, ExperiencePayload } from "@/types/domain";

type BrouillonExperience = {
  id: string | null; // null tant que l'expérience n'a pas été enregistrée
  poste: string;
  entreprise: string;
  type_contrat: string;
  date_debut: string;
  date_fin: string;
  en_cours: boolean;
  description: string;
  sauvegarde: boolean;
};

const CLAZZ_CHAMPS =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none";

const CONTRATS = ["CDI", "CDD", "Freelance", "Stage", "Alternance", "Intérim"];

/* Page de validation des données extraites du CV (Étape 3 de l'onboarding) — données réelles */
export default function CVReviewPage() {
  const router = useRouter();

  const [profil, setProfil] = useState<UserProfil | null>(null);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [nouvelleCompetence, setNouvelleCompetence] = useState("");
  const [experiences, setExperiences] = useState<BrouillonExperience[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    usersService
      .getMonProfil()
      .then((data) => {
        if (!vivant) return;
        setProfil(data);
        setPrenom(data.profile?.first_name ?? "");
        setNom(data.profile?.last_name ?? "");
        setEmail(data.email);
        setTelephone(data.profile?.phone ?? "");
        setSkills(data.profile?.skills ?? []);
        setExperiences(
          (data.profile?.experiences ?? []).map((exp) => ({
            id: exp.id,
            poste: exp.poste,
            entreprise: exp.entreprise,
            type_contrat: exp.type_contrat ?? "CDI",
            date_debut: exp.date_debut.slice(0, 10),
            date_fin: exp.date_fin?.slice(0, 10) ?? "",
            en_cours: exp.en_cours,
            description: exp.description ?? "",
            sauvegarde: false,
          }))
        );
      })
      .catch((e) => console.error("Erreur de chargement du profil", e))
      .finally(() => vivant && setChargement(false));
    return () => {
      vivant = false;
    };
  }, []);

  const ajouterCompetence = () => {
    const c = nouvelleCompetence.trim();
    if (!c) return;
    setSkills((prev) => (prev.some((s) => s.toLowerCase() === c.toLowerCase()) ? prev : [...prev, c]));
    setNouvelleCompetence("");
  };

  const retirerCompetence = (cible: string) => {
    setSkills((prev) => prev.filter((s) => s !== cible));
  };

  const ajouterPoste = () => {
    setExperiences((prev) => [
      ...prev,
      {
        id: null,
        poste: "",
        entreprise: "",
        type_contrat: "CDI",
        date_debut: "",
        date_fin: "",
        en_cours: false,
        description: "",
        sauvegarde: false,
      },
    ]);
  };

  const mettreAJourBrouillon = (index: number, patch: Partial<BrouillonExperience>) => {
    setExperiences((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...patch } : b))
    );
  };

  const enregistrerExperience = async (index: number) => {
    const b = experiences[index];
    if (!b.poste.trim() || !b.entreprise.trim() || !b.date_debut) {
      setErreur("Poste, entreprise et date de début sont obligatoires pour chaque expérience.");
      return;
    }
    setErreur(null);
    mettreAJourBrouillon(index, { sauvegarde: true });
    try {
      const payload: ExperiencePayload = {
        poste: b.poste.trim(),
        entreprise: b.entreprise.trim(),
        type_contrat: b.type_contrat,
        date_debut: b.date_debut,
        date_fin: b.en_cours ? null : b.date_fin || null,
        en_cours: b.en_cours,
        description: b.description.trim() || null,
      };
      if (b.id) {
        const maj = await usersService.mettreAJourExperience(b.id, payload);
        setExperiences((prev) =>
          prev.map((x, i) =>
            i === index
              ? {
                  ...x,
                  id: maj.id,
                  poste: maj.poste,
                  entreprise: maj.entreprise,
                  date_debut: maj.date_debut.slice(0, 10),
                  date_fin: maj.date_fin?.slice(0, 10) ?? "",
                  en_cours: maj.en_cours,
                  description: maj.description ?? "",
                }
              : x
          )
        );
      } else {
        const cree = await usersService.ajouterExperience(payload);
        setExperiences((prev) =>
          prev.map((x, i) =>
            i === index
              ? {
                  ...x,
                  id: cree.id,
                  date_debut: cree.date_debut.slice(0, 10),
                  date_fin: cree.date_fin?.slice(0, 10) ?? "",
                  en_cours: cree.en_cours,
                  description: cree.description ?? "",
                }
              : x
          )
        );
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur lors de l'enregistrement de l'expérience.");
    } finally {
      setExperiences((prev) => prev.map((x, i) => (i === index ? { ...x, sauvegarde: false } : x)));
    }
  };

  const supprimerExperience = async (index: number) => {
    const b = experiences[index];
    if (b.id) {
      try {
        await usersService.supprimerExperience(b.id);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Impossible de supprimer l'expérience.");
        return;
      }
    }
    setExperiences((prev) => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    setEnregistrement(true);
    setErreur(null);
    try {
      await usersService.mettreAJourProfil({
        profile: {
          first_name: prenom || null,
          last_name: nom || null,
          phone: telephone || null,
          skills,
        },
      });
      router.push("/overview");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur lors de la sauvegarde du profil.");
      setEnregistrement(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto w-full max-w-6xl space-y-8"
    >
      {/* En-tête de validation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Vérification du Profil Parsé</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-primary flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground">
              ✓
            </div>
            <span className="text-primary text-xs font-medium">Upload</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <div className="bg-primary flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground">
              ✓
            </div>
            <span className="text-primary text-xs font-medium">Analyse</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <div className="border-primary text-primary flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold">
              3
            </div>
            <span className="text-xs font-medium text-foreground">Vérification</span>
          </div>
        </div>
      </div>

      {erreur && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erreur}
        </div>
      )}

      <div className="flex h-[750px] flex-col gap-6 lg:flex-row">
        {/* Colonne de gauche : Document original */}
        <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background lg:w-[45%]">
          <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-3">
            <div className="flex items-center gap-2 text-foreground">
              <Search size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-bold">Document Original</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded">
                <ZoomOut size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="rounded">
                <ZoomIn size={16} />
              </Button>
            </div>
          </div>
          <div className="relative flex-1 p-6">
            <div className="absolute inset-6 overflow-hidden rounded-md border border-border bg-muted p-8 opacity-50 blur-[1px]">
              <div className="mb-8 h-10 w-1/2 rounded bg-foreground/20" />
              <div className="mb-8 space-y-4">
                <div className="h-5 w-full rounded bg-foreground/10" />
                <div className="h-5 w-5/6 rounded bg-foreground/10" />
                <div className="h-5 w-4/6 rounded bg-foreground/10" />
              </div>
              <div className="mb-4 h-8 w-1/3 rounded bg-foreground/20" />
              <div className="mb-8 space-y-4">
                <div className="h-5 w-full rounded bg-foreground/10" />
                <div className="h-5 w-3/4 rounded bg-foreground/10" />
              </div>
              <div className="mb-4 h-8 w-1/3 rounded bg-foreground/20" />
              <div className="space-y-4">
                <div className="h-5 w-full rounded bg-foreground/10" />
                <div className="h-5 w-4/5 rounded bg-foreground/10" />
              </div>
            </div>

            <div className="bg-primary/5 pointer-events-none absolute inset-0" />
            <div className="border-primary/30 text-primary absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded border bg-background/80 px-4 py-2 font-mono text-xs backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
                <span className="bg-primary relative inline-flex h-2 w-2 rounded-full"></span>
              </span>
              Analyse du document terminée
            </div>
          </div>
        </div>

        {/* Colonne de droite : Données extraites éditables */}
        <div className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background lg:w-[55%]">
          <div className="flex items-center justify-between border-b border-border bg-muted px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Données du Profil Parsé</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Veuillez vérifier et corriger les informations extraites ci-dessous.
              </p>
            </div>
            {(profil?.profile?.skills?.length ?? 0) > 0 && (
              <div className="bg-primary/20 border-primary/30 text-primary flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
                ✨ Extrait par IA
              </div>
            )}
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto p-6">
            {chargement ? (
              <div className="space-y-4">
                <div className="h-8 w-48 animate-pulse rounded bg-muted" />
                <div className="h-40 animate-pulse rounded-xl bg-muted/70" />
              </div>
            ) : (
              <>
                {/* Informations de base */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-2 text-foreground">
                    <User size={18} className="text-muted-foreground" />
                    <h3 className="text-sm font-bold">Informations de base</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Prénom
                      </label>
                      <Input
                        type="text"
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        className="h-auto px-3 py-2.5"
                        placeholder="Votre prénom"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Nom
                      </label>
                      <Input
                        type="text"
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        className="h-auto px-3 py-2.5"
                        placeholder="Votre nom"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={email}
                        readOnly
                        className="bg-muted h-auto px-3 py-2.5 text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Téléphone
                      </label>
                      <Input
                        type="tel"
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                        className="h-auto px-3 py-2.5"
                        placeholder="+33 6 12 34 56 78"
                      />
                    </div>
                  </div>
                </section>

                {/* Compétences extraites */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-2 text-foreground">
                      <Lightbulb size={18} className="text-muted-foreground" />
                      <h3 className="text-sm font-bold">Compétences Extraites</h3>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {skills.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Aucune compétence extraite — ajoutez vos savoir-faire manuellement.
                      </p>
                    )}
                    {skills.map((skill) => (
                      <div
                        key={skill}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-sm text-foreground/85 transition-colors hover:border-border"
                      >
                        {skill}
                        <button
                          onClick={() => retirerCompetence(skill)}
                          className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                          aria-label={`Retirer ${skill}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <div className="ml-1 flex items-center gap-1.5">
                      <Input
                        type="text"
                        value={nouvelleCompetence}
                        onChange={(e) => setNouvelleCompetence(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && ajouterCompetence()}
                        placeholder="Ajouter..."
                        className="h-auto w-36 px-2.5 py-1.5 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={ajouterCompetence}
                        aria-label="Ajouter la compétence"
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                </section>

                {/* Expériences */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-2 text-foreground">
                      <Briefcase size={18} className="text-muted-foreground" />
                      <h3 className="text-sm font-bold">Expérience</h3>
                    </div>
                    <Button variant="link" onClick={ajouterPoste} className="gap-1 text-xs font-medium">
                      <Plus size={12} /> Ajouter un poste
                    </Button>
                  </div>

                  {experiences.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Aucune expérience enregistrée — ajoutez les postes de votre parcours.
                    </p>
                  )}

                  <div className="space-y-3">
                    {experiences.map((b, index) => (
                      <div key={`${b.id ?? "draft"}-${index}`} className="space-y-3 rounded-lg border border-border bg-muted p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            type="text"
                            value={b.poste}
                            onChange={(e) => mettreAJourBrouillon(index, { poste: e.target.value })}
                            className="h-auto border-0 bg-transparent px-0 py-0 text-sm font-bold shadow-none"
                            placeholder="Intitulé du poste"
                          />
                          <Input
                            type="text"
                            value={b.entreprise}
                            onChange={(e) => mettreAJourBrouillon(index, { entreprise: e.target.value })}
                            className="h-auto bg-muted px-3 py-2 text-foreground/85"
                            placeholder="Nom de l'entreprise"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <select
                            value={b.type_contrat}
                            onChange={(e) => mettreAJourBrouillon(index, { type_contrat: e.target.value })}
                            className={CLAZZ_CHAMPS}
                          >
                            {CONTRATS.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <Input
                            type="date"
                            value={b.date_debut}
                            onChange={(e) => mettreAJourBrouillon(index, { date_debut: e.target.value })}
                            className="h-auto bg-muted px-3 py-2 text-foreground/85"
                            aria-label="Date de début"
                          />
                          <Input
                            type="date"
                            value={b.en_cours ? "" : b.date_fin}
                            disabled={b.en_cours}
                            onChange={(e) => mettreAJourBrouillon(index, { date_fin: e.target.value })}
                            className="h-auto bg-muted px-3 py-2 text-foreground/85"
                            aria-label="Date de fin"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3">
                          <div>
                            <span className="block text-sm font-medium text-foreground">Poste actuel</span>
                            <span className="block text-xs text-muted-foreground">
                              Cette expérience est toujours en cours.
                            </span>
                          </div>
                          <ToggleSwitch
                            actif={b.en_cours}
                            onChange={(v) => mettreAJourBrouillon(index, { en_cours: v })}
                          />
                        </div>
                        <textarea
                          value={b.description}
                          onChange={(e) => mettreAJourBrouillon(index, { description: e.target.value })}
                          placeholder="Missions, réalisations, environnement de travail…"
                          className="focus:border-primary h-20 w-full resize-none rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => supprimerExperience(index)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={14} /> Supprimer
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => enregistrerExperience(index)}
                            disabled={b.sauvegarde}
                            className="gap-1.5"
                          >
                            <Save size={14} />
                            {b.sauvegarde ? "Enregistrement..." : "Enregistrer"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border bg-background p-6">
            <Button variant="outline" size="lg" onClick={() => router.back()} className="px-5 py-2.5">
              Retour
            </Button>
            <Button size="lg" onClick={handleComplete} disabled={enregistrement} className="gap-2 px-6 py-2.5 text-sm font-bold">
              {enregistrement ? "Sauvegarde..." : "Confirmer et Terminer"} <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}