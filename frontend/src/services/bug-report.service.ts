import { apiClient } from '@/services/api/client';

export type BugReportEstado = 'abierto' | 'resuelto';

export interface BugReport {
  id: string;
  userId: string;
  email?: string;
  planId: string;
  descripcion: string;
  ruta?: string;
  userAgent?: string;
  estado: BugReportEstado;
  createdAt?: string;
  resueltoPor?: string;
  resueltoAt?: string;
}

export function reportarBug(descripcion: string, ruta?: string): Promise<{ id: string }> {
  return apiClient<{ id: string }>('/bugs', {
    method: 'POST',
    body: JSON.stringify({ descripcion, ruta }),
  });
}

export function listarBugs(
  estado?: BugReportEstado
): Promise<{ reportes: BugReport[] }> {
  const q = estado ? `?estado=${estado}` : '';
  return apiClient<{ reportes: BugReport[] }>(`/admin/bugs${q}`);
}

export function cambiarEstadoBug(
  id: string,
  estado: BugReportEstado
): Promise<{ ok: boolean }> {
  return apiClient<{ ok: boolean }>(`/admin/bugs/${id}/estado`, {
    method: 'POST',
    body: JSON.stringify({ estado }),
  });
}
