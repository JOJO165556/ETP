import type { components } from "./schema";

/*
 * Types domaine du frontend.
 *
 * Les types qui reflètent l'API FastAPI sont dérivés de `schema.d.ts`,
 * généré depuis openapi.json (npm run types:generate). Toute modification
 * de schéma backend qui casse le type-check signale une évolution du contrat.
 * Les types purement visuels (non adossés à l'API) restent déclarés ici.
 */

export type Schemas = components["schemas"];


export type JobStatus = Schemas["JobStatus"];
export type Job = Schemas["JobResponse"];
export type JobCreate = Schemas["JobCreate"];
export type JobUpdate = Schemas["JobUpdate"];
export type JobSearchFilters = Schemas["JobSearchFilters"];

/* Analyse d'une compétence par rapport au profil du candidat (vue calculée côté client) */
export interface AnalyseCompetence {
  libelle: string;
  statut: "validee" | "manquante" | "partielle";
  note?: string;
}


export type ApplicationStage = Schemas["ApplicationStage"];
export type Application = Schemas["ApplicationResponse"];
export type ApplicationSubmit = Schemas["ApplicationSubmitResponse"];
export type ApplicationStageUpdate = Schemas["ApplicationUpdateStage"];
export type TaskStatus = Schemas["TaskStatusResponse"];

/* Note d'évaluation recruteur : l'API expose un dict (pas de schéma Pydantic dédié). */
export interface ApplicationNote {
  id: string;
  application_id: string;
  author_id: string;
  content: string;
  rating: number | null;
  created_at: string | null;
}


export type InterviewStatus = Schemas["InterviewStatus"];
export type Interview = Schemas["InterviewRead"];
export type InterviewCreate = Schemas["InterviewCreate"];
export type InterviewUpdate = Schemas["InterviewUpdate"];


export type ProfileResponse = Schemas["ProfileResponse"];
export type ProfileUpdate = Schemas["ProfileUpdate"];
export type ExperienceResponse = Schemas["ExperienceResponse"];
export type ExperienceCreate = Schemas["ExperienceCreate"];
export type ExperienceUpdate = Schemas["ExperienceUpdate"];
export type FormationResponse = Schemas["FormationResponse"];
export type FormationCreate = Schemas["FormationCreate"];
export type FormationUpdate = Schemas["FormationUpdate"];
export type ExperienceResume = Schemas["ExperienceResume"];
export type FormationResume = Schemas["FormationResume"];

export type UserResponse = Schemas["UserResponse"];
export type UserMeUpdate = Schemas["UserMeUpdate"];
export type UserBriefResponse = Schemas["UserBriefResponse"];


export type CompanyResponse = Schemas["CompanyResponse"];
export type CompanyCreate = Schemas["CompanyCreate"];
export type CompanyUpdate = Schemas["CompanyUpdate"];


export type NotificationResponse = Schemas["NotificationResponse"];
export type NotificationListResponse = Schemas["NotificationListResponse"];
export type NotificationMarkedResponse = Schemas["NotificationMarkedResponse"];
export type NotificationReadAllResponse = Schemas["NotificationReadAllResponse"];
export type NotificationType = Schemas["NotificationType"];


export type SearchResult = Schemas["SearchResult"];
export type CandidateMatchResponse = Schemas["CandidateMatchResponse"];


export type CandidateResume = Schemas["CandidateResume"];
export type AnalyticsDashboard = Schemas["AnalyticsDashboard"];


export type AIJobConfigResponse = Schemas["AIJobConfigResponse"];
export type AIJobConfigUpdate = Schemas["AIJobConfigUpdate"];
export type DataExportResponse = Schemas["DataExportResponse"];
export type DataDeletionResponse = Schemas["DataDeletionResponse"];
export type AnonymizationResponse = Schemas["AnonymizationResponse"];


export type TokenResponse = Schemas["Token"];
export type RegisterRequest = Schemas["RegisterRequest"];
