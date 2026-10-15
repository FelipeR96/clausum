import type { Comparison, Contract, CountryCode } from '@clausum/shared';
import { invalidateSubscriptionCache } from '@/hooks/useSubscriptionSummary';
import { apiClient } from '@/services/api/client';

export async function runComparison(
  contractIdA: string,
  contractIdB: string,
  country: CountryCode = 'CO'
): Promise<{ comparisonId: string; comparison: Comparison }> {
  const result = await apiClient<{ comparisonId: string; comparison: Comparison }>('/compare', {
    method: 'POST',
    body: JSON.stringify({ contractIdA, contractIdB, country }),
  });
  invalidateSubscriptionCache();
  return result;
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
