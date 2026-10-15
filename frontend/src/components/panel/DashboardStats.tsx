import type { DashboardSummary } from '@/types/dashboard.types';

type DashboardStatCard = {
  key: string;
  icon: string;
  iconClass: string;
  label: string;
  value: number;
  suffix: string;
  limit?: number;
};

type DashboardStatsProps = {
  dashboard: DashboardSummary;
};

function formatLimit(limit: number): string {
  return limit < 0 ? '∞' : String(limit);
}

function formatRemaining(remaining: number | null, noun: string): string {
  if (remaining === null) return `${noun} ilimitados`;
  return `${remaining} restante${remaining === 1 ? '' : 's'}`;
}

export function DashboardStats({ dashboard }: DashboardStatsProps) {
  const { usage, entitlements } = dashboard.subscription;
  const cards: DashboardStatCard[] = [
    {
      key: 'contracts',
      icon: 'description',
      iconClass: 'text-primary',
      label: 'Contratos',
      value: dashboard.stats.contractsTotal,
      limit: entitlements.maxContracts,
      suffix: `de ${formatLimit(entitlements.maxContracts)} en ${dashboard.subscription.planName}`,
    },
    {
      key: 'analyses',
      icon: 'psychology',
      iconClass: 'text-primary',
      label: 'Análisis usados',
      value: usage.analysesCount,
      limit: usage.analysesLimit,
      suffix: formatRemaining(usage.analysesRemaining, 'Análisis'),
    },
    {
      key: 'comparisons',
      icon: 'compare_arrows',
      iconClass: 'text-primary',
      label: 'Comparaciones usadas',
      value: usage.comparisonsCount,
      limit: usage.comparisonsLimit,
      suffix: formatRemaining(usage.comparisonsRemaining, 'Comparaciones'),
    },
    {
      key: 'alerts',
      icon: 'notifications_active',
      iconClass: 'text-red-600',
      label: 'Alertas activas',
      value: dashboard.stats.activeAlerts,
      suffix: entitlements.alertsAdvanced ? 'Alertas avanzadas' : 'Alertas básicas',
    },
  ];

  return (
    <div className="dashboard-bento-grid">
      {cards.map((card) => {
        const limitLabel = card.limit == null ? null : formatLimit(card.limit);
        return (
          <div
            key={card.key}
            className="col-span-12 rounded-2xl border border-outline-variant/60 bg-surface p-5 shadow-soft sm:col-span-6 lg:col-span-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {card.label}
              </span>
              <span className={`material-symbols-outlined ${card.iconClass}`}>
                {card.icon}
              </span>
            </div>
            <p className="font-display text-3xl font-bold text-on-surface">
              {card.value}
              {limitLabel && (
                <span className="text-lg font-normal text-on-surface-variant">
                  /{limitLabel}
                </span>
              )}
            </p>
            <p className="mt-2 text-xs text-on-surface-variant">{card.suffix}</p>
          </div>
        );
      })}
    </div>
  );
}
