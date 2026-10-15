import type { FirestoreDate } from './common.types';

/** ISO 3166-1 alpha-2. Extensible sin migración. */
export type CountryCode =
  | 'CO'
  | 'MX'
  | 'ES'
  | 'CL'
  | 'PE'
  | 'US'
  | 'AR'
  | 'BR'
  | (string & {});

export type LawStatus = 'vigente' | 'derogado' | 'reforma';

export type LawNormType =
  | 'ley'
  | 'codigo'
  | 'decreto'
  | 'reglamento'
  | 'estatuto'
  | 'otro';

export type LegalSearchMethod = 'firestore' | 'vector' | 'none';

/**
 * Un artículo legal = un documento en `laws/{lawId}`.
 * Ejemplo de ID: `co_civil_1602`, `co_ley820_5`
 */
export interface LawArticle {
  id: string;
  country: CountryCode;
  codeName: string;
  normType: LawNormType;
  article: string;
  title?: string;
  content: string;
  summary?: string;
  category?: string;
  topics: string[];
  keywords: string[];
  contractTypeIds: string[];
  riskLevel?: 'high' | 'medium' | 'low';
  officialSource?: string;
  status: LawStatus;
  updatedAt?: FirestoreDate;
  /** Preparado para v2 embeddings — no usar en v1 */
  embeddingVersion?: number;
  embeddingModel?: string;
}

/** Catálogo en `contract_types/{id}` */
export interface ContractTypeCatalog {
  id: string;
  slug: string;
  name: string;
  description: string;
  keywords: string[];
  relatedLawIds: string[];
  legalCategories: string[];
  topArticleIds: string[];
  commonRisks: string[];
  countries: CountryCode[];
  active: boolean;
  sortOrder: number;
  updatedAt?: FirestoreDate;
}

/** Catálogo en `legal_topics/{id}` */
export interface LegalTopic {
  id: string;
  slug: string;
  name: string;
  description?: string;
  keywords: string[];
  relatedLawIds: string[];
  relatedContractTypeIds: string[];
  active: boolean;
  updatedAt?: FirestoreDate;
}

export interface LegalSearchQuery {
  country: CountryCode;
  contractTypeId?: string;
  topicSlugs?: string[];
  keywords?: string[];
  /** Fragmento del contrato para extraer términos */
  textSample?: string;
  limit?: number;
}

export interface LegalSearchResult {
  articles: LawArticle[];
  contractType: ContractTypeCatalog | null;
  topics: LegalTopic[];
  searchMethod: LegalSearchMethod;
}

/** Contexto RAG enviado a DeepSeek */
export interface LegalContext {
  country: CountryCode;
  contractTypeId: string | null;
  contractTypeName: string | null;
  detectedContractTypeId: string | null;
  articles: LawArticle[];
  topics: LegalTopic[];
  articleIds: string[];
  topicIds: string[];
  searchMethod: LegalSearchMethod;
}

/** Cita normativa en respuesta de IA */
export interface LawReference {
  lawId: string;
  article: string;
  codeName: string;
  excerpt?: string;
  relevance?: string;
}

export interface ContractClassification {
  country: CountryCode;
  contractTypeId: string | null;
  contractTypeName: string | null;
  confidence: number;
  method: 'explicit' | 'keyword' | 'deepseek';
}
