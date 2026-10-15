import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/seo/PageSeo';
import { SEO_PAGES } from '@/seo/pages';
import { CompareHero } from '@/components/compare/CompareHero';
import { CompareDiffViewer } from '@/components/compare/CompareDiffViewer';
import { CompareFeatures } from '@/components/compare/CompareFeatures';
import { CtaSection } from '@/components/landing/CtaSection';
import { SeoBreadcrumbs } from '@/components/marketing/SeoBreadcrumbs';
import { SeoRichContent } from '@/components/marketing/SeoRichContent';
import { SeoFaqSection } from '@/components/marketing/SeoFaqSection';
import {
  COMPARE_FAQ,
  COMPARE_SEO_CONTENT,
} from '@/seo/landing-content';

export function ComparePage() {
  const page = SEO_PAGES.compare;

  return (
    <MarketingLayout>
      <PageSeo page={page} faq={COMPARE_FAQ} />
      <SeoBreadcrumbs items={page.breadcrumbs} />
      <CompareHero />
      <CompareDiffViewer />
      <CompareFeatures />
      <SeoRichContent blocks={COMPARE_SEO_CONTENT} />
      <SeoFaqSection
        items={COMPARE_FAQ}
        title="Preguntas sobre comparación de contratos"
        id="faq-comparar"
      />
      <CtaSection />
    </MarketingLayout>
  );
}
