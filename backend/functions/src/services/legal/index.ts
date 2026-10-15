import type { LegalKnowledgeService } from './LegalKnowledgeService';
import { FirestoreLegalSearchProvider } from './FirestoreLegalSearchProvider';
import { VectorLegalSearchProvider } from './VectorLegalSearchProvider';
import { getEnv } from '../../config/env';

let instance: LegalKnowledgeService | null = null;

export function getLegalKnowledgeService(): LegalKnowledgeService {
  if (instance) return instance;

  const provider = getEnv().LEGAL_SEARCH_PROVIDER;
  instance =
    provider === 'vector'
      ? new VectorLegalSearchProvider()
      : new FirestoreLegalSearchProvider();

  return instance;
}

export { FirestoreLegalSearchProvider, VectorLegalSearchProvider };
export type { LegalKnowledgeService };
