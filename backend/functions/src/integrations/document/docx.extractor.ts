import { getEnv } from '../../config/env';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { DocumentExtractionResult } from './types';

export async function extractTextFromDocx(
  buffer: Buffer,
  context: { userId: string; contractId: string }
): Promise<DocumentExtractionResult> {
  const { MIN_PDF_TEXT_CHARS, MAX_PDF_TEXT_CHARS } = getEnv();

  let rawText: string;
  try {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value.replace(/\s+/g, ' ').trim();
  } catch (error) {
    logger.error('api', 'Error al leer DOCX', error, {
      userId: context.userId,
      metadata: { contractId: context.contractId },
    });
    throw new AppError(
      'No se pudo leer el archivo Word (.docx). Verifica que no esté corrupto.',
      422,
      'DOCX_PARSE_ERROR'
    );
  }

  if (rawText.length < MIN_PDF_TEXT_CHARS) {
    throw new AppError(
      'El documento Word está vacío o no contiene texto legible.',
      422,
      'DOCX_NO_TEXT'
    );
  }

  const truncated = rawText.length > MAX_PDF_TEXT_CHARS;
  const text = truncated ? rawText.slice(0, MAX_PDF_TEXT_CHARS) : rawText;

  if (truncated) {
    logger.warn('api', 'Texto DOCX truncado', {
      userId: context.userId,
      metadata: { contractId: context.contractId, originalLength: rawText.length },
    });
  }

  return {
    text,
    pageCount: 1,
    truncated,
    method: 'docx',
  };
}
