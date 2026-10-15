import { FieldValue } from 'firebase-admin/firestore';
import type { ProcessingProgress } from '@clausum/shared';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';

export async function setAnalysisProgress(
  analysisId: string,
  progress: ProcessingProgress
): Promise<void> {
  await adminDb().collection(COLLECTIONS.analyses).doc(analysisId).update({
    processingProgress: progress,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
