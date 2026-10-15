import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { COOKIES_SECTIONS } from '@/content/legal/cookies';
import { SEO_PAGES } from '@/seo/pages';

export function CookiesPolicyPage() {
  return (
    <LegalDocumentLayout
      page={SEO_PAGES.cookies}
      title="Política de cookies"
      intro="Información sobre el uso de cookies y tecnologías similares en el sitio y la aplicación de Clausum."
      sections={COOKIES_SECTIONS}
    />
  );
}
