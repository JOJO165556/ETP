"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Edit2,
  MapPin,
  Mail,
  Briefcase,
  Star,
  GraduationCap,
  Rocket,
  Eye,
  CheckCircle2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { usersService } from "@/services/users.service";
import type { ExperiencePro, FormationPro, UserProfil } from "@/types/domain";

function forceProfil(profil: UserProfil | null): number {
  if (!profil?.profile) return 0;
  const p = profil.profile;
  let score = 0;
  if (p.first_name && p.last_name) score += 20;
  if (p.phone) score += 15;
  if (p.raw_address) score += 15;
  score += Math.min(30, (p.skills ?? []).length * 10);
  if (p.cv_key) score += 20;
  return score;
}

function formaterDateFR(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

const CLAZZ_CHAMPS =
  "w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none";

const SELECT_CONTRATS = ["CDI", "CDD", "Freelance", "Stage", "Alternance", "Intérim"];

/* Page de profil et paramètres du candidat — données réelles (informations,
   compétences, expériences professionnelles, formations, visibilité). */
export default function ProfilPage() {
  const [profil, setProfil] = useState<UserProfil | null>(null);
  const [chargement, setChargement] = useState(true);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [skillsTexte, setSkillsTexte] = useState("");
  const [recherchable, setRecherchable] = useState(true);
  const [profilPublic, setProfilPublic] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const [experiences, setExperiences] = useState<ExperiencePro[]>([]);
  const [formations, setFormations] = useState<FormationPro[]>([]);

  /* Formulaire expérience */
  const [formExpOuvert, setFormExpOuvert] = useState(false);
  const [expEnEdition, setExpEnEdition] = useState<ExperiencePro | null>(null);
  const [expPoste, setExpPoste] = useState("");
  const [expEntreprise, setExpEntreprise] = useState("");
  const [expContrat, setExpContrat] = useState("CDI");
  const [expDebut, setExpDebut] = useState("");
  const [expFin, setExpFin] = useState("");
  const [expEnCours, setExpEnCours] = useState(false);
  const [expDescription, setExpDescription] = useState("");
  const [sauvegardeExp, setSauvegardeExp] = useState(false);

  /* Formulaire formation */
  const [formFormOuvert, setFormFormOuvert] = useState(false);
  const [formEnEdition, setFormEnEdition] = useState<FormationPro | null>(null);
  const [formaEtablissement, setFormaEtablissement] = useState("");
  const [formaDiplome, setFormaDiplome] = useState("");
  const [formaDomaine, setFormaDomaine] = useState("");
  const [formaAnnee, setFormaAnnee] = useState("");
  const [sauvegardeForm, setSauvegardeForm] = useState(false);

  useEffect(() => {
    let vivant = true;
    usersService
      .getMonProfil()
      .then((data) => {
        if (!vivant) return;
        setProfil(data);
        const p = data.profile;
        setPrenom(p?.first_name ?? "");
        setNom(p?.last_name ?? "");
        setTelephone(p?.phone ?? "");
        setAdresse(p?.raw_address ?? "");
        setSkillsTexte((p?.skills ?? []).join(", "));
        setRecherchable(p?.is_searchable ?? true);
        setProfilPublic(p?.is_profile_public ?? true);
        setExperiences(p?.experiences ?? []);
        setFormations(p?.formations ?? []);
      })
      .catch((erreur) => console.error("Erreur de chargement du profil", erreur))
      .finally(() => vivant && setChargement(false));
    return () => {
      vivant = false;
    };
  }, []);

  const score = useMemo(() => forceProfil(profil), [profil]);
  const nomComplet = `${prenom} ${nom}`.trim() || "Candidat";

  const enregistrer = async () => {
    setEnregistrement(true);
    setErreur(null);
    setSauvegarde(false);
    try {
      const skills = skillsTexte
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const misAJour = await usersService.mettreAJourProfil({
        profile: {
          first_name: prenom || null,
          last_name: nom || null,
          phone: telephone || null,
          raw_address: adresse || null,
          skills,
          is_profile_public: profilPublic,
          is_searchable: recherchable,
        },
      });
      setProfil(misAJour);
      setSauvegarde(true);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setEnregistrement(false);
    }
  };

  /* --- Expériences : CRUD --- */
  const ouvrirAjoutExp = () => {
    setExpEnEdition(null);
    setExpPoste("");
    setExpEntreprise("");
    setExpContrat("CDI");
    setExpDebut("");
    setExpFin("");
    setExpEnCours(false);
    setExpDescription("");
    setFormExpOuvert(true);
  };

  const ouvrirEditionExp = (exp: ExperiencePro) => {
    setExpEnEdition(exp);
    setExpPoste(exp.poste);
    setExpEntreprise(exp.entreprise);
    setExpContrat(exp.type_contrat ?? "CDI");
    setExpDebut(exp.date_debut.slice(0, 10));
    setExpFin(exp.date_fin?.slice(0, 10) ?? "");
    setExpEnCours(exp.en_cours);
    setExpDescription(exp.description ?? "");
    setFormExpOuvert(true);
  };

  const enregistrerExperience = async () => {
    if (!expPoste.trim() || !expEntreprise.trim() || !expDebut) {
      setErreur("Poste, entreprise et date de début sont obligatoires.");
      return;
    }
    setSauvegardeExp(true);
    setErreur(null);
    try {
      const payload = {
        poste: expPoste.trim(),
        entreprise: expEntreprise.trim(),
        type_contrat: expContrat,
        date_debut: expDebut,
        date_fin: expEnCours ? null : expFin || null,
        en_cours: expEnCours,
        description: expDescription.trim() || null,
      };
      if (expEnEdition) {
        const maj = await usersService.mettreAJourExperience(expEnEdition.id, payload);
        setExperiences((prev) => prev.map((x) => (x.id === maj.id ? maj : x)));
      } else {
        const cree = await usersService.ajouterExperience(payload);
        setExperiences((prev) => [...prev, cree]);
      }
      setFormExpOuvert(false);
      setExpEnEdition(null);
      setSauvegarde(true);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur lors de l'enregistrement de l'expérience.");
    } finally {
      setSauvegardeExp(false);
    }
  };

  const supprimerExperience = async (id: string) => {
    try {
      await usersService.supprimerExperience(id);
      setExperiences((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de supprimer l'expérience.");
    }
  };

  /* --- Formations : CRUD --- */
  const ouvrirAjoutForm = () => {
    setFormEnEdition(null);
    setFormaEtablissement("");
    setFormaDiplome("");
    setFormaDomaine("");
    setFormaAnnee("");
    setFormFormOuvert(true);
  };

  const ouvrirEditionForm = (formation: FormationPro) => {
    setFormEnEdition(formation);
    setFormaEtablissement(formation.etablissement);
    setFormaDiplome(formation.diplome);
    setFormaDomaine(formation.domaine ?? "");
    setFormaAnnee(String(formation.annee));
    setFormFormOuvert(true);
  };

  const enregistrerFormation = async () => {
    if (!formaEtablissement.trim() || !formaDiplome.trim() || !formaAnnee) {
      setErreur("Établissement, diplôme et année sont obligatoires.");
      return;
    }
    const annee = Number.parseInt(formaAnnee, 10);
    if (Number.isNaN(annee) || annee < 1900 || annee > new Date().getFullYear() + 1) {
      setErreur("Veuillez saisir une année valide.");
      return;
    }
    setSauvegardeForm(true);
    setErreur(null);
    try {
      const payload = {
        etablissement: formaEtablissement.trim(),
        diplome: formaDiplome.trim(),
        domaine: formaDomaine.trim() || null,
        annee,
      };
      if (formEnEdition) {
        const maj = await usersService.mettreAJourFormation(formEnEdition.id, payload);
        setFormations((prev) => prev.map((x) => (x.id === maj.id ? maj : x)));
      } else {
        const cree = await usersService.ajouterFormation(payload);
        setFormations((prev) => [...prev, cree]);
      }
      setFormFormOuvert(false);
      setFormEnEdition(null);
      setSauvegarde(true);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur lors de l'enregistrement de la formation.");
    } finally {
      setSauvegardeForm(false);
    }
  };

  const supprimerFormation = async (id: string) => {
    try {
      await usersService.supprimerFormation(id);
      setFormations((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de supprimer la formation.");
    }
  };

  if (chargement) {
    return (
      <div className="p-10 text-muted-foreground">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-muted/70" />
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-muted/70" />
      </div>
    );
  }

  if (!profil) {
    return <div className="p-10 text-destructive">Erreur de chargement du profil.</div>;
  }

  return (
    <div className="flex h-full">
      {/* Contenu de la page */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Mon Profil</h1>
          <Button onClick={enregistrer} disabled={enregistrement} className="gap-2">
            {enregistrement ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>

        {sauvegarde && !erreur && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle2 size={16} aria-hidden="true" /> Profil enregistré avec succès.
          </div>
        )}
        {erreur && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erreur}
          </div>
        )}

        {/* Carte identité + Force du profil */}
        <div className="mb-8 grid gap-6 xl:grid-cols-[1fr_350px]">
          <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 rounded-xl bg-secondary">
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-secondary-foreground/60">
                {nomComplet.charAt(0)}
              </div>
              <Button
                aria-label="Modifier l'avatar"
                variant="secondary"
                size="icon-sm"
                className="absolute -right-2 -bottom-2 rounded-full shadow-lg"
              >
                <Edit2 size={14} />
              </Button>
            </div>

            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold text-foreground">{nomComplet}</h1>
              <p className="text-lg text-foreground/70">{profil.role}</p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-muted-foreground">
                {adresse && (
                  <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1">
                    <MapPin size={14} aria-hidden="true" /> {adresse}
                  </span>
                )}
                <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1">
                  <Mail size={14} aria-hidden="true" /> {profil.email}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-foreground">Force du Profil</h3>
              <span className="font-mono text-xs text-muted-foreground">{score}% Complété</span>
            </div>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000"
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Renseignez vos informations, compétences, parcours et CV pour atteindre 100% et
              améliorer vos correspondances.
            </p>
          </div>
        </div>

        {/* Informations de base */}
        <section className="mb-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-5 text-lg font-bold text-foreground">Informations de base</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prenom">Prénom</Label>
              <Input id="prenom" type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Jean" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" type="text" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Dupont" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+33612345678" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adresse">Localisation</Label>
              <Input id="adresse" type="text" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Paris, France" />
            </div>
          </div>
        </section>

        {/* Expériences professionnelles */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Briefcase size={20} className="text-muted-foreground" aria-hidden="true" /> Expérience Professionnelle
            </h2>
            <Button variant="outline" size="sm" onClick={formExpOuvert ? undefined : ouvrirAjoutExp} className="gap-1.5">
              <Plus size={14} aria-hidden="true" /> Ajouter
            </Button>
          </div>

          {formExpOuvert && (
            <div className="mb-4 rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-foreground">
                  {expEnEdition ? "Modifier l'expérience" : "Nouvelle expérience"}
                </h3>
                <Button variant="ghost" size="icon-sm" onClick={() => setFormExpOuvert(false)} aria-label="Fermer le formulaire">
                  <X size={16} />
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="exp-poste">Intitulé du poste *</Label>
                  <Input id="exp-poste" value={expPoste} onChange={(e) => setExpPoste(e.target.value)} placeholder="Intitulé du poste" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exp-ent">Entreprise *</Label>
                  <Input id="exp-ent" value={expEntreprise} onChange={(e) => setExpEntreprise(e.target.value)} placeholder="Nom de l'entreprise" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exp-contrat">Type de contrat</Label>
                  <select id="exp-contrat" value={expContrat} onChange={(e) => setExpContrat(e.target.value)} className={CLAZZ_CHAMPS}>
                    {SELECT_CONTRATS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Période</Label>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={expDebut} onChange={(e) => setExpDebut(e.target.value)} aria-label="Date de début" />
                    <span className="text-muted-foreground">→</span>
                    <Input type="date" value={expFin} disabled={expEnCours} onChange={(e) => setExpFin(e.target.value)} aria-label="Date de fin" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/50 px-4 py-3 md:col-span-2">
                  <div>
                    <span className="block text-sm font-medium text-foreground">Poste actuel</span>
                    <span className="block text-xs text-muted-foreground">
                      Cocher si cette expérience est toujours en cours.
                    </span>
                  </div>
                  <ToggleSwitch actif={expEnCours} onChange={setExpEnCours} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="exp-desc">Description</Label>
                  <textarea
                    id="exp-desc"
                    rows={3}
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    className={CLAZZ_CHAMPS}
                    placeholder="Missions, réalisations, environnement technique…"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setFormExpOuvert(false)}>Annuler</Button>
                <Button onClick={enregistrerExperience} disabled={sauvegardeExp}>
                  {sauvegardeExp ? "Enregistrement..." : expEnEdition ? "Mettre à jour" : "Ajouter l'expérience"}
                </Button>
              </div>
            </div>
          )}

          {experiences.length === 0 && !formExpOuvert ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Aucune expérience enregistrée pour le moment. Ajoutez votre parcours pour
              enrichir votre profil.
            </div>
          ) : (
            <div className="space-y-3">
              {experiences.map((exp) => (
                <div key={exp.id} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-foreground">{exp.poste}</span>
                      <Badge variant="secondary">{exp.type_contrat ?? "Contrat"}</Badge>
                      {exp.en_cours && <Badge variant="success">En cours</Badge>}
                    </div>
                    <p className="text-sm font-medium text-foreground/80">{exp.entreprise}</p>
                    <p className="text-xs text-muted-foreground">
                      {formaterDateFR(exp.date_debut)} — {exp.en_cours ? "Aujourd'hui" : formaterDateFR(exp.date_fin)}
                    </p>
                    {exp.description && (
                      <p className="text-sm leading-relaxed text-foreground/70">{exp.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="ghost" size="icon-sm" onClick={() => ouvrirEditionExp(exp)} aria-label={`Modifier ${exp.poste}`}>
                      <Edit2 size={15} />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => supprimerExperience(exp.id)} aria-label={`Supprimer ${exp.poste}`} className="text-destructive hover:bg-destructive/10">
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Compétences et Formations */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground">
              <Star size={20} className="text-muted-foreground" aria-hidden="true" /> Compétences
            </h2>
            <Label htmlFor="skills" className="mb-2 text-xs text-muted-foreground">
              Une compétence par ligne, séparées par des virgules (ex : gestion de projet, comptabilité, marketing, droit).
            </Label>
            <textarea
              id="skills"
              value={skillsTexte}
              onChange={(e) => setSkillsTexte(e.target.value)}
              rows={3}
              className={CLAZZ_CHAMPS}
              placeholder="gestion de projet, relation client, reporting, excel"
            />
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <GraduationCap size={20} className="text-muted-foreground" aria-hidden="true" /> Formations & Diplômes
              </h2>
              <Button variant="outline" size="sm" onClick={ouvrirAjoutForm} className="gap-1.5">
                <Plus size={14} aria-hidden="true" /> Ajouter
              </Button>
            </div>

            {formFormOuvert && (
              <div className="mb-4 space-y-4 rounded-xl border border-border bg-secondary/50 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">
                    {formEnEdition ? "Modifier la formation" : "Nouvelle formation"}
                  </h3>
                  <Button variant="ghost" size="icon-sm" onClick={() => setFormFormOuvert(false)} aria-label="Fermer le formulaire">
                    <X size={16} />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="forma-etab">Établissement *</Label>
                  <Input id="forma-etab" value={formaEtablissement} onChange={(e) => setFormaEtablissement(e.target.value)} placeholder="Université Paris-Saclay" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="forma-diplome">Diplôme *</Label>
                  <Input id="forma-diplome" value={formaDiplome} onChange={(e) => setFormaDiplome(e.target.value)} placeholder="Master Informatique" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="forma-domaine">Domaine</Label>
                  <Input id="forma-domaine" value={formaDomaine} onChange={(e) => setFormaDomaine(e.target.value)} placeholder="Développement logiciel" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="forma-annee">Année d'obtention *</Label>
                  <Input id="forma-annee" type="number" value={formaAnnee} onChange={(e) => setFormaAnnee(e.target.value)} placeholder="2022" />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setFormFormOuvert(false)}>Annuler</Button>
                  <Button onClick={enregistrerFormation} disabled={sauvegardeForm}>
                    {sauvegardeForm ? "Enregistrement..." : formEnEdition ? "Mettre à jour" : "Ajouter"}
                  </Button>
                </div>
              </div>
            )}

            {formations.length === 0 && !formFormOuvert ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Aucune formation renseignée.
              </div>
            ) : (
              <ul className="space-y-2">
                {formations.map((form) => (
                  <li key={form.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card py-3 pr-2 pl-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground">{form.diplome}</p>
                      <p className="text-xs text-foreground/70">{form.etablissement}</p>
                      <p className="text-xs text-muted-foreground">
                        {form.domaine ? `${form.domaine} · ` : ""}{form.annee}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => ouvrirEditionForm(form)} aria-label={`Modifier ${form.diplome}`}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => supprimerFormation(form.id)} aria-label={`Supprimer ${form.diplome}`} className="text-destructive hover:bg-destructive/10">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Visibilité & Confidentialité */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground">
            Visibilité & Confidentialité
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Rocket size={16} aria-hidden="true" />
                </div>
                <div>
                  <span className="block text-sm font-medium text-foreground">Recherchable</span>
                  <span className="block text-xs text-muted-foreground">
                    Apparaître dans les recherches des recruteurs
                  </span>
                </div>
              </div>
              <ToggleSwitch actif={recherchable} onChange={setRecherchable} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Eye size={16} aria-hidden="true" />
                </div>
                <div>
                  <span className="block text-sm font-medium text-foreground">Profil Public</span>
                  <span className="block text-xs text-muted-foreground">
                    Votre fiche est visible par les recruteurs
                  </span>
                </div>
              </div>
              <ToggleSwitch actif={profilPublic} onChange={setProfilPublic} />
            </div>
          </div>
        </section>
      </div>

      {/* Sidebar Éditeur */}
      <div className="border-border hidden w-64 border-l bg-background p-6 lg:block">
        <h3 className="mb-6 text-sm font-bold text-foreground">
          ETP Workspace <br />
          <span className="text-xs font-normal text-muted-foreground">Éditeur de profil</span>
        </h3>

        <Button variant="secondary" className="w-full justify-start">Profil</Button>

        <Button
          onClick={enregistrer}
          disabled={enregistrement}
          className="mt-6 w-full gap-2"
        >
          <CheckCircle2 size={15} aria-hidden="true" /> Publier le Profil
        </Button>
      </div>
    </div>
  );
}