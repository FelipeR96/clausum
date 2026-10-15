/** Última actualización de los textos legales (mostrada en cada página). */
export const LEGAL_LAST_UPDATED = '3 de julio de 2026';

export const LEGAL_CONTACT_EMAIL = 'soporte@clausum.com';

export const LEGAL_ENTITY_NAME = 'Clausum';

export const LEGAL_COUNTRY = 'Colombia';

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};
