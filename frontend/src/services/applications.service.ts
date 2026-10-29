import { api } from "@/lib/api";
import type { CandidatureAPI } from "@/types/domain";

export interface TaskStatusResponse {
  task_id: string;
  application_id: string;
  status: string;
  result?: Record<string, unknown>;
  matching_score?: number;
  stage?: string;
}

/* Service pour le suivi des candidatures du candidat et du recruteur */
export const applicationsService = {
  getMesCandidatures: (): Promise<CandidatureAPI[]> =>
    api.get<CandidatureAPI[]>("/applications/me"),

  getTaskStatus: (taskId: string): Promise<TaskStatusResponse> =>
    api.get<TaskStatusResponse>(`/applications/tasks/${taskId}/status`),

  updateStage: (applicationId: string, stage: string): Promise<CandidatureAPI> =>
    api.patch<CandidatureAPI>(`/applications/${applicationId}/stage`, { stage }),

  getJobApplications: (jobId: string): Promise<CandidatureAPI[]> =>
    api.get<CandidatureAPI[]>(`/applications/jobs/${jobId}`),
};