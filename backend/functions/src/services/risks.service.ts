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
import type { AnalysisOptions } from './analysis.service';
import { assertEntitlement } from './subscription.service';
import { persistRisksAnalysis } from './risks-persist.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

type RiskDetectionOptions = AnalysisOptions & {
  reserveQuota?: boolean;
  markContractProcessing?: boolean;
  markContractError?: boolean;
};

export async function detectRisks(
  userId: string,
  contractId: string,
  options?: RiskDetectionOptions
): Promise<{ analysisId: string; analysis: Analysis }> {
  await assertEntitlement(userId, ENTITLEMENT_ACTIONS.ALERTS_ADVANCED);

  const startedAt = Date.now();

  const contract = await getOwnedContract(userId, contractId);
  if (!contract.storagePath) {
    throw new AppError('El contrato no tiene PDF asociado', 422, 'NO_PDF');
  }

  let quotaReserved = false;
  if (options?.reserveQuota !== false) {
    await reserveAnalysisUsage(userId);
    quotaReserved = true;
  }

  const analysisRef = adminDb().collection(COLLECTIONS.analyses).doc();
  await analysisRef.set({
    userId,
    contractId,
    mode: 'risks',
    status: 'processing',
    createdAt: FieldValue.serverTimestamp(),
  });

  if (options?.markContractProcessing !== false) {
    await adminDb().collection(COLLECTIONS.contracts).doc(contractId).update({
      status: 'processing',
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  try {
    const { text, pageCount } = await extractContractText(
      contract.storagePath,
      contract.fileName,
      { userId, contractId }
    );

    const legalContext = await buildLegalContext({
      contractText: text,
      contract,
      contractId,
      country: options?.country ?? contract.country,
      contractTypeId: options?.contractTypeId ?? contract.contractTypeId,
    });

    const deepseek = await callDeepSeek(buildRisksPrompt(text, legalContext), {
      userId,
      operation: 'risks',
      systemPrompt: SYSTEM_LEGAL,
    });

    const parsed = parseJsonResponse(deepseek.content, risksResponseSchema);
    const processingMs = Date.now() - startedAt;
    const riskScore = 100 - parsed.score;

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

    const saved = await adminDb().collection(COLLECTIONS.analyses).doc(risksAnalysisId).get();
    return { analysisId: risksAnalysisId, analysis: saved.data() as Analysis };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    if (quotaReserved) {
      await releaseAnalysisUsage(userId);
      quotaReserved = false;
    }
    await analysisRef.update({
      status: 'error',
      errorMessage: message,
      completedAt: FieldValue.serverTimestamp(),
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
