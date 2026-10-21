import { apiClientBlob } from '@/services/api/client';

export type InformeDescargado = {
  blob: Blob;
  fileName: string;
};

/**
 * Pide el informe y devuelve el archivo.
 *
 * No hay URL de descarga: el PDF viaja por la conexión autenticada. Lleva
 * nombres, documentos y direcciones, y un enlace que abre cualquiera sin
 * iniciar sesión no es sitio para eso.
 */
export async function exportContractPdf(contractId: string): Promise<InformeDescargado> {
  const { blob, fileName } = await apiClientBlob('/export', {
    method: 'POST',
    body: JSON.stringify({ contractId }),
  });

  return { blob, fileName: fileName ?? `informe-clausum-${contractId}.pdf` };
}

/** Lanza la descarga en el navegador. */
export function descargarInforme({ blob, fileName }: InformeDescargado): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = fileName;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  // Revocar en el acto corta la descarga en algunos navegadores, que aún no
  // han leído el blob cuando vuelve el click. Se suelta un momento después;
  // sin esto el archivo se queda en memoria hasta recargar la página.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
