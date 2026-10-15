import { Link } from 'react-router-dom';
import type { RiskAlertsData } from '@/types/risk-alerts.types';

type RiskExposureOverviewProps = {
  data: RiskAlertsData;
  contractId: string;
};

function exposureMeta(data: RiskAlertsData): {
  label: string;
  hint: string;
  barClass: string;
  textClass: string;
  percent: number;
} {
  const { high, medium } = data.severityCounts;
  const exposure =
    data.safetyScore != null ? Math.max(0, Math.min(100, 100 - data.safetyScore)) : null;

  if (high >= 2 || (exposure != null && exposure >= 65)) {
    return {
      label: 'Exposición alta',
      hint: 'Varias cláusulas requieren negociación antes de firmar.',
      barClass: 'bg-red-500',
      textClass: 'text-red-700',
      percent: exposure ?? 78,
    };
  }
  if (high >= 1 || medium >= 2 || (exposure != null && exposure >= 35)) {
    return {
      label: 'Exposición moderada',
      hint: 'Conviene revisar los puntos críticos con tu contraparte.',
      barClass: 'bg-amber-500',
      textClass: 'text-amber-800',
      percent: exposure ?? 48,
    };
  }
  return {
    label: 'Exposición controlada',
    hint: 'Riesgos detectados son manejables con ajustes puntuales.',
    barClass: 'bg-primary',
    textClass: 'text-primary',
    percent: exposure ?? 22,
  };
}

export function RiskExposureOverview({ data, contractId }: RiskExposureOverviewProps) {
  const exposure = exposureMeta(data);
  const priorities = [...data.risks]
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1))
    .slice(0, 3);
  const lawRefs = new Set(
    data.risks.map((risk) => risk.lawRef).filter((ref): ref is string => Boolean(ref))
  );

  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-on-surface">
            <span className="material-symbols-outlined text-primary">shield</span>
            Resumen de exposición
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Vista ejecutiva para decidir qué negociar primero en este contrato.
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-outline-variant/60 bg-surface-container px-5 py-4 text-center">
          <p className={`text-xs font-bold uppercase tracking-widest ${exposure.textClass}`}>
            {exposure.label}
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-on-surface">
            {exposure.percent}%
          </p>
          <p className="text-[10px] text-on-surface-variant">índice de exposición</p>
        </div>
      </div>

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-outline-variant/30">
        <div
          className={`h-full rounded-full transition-all ${exposure.barClass}`}
          style={{ width: `${exposure.percent}%` }}
        />
      </div>
      <p className="mb-6 text-sm leading-relaxed text-on-surface-variant">{exposure.hint}</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-red-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-red-800">
            Críticos
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-red-700">
            {String(data.severityCounts.high).padStart(2, '0')}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
            Moderados
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-amber-700">
            {String(data.severityCounts.medium).padStart(2, '0')}
          </p>
        </div>
        <div className="col-span-2 rounded-xl bg-primary-container/30 px-4 py-3 sm:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-on-primary-container">
            Con ley
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-primary">
            {String(lawRefs.size).padStart(2, '0')}
          </p>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-bold text-on-surface">Prioridades de negociación</h3>
        {priorities.length === 0 ? (
          <p className="mt-3 text-sm text-on-surface-variant">
            No hay alertas prioritarias en este contrato.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {priorities.map((risk, index) => (
              <li
                key={risk.id}
                className="flex gap-3 rounded-xl border border-outline-variant/60 bg-surface p-3"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    risk.severity === 'high'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    {risk.section}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-on-surface">{risk.title}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        to={`/panel/contratos/${contractId}/resultado`}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        Ver análisis general del contrato
        <span className="material-symbols-outlined text-base">arrow_forward</span>
      </Link>
    </div>
  );
}
