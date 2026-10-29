import { api } from "@/lib/api";
import type { Offre } from "@/types/domain";

export interface FiltresOffresAPI {
  skip?: number;
  limit?: number;
}

function construireRequete(filtres: FiltresOffresAPI = {}): string {
  const params = new URLSearchParams();
  if (filtres.skip != null) params.set("skip", String(filtres.skip));
  if (filtres.limit != null) params.set("limit", String(filtres.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export interface ReponseCandidature {
  application: { id: string; job_id: string; stage: string };
  task_id: string | null;
  task_status: string | null;
}

/* Service pour la gestion des offres d'emploi */
export const jobsService = {
  getOffres: (filtres: FiltresOffresAPI = {}): Promise<Offre[]> =>
    api.get<Offre[]>(`/jobs${construireRequete(filtres)}`),

  getOffreParId: (id: string): Promise<Offre> => api.get<Offre>(`/jobs/${id}`),

  getOffresSimilaires: (id: string): Promise<Offre[]> =>
    api.get<Offre[]>(`/jobs/${id}/similar`),

  getOffresLocales: (
    latitude: number,
    longitude: number,
    radiusKm = 50
  ): Promise<Offre[]> =>
    api.get<Offre[]>(
      `/jobs/search/location?lon=${longitude}&lat=${latitude}&radius_km=${radiusKm}`
    ),

  postuler: (jobId: string): Promise<ReponseCandidature> =>
    api.post<ReponseCandidature>(`/applications/jobs/${jobId}/apply`),
};