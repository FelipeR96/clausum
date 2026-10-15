import type {
  FirestoreDate,
  SubscriptionStatus,
  WithTimestamps,
} from './common.types';
import type { PlanSlug } from './plan.types';

export interface Subscription extends WithTimestamps {
  userId: string;
  planId: PlanSlug;
  paypalSubscriptionId?: string;
  status: SubscriptionStatus;
  currentPeriodStart?: FirestoreDate;
  currentPeriodEnd?: FirestoreDate;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: FirestoreDate;
  trialEnd?: FirestoreDate;
}
