import pdfParse from 'pdf-parse';
import { getEnv } from '../../config/env';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { DocumentExtractionResult } from '../document/types';
import { ocrPdfBuffer } from './ocr';

function normalizeText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function truncateText(
  rawText: string,
  context: { userId: string; contractId: string }
): { text: string; truncated: boolean } {
  const { MAX_PDF_TEXT_CHARS } = getEnv();
  const truncated = rawText.length > MAX_PDF_TEXT_CHARS;
  const text = truncated ? rawText.slice(0, MAX_PDF_TEXT_CHARS) : rawText;

  if (truncated) {
    logger.warn('api', 'Texto truncado por límite de caracteres', {
      userId: context.userId,
      metadata: {
        contractId: context.contractId,
        originalLength: rawText.length,
        maxChars: MAX_PDF_TEXT_CHARS,
      },
    });
  }

  return { text, truncated };
}

/**
 * 1. Intenta extraer texto embebido (PDF digital, rápido).
 * 2. Si hay poco texto → OCR con Tesseract.js (PDF escaneado).
 */
export async function extractTextFromPdf(
  buffer: Buffer,
  context: {
    userId: string;
    contractId: string;
    ocrAllowed?: boolean;
    reportProgress?: import('../document/types').ProgressReporter;
  }
): Promise<DocumentExtractionResult> {
  const { MIN_PDF_TEXT_CHARS } = getEnv();

  let parsed: { text: string; numpages: number };
  try {
    parsed = await pdfParse(buffer);
  } catch (error) {
    logger.error('api', 'Error al parsear PDF', error, {
      userId: context.userId,
      metadata: { contractId: context.contractId },
    });
    throw new AppError(
      'No se pudo leer el PDF. Verifica que el archivo no esté corrupto.',
      422,
      'PDF_PARSE_ERROR'
    );
  }

  const embeddedText = normalizeText(parsed.text);

  if (embeddedText.length >= MIN_PDF_TEXT_CHARS) {
    const { text, truncated } = truncateText(embeddedText, context);
    return {
      text,
      pageCount: parsed.numpages,
      truncated,
      method: 'pdf-text',
    };
  }

  if (!context.ocrAllowed) {
    throw new AppError(
      'Este PDF parece escaneado (sin texto seleccionable). El plan Free solo admite PDF o DOCX digitales sin límite de páginas. Actualiza a Pro para OCR en escaneos (primeras 7 páginas).',
      403,
      'OCR_PRO_REQUIRED'
    );
  }

  logger.info('api', 'Poco texto embebido, activando OCR', {
    userId: context.userId,
    metadata: {
      contractId: context.contractId,
      embeddedChars: embeddedText.length,
    },
  });

  const { OCR_MAX_PAGES } = getEnv();
  await context.reportProgress?.({
    stage: 'ocr',
    message: `Preparando OCR (hasta ${OCR_MAX_PAGES} páginas)…`,
    totalPages: OCR_MAX_PAGES,
  });

  let ocrResult: { text: string; pageCount: number };
  try {
    ocrResult = await ocrPdfBuffer(buffer, context, async (page, totalPages) => {
      await context.reportProgress?.({
        stage: 'ocr',
        message: `OCR página ${page}/${totalPages}…`,
        page,
        totalPages,
      });
    });
  } catch {
    throw new AppError(
      'No se pudo extraer texto del PDF (ni digital ni OCR).',
      422,
      'PDF_OCR_FAILED'
    );
  }

  const ocrText = normalizeText(ocrResult.text);
  if (ocrText.length < MIN_PDF_TEXT_CHARS) {
    throw new AppError(
      'No se pudo leer texto del documento. Prueba con mejor calidad de escaneo o un PDF/DOCX digital.',
      422,
      'DOCUMENT_NO_TEXT'
    );
  }

  const { text, truncated } = truncateText(ocrText, context);
  return {
    text,
    pageCount: ocrResult.pageCount,
    truncated,
    method: 'pdf-ocr',
  };
}
