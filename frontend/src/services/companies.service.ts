import { api } from "@/lib/api";
import type { CompanyResponse, CompanyUpdate } from "@/types/domain";

/* Service pour les informations de l'entreprise du recruteur connecté. */
export const companiesService = {
  getEntreprise: (companyId: string): Promise<CompanyResponse> =>
    api.get<CompanyResponse>(`/companies/${companyId}`),

  mettreAJourEntreprise: (
    companyId: string,
    payload: CompanyUpdate
  ): Promise<CompanyResponse> =>
    api.patch<CompanyResponse>(`/companies/${companyId}`, payload),
};
