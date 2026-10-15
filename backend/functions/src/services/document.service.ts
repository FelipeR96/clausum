import { adminStorage } from '../firebase/admin';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { extractTextFromDocument } from '../integrations/document/extractor';
import type { ProgressReporter } from '../integrations/document/types';
import { getPlanEntitlements } from '../config/plans';
import { resolveEffectivePlanId } from './subscription.service';

export async function downloadContractFile(
  storagePath: string,
  context: { userId: string; contractId: string }
): Promise<Buffer> {
  try {
    const bucket = adminStorage().bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new AppError(
        'Archivo no encontrado en Storage. Sube el contrato primero.',
        404,
        'FILE_NOT_FOUND'
      );
    }
    const [buffer] = await file.download();
    return buffer;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('api', 'Error descargando archivo de Storage', error, {
      userId: context.userId,
      metadata: { contractId: context.contractId, storagePath },
    });
    throw new AppError('Error al descargar el archivo', 500, 'STORAGE_DOWNLOAD_ERROR');
  }
}

export async function extractContractText(
  storagePath: string,
  fileName: string,
  context: { userId: string; contractId: string },
  reportProgress?: ProgressReporter
): Promise<{ text: string; pageCount: number; extractionMethod: string }> {
  const planId = await resolveEffectivePlanId(context.userId);
  const entitlements = await getPlanEntitlements(planId);

  await reportProgress?.({
    stage: 'downloading',
    message: 'Descargando documento…',
  });

  const buffer = await downloadContractFile(storagePath, context);
  const lowerName = fileName.toLowerCase();
  const isWord = lowerName.endsWith('.docx') || lowerName.endsWith('.doc');

  await reportProgress?.({
    stage: 'extracting',
    message: isWord ? 'Leyendo documento Word…' : 'Leyendo PDF…',
  });

  const result = await extractTextFromDocument(buffer, fileName, {
    ...context,
    ocrAllowed: entitlements.ocrScannedPdf,
    reportProgress,
  });
  return {
    text: result.text,
    pageCount: result.pageCount,
    extractionMethod: result.method,
  };
}
