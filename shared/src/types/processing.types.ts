export type ProcessingStage =
  | 'queued'
  | 'downloading'
  | 'extracting'
  | 'ocr'
  | 'legal_context'
  | 'ai_analysis'
  | 'finalizing';

export interface ProcessingProgress {
  stage: ProcessingStage;
  message: string;
  page?: number;
  totalPages?: number;
}
