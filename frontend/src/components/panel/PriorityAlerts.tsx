import { Link } from 'react-router-dom';
import type { Alert } from '@clausum/shared';

type PriorityAlertsProps = {
  alerts: Array<Alert & { id: string }>;
};

export function PriorityAlerts({ alerts }: PriorityAlertsProps) {
  return (
    <div className="rounded-2xl border border-outline-variant/60 bg-surface p-5 shadow-soft">
      <div className="mb-5 flex items-center gap-2 text-red-700">
        <span className="material-symbols-outlined">report</span>
        <h3 className="font-display text-lg font-bold text-on-surface">
          Alertas prioritarias
        </h3>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 && (
          <p className="rounded-xl bg-surface-container p-4 text-sm text-on-surface-variant">
            No tienes alertas activas por ahora.
          </p>
        )}
        {alerts.map((alert) =>
          alert.severity === 'critical' ? (
            <div
              key={alert.id}
              className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-red-800">
                {alert.title}
              </p>
              <p className="mt-1 text-sm leading-snug text-red-900/80">
                {alert.message}
              </p>
              <Link
                to={alert.actionUrl ?? '/panel/contratos'}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:underline"
              >
                Ver detalle
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          ) : (
            <div
              key={alert.id}
              className="rounded-xl border-l-4 border-primary bg-surface-container p-4"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                {alert.title}
              </p>
              <p className="mt-1 text-sm leading-snug text-on-surface-variant">
                {alert.message}
              </p>
              <Link
                to={alert.actionUrl ?? '/panel/contratos'}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                Ver detalle
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          )
        )}
      </div>
    </div>
  );
}
