/** Páginas máximas que el OCR Pro procesa en un PDF escaneado. */
export const OCR_SCANNED_MAX_PAGES = 7;

/** Atributo `accept` para inputs de subida de contratos. */
export const CONTRACT_FILE_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type ContractFileExtension = 'pdf' | 'doc' | 'docx';

export function getContractFileExtension(fileName: string): ContractFileExtension | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.doc')) return 'doc';
  return null;
}

export function isSupportedContractFileName(fileName: string): boolean {
  return getContractFileExtension(fileName) !== null;
}

export const CONTRACT_FORMATS_LABEL = 'PDF o Word (.doc, .docx)';

/**
 * Texto de producto sobre formatos (sincronizar con OCR_MAX_PAGES en Functions).
 * PDF/Word digital: sin tope de páginas en la práctica; el backend trunca texto muy largo.
 */
export const DOCUMENT_FORMAT_NOTES = {
  digitalUnlimited:
    'PDF con texto seleccionable y Word (.doc, .docx): sin límite de páginas — analizamos el documento completo.',
  ocrScannedLimit: (maxPages: number = OCR_SCANNED_MAX_PAGES) =>
    `PDF escaneado (solo Pro): OCR en las primeras ${maxPages} páginas. Si el contrato tiene más, sube un PDF digital o Word con el texto completo.`,
  freeNoOcr:
    'Plan Free: solo PDF digital o Word. No admitimos PDF escaneados (foto o escáner sin texto seleccionable).',
} as const;
