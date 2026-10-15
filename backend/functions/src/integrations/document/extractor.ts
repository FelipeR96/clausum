import { AppError } from '../../utils/errors';
import {
  detectFileType,
  type DocumentExtractionResult,
} from './types';
import type { ProgressReporter } from './types';

export async function extractTextFromDocument(
  buffer: Buffer,
  fileName: string,
  context: {
    userId: string;
    contractId: string;
    ocrAllowed?: boolean;
    reportProgress?: ProgressReporter;
  }
): Promise<DocumentExtractionResult> {
  let fileType;
  try {
    fileType = detectFileType(fileName);
  } catch {
    throw new AppError(
      'Formato no soportado. Usa PDF o Word (.doc, .docx).',
      422,
      'UNSUPPORTED_FORMAT'
    );
  }

  if (fileType === 'docx') {
    const { extractTextFromDocx } = await import('./docx.extractor');
    return extractTextFromDocx(buffer, context);
  }

  if (fileType === 'doc') {
    const { extractTextFromDoc } = await import('./doc.extractor');
    return extractTextFromDoc(buffer, context);
  }

  const { extractTextFromPdf } = await import('../pdf/extractor');
  return extractTextFromPdf(buffer, context);
}

export type { DocumentExtractionResult, ContractFileType, ExtractionMethod } from './types';
export { detectFileType } from './types';
