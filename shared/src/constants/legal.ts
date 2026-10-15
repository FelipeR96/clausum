import type { CountryCode, ContractTypeCatalog, LegalTopic } from '../types/legal.types';
import catalog from '../../data/legal-catalog.json';

export const DEFAULT_COUNTRY: CountryCode = 'CO';

/** Países con corpus normativo cargado en el sistema (RAG). */
export const LEGAL_CORPUS_COUNTRIES: readonly CountryCode[] = ['CO'];

export function hasLegalCorpus(country: CountryCode): boolean {
  return (LEGAL_CORPUS_COUNTRIES as readonly string[]).includes(country);
}

export const SUPPORTED_COUNTRIES: Array<{ code: CountryCode; name: string }> = [
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'México' },
  { code: 'ES', name: 'España' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brasil' },
];

/**
 * Catálogo de tipos de contrato (sin leyes).
 * Fuente: shared/data/legal-catalog.json
 */
export const CONTRACT_TYPE_CATALOG = catalog.contractTypes as Omit<
  ContractTypeCatalog,
  'updatedAt'
>[];

export const LEGAL_TOPIC_CATALOG = catalog.legalTopics as Omit<LegalTopic, 'updatedAt'>[];
