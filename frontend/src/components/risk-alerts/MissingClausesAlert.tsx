import type { RiskAlertsData } from '@/types/risk-alerts.types';

export function MissingClausesAlert({ data }: { data: RiskAlertsData }) {
  return (
    <div className="glass-panel rounded-2xl border border-red-100 bg-surface-container p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-on-surface">
          <span className="material-symbols-outlined text-red-600">
            notification_important
          </span>
          Cláusulas críticas ausentes
        </h2>
        <p className="mt-1 text-on-surface-variant">
          Elementos esenciales que no se encontraron en el borrador actual.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.missingClauses.map((clause) => (
          <div
            key={clause.id}
            className="rounded-xl border border-outline-variant bg-surface p-4 transition hover:shadow-soft"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">close</span>
              <span className="font-bold text-on-surface">{clause.title}</span>
            </div>
            <p className="text-sm text-on-surface-variant">{clause.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
