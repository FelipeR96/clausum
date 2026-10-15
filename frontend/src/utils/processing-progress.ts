import type { ProcessingProgress, ProcessingStage } from '@clausum/shared';

const STAGE_PERCENT: Record<ProcessingStage, number> = {
  queued: 8,
  downloading: 18,
  extracting: 35,
  ocr: 55,
  legal_context: 72,
  ai_analysis: 86,
  finalizing: 95,
};

export function getAnalysisProgressPercent(
  progress?: ProcessingProgress | null
): number | undefined {
  if (!progress) return undefined;

  if (progress.stage === 'ocr' && progress.page && progress.totalPages) {
    const ocrSpan = 35;
    const start = STAGE_PERCENT.extracting;
    return Math.min(
      95,
      Math.round(start + (progress.page / progress.totalPages) * ocrSpan)
    );
  }

  return STAGE_PERCENT[progress.stage];
}

export const DIGITAL_FORMAT_HINT =
  'Un PDF con texto seleccionable o un Word (.docx) se procesan más rápido que un escaneo.';

export const OCR_FORMAT_HINT =
  'Los PDF escaneados pueden tardar varios minutos. Si puedes, exporta el contrato como PDF digital.';
