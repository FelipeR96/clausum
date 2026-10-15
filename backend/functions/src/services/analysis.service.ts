import { FieldValue } from 'firebase-admin/firestore';
import type { Analysis, CountryCode } from '@clausum/shared';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { callDeepSeek } from '../integrations/deepseek/client';
import {
  buildAnalyzePrompt,
  buildProAnalyzePrompt,
  SYSTEM_LEGAL,
} from '../integrations/deepseek/legal-prompts';
import {
  analyzeResponseSchema,
  parseJsonResponse,
  proAnalyzeResponseSchema,
} from '../integrations/deepseek/schemas';
import { extractContractText } from './document.service';
import { getOwnedContract } from './contract.service';
import { releaseAnalysisUsage, reserveAnalysisUsage } from './usage.service';
import { addHistoryEntry } from './history.service';
import { buildLegalContext } from './legal-context.service';
import { createAnalysisDoneAlert } from './alerts.service';
import { persistRisksAnalysis } from './risks-persist.service';
import { resolveEffectivePlanId } from './subscription.service';
import { setAnalysisProgress } from './processing-progress.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface AnalysisOptions {
  country?: CountryCode;
  contractTypeId?: string;
}

/**
 * Opciones de ejecución del trabajo pesado, no del análisis en sí.
 *
 * `markErrorOnFailure` existe por los reintentos de Cloud Tasks: en un
 * intento intermedio no se marca el análisis como `error` ni se libera la
 * cuota, porque la cola va a volver a intentarlo y el usuario vería un
 * estado de fallo que no es definitivo. Solo el último intento persiste el
 * error. La ruta sincrónica (`analyzeContract`) lo deja en `true`.
 */
export interface JobExecutionOptions {
  markErrorOnFailure?: boolean;
  attempt?: number;
}

export async function initiateAnalyzeContract(
  userId: string,
  contractId: string
): Promise<{ analysisId: string }> {
  const contract = await getOwnedContract(userId, contractId);
  if (!contract.storagePath) {
    throw new AppError('El contrato no tiene PDF asociado', 422, 'NO_PDF');
  }

  await reserveAnalysisUsage(userId);

  const analysisRef = adminDb().collection(COLLECTIONS.analyses).doc();
  await analysisRef.set({
    userId,
    contractId,
    mode: 'analyze',
    status: 'processing',
    processingProgress: {
      stage: 'queued',
      message: 'Preparando análisis…',
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await adminDb().collection(COLLECTIONS.contracts).doc(contractId).update({
    status: 'processing',
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { analysisId: analysisRef.id };
}

export async function executeAnalyzeContract(
  userId: string,
  contractId: string,
  analysisId: string,
  options?: AnalysisOptions,
  execOptions?: JobExecutionOptions
): Promise<void> {
  const startedAt = Date.now();
  const analysisRef = adminDb().collection(COLLECTIONS.analyses).doc(analysisId);

  // Guarda de idempotencia. Cloud Tasks puede entregar la misma tarea más de
  // una vez (reintento tras un timeout en el que el trabajo sí terminó, o
  // entrega duplicada). Sin esto se repetiría la llamada a DeepSeek, se
  // duplicaría la alerta y se sobrescribiría un resultado válido.
  const existing = await analysisRef.get();
  if (!existing.exists) {
    throw new AppError('Análisis no encontrado', 404, 'ANALYSIS_NOT_FOUND');
  }
  if (existing.get('status') === 'done') {
    logger.info('api', 'Análisis ya completado; se omite el reintento', {
      userId,
      metadata: { analysisId, contractId, attempt: execOptions?.attempt ?? 0 },
    });
    return;
  }

  const contract = await getOwnedContract(userId, contractId);
  let quotaReserved = true;

  const reportProgress = (progress: Parameters<typeof setAnalysisProgress>[1]) =>
    setAnalysisProgress(analysisId, progress);

  try {
    const { text, pageCount } = await extractContractText(
      contract.storagePath!,
      contract.fileName,
      { userId, contractId },
      reportProgress
    );

    await reportProgress({
      stage: 'legal_context',
      message: 'Consultando contexto legal…',
    });

    const legalContext = await buildLegalContext({
      contractText: text,
      contract,
      contractId,
      country: options?.country ?? contract.country,
      contractTypeId: options?.contractTypeId ?? contract.contractTypeId,
    });

    const planId = await resolveEffectivePlanId(userId);
    const isPro = planId === 'pro';

    await reportProgress({
      stage: 'ai_analysis',
      message: isPro
        ? 'Analizando contrato y perfil de riesgo…'
        : 'Analizando con inteligencia artificial…',
    });

    const deepseek = await callDeepSeek(
      isPro
        ? buildProAnalyzePrompt(text, legalContext)
        : buildAnalyzePrompt(text, legalContext),
      {
        userId,
        operation: isPro ? 'analyze_pro_unified' : 'analyze',
        systemPrompt: SYSTEM_LEGAL,
      }
    );

    const processingMs = Date.now() - startedAt;

    await reportProgress({
      stage: 'finalizing',
      message: isPro ? 'Guardando análisis y perfil de riesgo…' : 'Guardando resultados…',
    });

    if (isPro) {
      const proParsed = parseJsonResponse(deepseek.content, proAnalyzeResponseSchema);
      const parsed = proParsed.analysis;
      const riskScore = 100 - proParsed.risks.score;

      await analysisRef.update({
        status: 'done',
        summary: parsed.summary,
        parties: parsed.parties ?? [],
        metadata: parsed.metadata ?? {},
        score: parsed.score,
        clauses: parsed.clauses,
        country: legalContext.country,
        ...(legalContext.contractTypeId
          ? { contractTypeId: legalContext.contractTypeId }
          : {}),
        legalArticleIds: legalContext.articleIds,
        lawReferences: parsed.lawReferences ?? [],
        legalSearchMethod: legalContext.searchMethod,
        tokensUsed: deepseek.tokensUsed,
        model: deepseek.model,
        processingMs,
        completedAt: FieldValue.serverTimestamp(),
        processingProgress: FieldValue.delete(),
      });

      const { risksAnalysisId } = await persistRisksAnalysis({
        userId,
        contractId,
        parsed: proParsed.risks,
        legalContext,
        tokensUsed: deepseek.tokensUsed,
        model: deepseek.model,
        processingMs,
      });

      await adminDb().collection(COLLECTIONS.contracts).doc(contractId).update({
        status: 'analyzed',
        lastAnalysisId: analysisId,
        riskScore,
        pageCount,
        country: legalContext.country,
        ...(options?.contractTypeId || contract.contractTypeId
          ? { contractTypeId: options?.contractTypeId ?? contract.contractTypeId }
          : {}),
        ...(legalContext.detectedContractTypeId
          ? { detectedContractTypeId: legalContext.detectedContractTypeId }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await addHistoryEntry(userId, {
        action: 'analysis.complete',
        entityType: 'analysis',
        entityId: analysisId,
        metadata: {
          mode: 'analyze',
          contractId,
          score: parsed.score,
          country: legalContext.country,
          legalArticles: legalContext.articleIds.length,
          unifiedPro: true,
          risksAnalysisId,
        },
      });

      await createAnalysisDoneAlert(userId, contractId, analysisId, contract.title);

      logger.info('deepseek', 'Análisis Pro unificado completado', {
        userId,
        metadata: {
          contractId,
          analysisId,
          risksAnalysisId,
          processingMs,
          riskCount: proParsed.risks.risks.length,
          legalArticles: legalContext.articleIds.length,
        },
      });
      return;
    }

    const parsed = parseJsonResponse(deepseek.content, analyzeResponseSchema);

    await analysisRef.update({
      status: 'done',
      summary: parsed.summary,
      parties: parsed.parties ?? [],
      metadata: parsed.metadata ?? {},
      score: parsed.score,
      clauses: parsed.clauses,
      country: legalContext.country,
      ...(legalContext.contractTypeId
        ? { contractTypeId: legalContext.contractTypeId }
        : {}),
      legalArticleIds: legalContext.articleIds,
      lawReferences: parsed.lawReferences ?? [],
      legalSearchMethod: legalContext.searchMethod,
      tokensUsed: deepseek.tokensUsed,
      model: deepseek.model,
      processingMs,
      completedAt: FieldValue.serverTimestamp(),
      processingProgress: FieldValue.delete(),
    });

    await adminDb().collection(COLLECTIONS.contracts).doc(contractId).update({
      status: 'analyzed',
      lastAnalysisId: analysisId,
      riskScore: 100 - parsed.score,
      pageCount,
      country: legalContext.country,
      ...(options?.contractTypeId || contract.contractTypeId
        ? { contractTypeId: options?.contractTypeId ?? contract.contractTypeId }
        : {}),
      ...(legalContext.detectedContractTypeId
        ? { detectedContractTypeId: legalContext.detectedContractTypeId }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await addHistoryEntry(userId, {
      action: 'analysis.complete',
      entityType: 'analysis',
      entityId: analysisId,
      metadata: {
        mode: 'analyze',
        contractId,
        score: parsed.score,
        country: legalContext.country,
        legalArticles: legalContext.articleIds.length,
      },
    });

    await createAnalysisDoneAlert(userId, contractId, analysisId, contract.title);

    logger.info('deepseek', 'Análisis completado', {
      userId,
      metadata: {
        contractId,
        analysisId,
        processingMs,
        legalArticles: legalContext.articleIds.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    const isFinal = execOptions?.markErrorOnFailure !== false;

    if (!isFinal) {
      // Intento intermedio: se conserva la cuota reservada y el estado
      // `processing`, y se deja constancia en el progreso de que se va a
      // reintentar. Se relanza para que la cola haga su trabajo.
      await reportProgress({
        stage: 'queued',
        message: 'Reintentando el análisis…',
      });
      logger.warn('deepseek', 'Fallo en intento de análisis; se reintentará', {
        userId,
        metadata: {
          contractId,
          analysisId,
          attempt: execOptions?.attempt ?? 0,
          reason: message,
        },
      });
      throw error;
    }

    if (quotaReserved) {
      await releaseAnalysisUsage(userId);
      quotaReserved = false;
    }
    await analysisRef.update({
      status: 'error',
      errorMessage: message,
      completedAt: FieldValue.serverTimestamp(),
      processingProgress: FieldValue.delete(),
    });
    await adminDb().collection(COLLECTIONS.contracts).doc(contractId).update({
      status: 'error',
      updatedAt: FieldValue.serverTimestamp(),
    });
    logger.error('deepseek', 'Error en análisis', error, { userId, metadata: { contractId } });
    throw error instanceof AppError ? error : new AppError(message, 500, 'ANALYSIS_FAILED');
  }
}

export async function analyzeContract(
  userId: string,
  contractId: string,
  options?: AnalysisOptions
): Promise<{ analysisId: string; analysis: Analysis }> {
  const { analysisId } = await initiateAnalyzeContract(userId, contractId);
  await executeAnalyzeContract(userId, contractId, analysisId, options);
  const saved = await adminDb().collection(COLLECTIONS.analyses).doc(analysisId).get();
  return { analysisId, analysis: saved.data() as Analysis };
}
