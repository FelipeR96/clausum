import type { AlertSeverity, AlertType, FirestoreDate } from './common.types';

export interface Alert {
  userId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  contractId?: string;
  analysisId?: string;
  comparisonId?: string;
  read: boolean;
  readAt?: FirestoreDate;
  actionUrl?: string;
  expiresAt?: FirestoreDate;
  createdAt: FirestoreDate;
}
