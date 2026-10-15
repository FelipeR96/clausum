import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { PRIVACY_SECTIONS } from '@/content/legal/privacidad';
import { SEO_PAGES } from '@/seo/pages';

export function PrivacyPolicyPage() {
  return (
    <LegalDocumentLayout
      page={SEO_PAGES.privacy}
      title="Política de privacidad y tratamiento de datos personales"
      intro="En Clausum tratamos sus datos personales con transparencia y conforme a la Ley 1581 de 2012 y normas complementarias en Colombia. Este documento explica qué datos recopilamos, para qué los usamos y cómo puede ejercer sus derechos."
      sections={PRIVACY_SECTIONS}
    />
  );
}
