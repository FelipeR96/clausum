import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { LEGAL_NOTICE_SECTIONS } from '@/content/legal/aviso-legal';
import { SEO_PAGES } from '@/seo/pages';

export function LegalNoticePage() {
  return (
    <LegalDocumentLayout
      page={SEO_PAGES.legalNotice}
      title="Aviso legal y descargo de responsabilidad"
      intro="Clausum es una herramienta tecnológica de apoyo al análisis contractual. No reemplaza la asesoría de un abogado. Este aviso describe las limitaciones del servicio y su uso responsable."
      sections={LEGAL_NOTICE_SECTIONS}
    />
  );
}
