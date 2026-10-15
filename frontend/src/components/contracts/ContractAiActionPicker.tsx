import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Contract } from '@clausum/shared';
import {
  ContractActionDialog,
  type ContractActionIntent,
} from '@/components/panel/ContractActionDialog';
import { QuotaLimitCard } from '@/components/billing/QuotaLimitCard';
import { RiskProfileProGate } from '@/components/billing/RiskProfileProGate';
import { listContracts } from '@/services/contracts.service';
import { runAnalysis } from '@/services/analysis.service';
import { isQuotaError } from '@/services/api/errors';
import {
  getQuotaErrorMessage,
  getUserFacingErrorMessage,
} from '@/services/api/user-facing-errors';
import {
  contractToHistoryRow,
} from '@/utils/contract-history';
import {
  contractAnalysisPath,
  contractRiskProfilePath,
} from '@/utils/risk-routes';
import type {
  ContractHistoryRow,
  ContractHistoryStatus,
} from '@/types/contract-history.types';
import { useSubscriptionSummary } from '@/hooks/useSubscriptionSummary';
import { DocumentProcessingProgress } from '@/components/contracts/DocumentProcessingProgress';
import type { ProcessingProgress } from '@clausum/shared';
import {
  DIGITAL_FORMAT_HINT,
  getAnalysisProgressPercent,
  OCR_FORMAT_HINT,
} from '@/utils/processing-progress';

type ContractAiActionMode = 'analysis' | 'risks';

type ContractAiActionPickerProps = {
  mode: ContractAiActionMode;
};

type FilterStatus = 'all' | ContractHistoryStatus;

const STATUS_LABELS: Record<ContractHistoryStatus, string> = {
  uploaded: 'Cargado',
  scanning: 'Analizando',
  completed: 'Completado',
  risk: 'Riesgo detectado',
  error: 'Error al analizar',
};

function statusClass(status: ContractHistoryStatus): string {
  if (status === 'risk') return 'bg-red-50 text-red-800';
  if (status === 'error') return 'bg-amber-50 text-amber-900';
  if (status === 'completed') return 'bg-emerald-50 text-emerald-800';
  if (status === 'uploaded') return 'bg-surface-container text-on-surface-variant';
  return 'bg-primary-container/40 text-on-primary-container';
}

function HeroCopy({ mode }: { mode: ContractAiActionMode }) {
  if (mode === 'analysis') {
    return {
      eyebrow: 'Análisis de IA',
      title: 'Elige un contrato para analizarlo',
      description:
        'Busca contratos cargados, ejecuta un análisis nuevo o abre resultados ya generados.',
      icon: 'psychology',
    };
  }
  return {
    eyebrow: 'Perfil de riesgo',
    title: 'Elige un contrato para revisar riesgos',
    description:
      'Selecciona un contrato para generar o abrir su perfil de riesgo legal.',
    icon: 'warning',
  };
}

function EmptyState({
  onUpload,
  mode,
}: {
  onUpload: () => void;
  mode: ContractAiActionMode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-outline-variant bg-surface p-10 text-center">
      <span className="material-symbols-outlined text-4xl text-primary">upload_file</span>
      <h2 className="mt-3 font-display text-xl font-bold text-on-surface">
        Aún no tienes contratos
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-on-surface-variant">
        Sube un PDF digital o Word (.docx) para empezar. Después podrás{' '}
        {mode === 'analysis' ? 'analizarlo con IA' : 'generar su perfil de riesgo'} desde aquí.
      </p>
      <button
        type="button"
        onClick={onUpload}
        className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
      >
        Subir contrato
      </button>
    </div>
  );
}

export function ContractAiActionPicker({ mode }: ContractAiActionPickerProps) {
  const navigate = useNavigate();
  const subscription = useSubscriptionSummary();
  const isPro = subscription?.planId === 'pro';
  const copy = HeroCopy({ mode });

  const [contracts, setContracts] = useState<Array<Contract & { id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<FilterStatus>('all');
  const [runningContractId, setRunningContractId] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<ProcessingProgress | undefined>();
  const [dialogIntent, setDialogIntent] = useState<ContractActionIntent | null>(null);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setQuotaError(null);
    try {
      setContracts(await listContracts());
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'cargar tus contratos' }));
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  const rows = useMemo(
    () =>
      contracts
        .map(contractToHistoryRow)
        .filter((row) => {
          const q = query.trim().toLowerCase();
          const matchesQuery =
            !q ||
            row.title.toLowerCase().includes(q) ||
            row.type.toLowerCase().includes(q);
          const matchesStatus = status === 'all' || row.status === status;
          return matchesQuery && matchesStatus;
        }),
    [contracts, query, status]
  );

  const runContractAnalysis = async (row: ContractHistoryRow) => {
    setRunningContractId(row.id);
    setAnalysisProgress(undefined);
    setError(null);
    setQuotaError(null);
    try {
      const country = contracts.find((c) => c.id === row.id)?.country ?? 'CO';
      const result = await runAnalysis(row.id, country, {
        onProgress: setAnalysisProgress,
      });
      void navigate(contractAnalysisPath(row.id), {
        state: { analysisPayload: result },
      });
    } catch (err) {
      if (isQuotaError(err)) {
        setQuotaError(getQuotaErrorMessage(err));
      } else {
        setError(getUserFacingErrorMessage(err, { action: 'analizar el contrato' }));
        void loadContracts();
      }
    } finally {
      setRunningContractId(null);
      setAnalysisProgress(undefined);
    }
  };

  const primaryAction = (row: ContractHistoryRow) => {
    if (mode === 'analysis') {
      if (row.status === 'uploaded') {
        return (
          <button
            type="button"
            onClick={() => void runContractAnalysis(row)}
            disabled={runningContractId === row.id}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
          >
            {runningContractId === row.id && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
            )}
            {runningContractId === row.id ? 'Analizando…' : 'Analizar ahora'}
          </button>
        );
      }
      if (row.status === 'scanning') {
        return (
          <button
            type="button"
            disabled
            className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant opacity-70"
          >
            En proceso
          </button>
        );
      }
      return (
        <Link
          to={contractAnalysisPath(row.id)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
        >
          Ver análisis
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </Link>
      );
    }

    if (row.status === 'scanning') {
      return (
        <button
          type="button"
          disabled
          className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant opacity-70"
        >
          En proceso
        </button>
      );
    }
    return (
      <Link
        to={isPro ? contractRiskProfilePath(row.id) : '/pricing'}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
      >
        {isPro
          ? row.status === 'uploaded'
            ? 'Generar perfil'
            : 'Abrir/generar perfil'
          : 'Desbloquear con Pro'}
        <span className="material-symbols-outlined text-base">arrow_forward</span>
      </Link>
    );
  };

  if (mode === 'risks' && subscription && !isPro) {
    return <RiskProfileProGate />;
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="mb-8 overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined">{copy.icon}</span>
                <span className="text-xs font-bold uppercase tracking-widest">
                  {copy.eyebrow}
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold text-on-surface sm:text-3xl">
                {copy.title}
              </h1>
              <p className="mt-2 max-w-2xl text-on-surface-variant">{copy.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setDialogIntent('upload')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-lg">upload_file</span>
              Subir contrato
            </button>
          </div>
        </section>

        <section className="mb-6 grid gap-3 rounded-2xl border border-outline-variant/60 bg-surface p-4 shadow-soft md:grid-cols-[1fr_auto]">
          <label className="relative block">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
              search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre o tipo de contrato"
              className="h-11 w-full rounded-xl border border-outline-variant bg-surface pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as FilterStatus)}
            className="h-11 rounded-xl border border-outline-variant bg-surface px-4 text-sm font-medium text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="all">Todos los estados</option>
            <option value="uploaded">Cargados</option>
            <option value="completed">Completados</option>
            <option value="risk">Con riesgo</option>
            <option value="scanning">En proceso</option>
          </select>
        </section>

        {runningContractId && (
          <DocumentProcessingProgress
            className="mb-6"
            title="Analizando contrato"
            message={analysisProgress?.message ?? 'Preparando análisis…'}
            percent={getAnalysisProgressPercent(analysisProgress)}
            hint={
              analysisProgress?.stage === 'ocr' ? OCR_FORMAT_HINT : DIGITAL_FORMAT_HINT
            }
          />
        )}

        {quotaError && (
          <QuotaLimitCard
            message={quotaError}
            onDevPlanActivated={() => {
              setQuotaError(null);
              void loadContracts();
            }}
          />
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
            <button
              type="button"
              onClick={() => void loadContracts()}
              className="ml-2 font-semibold underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-outline-variant/60 bg-surface py-16 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined mr-2 animate-spin">
              progress_activity
            </span>
            Cargando contratos…
          </div>
        ) : contracts.length === 0 ? (
          <EmptyState mode={mode} onUpload={() => setDialogIntent('upload')} />
        ) : (
          <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface shadow-soft">
            <div className="divide-y divide-outline-variant/40">
              {rows.length === 0 ? (
                <p className="p-8 text-center text-sm text-on-surface-variant">
                  No hay contratos que coincidan con tu búsqueda.
                </p>
              ) : (
                rows.map((row) => (
                  <article
                    key={row.id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-surface-container/50 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(row.status)}`}
                        >
                          {STATUS_LABELS[row.status]}
                        </span>
                        {row.risk && (
                          <span className="rounded-full bg-primary-container/40 px-3 py-1 text-xs font-bold text-on-primary-container">
                            Riesgo {row.risk}
                          </span>
                        )}
                      </div>
                      <h2 className="truncate font-display text-lg font-bold text-on-surface">
                        {row.title}
                      </h2>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {row.type} · {row.scannedAt}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {primaryAction(row)}
                      <Link
                        to={`/panel/contratos/${row.id}/comparar`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container"
                      >
                        Comparar
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </div>

      <ContractActionDialog
        intent={dialogIntent}
        onClose={() => setDialogIntent(null)}
        onUploadSuccess={loadContracts}
      />
    </>
  );
}
