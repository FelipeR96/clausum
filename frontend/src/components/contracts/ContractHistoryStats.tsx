type ContractHistoryStatsProps = {
  contractsTotal: number;
  contractsLimit: number;
  highRiskCount: number;
  historyLimit: number;
};

export function ContractHistoryStats({
  contractsTotal,
  contractsLimit,
  highRiskCount,
  historyLimit,
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
            de {contractsLimit} en Free
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
            máx. {historyLimit} en Free
          </span>
        </div>
      </div>
    </section>
  );
}
