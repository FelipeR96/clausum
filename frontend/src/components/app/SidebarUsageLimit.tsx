import { useEffect, useState } from 'react';
import { listContracts } from '@/services/contracts.service';
import { useSubscriptionSummary } from '@/hooks/useSubscriptionSummary';

function formatLimit(limit: number): string {
  return limit < 0 ? '∞' : String(limit);
}

export function SidebarUsageLimit() {
  const subscription = useSubscriptionSummary();
  const [contractsTotal, setContractsTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listContracts()
      .then((contracts) => {
        if (cancelled) return;
        setContractsTotal(contracts.length);
      })
      .catch(() => {
        if (!cancelled) setContractsTotal(0);
      });
    return () => {
      cancelled = true;
    };
  }, [subscription?.usage.analysesCount, subscription?.usage.comparisonsCount]);

  const analysesUsed = subscription?.usage.analysesCount ?? 0;
  const analysesLimit = subscription?.usage.analysesLimit ?? 0;
  const contractsLimit = subscription?.entitlements.maxContracts ?? 0;
  const analysisPct =
    analysesLimit < 0
      ? 100
      : Math.min(100, Math.round((analysesUsed / Math.max(analysesLimit, 1)) * 100));

  return (
    <div className="mt-4 rounded-2xl border border-outline-variant/40 bg-surface-container p-4">
      <p className="text-xs font-semibold text-on-surface-variant">Límite de uso</p>
      <p className="mt-1 text-[10px] text-on-surface-variant/80">Análisis este mes</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-outline-variant/40">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${analysisPct}%` }}
        />
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
        {analysesUsed} / {formatLimit(analysesLimit)} análisis · {contractsTotal}/
        {formatLimit(contractsLimit)}{' '}
        contratos
      </p>
    </div>
  );
}
