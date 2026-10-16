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
import type { AnalysisOptions, JobExecutionOptions } from './analysis.service';
import { setComparisonProgress } from './processing-progress.service';
import { AppError, esReintentable } from '../utils/errors';
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

/**
 * Prepara la comparación: valida propiedad de ambos contratos, reserva cuota
 * y crea el documento en `processing`. Corre dentro de la request.
 */
export async function initiateCompareContracts(
  userId: string,
  contractIdA: string,
  contractIdB: string
): Promise<{ comparisonId: string }> {
  const [contractA, contractB] = await Promise.all([
    getOwnedContract(userId, contractIdA),
    getOwnedContract(userId, contractIdB),
  ]);

  if (!contractA.storagePath || !contractB.storagePath) {
    throw new AppError('Ambos contratos deben tener PDF asociado', 422, 'NO_PDF');
  }

  await reserveComparisonUsage(userId);

  const comparisonRef = adminDb().collection(COLLECTIONS.comparisons).doc();
  await comparisonRef.set({
    userId,
    contractIdA,
    contractIdB,
    status: 'processing',
    processingProgress: {
      stage: 'queued',
      message: 'Preparando comparación…',
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  return { comparisonId: comparisonRef.id };
}

/**
 * Ejecuta la comparación. Es el trabajo más lento de los tres: extrae y
 * analiza DOS documentos, así que va en una tarea de Cloud Tasks.
 */
export async function executeCompareContracts(
  userId: string,
  contractIdA: string,
  contractIdB: string,
  comparisonId: string,
  options?: AnalysisOptions,
  execOptions?: JobExecutionOptions
): Promise<{ comparisonId: string; comparison: Comparison }> {
  const startedAt = Date.now();
  const comparisonRef = adminDb().collection(COLLECTIONS.comparisons).doc(comparisonId);

  // Idempotencia: ver la nota en executeAnalyzeContract.
  const existing = await comparisonRef.get();
  if (!existing.exists) {
    throw new AppError('Comparación no encontrada', 404, 'COMPARISON_NOT_FOUND');
  }
  if (existing.get('status') === 'done') {
    logger.info('api', 'Comparación ya completada; se omite el reintento', {
      userId,
      metadata: { comparisonId },
    });
    return { comparisonId, comparison: existing.data() as Comparison };
  }

  const [contractA, contractB] = await Promise.all([
    getOwnedContract(userId, contractIdA),
    getOwnedContract(userId, contractIdB),
  ]);

  if (!contractA.storagePath || !contractB.storagePath) {
    throw new AppError('Ambos contratos deben tener PDF asociado', 422, 'NO_PDF');
  }

  const reportProgress = (progress: Parameters<typeof setComparisonProgress>[1]) =>
    setComparisonProgress(comparisonId, progress);

  try {
    await reportProgress({
      stage: 'extracting',
      message: 'Extrayendo texto de ambos documentos…',
    });

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

    await reportProgress({
      stage: 'legal_context',
      message: 'Consultando contexto legal…',
    });

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

    await reportProgress({
      stage: 'ai_analysis',
      message: 'Comparando cláusula por cláusula…',
    });

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
      processingProgress: FieldValue.delete(),
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

    // Un error de plan o de archivo ya es definitivo en el primer
    // intento: reintentarlo solo retrasa el motivo real.
    if (execOptions?.markErrorOnFailure === false && esReintentable(error)) {
      await reportProgress({ stage: 'queued', message: 'Reintentando…' });
      logger.warn('deepseek', 'Fallo en intento de comparación; se reintentará', {
        userId,
        metadata: {
          contractIdA,
          contractIdB,
          comparisonId,
          attempt: execOptions?.attempt ?? 0,
          reason: message,
        },
      });
      throw error;
    }

    await releaseComparisonUsage(userId);
    await comparisonRef.update({
      status: 'error',
      errorMessage: message,
      completedAt: FieldValue.serverTimestamp(),
      processingProgress: FieldValue.delete(),
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

/**
 * Envoltorio sincrónico para scripts y pruebas. El endpoint HTTP encola.
 */
export async function compareContracts(
  userId: string,
  contractIdA: string,
  contractIdB: string,
  options?: AnalysisOptions
): Promise<{ comparisonId: string; comparison: Comparison }> {
  const { comparisonId } = await initiateCompareContracts(userId, contractIdA, contractIdB);
  return executeCompareContracts(userId, contractIdA, contractIdB, comparisonId, options);
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
