import { FieldValue } from 'firebase-admin/firestore';
import type { LegalContext } from '@clausum/shared';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import type { RisksResponse } from '../integrations/deepseek/schemas';
import { addHistoryEntry } from './history.service';
import { createAlertsForRisks } from './alerts.service';

export type PersistRisksAnalysisInput = {
  userId: string;
  contractId: string;
  parsed: RisksResponse;
  legalContext: LegalContext;
  tokensUsed?: number;
  model?: string;
  processingMs?: number;
  /** Si se indica, actualiza ese documento en lugar de crear uno nuevo. */
  analysisId?: string;
};

/** Guarda un documento de análisis mode=risks y dispara alertas. */
export async function persistRisksAnalysis(
  input: PersistRisksAnalysisInput
): Promise<{ risksAnalysisId: string }> {
  const {
    userId,
    contractId,
    parsed,
    legalContext,
    tokensUsed,
    model,
    processingMs,
    analysisId,
  } = input;
  const risksRef = analysisId
    ? adminDb().collection(COLLECTIONS.analyses).doc(analysisId)
    : adminDb().collection(COLLECTIONS.analyses).doc();

  const payload = {
    userId,
    contractId,
    mode: 'risks' as const,
    status: 'done' as const,
    summary: parsed.summary,
    score: parsed.score,
    risks: parsed.risks,
    country: legalContext.country,
    ...(legalContext.contractTypeId ? { contractTypeId: legalContext.contractTypeId } : {}),
    legalArticleIds: legalContext.articleIds,
    lawReferences: parsed.lawReferences ?? [],
    legalSearchMethod: legalContext.searchMethod,
    ...(tokensUsed != null ? { tokensUsed } : {}),
    ...(model ? { model } : {}),
    ...(processingMs != null ? { processingMs } : {}),
    completedAt: FieldValue.serverTimestamp(),
  };

  if (analysisId) {
    await risksRef.update(payload);
  } else {
    await risksRef.set({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await createAlertsForRisks(userId, contractId, risksRef.id, parsed.risks);

  await addHistoryEntry(userId, {
    action: 'analysis.complete',
    entityType: 'analysis',
    entityId: risksRef.id,
    metadata: {
      mode: 'risks',
      contractId,
      riskCount: parsed.risks.length,
      legalArticles: legalContext.articleIds.length,
    },
  });

  return { risksAnalysisId: risksRef.id };
}