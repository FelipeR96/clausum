import type { Worker } from 'tesseract.js';
import { getEnv } from '../../config/env';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

let workerInstance: Worker | null = null;

async function getOcrWorker(): Promise<Worker> {
  if (!workerInstance) {
    const { createWorker } = await import('tesseract.js');
    workerInstance = await createWorker('spa+eng');
  }
  return workerInstance;
}

async function pdfBufferToImages(buffer: Buffer, maxPages: number): Promise<Buffer[]> {
  try {
    const pdfImgConvert = await import('pdf-img-convert');
    const pageNumbers = Array.from({ length: maxPages }, (_, i) => i + 1);
    const pages = await pdfImgConvert.default.convert(buffer, {
      scale: 2,
      page_numbers: pageNumbers,
    });
    return pages.map((page) => Buffer.from(page));
  } catch (error) {
    logger.warn('api', 'OCR: pdf-img-convert no disponible en este entorno', {
      metadata: {
        hint: 'En Windows local usa PDF/DOCX digital. OCR funciona al desplegar en Firebase (Linux).',
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw new AppError(
      'OCR no disponible en este entorno. Usa un PDF digital, un DOCX, o despliega en Firebase.',
      422,
      'OCR_UNAVAILABLE'
    );
  }
}

export async function ocrPdfBuffer(
  buffer: Buffer,
  context: { userId: string; contractId: string },
  onPage?: (page: number, totalPages: number) => Promise<void>
): Promise<{ text: string; pageCount: number }> {
  const { OCR_MAX_PAGES } = getEnv();

  logger.info('api', 'Iniciando OCR en PDF escaneado', {
    userId: context.userId,
    metadata: { contractId: context.contractId, maxPages: OCR_MAX_PAGES },
  });

  const pageImages = await pdfBufferToImages(buffer, OCR_MAX_PAGES);
  if (!pageImages.length) {
    return { text: '', pageCount: 0 };
  }

  const worker = await getOcrWorker();
  const textParts: string[] = [];
  const totalPages = pageImages.length;

  for (let index = 0; index < pageImages.length; index += 1) {
    await onPage?.(index + 1, totalPages);
    const imageBuffer = pageImages[index];
    const { data } = await worker.recognize(imageBuffer);
    if (data.text?.trim()) {
      textParts.push(data.text.replace(/\s+/g, ' ').trim());
    }
  }

  return {
    text: textParts.join('\n\n').trim(),
    pageCount: pageImages.length,
  };
}

export async function terminateOcrWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.terminate();
    workerInstance = null;
  }
}
