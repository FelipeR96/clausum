import { FieldValue } from 'firebase-admin/firestore';
import type { ProcessingProgress } from '@clausum/shared';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { logger } from '../utils/logger';

/**
 * Escribe el progreso por etapas del trabajo en curso.
 *
 * Un fallo al reportar progreso nunca debe tumbar el trabajo: es información
 * para la UI, no parte del resultado. Se loguea y se sigue.
 */
async function setProgress(
  collection: string,
  docId: string,
  progress: ProcessingProgress
): Promise<void> {
  try {
    await adminDb().collection(collection).doc(docId).update({
      processingProgress: progress,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.warn('api', 'No se pudo reportar progreso', {
      metadata: {
        collection,
        docId,
        stage: progress.stage,
        reason: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

export function setAnalysisProgress(
  analysisId: string,
  progress: ProcessingProgress
): Promise<void> {
  return setProgress(COLLECTIONS.analyses, analysisId, progress);
}

export function setComparisonProgress(
  comparisonId: string,
  progress: ProcessingProgress
): Promise<void> {
  return setProgress(COLLECTIONS.comparisons, comparisonId, progress);
}
