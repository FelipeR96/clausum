import { esIlimitado } from '@clausum/shared';

type ContractHistoryStatsProps = {
  contractsTotal: number;
  contractsLimit: number;
  highRiskCount: number;
  historyLimit: number;
  planName: string;
};

export function ContractHistoryStats({
  contractsTotal,
  contractsLimit,
  highRiskCount,
  historyLimit,
  planName,
}: ContractHistoryStatsProps) {
  return (
    <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-outline-variant/60 bg-surface/80 p-6 shadow-soft backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
          Total analizados
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="font-display text-3xl font-bold">{contractsTotal}</p>
          <span className="text-sm font-medium text-primary">
            {esIlimitado(contractsLimit)
              ? 'sin límite'
              : `de ${contractsLimit} en ${planName}`}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant/60 border-l-4 border-l-red-500 bg-surface/80 p-6 shadow-soft backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
          Riesgo alto
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="font-display text-3xl font-bold">{highRiskCount}</p>
          <span className="text-sm text-on-surface-variant">Requiere revisión</span>
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant/60 border-l-4 border-l-primary bg-surface/80 p-6 shadow-soft backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
          Historial guardado
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="font-display text-3xl font-bold">{contractsTotal}</p>
          <span className="text-sm text-on-surface-variant">
            {esIlimitado(historyLimit)
              ? 'sin límite'
              : `máx. ${historyLimit} en ${planName}`}
          </span>
        </div>
      </div>
    </section>
  );
}
