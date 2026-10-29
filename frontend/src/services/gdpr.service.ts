import { api } from "@/lib/api";

export interface DataExportResponse {
  user_id: string;
  generated_at: string;
  data: Record<string, unknown>;
}

export interface DataDeletionResponse {
  user_id: string;
  deleted: boolean;
  message: string;
}

export interface AnonymizationResponse {
  user_id: string;
  anonymized: boolean;
  message: string;
}

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
