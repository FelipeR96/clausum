import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { PageSeo } from '@/seo/PageSeo';
import { SEO_PAGES } from '@/seo/pages';
import { HOME_FAQ } from '@/seo/landing-content';
import { HeroSection } from '@/components/landing/HeroSection';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { FaqSection } from '@/components/landing/FaqSection';

export function LandingPage() {
  const page = SEO_PAGES.home;

  return (
    <MarketingLayout>
      <PageSeo page={page} faq={HOME_FAQ} />
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <CtaSection />
      <FaqSection />
    </MarketingLayout>
  );
}
