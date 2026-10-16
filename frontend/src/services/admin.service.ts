import { apiClient } from '@/services/api/client';

export type PlanSlug = 'free' | 'pro';

export interface AdminUserView {
  uid: string;
  email?: string;
  displayName?: string;
  disabled: boolean;
  createdAt?: string;
  lastSignInAt?: string;
  isAdmin: boolean;
  planId: PlanSlug;
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
  billingProvider?: string;
  subscriptionAmountInCents?: number;
  /** Presente solo si el plan lo concedió un administrador, no un pago. */
  planGrantedBy?: string;
}

export interface RegionPricing {
  monthlyAmountInCents: number;
  yearlyAmountInCents: number;
  currency: string;
}

export interface Pricing {
  CO: RegionPricing;
  LATAM: RegionPricing;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PlanLimits {
  analysesPerMonth: number;
  comparisonsPerMonth: number;
  maxFileSizeMb: number;
  maxContracts: number;
  historyMaxEntries: number;
  exportPdf: boolean;
  fullHistory: boolean;
  alertsAdvanced: boolean;
  apiAccess: boolean;
  ocrScannedPdf: boolean;
}

export function findUser(email: string): Promise<AdminUserView> {
  return apiClient<AdminUserView>(`/admin/users?email=${encodeURIComponent(email)}`);
}

export function setUserPlan(
  uid: string,
  planId: PlanSlug,
  days?: number
): Promise<AdminUserView> {
  return apiClient<AdminUserView>(`/admin/users/${uid}/plan`, {
    method: 'POST',
    body: JSON.stringify(days ? { planId, days } : { planId }),
  });
}

export function fetchAdminPricing(): Promise<Pricing> {
  return apiClient<Pricing>('/admin/pricing');
}

export function savePricing(
  pricing: Pick<Pricing, 'CO' | 'LATAM'>
): Promise<Pricing & { message: string }> {
  return apiClient<Pricing & { message: string }>('/admin/pricing', {
    method: 'PUT',
    body: JSON.stringify(pricing),
  });
}

export function fetchPlan(
  slug: PlanSlug
): Promise<{ slug: PlanSlug; limits: PlanLimits; name?: string }> {
  return apiClient(`/admin/plans/${slug}`);
}

export function savePlanLimits(
  slug: PlanSlug,
  limits: Partial<PlanLimits>
): Promise<{ slug: PlanSlug; limits: PlanLimits }> {
  return apiClient(`/admin/plans/${slug}/limits`, {
    method: 'PUT',
    body: JSON.stringify(limits),
  });
}
