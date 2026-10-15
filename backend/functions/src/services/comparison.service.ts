import { FieldValue } from 'firebase-admin/firestore';
import type { Comparison, ComparisonReviewStatus } from '@clausum/shared';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { callDeepSeek } from '../integrations/deepseek/client';
import {
  buildComparePrompt,
  SYSTEM_LEGAL,
} from '../integrations/deepseek/legal-prompts';
import {
  compareResponseSchema,
  parseJsonResponse,
} from '../integrations/deepseek/schemas';
import { extractContractText } from './document.service';
import { getOwnedContract } from './contract.service';
import {
  releaseComparisonUsage,
  reserveComparisonUsage,
} from './usage.service';
import { addHistoryEntry } from './history.service';
import {
  buildLegalContext,
  mergeLegalContexts,
} from './legal-context.service';
import type { AnalysisOptions } from './analysis.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function getOwnedComparison(
  userId: string,
  comparisonId: string
): Promise<Comparison & { id: string }> {
  const doc = await adminDb().collection(COLLECTIONS.comparisons).doc(comparisonId).get();
  if (!doc.exists) {
    throw new AppError('Comparación no encontrada', 404, 'COMPARISON_NOT_FOUND');
  }
  const data = doc.data() as Comparison;
  if (data.userId !== userId) {
    throw new AppError('No tienes acceso a esta comparación', 403, 'FORBIDDEN');
  }
  return { id: doc.id, ...data };
}

export async function compareContracts(
  userId: string,
  contractIdA: string,
  contractIdB: string,
  options?: AnalysisOptions
): Promise<{ comparisonId: string; comparison: Comparison }> {
  const startedAt = Date.now();

  const [contractA, contractB] = await Promise.all([
    getOwnedContract(userId, contractIdA),
    getOwnedContract(userId, contractIdB),
  ]);

  if (!contractA.storagePath || !contractB.storagePath) {
    throw new AppError('Ambos contratos deben tener PDF asociado', 422, 'NO_PDF');
  }

  let quotaReserved = false;
  await reserveComparisonUsage(userId);
  quotaReserved = true;

  const comparisonRef = adminDb().collection(COLLECTIONS.comparisons).doc();
  await comparisonRef.set({
    userId,
    contractIdA,
    contractIdB,
    status: 'processing',
    createdAt: FieldValue.serverTimestamp(),
  });

  try {
    const [textA, textB] = await Promise.all([
      extractContractText(contractA.storagePath, contractA.fileName, {
        userId,
        contractId: contractIdA,
      }),
      extractContractText(contractB.storagePath, contractB.fileName, {
        userId,
        contractId: contractIdB,
      }),
    ]);

    const country =
      options?.country ?? contractA.country ?? contractB.country;
    const contractTypeId =
      options?.contractTypeId ??
      contractA.contractTypeId ??
      contractB.contractTypeId;

    const [ctxA, ctxB] = await Promise.all([
      buildLegalContext({
        contractText: textA.text,
        contract: contractA,
        country,
        contractTypeId,
      }),
      buildLegalContext({
        contractText: textB.text,
        contract: contractB,
        country,
        contractTypeId,
      }),
    ]);

    const legalContext = mergeLegalContexts([ctxA, ctxB]);

    const deepseek = await callDeepSeek(
      buildComparePrompt(textA.text, textB.text, legalContext),
      { userId, operation: 'compare', systemPrompt: SYSTEM_LEGAL }
    );

    const parsed = parseJsonResponse(deepseek.content, compareResponseSchema);
    const processingMs = Date.now() - startedAt;

    await comparisonRef.update({
      userId,
      contractIdA,
      contractIdB,
      title: `${contractA.title} vs ${contractB.title}`,
      status: 'done',
      summary: parsed.summary,
      diff: {
        ...parsed.diff,
        similarityScore: parsed.similarityScore,
      },
      country: legalContext.country,
      ...(legalContext.contractTypeId
        ? { contractTypeId: legalContext.contractTypeId }
        : {}),
      legalArticleIds: legalContext.articleIds,
      lawReferences: parsed.lawReferences ?? [],
      legalSearchMethod: legalContext.searchMethod,
      tokensUsed: deepseek.tokensUsed,
      completedAt: FieldValue.serverTimestamp(),
    });

    await addHistoryEntry(userId, {
      action: 'comparison.complete',
      entityType: 'comparison',
      entityId: comparisonRef.id,
      metadata: {
        contractIdA,
        contractIdB,
        similarityScore: parsed.similarityScore,
        legalArticles: legalContext.articleIds.length,
      },
    });

    logger.info('deepseek', 'Comparación completada', {
      userId,
      metadata: {
        comparisonId: comparisonRef.id,
        contractIdA,
        contractIdB,
        processingMs,
        legalArticles: legalContext.articleIds.length,
      },
    });

    const saved = await comparisonRef.get();
    return {
      comparisonId: comparisonRef.id,
      comparison: saved.data() as Comparison,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    if (quotaReserved) {
      await releaseComparisonUsage(userId);
      quotaReserved = false;
    }
    await comparisonRef.update({
      status: 'error',
      errorMessage: message,
      completedAt: FieldValue.serverTimestamp(),
    });
    logger.error('deepseek', 'Error en comparación', error, {
      userId,
      metadata: { contractIdA, contractIdB },
    });
    throw error instanceof AppError
      ? error
      : new AppError(message, 500, 'COMPARE_FAILED');
  }
}

export async function setComparisonReview(
  userId: string,
  comparisonId: string,
  decision: Exclude<ComparisonReviewStatus, 'pending'>
): Promise<Comparison & { id: string }> {
  const comparison = await getOwnedComparison(userId, comparisonId);

  if (comparison.status !== 'done') {
    throw new AppError(
      'La comparación aún no está lista para revisar',
      422,
      'COMPARISON_NOT_READY'
    );
  }

  if (comparison.reviewStatus && comparison.reviewStatus !== 'pending') {
    throw new AppError(
      'Esta comparación ya fue revisada',
      409,
      'COMPARISON_ALREADY_REVIEWED'
    );
  }

  await adminDb()
    .collection(COLLECTIONS.comparisons)
    .doc(comparisonId)
    .update({
      reviewStatus: decision,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  logger.info('api', 'Revisión de comparación registrada', {
    userId,
    metadata: { comparisonId, decision },
  });

  return getOwnedComparison(userId, comparisonId);
}
