import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { CountryCode } from '@clausum/shared';
import { AppShell } from '@/components/app/AppShell';
import { ComparisonToolbar } from '@/components/comparison-view/ComparisonToolbar';
import { ComparisonAiSidebar } from '@/components/comparison-view/ComparisonAiSidebar';
import { ComparisonDiffWorkspace } from '@/components/comparison-view/ComparisonDiffWorkspace';
import { ComparisonUnifiedView } from '@/components/comparison-view/ComparisonUnifiedView';
import { ComparisonFooterBar } from '@/components/comparison-view/ComparisonFooterBar';
import { ComparisonUploadStep } from '@/components/comparison-view/ComparisonUploadStep';
import type { ComparisonViewData, ComparisonViewMode } from '@/types/comparison-view.types';
import {
  getComparison,
  getContractsForComparison,
  runComparison,
  setComparisonReview,
} from '@/services/comparison.service';
import { mapComparisonToViewData } from '@/utils/comparison-mapper';
import { contractAnalysisPath } from '@/utils/risk-routes';
import { isQuotaError } from '@/services/api/errors';
import {
  getUserFacingErrorMessage,
  getQuotaErrorMessage,
} from '@/services/api/user-facing-errors';

export function ComparisonViewPage() {
  const { comparisonId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const prefillA = searchParams.get('a') ?? undefined;

  const [viewMode, setViewMode] = useState<ComparisonViewMode>('split');
  const [data, setData] = useState<ComparisonViewData | null>(null);
  const [loading, setLoading] = useState(Boolean(comparisonId));
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const loadComparison = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const comparison = await getComparison(id);
      if (comparison.status === 'processing') {
        setError('La comparación sigue en proceso. Intenta de nuevo en unos segundos.');
        setData(null);
        return;
      }
      if (comparison.status === 'error') {
        setError('La comparación falló. Vuelve a intentarlo con otros documentos.');
        setData(null);
        return;
      }

      const [contractA, contractB] = await getContractsForComparison(
        comparison.contractIdA,
        comparison.contractIdB
      );

      setData(
        mapComparisonToViewData(
          comparison,
          contractA.fileName,
          contractB.fileName,
          comparison.contractIdA
        )
      );
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, { action: 'cargar la comparación' })
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = comparisonId
      ? 'Resultado de comparación | Clausum'
      : 'Comparar contratos | Clausum';
  }, [comparisonId]);

  useEffect(() => {
    if (comparisonId) {
      void loadComparison(comparisonId);
    }
  }, [comparisonId, loadComparison]);

  const handleCompare = async (
    contractIdA: string,
    contractIdB: string,
    country: CountryCode
  ) => {
    setComparing(true);
    setError(null);
    setQuotaError(false);
    try {
      const result = await runComparison(contractIdA, contractIdB, country);
      void navigate(`/panel/comparar/${result.comparisonId}`, { replace: true });
    } catch (err) {
      if (isQuotaError(err)) {
        setQuotaError(true);
        setError(getQuotaErrorMessage(err));
      } else {
        setError(
          getUserFacingErrorMessage(err, { action: 'comparar los contratos' })
        );
      }
    } finally {
      setComparing(false);
    }
  };

  const handleDiscardReview = async () => {
    if (!comparisonId || !data) return;
    const confirmed = window.confirm(
      '¿Descartar esta revisión? Volverás al comparador sin marcar la contraparte como aprobada.'
    );
    if (!confirmed) return;

    setReviewSubmitting(true);
    setError(null);
    try {
      await setComparisonReview(comparisonId, 'discarded');
      void navigate('/panel/comparar');
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, { action: 'descartar la revisión' })
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleApproveReview = async () => {
    if (!comparisonId || !data) return;

    setReviewSubmitting(true);
    setError(null);
    try {
      await setComparisonReview(comparisonId, 'approved');
      setData((current) =>
        current ? { ...current, reviewStatus: 'approved' } : current
      );
      void navigate(contractAnalysisPath(data.contractId), {
        state: { reviewApproved: true },
      });
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, { action: 'aprobar la revisión' })
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (!comparisonId) {
    return (
      <AppShell pageTitle="Comparar" breadcrumb="Mis contratos">
        <ComparisonUploadStep
          onCompare={handleCompare}
          comparing={comparing}
          error={error}
          quotaError={quotaError}
          initialContractIdA={prefillA}
        />
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell pageTitle="Comparación" breadcrumb="Mis contratos">
        <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">
            progress_activity
          </span>
          <p className="text-sm text-on-surface-variant">Cargando comparación…</p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell pageTitle="Comparación" breadcrumb="Mis contratos">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-red-700">{error ?? 'Comparación no disponible'}</p>
          <button
            type="button"
            onClick={() => navigate('/panel/comparar')}
            className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
          >
            Nueva comparación
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="Comparación" breadcrumb="Mis contratos">
      <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
        <ComparisonToolbar
          data={data}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden bg-surface-container">
          <ComparisonAiSidebar
            insights={data.insights}
            contractId={data.contractId}
          />

          {viewMode === 'split' ? (
            <ComparisonDiffWorkspace data={data} />
          ) : (
            <ComparisonUnifiedView changes={data.unifiedChanges} />
          )}
        </div>

        {error && (
          <div className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800 sm:px-6">
            {error}
          </div>
        )}

        <ComparisonFooterBar
          reviewStatus={data.reviewStatus ?? 'pending'}
          submitting={reviewSubmitting}
          onDiscard={() => void handleDiscardReview()}
          onApprove={() => void handleApproveReview()}
        />
      </div>
    </AppShell>
  );
}
