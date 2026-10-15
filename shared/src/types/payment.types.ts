import type {
  FirestoreDate,
  PaymentStatus,
} from './common.types';
import type { PlanSlug } from './plan.types';
import type { BillingInterval } from '../constants/billing';

export type PaymentProvider = 'wompi' | 'paypal';

export interface Payment {
  userId: string;
  provider?: PaymentProvider;
  reference?: string;
  wompiTransactionId?: string;
  paypalSubscriptionId?: string;
  paypalSaleId?: string;
  billingInterval?: BillingInterval;
  amount: number;
  currency: string;
  status: PaymentStatus;
  planId?: PlanSlug;
  description?: string;
  receiptUrl?: string;
  failureCode?: string;
  createdAt: FirestoreDate;
  paidAt?: FirestoreDate;
}
