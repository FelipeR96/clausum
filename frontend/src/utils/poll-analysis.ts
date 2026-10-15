import type { Analysis, ProcessingProgress } from '@clausum/shared';
import { getAnalysisById } from '@/services/analysis.service';
import { ApiError } from '@/services/api/errors';

const POLL_INTERVAL_MS = 900;
const MAX_WAIT_MS = 320_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollAnalysisUntilDone(
  analysisId: string,
  onProgress?: (progress: ProcessingProgress | undefined) => void
): Promise<Analysis> {
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    const { analysis } = await getAnalysisById(analysisId);
    onProgress?.(analysis.processingProgress);

    if (analysis.status === 'done') {
      return analysis;
    }

    if (analysis.status === 'error') {
      throw new ApiError(
        analysis.errorMessage ?? 'No se pudo completar el análisis.',
        500,
        'ANALYSIS_FAILED'
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new ApiError(
    'El análisis está tardando más de lo habitual. Intenta de nuevo en unos minutos.',
    504,
    'ANALYSIS_TIMEOUT'
  );
}
