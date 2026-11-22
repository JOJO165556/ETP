import { api } from "@/lib/api";
import type {
  Application,
  ApplicationNote,
  ApplicationStage,
  TaskStatus,
} from "@/types/domain";

export type { TaskStatus } from "@/types/domain";

/* Service pour le suivi des candidatures du candidat et du recruteur */
export const applicationsService = {
  getMesCandidatures: (): Promise<Application[]> =>
    api.get<Application[]>("/applications/me"),

  getTaskStatus: (taskId: string): Promise<TaskStatus> =>
    api.get<TaskStatus>(`/applications/tasks/${taskId}/status`),

  updateStage: (applicationId: string, stage: ApplicationStage): Promise<Application> =>
    api.patch<Application>(`/applications/${applicationId}/stage`, { stage }),

  getJobApplications: (jobId: string): Promise<Application[]> =>
    api.get<Application[]>(`/applications/jobs/${jobId}`),

  getNotes: (applicationId: string): Promise<ApplicationNote[]> =>
    api.get<ApplicationNote[]>(`/applications/${applicationId}/notes`),

  addNote: (
    applicationId: string,
    payload: { content: string; rating?: number | null }
  ): Promise<ApplicationNote> =>
    api.post<ApplicationNote>(`/applications/${applicationId}/notes`, payload),
};
