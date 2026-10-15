import type { Analysis, CountryCode } from '@clausum/shared';
import type { Contract } from '@clausum/shared';
import type { ProcessingProgress } from '@clausum/shared';
import { invalidateSubscriptionCache } from '@/hooks/useSubscriptionSummary';
import { apiClient } from '@/services/api/client';
import { pollAnalysisUntilDone } from '@/utils/poll-analysis';

export type AnalysisPayload = {
  analysisId: string;
  analysis: Analysis;
  contract: Contract & { id: string };
};

export async function runAnalysis(
  contractId: string,
  country: CountryCode = 'CO',
  options?: {
    onProgress?: (progress: ProcessingProgress | undefined) => void;
  }
): Promise<AnalysisPayload> {
  const start = await apiClient<{ analysisId: string; status: string }>('/analyze', {
    method: 'POST',
    body: JSON.stringify({ contractId, country }),
  });

  const analysis = await pollAnalysisUntilDone(start.analysisId, options?.onProgress);
  const contract = await apiClient<{ contract: Contract & { id: string } }>(
    `/contracts/${contractId}`
  );
  invalidateSubscriptionCache();
  return { analysisId: start.analysisId, analysis, contract: contract.contract };
}

export async function runRiskDetection(
  contractId: string,
  country: CountryCode = 'CO'
): Promise<AnalysisPayload> {
  const result = await apiClient<{ analysisId: string; analysis: Analysis }>('/risks', {
    method: 'POST',
    body: JSON.stringify({ contractId, country }),
  });
  const contract = await apiClient<{ contract: Contract & { id: string } }>(
    `/contracts/${contractId}`
  );
  invalidateSubscriptionCache();
  return { ...result, contract: contract.contract };
}

export async function getContractAnalysis(
  contractId: string,
  mode: 'analyze' | 'risks' = 'analyze'
): Promise<AnalysisPayload> {
  return apiClient<AnalysisPayload>(
    `/contracts/${contractId}/analysis?mode=${mode}`
  );
}

export async function getAnalysisById(analysisId: string): Promise<{
  analysisId: string;
  analysis: Analysis;
}> {
  return apiClient(`/analyses/${analysisId}`);
}
