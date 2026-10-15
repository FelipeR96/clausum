import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/app/AppShell';
import {
  ContractHistoryFilters,
  type HistoryFilter,
} from '@/components/contracts/ContractHistoryFilters';
import { ContractHistoryStats } from '@/components/contracts/ContractHistoryStats';
import { ContractHistoryTable } from '@/components/contracts/ContractHistoryTable';
import {
  ContractActionDialog,
  type ContractActionIntent,
} from '@/components/panel/ContractActionDialog';
import { QuotaLimitCard } from '@/components/billing/QuotaLimitCard';
import { DocumentUploadGuidance } from '@/components/contracts/DocumentUploadGuidance';
import { deleteContract, listContracts } from '@/services/contracts.service';
import { fetchMe } from '@/services/user.service';
import { isApiError, isQuotaError } from '@/services/api/errors';
import {
  getQuotaErrorMessage,
  getUserFacingErrorMessage,
} from '@/services/api/user-facing-errors';
import {
  getContractAnalysis,
  runAnalysis,
  runRiskDetection,
} from '@/services/analysis.service';
import { FREE_ENTITLEMENTS } from '@clausum/shared';
import {
  contractToHistoryRow,
  matchesDateRange,
  type DateRangeFilter,
} from '@/utils/contract-history';
import { contractAnalysisPath, contractRiskProfilePath } from '@/utils/risk-routes';
import type { ContractHistoryRow } from '@/types/contract-history.types';
import { useSubscriptionSummary } from '@/hooks/useSubscriptionSummary';
import { DocumentProcessingProgress } from '@/components/contracts/DocumentProcessingProgress';
import type { ProcessingProgress } from '@clausum/shared';
import {
  DIGITAL_FORMAT_HINT,
  getAnalysisProgressPercent,
  OCR_FORMAT_HINT,
} from '@/utils/processing-progress';

function matchesFilter(status: HistoryFilter, rowStatus: string) {
  if (status === 'all') return true;
  return rowStatus === status;
}

export function ContractsHistoryPage() {
  const navigate = useNavigate();
  const subscription = useSubscriptionSummary();
  const isPro = subscription?.planId === 'pro';
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('30d');
  const [dialogIntent, setDialogIntent] = useState<ContractActionIntent | null>(null);
  const [rows, setRows] = useState<ContractHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [contractsLimit, setContractsLimit] = useState(FREE_ENTITLEMENTS.maxContracts);
  const [historyLimit, setHistoryLimit] = useState(FREE_ENTITLEMENTS.historyMaxEntries);
  const [ocrAllowed, setOcrAllowed] = useState(false);
  const [analyzingContractId, setAnalyzingContractId] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<ProcessingProgress | undefined>();
  const [riskGeneratingContractId, setRiskGeneratingContractId] = useState<string | null>(null);
  const [deletingContractId, setDeletingContractId] = useState<string | null>(null);
  const [contractToDelete, setContractToDelete] = useState<ContractHistoryRow | null>(null);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contracts, me] = await Promise.all([listContracts(), fetchMe()]);
      setContractsLimit(me.subscription.entitlements.maxContracts);
      setHistoryLimit(me.subscription.entitlements.historyMaxEntries);
      setOcrAllowed(me.subscription.entitlements.ocrScannedPdf);
      setRows(contracts.map(contractToHistoryRow));
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, { action: 'cargar tu historial de contratos' })
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnalyzeContract = useCallback(
    async (contractId: string) => {
      setAnalyzingContractId(contractId);
      setAnalysisProgress(undefined);
      setError(null);
      setQuotaError(null);
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === contractId ? { ...row, status: 'scanning', risk: null } : row
        )
      );
      try {
        const country = rows.find((r) => r.id === contractId)?.country ?? 'CO';
        const result = await runAnalysis(contractId, country, {
          onProgress: setAnalysisProgress,
        });
        void navigate(contractAnalysisPath(contractId), {
          state: { analysisPayload: result },
        });
      } catch (err) {
        if (isQuotaError(err)) {
          setQuotaError(getQuotaErrorMessage(err));
        } else {
          setError(
            getUserFacingErrorMessage(err, { action: 'analizar el contrato' })
          );
        }
        void loadContracts();
      } finally {
        setAnalyzingContractId(null);
        setAnalysisProgress(undefined);
      }
    },
    [loadContracts, navigate, rows]
  );

  const handleRiskProfileContract = useCallback(
    async (contractId: string) => {
      if (!isPro) {
        void navigate(contractRiskProfilePath(contractId));
        return;
      }

      setRiskGeneratingContractId(contractId);
      setError(null);
      setQuotaError(null);
      try {
        try {
          await getContractAnalysis(contractId, 'risks');
        } catch (err) {
          if (!isApiError(err) || err.code !== 'RISKS_ANALYSIS_NOT_FOUND') {
            throw err;
          }
          const country = rows.find((r) => r.id === contractId)?.country ?? 'CO';
          await runRiskDetection(contractId, country);
        }
        void navigate(contractRiskProfilePath(contractId));
      } catch (err) {
        if (isQuotaError(err)) {
          setQuotaError(getQuotaErrorMessage(err));
        } else {
          setError(
            getUserFacingErrorMessage(err, { action: 'generar el perfil de riesgo' })
          );
        }
        void loadContracts();
      } finally {
        setRiskGeneratingContractId(null);
      }
    },
    [isPro, loadContracts, navigate, rows]
  );

  const handleDeleteContract = useCallback(
    async (row: ContractHistoryRow) => {
      setDeletingContractId(row.id);
      setError(null);
      setQuotaError(null);
      try {
        await deleteContract(row.id);
        await loadContracts();
        setContractToDelete(null);
      } catch (err) {
        setError(
          getUserFacingErrorMessage(err, { action: 'eliminar el contrato' })
        );
      } finally {
        setDeletingContractId(null);
      }
    },
    [loadContracts]
  );

  useEffect(() => {
    document.title = 'Historial de contratos | Clausum';
    void loadContracts();
  }, [loadContracts]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !q ||
        row.title.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q);
      const matchesDate =
        row.createdAtMs == null || matchesDateRange(row.createdAtMs, dateRange);
      return matchesQuery && matchesFilter(filter, row.status) && matchesDate;
    });
  }, [query, filter, dateRange, rows]);

  const highRiskCount = useMemo(
    () => rows.filter((row) => row.risk === 'high').length,
    [rows]
  );

  return (
    <AppShell
      pageTitle="Historial de contratos"
      breadcrumb="Mis contratos"
      onUploadClick={() => setDialogIntent('upload')}
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ContractHistoryFilters
          query={query}
          filter={filter}
          dateRange={dateRange}
          onQueryChange={setQuery}
          onFilterChange={setFilter}
          onDateRangeChange={setDateRange}
        />

        <DocumentUploadGuidance variant="banner" ocrAllowed={ocrAllowed} className="mb-6" />

        {analyzingContractId && (
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

        <ContractHistoryStats
          contractsTotal={rows.length}
          contractsLimit={contractsLimit}
          highRiskCount={highRiskCount}
          historyLimit={historyLimit}
        />

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
            <span className="material-symbols-outlined mr-2 animate-spin">progress_activity</span>
            Cargando contratos…
          </div>
        ) : (
          <ContractHistoryTable
            rows={filteredRows}
            total={rows.length}
            historyLimit={historyLimit}
            analyzingContractId={analyzingContractId}
            riskGeneratingContractId={riskGeneratingContractId}
            deletingContractId={deletingContractId}
            onAnalyzeContract={handleAnalyzeContract}
            onRiskProfileContract={handleRiskProfileContract}
            onDeleteContract={setContractToDelete}
          />
        )}

        <footer className="mt-12 border-t border-outline-variant/60 py-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-on-surface-variant sm:flex-row">
            <p>© {new Date().getFullYear()} Clausum</p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link to="/panel" className="hover:text-primary">
                Panel
              </Link>
              <Link to="/pricing" className="hover:text-primary">
                Precios
              </Link>
            </div>
          </div>
        </footer>
      </div>

      <ContractActionDialog
        intent={dialogIntent}
        onClose={() => setDialogIntent(null)}
        onUploadSuccess={loadContracts}
      />

      {contractToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/45 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-contract-title"
          onClick={() => {
            if (!deletingContractId) setContractToDelete(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface p-6 shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <span className="material-symbols-outlined">delete_forever</span>
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-red-700">
                  Eliminación definitiva
                </p>
                <h2
                  id="delete-contract-title"
                  className="mt-1 font-display text-xl font-bold text-on-surface"
                >
                  ¿Eliminar este contrato?
                </h2>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-on-surface-variant">
              Se eliminará permanentemente{' '}
              <strong className="text-on-surface">{contractToDelete.title}</strong>,
              incluyendo su archivo, análisis, alertas y comparaciones asociadas.
            </p>
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Esta acción no se puede deshacer. Si lo necesitas de nuevo, tendrás que
              subir el contrato otra vez.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setContractToDelete(null)}
                disabled={deletingContractId === contractToDelete.id}
                className="rounded-xl border border-outline-variant px-5 py-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteContract(contractToDelete)}
                disabled={deletingContractId === contractToDelete.id}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-70"
              >
                {deletingContractId === contractToDelete.id && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                )}
                {deletingContractId === contractToDelete.id
                  ? 'Eliminando…'
                  : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
