import type { ContractTypeCatalog } from '@clausum/shared';
import { apiClient } from '@/services/api/client';

export async function listContractTypes(
  country = 'CO'
): Promise<ContractTypeCatalog[]> {
  const data = await apiClient<{ contractTypes: ContractTypeCatalog[] }>(
    `/legal/contract-types?country=${encodeURIComponent(country)}`
  );
  return data.contractTypes;
}
