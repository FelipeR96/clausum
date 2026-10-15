import type {
  ContractTypeCatalog,
  LawArticle,
  LegalSearchQuery,
  LegalSearchResult,
  LegalTopic,
} from '@clausum/shared';
import { logger } from '../../utils/logger';
import type { LegalKnowledgeService } from './LegalKnowledgeService';

/**
 * Placeholder para búsqueda semántica con embeddings (v2).
 * No acoplado al resto del sistema — cambiar provider vía env.
 */
export class VectorLegalSearchProvider implements LegalKnowledgeService {
  async searchArticles(query: LegalSearchQuery): Promise<LegalSearchResult> {
    logger.warn('api', 'VectorLegalSearchProvider no implementado; usar LEGAL_SEARCH_PROVIDER=firestore', {
      metadata: { country: query.country },
    });
    return {
      articles: [],
      contractType: null,
      topics: [],
      searchMethod: 'vector',
    };
  }

  async getArticleById(): Promise<LawArticle | null> {
    return null;
  }

  async getArticlesByIds(): Promise<LawArticle[]> {
    return [];
  }

  async getContractType(): Promise<ContractTypeCatalog | null> {
    return null;
  }

  async listContractTypes(): Promise<ContractTypeCatalog[]> {
    return [];
  }

  async getTopicBySlug(): Promise<LegalTopic | null> {
    return null;
  }

  async listTopics(): Promise<LegalTopic[]> {
    return [];
  }
}
