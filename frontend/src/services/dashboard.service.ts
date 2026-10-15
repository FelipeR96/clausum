import { apiClient } from '@/services/api/client';
import type { DashboardSummary } from '@/types/dashboard.types';

export async function fetchDashboard(): Promise<DashboardSummary> {
  return apiClient<DashboardSummary>('/dashboard');
}
