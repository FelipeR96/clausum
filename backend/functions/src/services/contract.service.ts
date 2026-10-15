import type { Contract, CountryCode } from '@clausum/shared';
import { COLLECTIONS, USER_SUBCOLLECTIONS } from '@clausum/shared';
import { FieldValue, type DocumentData, type Query } from 'firebase-admin/firestore';
import { adminDb, adminStorage } from '../firebase/admin';
import { getPlanEntitlements, isUnlimited } from '../config/plans';
import { addHistoryEntry } from './history.service';
import { getLegalKnowledgeService } from './legal';
import { resolveEffectivePlanId } from './subscription.service';
import { AppError } from '../utils/errors';

export type CreateContractInput = {
  contractId: string;
  title: string;
  fileName: string;
  storagePath: string;
  fileSizeBytes?: number;
  country?: CountryCode;
  contractTypeId?: string;
};

export async function getOwnedContract(
  userId: string,
  contractId: string
): Promise<Contract & { id: string }> {
  const doc = await adminDb().collection(COLLECTIONS.contracts).doc(contractId).get();
  if (!doc.exists) {
    throw new AppError('Contrato no encontrado', 404, 'CONTRACT_NOT_FOUND');
  }
  const data = doc.data() as Contract;
  if (data.userId !== userId) {
    throw new AppError('No tienes acceso a este contrato', 403, 'FORBIDDEN');
  }
  if (data.deletedAt) {
    throw new AppError('Contrato eliminado', 410, 'CONTRACT_DELETED');
  }
  return { id: doc.id, ...data };
}

export async function countUserContracts(userId: string): Promise<number> {
  const snap = await adminDb()
    .collection(COLLECTIONS.contracts)
    .where('userId', '==', userId)
    .get();

  return snap.docs.filter((doc) => !(doc.data() as Contract).deletedAt).length;
}

export async function listUserContracts(
  userId: string,
  limit = 50
): Promise<Array<Contract & { id: string }>> {
  const snap = await adminDb()
    .collection(COLLECTIONS.contracts)
    .where('userId', '==', userId)
    .limit(limit)
    .get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Contract) }))
    .filter((c) => !c.deletedAt);
}

export async function createContract(
  userId: string,
  input: CreateContractInput
): Promise<{ contractId: string; contract: Contract & { id: string } }> {
  const planId = await resolveEffectivePlanId(userId);
  const entitlements = await getPlanEntitlements(planId);
  const currentCount = await countUserContracts(userId);

  if (
    !isUnlimited(entitlements.maxContracts) &&
    currentCount >= entitlements.maxContracts
  ) {
    throw new AppError(
      `Límite de contratos alcanzado (${entitlements.maxContracts}). Actualiza a Pro.`,
      403,
      'CONTRACT_LIMIT'
    );
  }

  const expectedPrefix = `users/${userId}/contracts/`;
  if (!input.storagePath.startsWith(expectedPrefix)) {
    throw new AppError('Ruta de almacenamiento inválida', 400, 'INVALID_STORAGE_PATH');
  }

  if (!/\.(pdf|docx|doc)$/i.test(input.storagePath)) {
    throw new AppError('Solo se permiten archivos PDF o Word (.doc, .docx)', 400, 'INVALID_FILE_TYPE');
  }

  const maxBytes = entitlements.maxFileSizeMb * 1024 * 1024;
  if (input.fileSizeBytes && input.fileSizeBytes > maxBytes) {
    throw new AppError(
      `El archivo excede el límite de ${entitlements.maxFileSizeMb} MB`,
      413,
      'FILE_TOO_LARGE'
    );
  }

  const [fileExists] = await adminStorage().bucket().file(input.storagePath).exists();
  if (!fileExists) {
    throw new AppError(
      'Archivo no encontrado en Storage. Sube el documento antes de registrar el contrato.',
      422,
      'FILE_NOT_IN_STORAGE'
    );
  }

  const contractRef = adminDb().collection(COLLECTIONS.contracts).doc(input.contractId);
  const existing = await contractRef.get();
  if (existing.exists) {
    throw new AppError('Ya existe un contrato con ese identificador', 409, 'CONTRACT_EXISTS');
  }

  if (input.contractTypeId) {
    const contractType = await getLegalKnowledgeService().getContractType(
      input.contractTypeId
    );
    if (!contractType) {
      throw new AppError('Tipo de contrato no válido', 400, 'INVALID_CONTRACT_TYPE');
    }
  }

  const payload = {
    userId,
    title: input.title,
    fileName: input.fileName,
    storagePath: input.storagePath,
    fileSizeBytes: input.fileSizeBytes,
    country: input.country ?? 'CO',
    ...(input.contractTypeId ? { contractTypeId: input.contractTypeId } : {}),
    status: 'uploaded' as const,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await contractRef.set(payload);

  await addHistoryEntry(userId, {
    action: 'contract.upload',
    entityType: 'contract',
    entityId: input.contractId,
    metadata: {
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes ?? 0,
      ...(input.contractTypeId ? { contractTypeId: input.contractTypeId } : {}),
    },
  });

  const saved = await contractRef.get();
  return {
    contractId: input.contractId,
    contract: { id: saved.id, ...(saved.data() as Contract) },
  };
}

async function deleteCollectionDocs(
  query: Query<DocumentData>
): Promise<string[]> {
  const snap = await query.get();
  const ids = snap.docs.map((doc) => doc.id);
  if (!snap.empty) {
    const batch = adminDb().batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
  return ids;
}

async function deleteUserHistoryEntries(
  userId: string,
  entityIds: string[]
): Promise<void> {
  const uniqueIds = [...new Set(entityIds)].filter(Boolean);
  for (let i = 0; i < uniqueIds.length; i += 10) {
    const chunk = uniqueIds.slice(i, i + 10);
    await deleteCollectionDocs(
      adminDb()
        .collection(COLLECTIONS.users)
        .doc(userId)
        .collection(USER_SUBCOLLECTIONS.history)
        .where('entityId', 'in', chunk)
    );
  }
}

export async function hardDeleteContract(
  userId: string,
  contractId: string
): Promise<{ deleted: true }> {
  const contract = await getOwnedContract(userId, contractId);

  const analysesIds = await deleteCollectionDocs(
    adminDb()
      .collection(COLLECTIONS.analyses)
      .where('contractId', '==', contractId)
      .where('userId', '==', userId)
  );

  const alertsIds = await deleteCollectionDocs(
    adminDb()
      .collection(COLLECTIONS.alerts)
      .where('contractId', '==', contractId)
      .where('userId', '==', userId)
  );

  const comparisonAIds = await deleteCollectionDocs(
    adminDb()
      .collection(COLLECTIONS.comparisons)
      .where('contractIdA', '==', contractId)
      .where('userId', '==', userId)
  );

  const comparisonBIds = await deleteCollectionDocs(
    adminDb()
      .collection(COLLECTIONS.comparisons)
      .where('contractIdB', '==', contractId)
      .where('userId', '==', userId)
  );

  if (contract.storagePath) {
    await adminStorage()
      .bucket()
      .file(contract.storagePath)
      .delete({ ignoreNotFound: true });
  }

  await adminDb().collection(COLLECTIONS.contracts).doc(contractId).delete();

  await deleteUserHistoryEntries(userId, [
    contractId,
    ...analysesIds,
    ...alertsIds,
    ...comparisonAIds,
    ...comparisonBIds,
  ]);

  return { deleted: true };
}
