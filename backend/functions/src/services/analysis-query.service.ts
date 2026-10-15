import type { Analysis } from '@clausum/shared';
import { ENTITLEMENT_ACTIONS } from '@clausum/shared';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { AppError } from '../utils/errors';
import { getOwnedContract } from './contract.service';
import { assertEntitlement } from './subscription.service';

export async function getOwnedAnalysis(
  userId: string,
  analysisId: string
): Promise<Analysis & { id: string }> {
  const doc = await adminDb().collection(COLLECTIONS.analyses).doc(analysisId).get();
  if (!doc.exists) {
    throw new AppError('Análisis no encontrado', 404, 'ANALYSIS_NOT_FOUND');
  }
  const data = doc.data() as Analysis;
  if (data.userId !== userId) {
    throw new AppError('No tienes acceso a este análisis', 403, 'FORBIDDEN');
  }
  return { id: doc.id, ...data };
}

export async function getLatestContractAnalysis(
  userId: string,
  contractId: string,
  mode: 'analyze' | 'risks'
): Promise<{ analysisId: string; analysis: Analysis }> {
  await getOwnedContract(userId, contractId);

  if (mode === 'risks') {
    await assertEntitlement(userId, ENTITLEMENT_ACTIONS.ALERTS_ADVANCED);
  }

  const snap = await adminDb()
    .collection(COLLECTIONS.analyses)
    .where('contractId', '==', contractId)
    .orderBy('createdAt', 'desc')
    .limit(30)
    .get();

  for (const doc of snap.docs) {
    const data = doc.data() as Analysis;
    if (data.userId !== userId) continue;
    if (data.mode !== mode) continue;
    if (data.status !== 'done') continue;
    return { analysisId: doc.id, analysis: data };
  }

  throw new AppError(
    mode === 'analyze'
      ? 'No hay análisis para este contrato'
      : 'No hay perfil de riesgo para este contrato',
    404,
    mode === 'analyze' ? 'ANALYSIS_NOT_FOUND' : 'RISKS_ANALYSIS_NOT_FOUND'
  );
}
