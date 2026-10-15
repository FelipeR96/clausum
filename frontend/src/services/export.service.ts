import { ref, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from '@/firebase/storage';
import { apiClient } from '@/services/api/client';

export type ExportPdfResponse = {
  exportId: string;
  status: 'ready';
  downloadUrl?: string;
  storagePath: string;
  expiresAt?: string;
};

export async function exportContractPdf(contractId: string): Promise<ExportPdfResponse> {
  return apiClient<ExportPdfResponse>('/export', {
    method: 'POST',
    body: JSON.stringify({ contractId }),
  });
}

export async function resolveExportDownloadUrl(result: ExportPdfResponse): Promise<string> {
  if (result.downloadUrl) {
    return result.downloadUrl;
  }

  const storage = getFirebaseStorage();
  return getDownloadURL(ref(storage, result.storagePath));
}
