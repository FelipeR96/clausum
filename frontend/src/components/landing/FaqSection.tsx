import { SeoFaqSection } from '@/components/marketing/SeoFaqSection';
import { HOME_FAQ } from '@/seo/landing-content';

export function FaqSection() {
  return <SeoFaqSection items={HOME_FAQ} />;
}
