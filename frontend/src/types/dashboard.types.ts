import type { Alert, Contract, SubscriptionSummary } from '@clausum/shared';

export type DashboardMonthlyUsage = {
  key: string;
  month: string;
  analyses: number;
};

export type DashboardSummary = {
  user: {
    displayName?: string;
    email?: string;
  };
  subscription: SubscriptionSummary;
  stats: {
    contractsTotal: number;
    highRiskContracts: number;
    activeAlerts: number;
  };
  recentContracts: Array<Contract & { id: string }>;
  activeAlerts: Array<Alert & { id: string }>;
  usageByMonth: DashboardMonthlyUsage[];
};
