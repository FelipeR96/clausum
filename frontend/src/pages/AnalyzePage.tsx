import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/seo/PageSeo';
import { SEO_PAGES } from '@/seo/pages';
import { AnalyzeHero } from '@/components/analyze/AnalyzeHero';
import { BentoFeatures } from '@/components/analyze/BentoFeatures';
import { SectorPrecision } from '@/components/analyze/SectorPrecision';
import { CtaSection } from '@/components/landing/CtaSection';
import { SeoBreadcrumbs } from '@/components/marketing/SeoBreadcrumbs';
import { SeoRichContent } from '@/components/marketing/SeoRichContent';
import { SeoFaqSection } from '@/components/marketing/SeoFaqSection';
import {
  ANALYZE_FAQ,
  ANALYZE_SEO_CONTENT,
} from '@/seo/landing-content';

export function AnalyzePage() {
  const page = SEO_PAGES.analyze;

  return (
    <MarketingLayout>
      <PageSeo page={page} faq={ANALYZE_FAQ} />
      <SeoBreadcrumbs items={page.breadcrumbs} />
      <AnalyzeHero />
      <BentoFeatures />
      <SectorPrecision />
      <SeoRichContent blocks={ANALYZE_SEO_CONTENT} />
      <div className="seo-below-fold">
        <SeoFaqSection
        items={ANALYZE_FAQ}
        title="Preguntas sobre análisis de contratos"
        id="faq-analizar"
        />
      </div>
      <CtaSection />
    </MarketingLayout>
  );
}
