import type { SubscriptionSummary } from '@clausum/shared';
import type { PlanSlug } from '@clausum/shared';
import { apiClient } from '@/services/api/client';

export type MeResponse = {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  planId?: string;
  billingRegion?: 'CO' | 'LATAM';
  subscription: SubscriptionSummary;
};

export async function fetchMe(): Promise<MeResponse> {
  return apiClient<MeResponse>('/me');
}

export async function setDevPlan(planId: Extract<PlanSlug, 'free' | 'pro'>) {
  return apiClient<SubscriptionSummary & { message: string }>(
    '/dev/set-plan',
    {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }
  );
}
