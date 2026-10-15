import type { Analysis, CountryCode } from '@clausum/shared';
import type { Contract } from '@clausum/shared';
import type { ProcessingProgress } from '@clausum/shared';
import { invalidateSubscriptionCache } from '@/hooks/useSubscriptionSummary';
import { apiClient } from '@/services/api/client';
import { waitForJob } from '@/utils/wait-for-job';

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

  const { analysis } = await waitForJob({
    collection: 'analyses',
    docId: start.analysisId,
    fetchViaApi: () => getAnalysisById(start.analysisId),
    onProgress: options?.onProgress,
    timeoutMessage:
      'El análisis está tardando más de lo habitual. Vuelve a intentarlo en unos minutos.',
  });

  const contract = await apiClient<{ contract: Contract & { id: string } }>(
    `/contracts/${contractId}`
  );
  invalidateSubscriptionCache();
  return { analysisId: start.analysisId, analysis, contract: contract.contract };
}

export async function runRiskDetection(
  contractId: string,
  country: CountryCode = 'CO',
  options?: {
    onProgress?: (progress: ProcessingProgress | undefined) => void;
  }
): Promise<AnalysisPayload> {
  // Desde el paso a Cloud Tasks, /risks responde 202 y el trabajo corre
  // aparte; el resultado se espera por el documento de Firestore.
  const start = await apiClient<{ analysisId: string; status: string }>('/risks', {
    method: 'POST',
    body: JSON.stringify({ contractId, country }),
  });

  const { analysis } = await waitForJob({
    collection: 'analyses',
    docId: start.analysisId,
    fetchViaApi: () => getAnalysisById(start.analysisId),
    onProgress: options?.onProgress,
    timeoutMessage:
      'La detección de riesgos está tardando más de lo habitual. Vuelve a intentarlo en unos minutos.',
  });

  const contract = await apiClient<{ contract: Contract & { id: string } }>(
    `/contracts/${contractId}`
  );
  invalidateSubscriptionCache();
  return { analysisId: start.analysisId, analysis, contract: contract.contract };
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
