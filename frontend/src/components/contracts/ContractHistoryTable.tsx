import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  ContractHistoryRow,
  ContractHistoryStatus,
  ContractRiskLevel,
} from '@/types/contract-history.types';

const STATUS_META: Record<
  ContractHistoryStatus,
  { label: string; className: string; dot?: string; spinner?: boolean }
> = {
  completed: {
    label: 'Completado',
    className: 'bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  uploaded: {
    label: 'Cargado',
    className: 'bg-surface-container text-on-surface-variant',
    dot: 'bg-outline',
  },
  risk: {
    label: 'Riesgo detectado',
    className: 'bg-red-50 text-red-800',
    dot: 'bg-red-500',
  },
  scanning: {
    label: 'Analizando…',
    className: 'bg-primary-container/40 text-on-primary-container italic',
    spinner: true,
  },
  error: {
    label: 'Error al analizar',
    className: 'bg-amber-50 text-amber-900',
    dot: 'bg-amber-500',
  },
};

const RISK_LABEL: Record<NonNullable<ContractRiskLevel>, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
};

function RiskCell({ risk }: { risk: ContractRiskLevel }) {
  if (!risk) return <span className="text-sm text-on-surface-variant">—</span>;
  const colors = {
    low: 'text-on-surface-variant font-medium',
    medium: 'text-primary font-bold',
    high: 'text-red-600 font-bold',
  };
  return <span className={`text-sm ${colors[risk]}`}>{RISK_LABEL[risk]}</span>;
}

function RowIcon({ status }: { status: ContractHistoryStatus }) {
  if (status === 'error') {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
        <span className="material-symbols-outlined text-amber-700">error</span>
      </span>
    );
  }
  if (status === 'risk') {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
        <span className="material-symbols-outlined text-red-600">assignment_late</span>
      </span>
    );
  }
  if (status === 'scanning') {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container">
        <span className="material-symbols-outlined animate-pulse text-primary">sync</span>
      </span>
    );
  }
  if (status === 'uploaded') {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container">
        <span className="material-symbols-outlined text-on-surface-variant">upload_file</span>
      </span>
    );
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
      <span className="material-symbols-outlined text-primary">description</span>
    </span>
  );
}

type ContractHistoryTableProps = {
  rows: ContractHistoryRow[];
  total: number;
  historyLimit?: number;
  analyzingContractId?: string | null;
  riskGeneratingContractId?: string | null;
  deletingContractId?: string | null;
  onAnalyzeContract?: (contractId: string) => void;
  onRiskProfileContract?: (contractId: string) => void;
  onDeleteContract?: (row: ContractHistoryRow) => void;
};

type MenuState = {
  row: ContractHistoryRow;
  top: number;
  right: number;
};

export function ContractHistoryTable({
  rows,
  total,
  historyLimit = 10,
  analyzingContractId,
  riskGeneratingContractId,
  deletingContractId,
  onAnalyzeContract,
  onRiskProfileContract,
  onDeleteContract,
}: ContractHistoryTableProps) {
  const [menu, setMenu] = useState<MenuState | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('click', close);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);

    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  const openActionsMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    row: ContractHistoryRow
  ) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = 196;
    const preferredTop = rect.bottom + 8;
    setMenu({
      row,
      top: Math.min(preferredTop, window.innerHeight - menuHeight - 12),
      right: Math.max(12, window.innerWidth - rect.right),
    });
  };

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container/50">
                {[
                  'Nombre del contrato',
                  'Tipo',
                  'Fecha',
                  'Estado',
                  'Nivel de riesgo',
                  'Acciones',
                ].map((col) => (
                  <th
                    key={col}
                    className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-on-surface-variant"
                  >
                    No hay contratos que coincidan con tu búsqueda.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const status = STATUS_META[row.status];
                  return (
                    <tr
                      key={row.id}
                      className="contract-history-row group transition hover:bg-surface-container/60"
                    >
                      <td className="px-5 py-4">
                        <Link
                          to={`/panel/contratos/${row.id}/resultado`}
                          className="flex items-center gap-3"
                        >
                          <RowIcon status={row.status} />
                          <div>
                            <p className="font-semibold text-on-surface group-hover:text-primary">
                              {row.title}
                            </p>
                            <p className="text-xs text-on-surface-variant">ID: {row.id}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">{row.type}</td>
                      <td className="px-5 py-4 text-sm text-on-surface-variant">
                        {row.scannedAt}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${status.className}`}
                        >
                          {status.spinner ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          ) : (
                            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          )}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <RiskCell risk={row.risk} />
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={(event) => openActionsMenu(event, row)}
                          className="contract-row-action flex rounded-full p-2 opacity-0 transition hover:bg-surface-container group-hover:opacity-100"
                          aria-label="Más acciones"
                          aria-expanded={menu?.row.id === row.id}
                        >
                          <span className="material-symbols-outlined text-on-surface-variant">
                            more_vert
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-outline-variant/60 bg-surface-container/30 px-5 py-4 sm:flex-row">
          <p className="text-sm text-on-surface-variant">
            Mostrando 1–{rows.length} de {total} contratos
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="rounded-lg border border-outline-variant p-2 opacity-40"
              aria-label="Página anterior"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-on-primary"
            >
              1
            </button>
            <button
              type="button"
              disabled
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant text-sm text-on-surface-variant opacity-40"
            >
              2
            </button>
            <button
              type="button"
              disabled
              className="rounded-lg border border-outline-variant p-2 opacity-40"
              aria-label="Página siguiente"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        <p className="border-t border-outline-variant/40 px-5 py-3 text-xs text-on-surface-variant">
          Historial limitado a {historyLimit} entradas en plan Free. Pro incluye historial completo.
        </p>
      </section>

      {menu && (
        <div
          className="fixed z-50 w-56 overflow-hidden rounded-xl border border-outline-variant bg-surface p-1 text-sm shadow-card"
          style={{ top: menu.top, right: menu.right }}
          onClick={(event) => event.stopPropagation()}
        >
          {menu.row.status === 'uploaded' ? (
            <button
              type="button"
              onClick={() => {
                onAnalyzeContract?.(menu.row.id);
                setMenu(null);
              }}
              disabled={!onAnalyzeContract || analyzingContractId === menu.row.id}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-on-surface transition hover:bg-surface-container disabled:cursor-wait disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">search_insights</span>
              {analyzingContractId === menu.row.id ? 'Analizando…' : 'Analizar ahora'}
            </button>
          ) : (
            <Link
              to={`/panel/contratos/${menu.row.id}/resultado`}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-on-surface transition hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-base">analytics</span>
              Ver análisis
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              onRiskProfileContract?.(menu.row.id);
              setMenu(null);
            }}
            disabled={
              !onRiskProfileContract ||
              menu.row.status === 'scanning' ||
              riskGeneratingContractId === menu.row.id
            }
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-on-surface transition hover:bg-surface-container disabled:cursor-wait disabled:text-on-surface-variant/50 disabled:hover:bg-transparent"
          >
            <span className="material-symbols-outlined text-base">shield</span>
            {riskGeneratingContractId === menu.row.id
              ? 'Generando perfil…'
              : menu.row.status === 'uploaded'
                ? 'Generar perfil de riesgo'
                : 'Perfil de riesgo'}
          </button>

          <Link
            to={`/panel/contratos/${menu.row.id}/comparar`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-on-surface transition hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-base">compare_arrows</span>
            Comparar contrato
          </Link>

          <div className="my-1 border-t border-outline-variant" />

          <button
            type="button"
            onClick={() => {
              onDeleteContract?.(menu.row);
              setMenu(null);
            }}
            disabled={!onDeleteContract || deletingContractId === menu.row.id}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            {deletingContractId === menu.row.id ? 'Eliminando…' : 'Eliminar contrato'}
          </button>
        </div>
      )}
    </>
  );
}
