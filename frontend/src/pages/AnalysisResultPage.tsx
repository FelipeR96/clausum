import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/app/AppShell';
import { AnalysisResultHeader } from '@/components/analysis-result/AnalysisResultHeader';
import { AnalysisSummarySection } from '@/components/analysis-result/AnalysisSummarySection';
import { AnalysisVerdictBanner } from '@/components/analysis-result/AnalysisVerdictBanner';
import { AnalysisMetaGrid } from '@/components/analysis-result/AnalysisMetaGrid';
import { AnalysisClauseBreakdown } from '@/components/analysis-result/AnalysisClauseBreakdown';
import { AnalysisRiskTeaserBanner } from '@/components/analysis-result/AnalysisRiskTeaserBanner';
import {
  ContractActionDialog,
  type ContractActionIntent,
} from '@/components/panel/ContractActionDialog';
import { ContractAiActionPicker } from '@/components/contracts/ContractAiActionPicker';
import type { AnalysisPayload } from '@/services/analysis.service';
import { getContractAnalysis } from '@/services/analysis.service';
import { mapAnalysisToResultView } from '@/utils/analysis-mapper';
import type { AnalysisResultData } from '@/types/analysis-view.types';
import { isApiError } from '@/services/api/errors';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';
import { contractRiskProfilePath } from '@/utils/risk-routes';
import type { CountryCode } from '@clausum/shared';
import { hasLegalCorpus } from '@clausum/shared';
import { useSubscriptionSummary } from '@/hooks/useSubscriptionSummary';

type LocationState = {
  analysisPayload?: AnalysisPayload;
};

export function AnalysisResultPage() {
  const { contractId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const usedNavigationState = useRef(false);
  const subscription = useSubscriptionSummary();
  const isPro = subscription?.planId === 'pro';

  const [data, setData] = useState<AnalysisResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [dialogIntent, setDialogIntent] = useState<ContractActionIntent | null>(null);

  useEffect(() => {
    document.title = 'Resultado del análisis | Clausum';
  }, []);

  useEffect(() => {
    if (!contractId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    const resolvedContractId = contractId;

    const fromState = state?.analysisPayload;
    if (
      !usedNavigationState.current &&
      fromState?.contract.id === resolvedContractId &&
      fromState.analysis.mode === 'analyze'
    ) {
      usedNavigationState.current = true;
      setData(
        mapAnalysisToResultView(
          fromState.analysis,
          fromState.contract,
          fromState.analysisId
        )
      );
      setLoading(false);
      setError(null);
      setNotFound(false);
      void navigate(location.pathname, { replace: true, state: null });
    }

    let cancelled = false;

    async function load() {
      const silent = usedNavigationState.current;
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      setNotFound(false);
      try {
        const payload = await getContractAnalysis(resolvedContractId, 'analyze');
        if (cancelled) return;
        setData(
          mapAnalysisToResultView(
            payload.analysis,
            payload.contract,
            payload.analysisId
          )
        );
      } catch (err) {
        if (cancelled) return;
        if (isApiError(err) && err.code === 'ANALYSIS_NOT_FOUND') {
          setNotFound(true);
          setData(null);
        } else {
          setError(
            getUserFacingErrorMessage(err, { action: 'cargar el resultado del análisis' })
          );
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [contractId, location.pathname, navigate, state?.analysisPayload]);

  const lawRefs = useMemo(() => data?.lawReferences ?? [], [data]);

  if (!contractId) {
    return (
      <AppShell pageTitle="Resultado del análisis" breadcrumb="Análisis de IA">
        <ContractAiActionPicker mode="analysis" />
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell pageTitle="Resultado del análisis" breadcrumb="Análisis de IA">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <span className="material-symbols-outlined mb-4 animate-spin text-4xl text-primary">
            progress_activity
          </span>
          <p className="text-on-surface-variant">Cargando resultado del análisis…</p>
        </div>
      </AppShell>
    );
  }

  if (notFound) {
    return (
      <AppShell pageTitle="Resultado del análisis" breadcrumb="Análisis de IA">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="font-display text-xl font-bold text-on-surface">
            Este contrato aún no tiene análisis
          </h2>
          <p className="mt-2 text-on-surface-variant">
            Ejecuta un análisis con IA para ver el resumen y las cláusulas detectadas.
          </p>
          <button
            type="button"
            onClick={() => setDialogIntent('analyze')}
            className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary"
          >
            Iniciar análisis
          </button>
          <ContractActionDialog
            intent={dialogIntent}
            onClose={() => setDialogIntent(null)}
          />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell pageTitle="Resultado del análisis" breadcrumb="Análisis de IA">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <p className="text-red-700">{error ?? 'No se pudo cargar el análisis.'}</p>
          <Link
            to="/panel/contratos"
            className="mt-4 inline-block text-primary hover:underline"
          >
            Volver al historial
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="Resultado del análisis" breadcrumb="Análisis de IA">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <AnalysisResultHeader data={data} contractId={contractId} isPro={isPro} />
        <AnalysisVerdictBanner data={data} />
        <AnalysisSummarySection data={data} contractId={contractId} />
        <AnalysisRiskTeaserBanner data={data} contractId={contractId} isPro={isPro} />
        <AnalysisMetaGrid data={data} />

        {lawRefs.length > 0 && hasLegalCorpus(data.countryCode as CountryCode) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {lawRefs.map((ref) => (
              <span
                key={ref}
                className="rounded-full bg-primary-container/40 px-3 py-1 text-xs font-semibold text-on-primary-container"
              >
                {ref}
              </span>
            ))}
          </div>
        )}

        <AnalysisClauseBreakdown data={data} contractId={contractId} isPro={isPro} />

        <footer className="mt-12 border-t border-outline-variant/60 py-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-on-surface-variant sm:flex-row">
            <p>El análisis de Clausum no constituye asesoría legal.</p>
            <div className="flex gap-6">
              <Link to={isPro ? contractRiskProfilePath(contractId) : '/pricing'} className="hover:text-primary">
                {isPro ? 'Perfil de riesgo' : 'Perfil de riesgo Pro'}
              </Link>
              <Link to="/panel/contratos" className="hover:text-primary">
                Historial
              </Link>
              <Link to="/panel" className="hover:text-primary">
                Panel
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
