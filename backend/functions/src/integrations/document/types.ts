import type { ProcessingProgress } from '@clausum/shared';

export type ProgressReporter = (progress: ProcessingProgress) => Promise<void>;

export type ExtractionMethod = 'pdf-text' | 'pdf-ocr' | 'docx' | 'doc';

export type ContractFileType = 'pdf' | 'docx' | 'doc';

export interface DocumentExtractionResult {
  text: string;
  pageCount: number;
  truncated: boolean;
  method: ExtractionMethod;
}

export function detectFileType(fileName: string): ContractFileType {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'doc') return 'doc';
  throw new Error(`UNSUPPORTED_FORMAT:${fileName}`);
}
