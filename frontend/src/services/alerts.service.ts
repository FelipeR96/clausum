import type { Alert } from '@clausum/shared';
import { apiClient } from '@/services/api/client';

export async function fetchAlerts(limit = 20): Promise<{
  alerts: Array<Alert & { id: string }>;
  unreadCount: number;
}> {
  return apiClient(`/alerts?limit=${limit}`);
}

export async function markAlertAsRead(
  alertId: string
): Promise<Alert & { id: string }> {
  const data = await apiClient<{ alert: Alert & { id: string } }>(
    `/alerts/${alertId}/read`,
    { method: 'POST' }
  );
  return data.alert;
}

export async function markAllAlertsAsRead(): Promise<number> {
  const data = await apiClient<{ updated: number }>('/alerts/read-all', {
    method: 'POST',
  });
  return data.updated;
}
