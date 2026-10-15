import type {
  FirestoreDate,
  Locale,
  SubscriptionStatus,
  WithTimestamps,
} from './common.types';
import type { PlanSlug } from './plan.types';
import type { BillingRegion } from '../constants/billing';

export type LandingSource = 'analyze' | 'compare' | 'risks' | 'home';

export interface User extends WithTimestamps {
  email: string;
  displayName?: string;
  photoURL?: string;
  planId: PlanSlug;
  locale?: Locale;
  /** Región de facturación: Colombia (Wompi/COP) o resto LATAM (PayPal/USD). */
  billingRegion?: BillingRegion;
  onboardingCompleted?: boolean;
  subscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
  /** Fin del periodo de suscripción activo. */
  currentPeriodEnd?: FirestoreDate;
  /** Proveedor de pago activo (Wompi Colombia, PayPal LATAM). */
  billingProvider?: 'wompi' | 'paypal';
  /** Fuente de pago Wompi para renovaciones automáticas (tarjeta tokenizada). */
  wompiPaymentSourceId?: number;
  /** Intervalo de facturación Wompi activo. */
  wompiBillingInterval?: 'monthly' | 'annual';
  /** Último intento de renovación automática Wompi. */
  wompiLastRenewalAttemptAt?: FirestoreDate;
  /** El usuario canceló renovación pero conserva Pro hasta currentPeriodEnd. */
  cancelAtPeriodEnd?: boolean;
  canceledAt?: FirestoreDate;
  landingSource?: LandingSource;
  deletedAt?: FirestoreDate;
}

export interface UserUsage {
  period: string;
  analysesCount: number;
  comparisonsCount: number;
  storageBytes: number;
  updatedAt: FirestoreDate;
}

export interface UserSettings {
  emailNotifications: boolean;
  riskThreshold: 'low' | 'medium' | 'high';
  defaultAnalysisMode: 'analyze' | 'compare' | 'risks';
  theme: 'light' | 'dark' | 'system';
  updatedAt?: FirestoreDate;
}
