import type { Alert, Analysis, Contract, User } from '@clausum/shared';
import { COLLECTIONS, USER_SUBCOLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { listUserContracts } from './contract.service';
import { getSubscriptionSummary } from './subscription.service';

type TimestampLike = { toDate?: () => Date; seconds?: number; _seconds?: number };

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    const ts = value as TimestampLike;
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
    if (typeof ts._seconds === 'number') return new Date(ts._seconds * 1000);
  }
  return null;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');
}

function buildSixMonthBuckets() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: monthKey(date),
      month: monthLabel(date),
      analyses: 0,
    };
  });
}

export async function getDashboardSummary(userId: string) {
  const [subscription, userDoc, contracts, alertsSnap, analysesSnap] = await Promise.all([
    getSubscriptionSummary(userId),
    adminDb().collection(COLLECTIONS.users).doc(userId).get(),
    listUserContracts(userId, 100),
    adminDb()
      .collection(COLLECTIONS.alerts)
      .where('userId', '==', userId)
      .where('read', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get(),
    adminDb()
      .collection(COLLECTIONS.analyses)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get(),
  ]);

  const user = userDoc.exists ? (userDoc.data() as User) : undefined;
  const activeAlerts = alertsSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Alert),
  }));
  const recentContracts = [...contracts]
    .sort((a, b) => {
      const aDate = toDate(a.createdAt)?.getTime() ?? 0;
      const bDate = toDate(b.createdAt)?.getTime() ?? 0;
      return bDate - aDate;
    })
    .slice(0, 5);

  const buckets = buildSixMonthBuckets();
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const doc of analysesSnap.docs) {
    const analysis = doc.data() as Analysis;
    if (analysis.status !== 'done') continue;
    if (analysis.mode !== 'analyze' && analysis.mode !== 'risks') continue;
    const createdAt = toDate(analysis.createdAt);
    if (!createdAt) continue;
    const bucket = bucketByKey.get(monthKey(createdAt));
    if (bucket) bucket.analyses += 1;
  }

  const usageSnap = await adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .collection(USER_SUBCOLLECTIONS.usage)
    .get();

  for (const doc of usageSnap.docs) {
    const bucket = bucketByKey.get(doc.id);
    if (!bucket) continue;
    const analysesCount = (doc.data()?.analysesCount as number) ?? 0;
    bucket.analyses = Math.max(bucket.analyses, analysesCount);
  }

  const highRiskContracts = contracts.filter(
    (contract) => contract.riskScore != null && contract.riskScore >= 65
  ).length;

  return {
    user: {
      displayName: user?.displayName,
      email: user?.email,
    },
    subscription,
    stats: {
      contractsTotal: contracts.length,
      highRiskContracts,
      activeAlerts: activeAlerts.length,
    },
    recentContracts: recentContracts satisfies Array<Contract & { id: string }>,
    activeAlerts,
    usageByMonth: buckets,
  };
}
