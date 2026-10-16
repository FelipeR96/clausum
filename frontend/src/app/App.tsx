import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner';
import { LazyBoundary } from '@/app/LazyBoundary';

// ─────────────────────────────────────────────────────────────────────────
// Qué entra en el chunk inicial y qué no
//
// Las landings de SEO son la puerta de entrada del tráfico orgánico, así
// que lo que ve un visitante anónimo tiene que ser lo más ligero posible:
// el chunk inicial afecta directamente al LCP, que es la métrica que esas
// landings persiguen.
//
// Eager: landing, landings de SEO, login/signup y pricing. Es el embudo de
// conversión y un parpadeo de carga ahí cuesta visitas.
//
// Lazy: todo `/panel/*` (solo hace falta con sesión iniciada) y las páginas
// legales (se visitan desde el pie, rara vez).
//
// Los dos límites de Suspense están separados a propósito: las legales van
// en LazyBoundary, que no exige sesión, y el panel en ProtectedRoute, que
// sí. Diferir una ruta y protegerla son decisiones distintas; juntarlas
// dejaría la política de privacidad detrás del login.
// ─────────────────────────────────────────────────────────────────────────

import { LandingPage } from '@/pages/LandingPage';
import { AnalyzePage } from '@/pages/AnalyzePage';
import { ComparePage } from '@/pages/ComparePage';
import { RisksPage } from '@/pages/RisksPage';
import { LoginPage, SignupPage } from '@/pages/AuthPages';
import { PricingPage } from '@/pages/PricingPage';

const PanelPage = lazy(() =>
  import('@/pages/PanelPage').then((m) => ({ default: m.PanelPage }))
);
const ContractsHistoryPage = lazy(() =>
  import('@/pages/ContractsHistoryPage').then((m) => ({
    default: m.ContractsHistoryPage,
  }))
);
const AnalysisResultPage = lazy(() =>
  import('@/pages/AnalysisResultPage').then((m) => ({
    default: m.AnalysisResultPage,
  }))
);
const RiskAlertsPage = lazy(() =>
  import('@/pages/RiskAlertsPage').then((m) => ({ default: m.RiskAlertsPage }))
);
const ComparisonViewPage = lazy(() =>
  import('@/pages/ComparisonViewPage').then((m) => ({
    default: m.ComparisonViewPage,
  }))
);
const AdminPage = lazy(() =>
  import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage }))
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

const PrivacyPolicyPage = lazy(() =>
  import('@/pages/legal/PrivacyPolicyPage').then((m) => ({
    default: m.PrivacyPolicyPage,
  }))
);
const TermsPage = lazy(() =>
  import('@/pages/legal/TermsPage').then((m) => ({ default: m.TermsPage }))
);
const LegalNoticePage = lazy(() =>
  import('@/pages/legal/LegalNoticePage').then((m) => ({
    default: m.LegalNoticePage,
  }))
);
const CookiesPolicyPage = lazy(() =>
  import('@/pages/legal/CookiesPolicyPage').then((m) => ({
    default: m.CookiesPolicyPage,
  }))
);

function ContractCompareRedirect() {
  const { contractId } = useParams();
  return <Navigate to={`/panel/comparar?a=${contractId ?? ''}`} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <CookieConsentBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Landings SEO */}
        <Route path="/analizar-contratos" element={<AnalyzePage />} />
        <Route path="/comparar-contratos" element={<ComparePage />} />
        <Route path="/detectar-riesgos" element={<RisksPage />} />

        {/* Redirects legacy */}
        <Route path="/analizar" element={<Navigate to="/analizar-contratos" replace />} />
        <Route path="/comparar" element={<Navigate to="/comparar-contratos" replace />} />
        <Route path="/riesgos" element={<Navigate to="/detectar-riesgos" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/pricing" element={<PricingPage />} />

        {/* Diferidas pero públicas: no exigen sesión. */}
        <Route element={<LazyBoundary />}>
          <Route path="/legal/privacidad" element={<PrivacyPolicyPage />} />
          <Route path="/legal/terminos" element={<TermsPage />} />
          <Route path="/legal/aviso-legal" element={<LegalNoticePage />} />
          <Route path="/legal/cookies" element={<CookiesPolicyPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/panel" element={<PanelPage />} />
          <Route path="/panel/riesgos" element={<RiskAlertsPage />} />
          <Route path="/panel/comparar" element={<ComparisonViewPage />} />
          <Route path="/panel/comparar/:comparisonId" element={<ComparisonViewPage />} />
          <Route
            path="/panel/contratos/:contractId/riesgos"
            element={<RiskAlertsPage />}
          />
          <Route
            path="/panel/analisis/resultado"
            element={<AnalysisResultPage />}
          />
          <Route
            path="/panel/contratos/:contractId/resultado"
            element={<AnalysisResultPage />}
          />
          <Route path="/panel/contratos" element={<ContractsHistoryPage />} />
          <Route path="/panel/configuracion" element={<SettingsPage />} />
          {/* La pagina comprueba el claim y redirige; la API responde 404. */}
          <Route path="/panel/admin" element={<AdminPage />} />
          <Route
            path="/panel/contratos/:contractId/comparar"
            element={<ContractCompareRedirect />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
