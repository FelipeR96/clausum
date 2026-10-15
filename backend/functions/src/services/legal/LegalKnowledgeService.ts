import type {
  ContractTypeCatalog,
  LawArticle,
  LegalSearchQuery,
  LegalSearchResult,
  LegalTopic,
} from '@clausum/shared';

/**
 * Abstracción de búsqueda legal.
 * v1: Firestore (keywords, categorías, tipos)
 * v2: Vector Search (embeddings) — sin cambiar consumidores
 */
export interface LegalKnowledgeService {
  searchArticles(query: LegalSearchQuery): Promise<LegalSearchResult>;
  getArticleById(id: string): Promise<LawArticle | null>;
  getArticlesByIds(ids: string[]): Promise<LawArticle[]>;
  getContractType(id: string): Promise<ContractTypeCatalog | null>;
  listContractTypes(country?: string): Promise<ContractTypeCatalog[]>;
  getTopicBySlug(slug: string): Promise<LegalTopic | null>;
  listTopics(): Promise<LegalTopic[]>;
}
