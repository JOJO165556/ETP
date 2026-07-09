import type { JobId, CompanyId, UserId } from "./index";

// Offres d'emploi

export type TypeContrat = "CDI" | "CDD" | "Freelance" | "Stage" | "Alternance";
export type ModesTravail = "Télétravail" | "Hybride" | "Présentiel";
export type NiveauExperience = "Junior" | "Confirmé" | "Senior" | "Lead" | "Directeur";

export interface Offre {
  id: JobId;
  title: string;
  company_name: string;
  company_id: CompanyId;
  company_logo_url?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  work_mode?: ModesTravail;
  contract_type?: TypeContrat;
  salary_range?: string;
  salary_min?: number;
  salary_max?: number;
  experience_level?: NiveauExperience;
  tags: string[];
  match_score?: number;
  posted_at: string;
  applicants_count?: number;
  description?: string;
  responsibilities?: string[];
  is_active: boolean;
}

/* Alias publié — permet d'importer Job ou Offre selon le contexte */
export type Job = Offre;

export interface FiltresOffres {
  search?: string;
  work_mode?: ModesTravail;
  salary_min?: number;
  salary_max?: number;
  experience_level?: NiveauExperience;
  tags?: string[];
  page?: number;
  size?: number;
}

/* Analyse d'une compétence par rapport au profil du candidat */
export interface AnalyseCompetence {
  libelle: string;
  statut: "validee" | "manquante" | "partielle";
  note?: string;
}

export interface ResponsableRecrutement {
  nom: string;
  titre: string;
  avatar_url?: string;
}

/* Détail complet d'une offre, incluant l'analyse de correspondance */
export interface DetailOffre extends Offre {
  overview?: string;
  responsibilities: string[];
  skill_analysis?: AnalyseCompetence[];
  culture_perks?: string[];
  hiring_manager?: ResponsableRecrutement;
  similar_jobs?: Offre[];
}

// Candidatures

export type EtapeCandidature =
  "POSTULE" | "PREEVALUATION" | "ENTRETIEN" | "OFFRE" | "EMBAUCHE";
export type StatutCandidature = "ACTIVE" | "ACTION_REQUISE" | "ARCHIVEE";

export interface ActionCandidature {
  libelle: string;
  variante: "primaire" | "secondaire";
  href?: string;
}

export interface Candidature {
  id: string;
  intitule_poste: string;
  nom_entreprise: string;
  logo_entreprise?: string;
  lieu?: string;
  salaire?: string;
  statut: StatutCandidature;
  etape_actuelle: EtapeCandidature;
  etapes_completees: EtapeCandidature[];
  mise_a_jour: string;
  prochaine_action?: ActionCandidature;
  prochain_evenement?: {
    libelle: string;
    date_heure: string;
  };
  motif_rejet?: string;
}

// Profil candidat

export type NiveauCompetence = "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE" | "EXPERT";

export interface ExperienceProfessionnelle {
  id: string;
  entreprise: string;
  poste: string;
  type_contrat?: string;
  date_debut: string;
  date_fin?: string;
  en_cours: boolean;
  description?: string;
  logo_entreprise?: string;
}

export interface Competence {
  id: string;
  nom: string;
  niveau: NiveauCompetence;
  est_verifiee?: boolean;
}

export interface FormationDiplome {
  id: string;
  etablissement: string;
  diplome: string;
  domaine?: string;
  annee?: number;
  logo_url?: string;
}

export interface ProfilCandidat {
  id: UserId;
  nom_complet: string;
  titre?: string;
  avatar_url?: string;
  localisation?: string;
  email: string;
  force_profil: number; // 0 à 100
  conseil_completion?: string;
  experiences: ExperienceProfessionnelle[];
  competences: Competence[];
  formations: FormationDiplome[];
  profil_public: boolean;
  recherchable: boolean;
}

// Vivier de talents (vue recruteur)

export interface CandidatVivier {
  id: UserId;
  nom_complet: string;
  titre?: string;
  avatar_url?: string;
  localisation?: string;
  annees_experience?: number;
  langues?: string[];
  score_correspondance?: number;
  libelle_correspondance?: string;
  tags_correspondance?: string[];
  experiences: ExperienceProfessionnelle[];
  competences: Competence[];
  activite_plateforme?: {
    entretiens: number;
    offres: number;
  };
}

// Analytiques

export interface ResumeAnalytiques {
  vues_profil: number;
  evolution_vues: number;
  nouveaux_matchs: number;
  candidatures_actives: number;
  taux_entretien: number;
  taux_offre: number;
}

/* Alias anglais conservés pour compatibilité avec le service backend */
export type { Offre as JobDetail, CandidatVivier as TalentPoolCandidate };
export type { ProfilCandidat as CandidateProfile };
export type { AnalyseCompetence as SkillAnalysis };
export type { FiltresOffres as JobFilters };
