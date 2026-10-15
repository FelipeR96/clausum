import type {
  ContractTypeCatalog,
  LawArticle,
  LegalSearchMethod,
  LegalSearchQuery,
  LegalSearchResult,
  LegalTopic,
} from '@clausum/shared';
import { COLLECTIONS, CONTRACT_TYPE_CATALOG } from '@clausum/shared';
import { adminDb } from '../../firebase/admin';
import { logger } from '../../utils/logger';
import type { LegalKnowledgeService } from './LegalKnowledgeService';

const ACTIVE_LAW_STATUS = 'vigente';

function mapLawDoc(id: string, data: FirebaseFirestore.DocumentData): LawArticle {
  return {
    id,
    country: data.country,
    codeName: data.codeName,
    normType: data.normType,
    article: data.article,
    title: data.title,
    content: data.content,
    summary: data.summary,
    category: data.category,
    topics: data.topics ?? [],
    keywords: data.keywords ?? [],
    contractTypeIds: data.contractTypeIds ?? [],
    riskLevel: data.riskLevel,
    officialSource: data.officialSource,
    status: data.status,
    updatedAt: data.updatedAt,
    embeddingVersion: data.embeddingVersion,
    embeddingModel: data.embeddingModel,
  };
}

function mapContractTypeDoc(
  id: string,
  data: FirebaseFirestore.DocumentData
): ContractTypeCatalog {
  return {
    id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    keywords: data.keywords ?? [],
    relatedLawIds: data.relatedLawIds ?? [],
    legalCategories: data.legalCategories ?? [],
    topArticleIds: data.topArticleIds ?? [],
    commonRisks: data.commonRisks ?? [],
    countries: data.countries ?? [],
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
    updatedAt: data.updatedAt,
  };
}

function mapTopicDoc(id: string, data: FirebaseFirestore.DocumentData): LegalTopic {
  return {
    id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    keywords: data.keywords ?? [],
    relatedLawIds: data.relatedLawIds ?? [],
    relatedContractTypeIds: data.relatedContractTypeIds ?? [],
    active: data.active ?? true,
    updatedAt: data.updatedAt,
  };
}

function scoreArticle(
  article: LawArticle,
  keywords: string[],
  topicSlugs: string[]
): number {
  let score = 0;
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  for (const kw of lowerKeywords) {
    if (article.keywords.some((k) => k.toLowerCase().includes(kw) || kw.includes(k.toLowerCase()))) {
      score += 2;
    }
    if (article.content.toLowerCase().includes(kw)) score += 1;
    if (article.title?.toLowerCase().includes(kw)) score += 1;
  }

  for (const topic of topicSlugs) {
    if (article.topics.includes(topic)) score += 3;
  }

  return score;
}

function uniqueArticles(articles: LawArticle[]): LawArticle[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export class FirestoreLegalSearchProvider implements LegalKnowledgeService {
  async getArticleById(id: string): Promise<LawArticle | null> {
    const doc = await adminDb().collection(COLLECTIONS.laws).doc(id).get();
    if (!doc.exists) return null;
    return mapLawDoc(doc.id, doc.data()!);
  }

  async getArticlesByIds(ids: string[]): Promise<LawArticle[]> {
    if (!ids.length) return [];
    const results = await Promise.all(ids.map((id) => this.getArticleById(id)));
    return results.filter((a): a is LawArticle => a !== null);
  }

  async getContractType(id: string): Promise<ContractTypeCatalog | null> {
    const doc = await adminDb().collection(COLLECTIONS.contractTypes).doc(id).get();
    if (doc.exists) return mapContractTypeDoc(doc.id, doc.data()!);
    return CONTRACT_TYPE_CATALOG.find((ct) => ct.id === id) ?? null;
  }

  async listContractTypes(country?: string): Promise<ContractTypeCatalog[]> {
    const snapshot = await adminDb()
      .collection(COLLECTIONS.contractTypes)
      .where('active', '==', true)
      .orderBy('sortOrder', 'asc')
      .get();

    const fromFirestore = snapshot.docs
      .map((doc) => mapContractTypeDoc(doc.id, doc.data()))
      .filter((ct) => !country || ct.countries.includes(country));

    if (fromFirestore.length > 0) return fromFirestore;

    return CONTRACT_TYPE_CATALOG.filter(
      (ct) => ct.active !== false && (!country || ct.countries.includes(country))
    ).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async getTopicBySlug(slug: string): Promise<LegalTopic | null> {
    const snapshot = await adminDb()
      .collection(COLLECTIONS.legalTopics)
      .where('slug', '==', slug)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return mapTopicDoc(doc.id, doc.data());
  }

  async listTopics(): Promise<LegalTopic[]> {
    const snapshot = await adminDb()
      .collection(COLLECTIONS.legalTopics)
      .where('active', '==', true)
      .get();
    return snapshot.docs.map((doc) => mapTopicDoc(doc.id, doc.data()));
  }

  async searchArticles(query: LegalSearchQuery): Promise<LegalSearchResult> {
    const limit = query.limit ?? 25;
    const keywords = query.keywords ?? [];
    const topicSlugs = query.topicSlugs ?? [];
    const collected: LawArticle[] = [];

    const contractType = query.contractTypeId
      ? await this.getContractType(query.contractTypeId)
      : null;

    if (contractType?.topArticleIds?.length) {
      const top = await this.getArticlesByIds(contractType.topArticleIds.slice(0, limit));
      collected.push(...top.filter((a) => a.country === query.country));
    }

    if (contractType?.relatedLawIds?.length) {
      const related = await this.getArticlesByIds(contractType.relatedLawIds.slice(0, limit));
      collected.push(...related.filter((a) => a.country === query.country));
    }

    if (query.contractTypeId) {
      const byType = await adminDb()
        .collection(COLLECTIONS.laws)
        .where('country', '==', query.country)
        .where('status', '==', ACTIVE_LAW_STATUS)
        .where('contractTypeIds', 'array-contains', query.contractTypeId)
        .limit(limit)
        .get();

      collected.push(...byType.docs.map((doc) => mapLawDoc(doc.id, doc.data())));
    }

    const keywordBatch = keywords.slice(0, 10);
    if (keywordBatch.length) {
      const byKeywords = await adminDb()
        .collection(COLLECTIONS.laws)
        .where('country', '==', query.country)
        .where('status', '==', ACTIVE_LAW_STATUS)
        .where('keywords', 'array-contains-any', keywordBatch)
        .limit(limit)
        .get();

      collected.push(...byKeywords.docs.map((doc) => mapLawDoc(doc.id, doc.data())));
    }

    const topics: LegalTopic[] = [];
    for (const slug of topicSlugs.slice(0, 5)) {
      const topic = await this.getTopicBySlug(slug);
      if (topic) {
        topics.push(topic);
        if (topic.relatedLawIds.length) {
          const topicLaws = await this.getArticlesByIds(topic.relatedLawIds.slice(0, limit));
          collected.push(...topicLaws.filter((a) => a.country === query.country));
        }
      }
    }

    if (contractType) {
      for (const category of contractType.legalCategories.slice(0, 5)) {
        const byCategory = await adminDb()
          .collection(COLLECTIONS.laws)
          .where('country', '==', query.country)
          .where('status', '==', ACTIVE_LAW_STATUS)
          .where('category', '==', category)
          .limit(Math.min(5, limit))
          .get();
        collected.push(...byCategory.docs.map((doc) => mapLawDoc(doc.id, doc.data())));
      }
    }

    const deduped = uniqueArticles(collected);
    const ranked = deduped
      .map((article) => ({
        article,
        score: scoreArticle(article, keywords, topicSlugs),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.article);

    if (!ranked.length) {
      logger.info('api', 'Búsqueda legal sin artículos (corpus pendiente de carga)', {
        metadata: {
          country: query.country,
          contractTypeId: query.contractTypeId ?? 'none',
        },
      });
    }

    return {
      articles: ranked,
      contractType,
      topics,
      searchMethod: 'firestore' as LegalSearchMethod,
    };
  }
}
