import type {
  Comparison,
  Contract,
  CountryCode,
  ProcessingProgress,
} from '@clausum/shared';
import { invalidateSubscriptionCache } from '@/hooks/useSubscriptionSummary';
import { apiClient } from '@/services/api/client';
import { waitForJob } from '@/utils/wait-for-job';

export async function runComparison(
  contractIdA: string,
  contractIdB: string,
  country: CountryCode = 'CO',
  options?: {
    onProgress?: (progress: ProcessingProgress | undefined) => void;
  }
): Promise<{ comparisonId: string; comparison: Comparison }> {
  // Comparar es el trabajo más lento (dos documentos), así que /compare
  // responde 202 y el resultado se espera por Firestore.
  const start = await apiClient<{ comparisonId: string; status: string }>('/compare', {
    method: 'POST',
    body: JSON.stringify({ contractIdA, contractIdB, country }),
  });

  const comparison = await waitForJob({
    collection: 'comparisons',
    docId: start.comparisonId,
    fetchViaApi: () => getComparison(start.comparisonId),
    onProgress: options?.onProgress,
    timeoutMessage:
      'La comparación está tardando más de lo habitual. Vuelve a intentarlo en unos minutos.',
  });

  invalidateSubscriptionCache();
  return { comparisonId: start.comparisonId, comparison };
}

export async function getComparison(
  comparisonId: string
): Promise<Comparison & { id: string }> {
  const data = await apiClient<{ comparison: Comparison & { id: string } }>(
    `/comparisons/${comparisonId}`
  );
  return data.comparison;
}

export async function setComparisonReview(
  comparisonId: string,
  decision: 'approved' | 'discarded'
): Promise<Comparison & { id: string }> {
  const data = await apiClient<{ comparison: Comparison & { id: string } }>(
    `/comparisons/${comparisonId}/review`,
    {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }
  );
  return data.comparison;
}

export async function getContractsForComparison(
  contractIdA: string,
  contractIdB: string
): Promise<[Contract & { id: string }, Contract & { id: string }]> {
  const [a, b] = await Promise.all([
    apiClient<{ contract: Contract & { id: string } }>(`/contracts/${contractIdA}`),
    apiClient<{ contract: Contract & { id: string } }>(`/contracts/${contractIdB}`),
  ]);
  return [a.contract, b.contract];
}
