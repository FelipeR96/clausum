import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/seo/PageSeo';
import { SEO_PAGES } from '@/seo/pages';
import { RisksHero } from '@/components/risks/RisksHero';
import { RisksBentoGrid } from '@/components/risks/RisksBentoGrid';
import { RisksPortfolioSection } from '@/components/risks/RisksPortfolioSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { SeoBreadcrumbs } from '@/components/marketing/SeoBreadcrumbs';
import { SeoRichContent } from '@/components/marketing/SeoRichContent';
import { SeoFaqSection } from '@/components/marketing/SeoFaqSection';
import {
  RISKS_FAQ,
  RISKS_SEO_CONTENT,
} from '@/seo/landing-content';

export function RisksPage() {
  const page = SEO_PAGES.risks;

  return (
    <MarketingLayout>
      <PageSeo page={page} faq={RISKS_FAQ} />
      <SeoBreadcrumbs items={page.breadcrumbs} />
      <RisksHero />
      <RisksBentoGrid />
      <RisksPortfolioSection />
      <SeoRichContent blocks={RISKS_SEO_CONTENT} />
      <SeoFaqSection
        items={RISKS_FAQ}
        title="Preguntas sobre detección de riesgos"
        id="faq-riesgos"
      />
      <CtaSection />
    </MarketingLayout>
  );
}
