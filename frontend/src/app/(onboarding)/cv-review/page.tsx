"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, Check, Lightbulb, Plus, Save, Trash2, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatePanel } from "@/components/shared/state-panel";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { usersService } from "@/services/users.service";
import { cn } from "@/lib/utils";
import type { ExperienceCreate, UserResponse } from "@/types/domain";

type BrouillonExperience = {
  id: string | null;
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
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none";

const CONTRATS = ["CDI", "CDD", "Freelance", "Stage", "Alternance", "Intérim"];

const ETAPES = ["Dépôt du CV", "Lecture du document", "Vérification"];

export default function VerificationProfilPage() {
  const router = useRouter();

  const [profil, setProfil] = useState<UserResponse | null>(null);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [nouvelleCompetence, setNouvelleCompetence] = useState("");
  const [experiences, setExperiences] = useState<BrouillonExperience[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;

    const charger = async () => {
      setChargement(true);
      setErreurChargement(false);
      try {
        const data = await usersService.getMonProfil();
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
      } catch {
        if (vivant) setErreurChargement(true);
      } finally {
        if (vivant) setChargement(false);
      }
    };

    charger();

    return () => {
      vivant = false;
    };
  }, []);

  const ajouterCompetence = () => {
    const valeur = nouvelleCompetence.trim();
    if (!valeur) return;
    setSkills((prev) =>
      prev.some((s) => s.toLowerCase() === valeur.toLowerCase()) ? prev : [...prev, valeur]
    );
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
    setExperiences((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  };

  const enregistrerExperience = async (index: number) => {
    const brouillon = experiences[index];
    if (!brouillon.poste.trim() || !brouillon.entreprise.trim() || !brouillon.date_debut) {
      setErreur("Poste, entreprise et date de début sont obligatoires pour chaque expérience.");
      return;
    }
    setErreur(null);
    mettreAJourBrouillon(index, { sauvegarde: true });

    const payload: ExperienceCreate = {
      poste: brouillon.poste.trim(),
      entreprise: brouillon.entreprise.trim(),
      type_contrat: brouillon.type_contrat,
      date_debut: brouillon.date_debut,
      date_fin: brouillon.en_cours ? null : brouillon.date_fin || null,
      en_cours: brouillon.en_cours,
      description: brouillon.description.trim() || null,
    };

    try {
      const enregistree = brouillon.id
        ? await usersService.mettreAJourExperience(brouillon.id, payload)
        : await usersService.ajouterExperience(payload);

      setExperiences((prev) =>
        prev.map((x, i) =>
          i === index
            ? {
                ...x,
                id: enregistree.id,
                poste: enregistree.poste,
                entreprise: enregistree.entreprise,
                date_debut: enregistree.date_debut.slice(0, 10),
                date_fin: enregistree.date_fin?.slice(0, 10) ?? "",
                en_cours: enregistree.en_cours,
                description: enregistree.description ?? "",
              }
            : x
        )
      );
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'expérience n'a pas pu être enregistrée.");
    } finally {
      setExperiences((prev) => prev.map((x, i) => (i === index ? { ...x, sauvegarde: false } : x)));
    }
  };

  const supprimerExperience = async (index: number) => {
    const brouillon = experiences[index];
    if (brouillon.id) {
      try {
        await usersService.supprimerExperience(brouillon.id);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "L'expérience n'a pas pu être supprimée.");
        return;
      }
    }
    setExperiences((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmer = async () => {
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
      setErreur(e instanceof Error ? e.message : "Le profil n'a pas pu être enregistré.");
      setEnregistrement(false);
    }
  };

  if (chargement) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (erreurChargement || !profil) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <StatePanel
          tone="error"
          title="Votre profil n'a pas pu se charger"
          description="La connexion au serveur a échoué. Réessayez pour reprendre la vérification."
          actionLabel="Réessayer"
          onAction={() => router.refresh()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Vérifiez votre profil
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Ces informations proviennent de votre CV. Corrigez ce qui doit l&apos;être, puis
            validez : elles seront utilisées pour vous proposer des offres.
          </p>
        </div>

        <ol className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {ETAPES.map((etape, index) => {
            const courante = index === ETAPES.length - 1;
            return (
              <li key={etape} className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                    courante
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {courante ? index + 1 : <Check size={11} aria-hidden="true" />}
                </span>
                <span className={courante ? "text-foreground" : "text-muted-foreground"}>
                  {etape}
                </span>
                {!courante && <span className="mx-1 h-px w-6 bg-border" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </header>

      {erreur && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {erreur}
        </p>
      )}

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <User size={16} className="text-muted-foreground" aria-hidden="true" />
          Informations personnelles
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="prenom" className="text-xs font-medium text-muted-foreground">
              Prénom
            </label>
            <Input
              id="prenom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Votre prénom"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="nom" className="text-xs font-medium text-muted-foreground">
              Nom
            </label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Votre nom"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Adresse email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              readOnly
              className="bg-muted text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              L&apos;adresse de connexion ne peut pas être modifiée ici.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="telephone" className="text-xs font-medium text-muted-foreground">
              Téléphone
            </label>
            <Input
              id="telephone"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb size={16} className="text-muted-foreground" aria-hidden="true" />
            Compétences
          </h2>
          {(profil.profile?.skills?.length ?? 0) > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              Reconnues dans votre CV
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {skills.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune compétence pour l&apos;instant. Ajoutez vos savoir-faire.
            </p>
          )}
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-sm text-foreground"
            >
              {skill}
              <button
                type="button"
                onClick={() => retirerCompetence(skill)}
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Retirer ${skill}`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}

          <div className="flex items-center gap-1.5">
            <Input
              value={nouvelleCompetence}
              onChange={(e) => setNouvelleCompetence(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ajouterCompetence();
                }
              }}
              placeholder="Ajouter une compétence"
              aria-label="Nouvelle compétence"
              className="w-52"
            />
            <Button
              variant="outline"
              size="icon-sm"
              onClick={ajouterCompetence}
              aria-label="Ajouter la compétence"
            >
              <Plus size={14} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Briefcase size={16} className="text-muted-foreground" aria-hidden="true" />
            Expériences
          </h2>
          <Button variant="outline" size="sm" onClick={ajouterPoste} className="gap-1.5">
            <Plus size={14} aria-hidden="true" />
            Ajouter un poste
          </Button>
        </div>

        {experiences.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Aucune expérience enregistrée. Ajoutez les postes de votre parcours.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {experiences.map((brouillon, index) => (
              <div
                key={`${brouillon.id ?? "nouveau"}-${index}`}
                className="space-y-3 rounded-lg border border-border p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`poste-${index}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Intitulé du poste
                    </label>
                    <Input
                      id={`poste-${index}`}
                      value={brouillon.poste}
                      onChange={(e) => mettreAJourBrouillon(index, { poste: e.target.value })}
                      placeholder="Ex. Chargée de recrutement"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`entreprise-${index}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Entreprise
                    </label>
                    <Input
                      id={`entreprise-${index}`}
                      value={brouillon.entreprise}
                      onChange={(e) => mettreAJourBrouillon(index, { entreprise: e.target.value })}
                      placeholder="Nom de l'entreprise"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`contrat-${index}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Contrat
                    </label>
                    <select
                      id={`contrat-${index}`}
                      value={brouillon.type_contrat}
                      onChange={(e) =>
                        mettreAJourBrouillon(index, { type_contrat: e.target.value })
                      }
                      className={CLAZZ_CHAMPS}
                    >
                      {CONTRATS.map((contrat) => (
                        <option key={contrat} value={contrat}>
                          {contrat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`debut-${index}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Début
                    </label>
                    <Input
                      id={`debut-${index}`}
                      type="date"
                      value={brouillon.date_debut}
                      onChange={(e) => mettreAJourBrouillon(index, { date_debut: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`fin-${index}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Fin
                    </label>
                    <Input
                      id={`fin-${index}`}
                      type="date"
                      value={brouillon.en_cours ? "" : brouillon.date_fin}
                      disabled={brouillon.en_cours}
                      onChange={(e) => mettreAJourBrouillon(index, { date_fin: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Poste occupé actuellement</p>
                    <p className="text-xs text-muted-foreground">
                      La date de fin est désactivée tant que ce poste est en cours.
                    </p>
                  </div>
                  <ToggleSwitch
                    actif={brouillon.en_cours}
                    onChange={(valeur) => mettreAJourBrouillon(index, { en_cours: valeur })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={`description-${index}`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Missions et réalisations
                  </label>
                  <textarea
                    id={`description-${index}`}
                    value={brouillon.description}
                    onChange={(e) => mettreAJourBrouillon(index, { description: e.target.value })}
                    placeholder="Décrivez en quelques lignes ce que vous avez accompli."
                    className={cn(CLAZZ_CHAMPS, "h-24 resize-y")}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => supprimerExperience(index)}
                    className="gap-1.5 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Supprimer
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => enregistrerExperience(index)}
                    disabled={brouillon.sauvegarde}
                    className="gap-1.5"
                  >
                    <Save size={14} aria-hidden="true" />
                    {brouillon.sauvegarde ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <Button variant="outline" onClick={() => router.push("/cv-upload")}>
          Déposer un autre CV
        </Button>
        <Button onClick={confirmer} disabled={enregistrement} className="gap-2">
          {enregistrement ? "Enregistrement..." : "Valider mon profil"}
          <ArrowRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
