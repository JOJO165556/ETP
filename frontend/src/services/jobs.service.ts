import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/types";
import type { Offre, DetailOffre, FiltresOffres } from "@/types/domain";

function construireRequete(filtres: FiltresOffres): string {
  const params = new URLSearchParams();

  if (filtres.search) params.set("search", filtres.search);
  if (filtres.work_mode) params.set("work_mode", filtres.work_mode);
  if (filtres.salary_min != null) params.set("salary_min", String(filtres.salary_min));
  if (filtres.salary_max != null) params.set("salary_max", String(filtres.salary_max));
  if (filtres.experience_level) params.set("experience_level", filtres.experience_level);
  if (filtres.tags?.length) params.set("tags", filtres.tags.join(","));
  if (filtres.page != null) params.set("page", String(filtres.page));
  if (filtres.size != null) params.set("size", String(filtres.size));

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/* Service pour la gestion des offres d'emploi */
export const jobsService = {
  getOffres: (filtres: FiltresOffres = {}): Promise<PaginatedResponse<Offre>> =>
    api.get<PaginatedResponse<Offre>>(`/jobs${construireRequete(filtres)}`),

  getOffreParId: (id: string): Promise<DetailOffre> =>
    api.get<DetailOffre>(`/jobs/${id}`),

  postuler: (jobId: string): Promise<{ id: string }> =>
    api.post<{ id: string }>("/applications", { job_id: jobId }),

  sauvegarderOffre: (jobId: string): Promise<void> =>
    api.post<void>(`/jobs/${jobId}/save`),
};
