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

export interface AdminUserRow {
  uid: string;
  email?: string;
  displayName?: string;
  planId: PlanSlug;
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
  billingProvider?: string;
  billingInterval?: string;
  subscriptionId?: string;
  subscriptionAmountInCents?: number;
  planGrantedBy?: string;
  createdAt?: string;
}

export interface ListaUsuarios {
  usuarios: AdminUserRow[];
  siguienteCursor?: string;
}

export type OrdenUsuarios = 'recientes' | 'vencimiento';

export function listUsers(params?: {
  plan?: PlanSlug;
  estado?: string;
  buscar?: string;
  orden?: OrdenUsuarios;
  limit?: number;
  cursor?: string;
}): Promise<ListaUsuarios> {
  const q = new URLSearchParams();
  if (params?.plan) q.set('plan', params.plan);
  if (params?.estado) q.set('estado', params.estado);
  if (params?.buscar) q.set('buscar', params.buscar);
  if (params?.orden) q.set('orden', params.orden);
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.cursor) q.set('cursor', params.cursor);
  const sufijo = q.toString() ? `?${q}` : '';
  return apiClient<ListaUsuarios>(`/admin/users${sufijo}`);
}

export interface IngresosResumen {
  desde: string;
  hasta: string;
  totalEnCentavos: number;
  moneda: string;
  pagos: number;
  clientes: number;
  porProveedor: Record<string, { pagos: number; totalEnCentavos: number }>;
  porIntervalo: Record<string, { pagos: number; totalEnCentavos: number }>;
  renovaciones: { pagos: number; totalEnCentavos: number };
  primeros: { pagos: number; totalEnCentavos: number };
}

export function fetchIngresos(desde: string, hasta: string): Promise<IngresosResumen> {
  const q = new URLSearchParams({ desde, hasta });
  return apiClient<IngresosResumen>(`/admin/ingresos?${q}`);
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
