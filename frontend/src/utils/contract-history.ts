import type { Contract, ContractStatus, FirestoreDate } from '@clausum/shared';
import { CONTRACT_TYPE_CATALOG } from '@clausum/shared';
import type {
  ContractHistoryRow,
  ContractHistoryStatus,
  ContractRiskLevel,
} from '@/types/contract-history.types';

export type DateRangeFilter = 'all' | '7d' | '30d' | '90d';

const DATE_RANGE_LABELS: Record<DateRangeFilter, string> = {
  all: 'Todo el historial',
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
};

export function dateRangeLabel(range: DateRangeFilter): string {
  return DATE_RANGE_LABELS[range];
}

export const DATE_RANGE_OPTIONS: DateRangeFilter[] = ['all', '7d', '30d', '90d'];

function toDate(value: FirestoreDate | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'seconds' in value) {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === 'object' && '_seconds' in value) {
    return new Date((value as { _seconds: number })._seconds * 1000);
  }
  return null;
}

function formatRelativeDate(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Hace unos minutos';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function mapStatus(status: ContractStatus, risk: ContractRiskLevel): ContractHistoryStatus {
  if (status === 'processing') return 'scanning';
  if (status === 'error') return 'error';
  if (risk === 'high') return 'risk';
  if (status === 'uploaded' || status === 'draft') return 'uploaded';
  return 'completed';
}

function mapRisk(riskScore: number | undefined, status: ContractStatus): ContractRiskLevel {
  if (
    status === 'processing' ||
    status === 'uploaded' ||
    status === 'draft' ||
    status === 'error'
  ) {
    return null;
  }
  if (riskScore == null) return null;
  if (riskScore >= 65) return 'high';
  if (riskScore >= 35) return 'medium';
  return 'low';
}

function mapContractType(contract: Contract): string {
  const typeId = contract.detectedContractTypeId ?? contract.contractTypeId;
  if (!typeId) return 'Sin clasificar';
  const fromCatalog = CONTRACT_TYPE_CATALOG.find((ct) => ct.id === typeId);
  return fromCatalog?.name ?? typeId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function contractToHistoryRow(contract: Contract & { id: string }): ContractHistoryRow {
  const created = toDate(contract.createdAt) ?? new Date();
  const risk = mapRisk(contract.riskScore, contract.status);

  return {
    id: contract.id,
    title: contract.title,
    type: mapContractType(contract),
    scannedAt: formatRelativeDate(created),
    createdAtMs: created.getTime(),
    status: mapStatus(contract.status, risk),
    risk,
    country: contract.country ?? 'CO',
  };
}

export function matchesDateRange(createdAtMs: number, range: DateRangeFilter): boolean {
  if (range === 'all') return true;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return createdAtMs >= cutoff;
}
