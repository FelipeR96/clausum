import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner';
import { LandingPage } from '@/pages/LandingPage';
import { AnalyzePage } from '@/pages/AnalyzePage';
import { ComparePage } from '@/pages/ComparePage';
import { RisksPage } from '@/pages/RisksPage';
import { LoginPage, SignupPage } from '@/pages/AuthPages';
import { PricingPage } from '@/pages/PricingPage';
import { PanelPage } from '@/pages/PanelPage';
import { ContractsHistoryPage } from '@/pages/ContractsHistoryPage';
import { AnalysisResultPage } from '@/pages/AnalysisResultPage';
import { RiskAlertsPage } from '@/pages/RiskAlertsPage';
import { ComparisonViewPage } from '@/pages/ComparisonViewPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PrivacyPolicyPage } from '@/pages/legal/PrivacyPolicyPage';
import { TermsPage } from '@/pages/legal/TermsPage';
import { LegalNoticePage } from '@/pages/legal/LegalNoticePage';
import { CookiesPolicyPage } from '@/pages/legal/CookiesPolicyPage';

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
        <Route path="/legal/privacidad" element={<PrivacyPolicyPage />} />
        <Route path="/legal/terminos" element={<TermsPage />} />
        <Route path="/legal/aviso-legal" element={<LegalNoticePage />} />
        <Route path="/legal/cookies" element={<CookiesPolicyPage />} />

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
