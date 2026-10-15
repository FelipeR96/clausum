import type { Contract, CountryCode, LegalContext } from '@clausum/shared';
import { hasLegalCorpus } from '@clausum/shared';
import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { classifyContract } from './contract-classifier.service';
import { getLegalKnowledgeService } from './legal';
import { extractKeywordsFromText, extractTopicHints } from './legal/text-utils';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';

export interface BuildLegalContextInput {
  contractText: string;
  contract?: Contract;
  contractId?: string;
  country?: CountryCode;
  contractTypeId?: string;
}

export async function buildLegalContext(
  input: BuildLegalContextInput
): Promise<LegalContext> {
  const classification = await classifyContract({
    contractText: input.contractText,
    contract: input.contract,
    country: input.country,
    contractTypeId: input.contractTypeId,
  });

  if (!hasLegalCorpus(classification.country)) {
    const context: LegalContext = {
      country: classification.country,
      contractTypeId: classification.contractTypeId,
      contractTypeName: classification.contractTypeName,
      detectedContractTypeId:
        classification.method === 'keyword' ? classification.contractTypeId : null,
      articles: [],
      topics: [],
      articleIds: [],
      topicIds: [],
      searchMethod: 'none',
    };

    if (input.contractId) {
      await persistContractLegalProfile(input.contractId, classification, context);
    }

    logger.info('api', 'Contexto legal omitido (sin corpus para el país)', {
      metadata: { country: classification.country },
    });

    return context;
  }

  const keywords = extractKeywordsFromText(input.contractText);
  const topicSlugs = extractTopicHints(input.contractText);

  const searchResult = await getLegalKnowledgeService().searchArticles({
    country: classification.country,
    contractTypeId: classification.contractTypeId ?? undefined,
    keywords,
    topicSlugs,
    textSample: input.contractText.slice(0, 2000),
    limit: getEnv().LEGAL_MAX_ARTICLES,
  });

  const context: LegalContext = {
    country: classification.country,
    contractTypeId: classification.contractTypeId,
    contractTypeName: classification.contractTypeName,
    detectedContractTypeId:
      classification.method === 'keyword' ? classification.contractTypeId : null,
    articles: searchResult.articles,
    topics: searchResult.topics,
    articleIds: searchResult.articles.map((a) => a.id),
    topicIds: searchResult.topics.map((t) => t.id),
    searchMethod:
      searchResult.articles.length > 0 ? searchResult.searchMethod : 'none',
  };

  if (input.contractId) {
    await persistContractLegalProfile(input.contractId, classification, context);
  }

  logger.info('api', 'Contexto legal construido', {
    metadata: {
      country: context.country,
      contractTypeId: context.contractTypeId ?? 'none',
      articlesFound: context.articles.length,
      searchMethod: context.searchMethod,
    },
  });

  return context;
}

async function persistContractLegalProfile(
  contractId: string,
  classification: { country: CountryCode; contractTypeId: string | null },
  context: LegalContext
): Promise<void> {
  const update: Record<string, unknown> = {
    country: classification.country,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (classification.contractTypeId && context.detectedContractTypeId) {
    update.detectedContractTypeId = context.detectedContractTypeId;
  }

  await adminDb().collection(COLLECTIONS.contracts).doc(contractId).update(update);
}

export function mergeLegalContexts(contexts: LegalContext[]): LegalContext {
  if (!contexts.length) {
    throw new Error('mergeLegalContexts requiere al menos un contexto');
  }

  const base = contexts[0];
  const articleMap = new Map<string, (typeof base.articles)[0]>();
  const topicMap = new Map<string, (typeof base.topics)[0]>();

  for (const ctx of contexts) {
    for (const article of ctx.articles) articleMap.set(article.id, article);
    for (const topic of ctx.topics) topicMap.set(topic.id, topic);
  }

  return {
    country: base.country,
    contractTypeId: base.contractTypeId,
    contractTypeName: base.contractTypeName,
    detectedContractTypeId: base.detectedContractTypeId,
    articles: [...articleMap.values()],
    topics: [...topicMap.values()],
    articleIds: [...articleMap.keys()],
    topicIds: [...topicMap.keys()],
    searchMethod: contexts.some((c) => c.searchMethod === 'firestore')
      ? 'firestore'
      : contexts.some((c) => c.searchMethod === 'vector')
        ? 'vector'
        : 'none',
  };
}
