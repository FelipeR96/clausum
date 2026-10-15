import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '@/components/app/AppShell';
import { QuotaLimitCard } from '@/components/billing/QuotaLimitCard';
import { RiskProfileProGate } from '@/components/billing/RiskProfileProGate';
import { ContractAiActionPicker } from '@/components/contracts/ContractAiActionPicker';
import { RiskAlertsHeader } from '@/components/risk-alerts/RiskAlertsHeader';
import { RiskSeveritySummary } from '@/components/risk-alerts/RiskSeveritySummary';
import { MissingClausesAlert } from '@/components/risk-alerts/MissingClausesAlert';
import { RiskExposureOverview } from '@/components/risk-alerts/RiskExposureOverview';
import { RiskVectorCard } from '@/components/risk-alerts/RiskVectorCard';
import { RiskReviewCta } from '@/components/risk-alerts/RiskReviewCta';
import type { RiskAlertsData, RiskSortOption, RiskVectorItem } from '@/types/risk-alerts.types';
import {
  getContractAnalysis,
  runRiskDetection,
} from '@/services/analysis.service';
import { listContracts } from '@/services/contracts.service';
import { mapRisksToAlertsView } from '@/utils/risk-alerts-mapper';
import { isApiError, isProFeatureError, isQuotaError } from '@/services/api/errors';
import {
  getQuotaErrorMessage,
  getUserFacingErrorMessage,
} from '@/services/api/user-facing-errors';
import { useSubscriptionSummary } from '@/hooks/useSubscriptionSummary';
import { contractAnalysisPath } from '@/utils/risk-routes';

function sortRisks(risks: RiskVectorItem[], sort: RiskSortOption): RiskVectorItem[] {
  const copy = [...risks];
  if (sort === 'severity') {
    return copy.sort((a, b) => {
      if (a.severity === b.severity) return a.section.localeCompare(b.section);
      return a.severity === 'high' ? -1 : 1;
    });
  }
  if (sort === 'clause') {
    return copy.sort((a, b) => a.section.localeCompare(b.section));
  }
  return copy.sort((a, b) => (a.lawRef ?? 'zzz').localeCompare(b.lawRef ?? 'zzz'));
}

export function RiskAlertsPage() {
  const { contractId } = useParams();
  const subscription = useSubscriptionSummary();
  const isPro = subscription?.planId === 'pro';
  const [data, setData] = useState<RiskAlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [sort, setSort] = useState<RiskSortOption>('severity');

  const loadOrGenerate = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setQuotaError(null);
    try {
      const payload = await getContractAnalysis(id, 'risks');
      setData(mapRisksToAlertsView(payload.analysis, payload.contract, payload.analysisId));
      return;
    } catch (err) {
      if (!isApiError(err) || err.code !== 'RISKS_ANALYSIS_NOT_FOUND') {
        throw err;
      }
    }

    setGenerating(true);
    try {
      const contracts = await listContracts();
      const country = contracts.find((c) => c.id === id)?.country ?? 'CO';
      const payload = await runRiskDetection(id, country);
      setData(mapRisksToAlertsView(payload.analysis, payload.contract, payload.analysisId));
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Alertas de riesgo | Clausum';
  }, []);

  useEffect(() => {
    if (!contractId) {
      setLoading(false);
      setData(null);
      return;
    }

    if (subscription && !isPro) {
      setLoading(false);
      setData(null);
      setError(null);
      setQuotaError(null);
      return;
    }

    if (!subscription) return;

    let cancelled = false;
    setQuotaError(null);

    loadOrGenerate(contractId)
      .catch((err) => {
        if (cancelled) return;
        if (isProFeatureError(err)) {
          setError(null);
          setQuotaError(null);
          setData(null);
          return;
        }
        if (isQuotaError(err)) {
          setQuotaError(getQuotaErrorMessage(err));
          setError(null);
        } else {
          setError(
            getUserFacingErrorMessage(err, { action: 'generar el perfil de riesgo' })
          );
          setQuotaError(null);
        }
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contractId, isPro, loadOrGenerate, retryKey, subscription]);

  const sortedRisks = useMemo(
    () => (data ? sortRisks(data.risks, sort) : []),
    [data, sort]
  );

  const totalAlerts = data
    ? data.severityCounts.high + data.severityCounts.medium + data.severityCounts.info
    : 0;

  if (!contractId) {
    if (subscription && !isPro) {
      return (
        <AppShell pageTitle="Alertas de riesgo" breadcrumb="Perfil de riesgo">
          <RiskProfileProGate onDevPlanActivated={() => setRetryKey((key) => key + 1)} />
        </AppShell>
      );
    }
    return (
      <AppShell pageTitle="Alertas de riesgo" breadcrumb="Perfil de riesgo">
        <ContractAiActionPicker mode="risks" />
      </AppShell>
    );
  }

  if (!isPro) {
    return (
      <AppShell pageTitle="Alertas de riesgo" breadcrumb="Perfil de riesgo">
        <RiskProfileProGate
          contractId={contractId}
          analysisPath={contractAnalysisPath(contractId)}
          onDevPlanActivated={() => setRetryKey((key) => key + 1)}
        />
      </AppShell>
    );
  }

  if (!subscription || loading || generating) {
    return (
      <AppShell pageTitle="Alertas de riesgo" breadcrumb="Perfil de riesgo">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <span className="material-symbols-outlined mb-4 animate-spin text-4xl text-primary">
            progress_activity
          </span>
          <p className="text-on-surface-variant">
            {generating
              ? 'Generando perfil de riesgo con IA… Esto puede tardar hasta 2 minutos.'
              : 'Cargando alertas de riesgo…'}
          </p>
        </div>
      </AppShell>
    );
  }

  if (quotaError) {
    return (
      <AppShell pageTitle="Alertas de riesgo" breadcrumb="Perfil de riesgo">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <QuotaLimitCard
            message={quotaError}
            onDevPlanActivated={() => setRetryKey((key) => key + 1)}
          />
          <div className="text-center">
            <Link to="/panel/riesgos" className="text-primary hover:underline">
              Elegir otro contrato
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell pageTitle="Alertas de riesgo" breadcrumb="Perfil de riesgo">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center">
          <p className="text-red-700">{error ?? 'No se pudo cargar el perfil de riesgo.'}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setRetryKey((key) => key + 1)}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90"
            >
              Reintentar
            </button>
            <Link
              to={`/panel/contratos/${contractId}/resultado`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Ir al análisis
            </Link>
            <Link to="/panel/riesgos" className="text-sm text-on-surface-variant hover:underline">
              Elegir otro contrato
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="Alertas de riesgo" breadcrumb="Perfil de riesgo">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <RiskAlertsHeader data={data} contractId={contractId} isPro={isPro} />

        <div className="dashboard-bento-grid mb-12">
          <div className="col-span-12 lg:col-span-4">
            <RiskSeveritySummary data={data} sort={sort} onSortChange={setSort} />
          </div>
          <div className="col-span-12 lg:col-span-8">
            {data.missingClauses.length > 0 ? (
              <MissingClausesAlert data={data} />
            ) : (
              <RiskExposureOverview data={data} contractId={contractId} />
            )}
          </div>
        </div>

        <section className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-on-surface">
              Vectores de riesgo detectados
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Exposición legal detallada, fundamento normativo y acciones sugeridas para negociar.
            </p>
          </div>
          {sortedRisks.length === 0 ? (
            <p className="rounded-xl border border-outline-variant bg-surface-container p-6 text-sm text-on-surface-variant">
              No se detectaron riesgos relevantes en este contrato.
            </p>
          ) : (
            sortedRisks.map((risk) => (
              <RiskVectorCard key={risk.id} risk={risk} contractId={contractId} />
            ))
          )}
        </section>

        <RiskReviewCta totalAlerts={totalAlerts} contractId={contractId} isPro={isPro} />

        <footer className="mt-12 border-t border-outline-variant/60 py-8">
          <p className="text-center text-sm text-on-surface-variant">
            Las alertas de Clausum no constituyen asesoría legal. Consulta a un
            profesional del derecho antes de firmar.
          </p>
        </footer>
      </div>
    </AppShell>
  );
}
