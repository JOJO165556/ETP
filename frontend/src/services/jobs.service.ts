import { api } from "@/lib/api";
import type { ApplicationSubmit, Job, JobCreate, JobStatus, JobUpdate } from "@/types/domain";

export interface FiltresOffresAPI {
  skip?: number;
  limit?: number;
  /** Vue gestion recruteur : toutes les offres de l'entreprise (tous statuts). */
  company_id?: string;
  status?: JobStatus;
}

function construireRequete(filtres: FiltresOffresAPI = {}): string {
  const params = new URLSearchParams();
  if (filtres.skip != null) params.set("skip", String(filtres.skip));
  if (filtres.limit != null) params.set("limit", String(filtres.limit));
  if (filtres.company_id) params.set("company_id", filtres.company_id);
  if (filtres.status) params.set("status", filtres.status);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/* Service pour la gestion des offres d'emploi */
export const jobsService = {
  getOffres: (filtres: FiltresOffresAPI = {}): Promise<Job[]> =>
    api.get<Job[]>(`/jobs${construireRequete(filtres)}`),

  getOffreParId: (id: string): Promise<Job> => api.get<Job>(`/jobs/${id}`),

  creerOffre: (payload: JobCreate): Promise<Job> =>
    api.post<Job>("/jobs", payload),

  mettreAJourOffre: (id: string, payload: JobUpdate): Promise<Job> =>
    api.patch<Job>(`/jobs/${id}`, payload),

  getOffresLocales: (
    latitude: number,
    longitude: number,
    radiusKm = 50
  ): Promise<Job[]> =>
    api.get<Job[]>(
      `/jobs/search/location?lon=${longitude}&lat=${latitude}&radius_km=${radiusKm}`
    ),

  postuler: (jobId: string): Promise<ApplicationSubmit> =>
    api.post<ApplicationSubmit>(`/applications/jobs/${jobId}/apply`),
};
