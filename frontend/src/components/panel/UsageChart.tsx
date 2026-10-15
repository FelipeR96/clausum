import type { DashboardMonthlyUsage } from '@/types/dashboard.types';

type UsageChartProps = {
  usageByMonth: DashboardMonthlyUsage[];
  analysesLimit: number;
};

const CHART_HEIGHT_PX = 120;

function formatLimit(limit: number): string {
  return limit < 0 ? 'ilimitado' : `máx. ${limit}/mes`;
}

function barHeightPx(analyses: number, max: number): number {
  if (analyses <= 0) return 3;
  return Math.max(8, Math.round((analyses / max) * CHART_HEIGHT_PX));
}

export function UsageChart({ usageByMonth, analysesLimit }: UsageChartProps) {
  const months = usageByMonth.length > 0 ? usageByMonth : [];
  const max = Math.max(...months.map((m) => m.analyses), 1);
  const currentTotal = months.at(-1)?.analyses ?? 0;

  return (
    <div className="flex h-64 flex-col rounded-2xl border border-outline-variant/60 bg-surface p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display font-bold text-on-surface">Uso mensual</h3>
        <span className="text-xs font-semibold text-primary">Últimos 6 meses</span>
      </div>

      <div
        className="flex flex-1 items-end gap-2 px-1"
        style={{ minHeight: CHART_HEIGHT_PX }}
      >
        {months.map((month, index) => {
          const heightPx = barHeightPx(month.analyses, max);
          const isCurrent = index === months.length - 1;
          return (
            <div
              key={month.key}
              className="flex flex-1 flex-col items-center justify-end"
              style={{ height: CHART_HEIGHT_PX }}
            >
              <div
                className={`w-full rounded-t-md transition hover:opacity-90 ${
                  isCurrent ? 'bg-primary' : 'bg-primary-container'
                } ${month.analyses > 0 ? 'opacity-100' : 'opacity-40'}`}
                style={{ height: heightPx }}
                title={`${month.month}: ${month.analyses} análisis`}
                aria-label={`${month.month}: ${month.analyses} análisis`}
              />
              <span className="mt-2 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                {month.month}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-on-surface-variant">
        Análisis ejecutados por mes ({formatLimit(analysesLimit)})
        {currentTotal > 0 && (
          <span className="font-semibold text-on-surface">
            {' '}
            · Este mes: {currentTotal}
          </span>
        )}
      </p>
    </div>
  );
}
