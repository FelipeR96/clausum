import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { TERMS_SECTIONS } from '@/content/legal/terminos';
import { SEO_PAGES } from '@/seo/pages';

export function TermsPage() {
  return (
    <LegalDocumentLayout
      page={SEO_PAGES.terms}
      title="Términos y condiciones de uso"
      intro="Lea atentamente estos términos antes de usar Clausum. Regulan la relación entre usted y el servicio, incluyendo planes, pagos, limitaciones de responsabilidad y el carácter no vinculante del análisis con IA."
      sections={TERMS_SECTIONS}
    />
  );
}
