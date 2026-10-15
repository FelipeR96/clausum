import { ref, uploadBytesResumable } from 'firebase/storage';
import type { Contract, CountryCode } from '@clausum/shared';
import { getContractFileExtension } from '@clausum/shared';
import { getFirebaseStorage } from '@/firebase/storage';
import { apiClient } from '@/services/api/client';

export function contractStoragePath(
  userId: string,
  contractId: string,
  fileName: string
): string {
  const ext = getContractFileExtension(fileName) ?? 'pdf';
  return `users/${userId}/contracts/${contractId}.${ext}`;
}

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.(pdf|docx?)$/i, '').replace(/[_-]+/g, ' ');
}

export async function listContracts(): Promise<Array<Contract & { id: string }>> {
  const data = await apiClient<{ contracts: Array<Contract & { id: string }> }>(
    '/contracts'
  );
  return data.contracts;
}

export async function deleteContract(contractId: string): Promise<void> {
  await apiClient<{ deleted: true }>(`/contracts/${contractId}`, {
    method: 'DELETE',
  });
}

export async function uploadAndRegisterContract(
  userId: string,
  file: File,
  options?: {
    country?: CountryCode;
    contractTypeId?: string;
    onUploadProgress?: (percent: number) => void;
  }
): Promise<Contract & { id: string }> {
  const contractId = crypto.randomUUID();
  const storagePath = contractStoragePath(userId, contractId, file.name);
  const storage = getFirebaseStorage();
  const country = options?.country ?? 'CO';

  const uploadTask = uploadBytesResumable(ref(storage, storagePath), file, {
    contentType: file.type || 'application/pdf',
  });

  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          options?.onUploadProgress?.(percent);
        }
      },
      reject,
      () => resolve()
    );
  });

  const result = await apiClient<{
    contractId: string;
    contract: Contract & { id: string };
  }>('/contracts', {
    method: 'POST',
    body: JSON.stringify({
      contractId,
      title: titleFromFileName(file.name),
      fileName: file.name,
      storagePath,
      fileSizeBytes: file.size,
      country,
      ...(options?.contractTypeId ? { contractTypeId: options.contractTypeId } : {}),
    }),
  });

  return result.contract;
}

export async function resolveContractSelection(
  userId: string,
  selection: { kind: 'file'; file: File; contractTypeId?: string } | { kind: 'existing'; contractId: string },
  contracts: Array<Contract & { id: string }>,
  options?: { country?: CountryCode }
): Promise<Contract & { id: string }> {
  if (selection.kind === 'existing') {
    const found = contracts.find((c) => c.id === selection.contractId);
    if (!found) {
      throw new Error('Contrato no encontrado en tu historial');
    }
    return found;
  }
  return uploadAndRegisterContract(userId, selection.file, {
    contractTypeId: selection.contractTypeId,
    country: options?.country,
  });
}
