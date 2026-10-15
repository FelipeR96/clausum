import { Link } from 'react-router-dom';
import type { Contract } from '@clausum/shared';
import { contractToHistoryRow } from '@/utils/contract-history';
import type { ContractHistoryStatus } from '@/types/contract-history.types';

const STATUS_STYLES: Record<
  ContractHistoryStatus,
  { label: string; className: string; spinner?: boolean }
> = {
  completed: {
    label: 'Análisis completado',
    className: 'bg-primary-container/50 text-on-primary-container',
  },
  uploaded: {
    label: 'Cargado',
    className: 'bg-surface-container text-on-surface-variant',
  },
  risk: {
    label: 'Alerta crítica',
    className: 'bg-red-100 text-red-800',
  },
  scanning: {
    label: 'Analizando…',
    className: 'text-on-surface-variant',
    spinner: true,
  },
  error: {
    label: 'Error al analizar',
    className: 'bg-amber-100 text-amber-900',
  },
};

type RecentContractsProps = {
  contracts: Array<Contract & { id: string }>;
};

export function RecentContracts({ contracts }: RecentContractsProps) {
  const rows = contracts.map(contractToHistoryRow);

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface shadow-soft">
      <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container px-5 py-4">
        <h3 className="font-display text-lg font-bold">Cargas recientes</h3>
        <Link
          to="/panel/contratos"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Ver todo
        </Link>
      </div>

      <ul className="divide-y divide-outline-variant/40">
        {rows.length === 0 && (
          <li className="p-5 text-sm text-on-surface-variant">
            Aún no has cargado contratos. Sube el primero para verlo aquí.
          </li>
        )}
        {rows.map((contract) => {
          const status = STATUS_STYLES[contract.status];
          return (
            <li key={contract.id}>
              <Link
                to={`/panel/contratos/${contract.id}/resultado`}
                className="group flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-surface-container"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container">
                    <span className="material-symbols-outlined text-on-surface-variant">
                      description
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold group-hover:text-primary">
                      {contract.title}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <span>{contract.scannedAt}</span>
                      <span className="h-1 w-1 rounded-full bg-outline-variant" />
                      <span>{contract.type}</span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <div className="hidden flex-col items-end sm:flex">
                    <span className="text-[10px] uppercase tracking-wide text-on-surface-variant/70">
                      Estado
                    </span>
                    <span
                      className={`mt-1 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${status.className}`}
                    >
                      {status.spinner && (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      )}
                      {status.label}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant transition group-hover:translate-x-0.5 group-hover:text-primary">
                    chevron_right
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
