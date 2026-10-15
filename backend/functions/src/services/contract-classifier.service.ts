import type { Contract, ContractClassification, CountryCode } from '@clausum/shared';
import { DEFAULT_COUNTRY } from '@clausum/shared';
import { getLegalKnowledgeService } from './legal';
import { extractKeywordsFromText } from './legal/text-utils';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';

export interface ClassifyContractInput {
  contractText: string;
  contract?: Partial<Contract>;
  country?: CountryCode;
  contractTypeId?: string;
}

export async function classifyContract(
  input: ClassifyContractInput
): Promise<ContractClassification> {
  const country =
    input.country ?? input.contract?.country ?? (getEnv().LEGAL_DEFAULT_COUNTRY as CountryCode);

  const explicitTypeId = input.contractTypeId ?? input.contract?.contractTypeId;
  if (explicitTypeId) {
    const contractType = await getLegalKnowledgeService().getContractType(explicitTypeId);
    return {
      country,
      contractTypeId: explicitTypeId,
      contractTypeName: contractType?.name ?? explicitTypeId,
      confidence: 1,
      method: 'explicit',
    };
  }

  const catalog = await getLegalKnowledgeService().listContractTypes(country);
  const classificationText = [
    input.contract?.title,
    input.contract?.fileName,
    input.contractText,
  ]
    .filter(Boolean)
    .join('\n');
  const textLower = classificationText.toLowerCase();
  const textKeywords = extractKeywordsFromText(classificationText, 30);

  let bestId: string | null = null;
  let bestName: string | null = null;
  let bestScore = 0;

  for (const ct of catalog) {
    let score = 0;
    for (const kw of ct.keywords) {
      if (textLower.includes(kw.toLowerCase())) score += 2;
    }
    for (const kw of textKeywords) {
      if (ct.keywords.some((k) => k.toLowerCase().includes(kw))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = ct.id;
      bestName = ct.name;
    }
  }

  const minScore = getEnv().LEGAL_CLASSIFIER_MIN_SCORE;
  if (bestId && bestScore >= minScore) {
    logger.info('api', 'Tipo de contrato detectado por keywords', {
      metadata: { contractTypeId: bestId, score: bestScore },
    });
    return {
      country,
      contractTypeId: bestId,
      contractTypeName: bestName,
      confidence: Math.min(1, bestScore / 10),
      method: 'keyword',
    };
  }

  return {
    country: country ?? DEFAULT_COUNTRY,
    contractTypeId: null,
    contractTypeName: null,
    confidence: 0,
    method: 'keyword',
  };
}
