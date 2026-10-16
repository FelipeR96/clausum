import { FieldValue } from 'firebase-admin/firestore';
import type { Analysis } from '@clausum/shared';
import { COLLECTIONS, ENTITLEMENT_ACTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { callDeepSeek } from '../integrations/deepseek/client';
import {
  buildRisksPrompt,
  SYSTEM_LEGAL,
} from '../integrations/deepseek/legal-prompts';
import {
  parseJsonResponse,
  risksResponseSchema,
} from '../integrations/deepseek/schemas';
import { extractContractText } from './document.service';
import { getOwnedContract } from './contract.service';
import {
  releaseAnalysisUsage,
  reserveAnalysisUsage,
} from './usage.service';
import { buildLegalContext } from './legal-context.service';
import type { AnalysisOptions, JobExecutionOptions } from './analysis.service';
import { setAnalysisProgress } from './processing-progress.service';
import { assertEntitlement } from './subscription.service';
import { persistRisksAnalysis } from './risks-persist.service';
import { AppError, esReintentable } from '../utils/errors';
import { logger } from '../utils/logger';

export type RiskDetectionOptions = AnalysisOptions & {
  reserveQuota?: boolean;
  markContractProcessing?: boolean;
  markContractError?: boolean;
};

/**
 * Prepara la detección de riesgos: valida permisos, reserva cuota y crea el
 * documento en `processing`. Barato y rápido — corre dentro de la request.
 */
export async function initiateDetectRisks(
  userId: string,
  contractId: string,
  options?: RiskDetectionOptions
): Promise<{ analysisId: string }> {
  await assertEntitlement(userId, ENTITLEMENT_ACTIONS.ALERTS_ADVANCED);

  const contract = await getOwnedContract(userId, contractId);
  if (!contract.storagePath) {
    throw new AppError('El contrato no tiene PDF asociado', 422, 'NO_PDF');
  }

  if (options?.reserveQuota !== false) {
    await reserveAnalysisUsage(userId);
  }

  const analysisRef = adminDb().collection(COLLECTIONS.analyses).doc();
  await analysisRef.set({
    userId,
    contractId,
    mode: 'risks',
    status: 'processing',
    processingProgress: {
      stage: 'queued',
      message: 'Preparando detección de riesgos…',
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  if (options?.markContractProcessing !== false) {
    await adminDb().collection(COLLECTIONS.contracts).doc(contractId).update({
      status: 'processing',
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return { analysisId: analysisRef.id };
}

/**
 * Ejecuta el trabajo pesado. Va en una tarea de Cloud Tasks, no en el ciclo
 * de la request: extracción de texto, OCR, contexto legal y DeepSeek pueden
 * tardar minutos, y Cloud Run estrangula la CPU en cuanto la respuesta HTTP
 * se cierra.
 */
export async function executeDetectRisks(
  userId: string,
  contractId: string,
  analysisId: string,
  options?: RiskDetectionOptions,
  execOptions?: JobExecutionOptions
): Promise<{ analysisId: string; analysis: Analysis }> {
  const startedAt = Date.now();
  const analysisRef = adminDb().collection(COLLECTIONS.analyses).doc(analysisId);

  // Idempotencia: ver la nota en executeAnalyzeContract.
  const existing = await analysisRef.get();
  if (!existing.exists) {
    throw new AppError('Análisis no encontrado', 404, 'ANALYSIS_NOT_FOUND');
  }
  if (existing.get('status') === 'done') {
    logger.info('api', 'Detección de riesgos ya completada; se omite el reintento', {
      userId,
      metadata: { analysisId, contractId },
    });
    return { analysisId, analysis: existing.data() as Analysis };
  }

  const contract = await getOwnedContract(userId, contractId);
  if (!contract.storagePath) {
    throw new AppError('El contrato no tiene PDF asociado', 422, 'NO_PDF');
  }

  const quotaReserved = options?.reserveQuota !== false;
  const reportProgress = (progress: Parameters<typeof setAnalysisProgress>[1]) =>
    setAnalysisProgress(analysisId, progress);

  try {
    const { text, pageCount } = await extractContractText(
      contract.storagePath,
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

    await reportProgress({
      stage: 'ai_analysis',
      message: 'Detectando riesgos con inteligencia artificial…',
    });

    const deepseek = await callDeepSeek(buildRisksPrompt(text, legalContext), {
      userId,
      operation: 'risks',
      systemPrompt: SYSTEM_LEGAL,
    });

    const parsed = parseJsonResponse(deepseek.content, risksResponseSchema);
    const processingMs = Date.now() - startedAt;
    const riskScore = 100 - parsed.score;

    await reportProgress({
      stage: 'finalizing',
      message: 'Guardando perfil de riesgo…',
    });

    const { risksAnalysisId } = await persistRisksAnalysis({
      userId,
      contractId,
      parsed,
      legalContext,
      tokensUsed: deepseek.tokensUsed,
      model: deepseek.model,
      processingMs,
      analysisId: analysisRef.id,
    });

    await adminDb().collection(COLLECTIONS.contracts).doc(contractId).update({
      riskScore,
      pageCount,
      country: legalContext.country,
      updatedAt: FieldValue.serverTimestamp(),
      ...(options?.markContractProcessing !== false ? { status: 'analyzed' as const } : {}),
    });

    logger.info('deepseek', 'Detección de riesgos completada', {
      userId,
      metadata: {
        contractId,
        analysisId: risksAnalysisId,
        processingMs,
        legalArticles: legalContext.articleIds.length,
      },
    });

    await adminDb().collection(COLLECTIONS.analyses).doc(risksAnalysisId).update({
      processingProgress: FieldValue.delete(),
    });

    const saved = await adminDb().collection(COLLECTIONS.analyses).doc(risksAnalysisId).get();
    return { analysisId: risksAnalysisId, analysis: saved.data() as Analysis };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';

    // Un error de plan o de archivo ya es definitivo en el primer
    // intento: reintentarlo solo retrasa el motivo real.
    if (execOptions?.markErrorOnFailure === false && esReintentable(error)) {
      await reportProgress({ stage: 'queued', message: 'Reintentando…' });
      logger.warn('deepseek', 'Fallo en intento de riesgos; se reintentará', {
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
    }
    await analysisRef.update({
      status: 'error',
      errorMessage: message,
      completedAt: FieldValue.serverTimestamp(),
      processingProgress: FieldValue.delete(),
    });
    if (options?.markContractError !== false) {
      await adminDb().collection(COLLECTIONS.contracts).doc(contractId).update({
        status: 'error',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    logger.error('deepseek', 'Error en detección de riesgos', error, {
      userId,
      metadata: { contractId },
    });
    throw error instanceof AppError ? error : new AppError(message, 500, 'RISKS_FAILED');
  }
}

/**
 * Envoltorio sincrónico: inicia y ejecuta en la misma llamada.
 *
 * Sirve para scripts y pruebas. El endpoint HTTP NO lo usa — encola.
 */
export async function detectRisks(
  userId: string,
  contractId: string,
  options?: RiskDetectionOptions
): Promise<{ analysisId: string; analysis: Analysis }> {
  const { analysisId } = await initiateDetectRisks(userId, contractId, options);
  return executeDetectRisks(userId, contractId, analysisId, options);
}
