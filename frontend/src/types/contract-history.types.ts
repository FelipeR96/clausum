import type { CountryCode } from '@clausum/shared';

export type ContractHistoryStatus =
  | 'completed'
  | 'uploaded'
  | 'scanning'
  | 'risk'
  | 'error';
export type ContractRiskLevel = 'low' | 'medium' | 'high' | null;

export type ContractHistoryRow = {
  id: string;
  title: string;
  type: string;
  scannedAt: string;
  /** Timestamp para filtros por rango de fechas */
  createdAtMs?: number;
  status: ContractHistoryStatus;
  risk: ContractRiskLevel;
  country?: CountryCode;
};
