import { useAuth } from '@/auth/AuthProvider';

export type MarketingFeature = 'analysis' | 'compare' | 'risks';

const PANEL_ROUTES: Record<MarketingFeature, string> = {
  analysis: '/panel/analisis/resultado',
  compare: '/panel/comparar',
  risks: '/panel/riesgos',
};

const MARKETING_ROUTES: Record<MarketingFeature, string> = {
  analysis: '/analizar-contratos',
  compare: '/comparar-contratos',
  risks: '/detectar-riesgos',
};

/** Ruta de marketing o panel según si hay sesión iniciada. */
export function useMarketingDestination(feature: MarketingFeature): string {
  const { user } = useAuth();
  return user ? PANEL_ROUTES[feature] : MARKETING_ROUTES[feature];
}

/** CTA principal: signup para invitados, panel para usuarios autenticados. */
export function useFeatureCtaDestination(feature: MarketingFeature): string {
  const { user } = useAuth();
  return user ? PANEL_ROUTES[feature] : '/signup';
}
