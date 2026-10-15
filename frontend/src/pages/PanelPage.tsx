import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SETTINGS_BILLING_PATH } from '@/constants/app-paths';
import { AppShell } from '@/components/app/AppShell';
import { DashboardStats } from '@/components/panel/DashboardStats';
import { QuickActions } from '@/components/panel/QuickActions';
import { RecentContracts } from '@/components/panel/RecentContracts';
import { PriorityAlerts } from '@/components/panel/PriorityAlerts';
import { UsageChart } from '@/components/panel/UsageChart';
import {
  ContractActionDialog,
  type ContractActionIntent,
} from '@/components/panel/ContractActionDialog';
import { DocumentUploadGuidance } from '@/components/contracts/DocumentUploadGuidance';
import { useSubscriptionSummary } from '@/hooks/useSubscriptionSummary';
import { fetchDashboard } from '@/services/dashboard.service';
import { withApiRetry } from '@/services/api/retry';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';
import type { DashboardSummary } from '@/types/dashboard.types';

export function PanelPage() {
  const [dialogIntent, setDialogIntent] = useState<ContractActionIntent | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const subscription = useSubscriptionSummary();
  const ocrAllowed = subscription?.entitlements.ocrScannedPdf ?? false;

  useEffect(() => {
    document.title = 'Panel de control | Clausum';
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = () => {
      setLoadingDashboard(true);
      setDashboardError(null);
      withApiRetry(() => fetchDashboard())
        .then((data) => {
          if (!cancelled) setDashboard(data);
        })
        .catch((err) => {
          if (!cancelled) {
            setDashboardError(
              getUserFacingErrorMessage(err, { action: 'cargar tu panel' })
            );
            setDashboard(null);
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingDashboard(false);
        });
    };

    loadDashboard();

    const onFocus = () => loadDashboard();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const displayName =
    dashboard?.user.displayName ??
    dashboard?.user.email?.split('@')[0] ??
    'Usuario Clausum';
  const activeAlerts = dashboard?.stats.activeAlerts ?? 0;
  const contractsTotal = dashboard?.stats.contractsTotal ?? 0;
  const planName = dashboard?.subscription.planName ?? subscription?.planName ?? 'Free';

  return (
    <AppShell onUploadClick={() => setDialogIntent('upload')}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-on-surface sm:text-3xl">
            Bienvenido de nuevo, {displayName}
          </h1>
          <p className="mt-2 text-on-surface-variant">
            Tienes{' '}
            <span className="font-semibold text-primary">
              {activeAlerts} alertas activas
            </span>{' '}
            en {contractsTotal} contratos (plan {planName}).
          </p>
        </div>

        {loadingDashboard && (
          <div className="mb-6 rounded-2xl border border-outline-variant bg-surface-container p-6 text-sm text-on-surface-variant">
            Cargando datos reales del panel…
          </div>
        )}

        {dashboardError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            {dashboardError}
          </div>
        )}

        {dashboard && <DashboardStats dashboard={dashboard} />}

        <DocumentUploadGuidance variant="banner" ocrAllowed={ocrAllowed} className="mb-6" />

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <QuickActions
              onUpload={() => setDialogIntent('upload')}
              onAnalyze={() => setDialogIntent('analyze')}
            />
            <RecentContracts contracts={dashboard?.recentContracts ?? []} />
          </div>

          <div className="space-y-6 lg:col-span-4">
            <PriorityAlerts alerts={dashboard?.activeAlerts ?? []} />
            <UsageChart
              usageByMonth={dashboard?.usageByMonth ?? []}
              analysesLimit={
                dashboard?.subscription.usage.analysesLimit ??
                subscription?.usage.analysesLimit ??
                0
              }
            />
          </div>
        </div>

        <footer className="mt-12 border-t border-outline-variant/60 py-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-on-surface-variant sm:flex-row">
            <p>© {new Date().getFullYear()} Clausum</p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link to="/" className="hover:text-primary">
                Inicio
              </Link>
              <Link to={SETTINGS_BILLING_PATH} className="hover:text-primary">
                Planes
              </Link>
              <a
                href="mailto:soporte@clausum.com"
                className="hover:text-primary"
              >
                Soporte
              </a>
            </div>
          </div>
        </footer>
      </div>

      <button
        type="button"
        onClick={() => setDialogIntent('upload')}
        className="fixed bottom-8 right-8 z-30 hidden h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-card transition hover:scale-105 active:scale-95 lg:flex"
        aria-label="Subir contrato"
      >
        <span className="material-symbols-outlined text-3xl">cloud_upload</span>
      </button>

      <ContractActionDialog
        intent={dialogIntent}
        onClose={() => setDialogIntent(null)}
      />
    </AppShell>
  );
}
