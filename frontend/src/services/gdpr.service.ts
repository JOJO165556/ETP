import { api } from "@/lib/api";
import type {
  AnonymizationResponse,
  DataDeletionResponse,
  DataExportResponse,
} from "@/types/domain";

export const gdprService = {
  exportUserData: (userId: string): Promise<DataExportResponse> =>
    api.get<DataExportResponse>(`/gdpr/export/${userId}`),

  deleteUserData: (userId: string, confirm = true): Promise<DataDeletionResponse> =>
    api.delete<DataDeletionResponse>(`/gdpr/delete/${userId}`, {
      body: JSON.stringify({ confirm }),
    }),

  anonymizeUserData: (userId: string): Promise<AnonymizationResponse> =>
    api.post<AnonymizationResponse>(`/gdpr/anonymize/${userId}`),
};
