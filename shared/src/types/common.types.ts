/** Valor de fecha en Firestore (Timestamp en runtime; Date al serializar). */
export type FirestoreDate = Date | { seconds: number; nanoseconds: number };

export type Locale = 'es' | 'en';

export type AnalysisMode = 'analyze' | 'compare' | 'risks';

export type ContractStatus =
  | 'draft'
  | 'uploaded'
  | 'processing'
  | 'analyzed'
  | 'error';

export type JobStatus = 'pending' | 'processing' | 'done' | 'error';

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'incomplete';

export type PaymentStatus = 'succeeded' | 'failed' | 'pending' | 'refunded';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertType =
  | 'risk_high'
  | 'risk_medium'
  | 'analysis_done'
  | 'subscription'
  | 'payment_failed';

export type RiskLevel = 'high' | 'medium' | 'low';

export type Importance = 'high' | 'medium' | 'low';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type HistoryAction =
  | 'contract.upload'
  | 'contract.delete'
  | 'analysis.complete'
  | 'comparison.complete'
  | 'subscription.upgrade'
  | 'subscription.cancel';

export type HistoryEntityType =
  | 'contract'
  | 'analysis'
  | 'comparison'
  | 'subscription';

export interface WithTimestamps {
  createdAt: FirestoreDate;
  updatedAt?: FirestoreDate;
}
