import type {
  BillingRegion,
  CountryCode,
  SingleAnalysisCheckout,
  SingleAnalysisReport,
  SingleAnalysisState,
} from '@clausum/shared';
import { apiClient, apiClientBlob } from '@/services/api/client';
import type { InformeDescargado } from '@/services/export.service';

/**
 * Compra de un analisis sin cuenta.
 *
 * El cliente de la API adjunta el token solo si hay sesion, asi que estas
 * llamadas funcionan igual sin ella. La credencial aqui es la referencia:
 * son 128 bits al azar y quien la tiene ve su informe.
 */

/**
 * Sube el contrato y arranca el analisis.
 *
 * El archivo va como cuerpo crudo, no en un formulario. El resto de la
 * aplicacion sube a Storage desde el navegador y luego avisa a la API, pero
 * eso exige sesion; aqui el archivo pasa por la API, se extrae el texto en
 * memoria y nunca toca disco.
 *
 * El Content-Type se pone a mano porque el cliente pone JSON por defecto. Si
 * llegara como JSON, el servidor lo parsearia como tal y el cuerpo crudo
 * llegaria vacio.
 */
export async function analizarSinCuenta(input: {
  file: File;
  region: BillingRegion;
  country?: CountryCode;
  contractTypeId?: string;
}): Promise<{ reference: string; pageCount: number }> {
  const params = new URLSearchParams({
    fileName: input.file.name,
    region: input.region,
  });
  if (input.country) params.set('country', input.country);
  if (input.contractTypeId) params.set('contractTypeId', input.contractTypeId);

  return apiClient<{ reference: string; pageCount: number }>(
    `/single/analyze?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': input.file.type || 'application/octet-stream',
      },
      body: input.file,
    }
  );
}

/** Estado de la orden: analizando, listo (con la vista previa) o caducado. */
export async function consultarAnalisisSuelto(
  reference: string
): Promise<SingleAnalysisState> {
  return apiClient<SingleAnalysisState>(`/single/${reference}`);
}

/** Lo que necesita el widget de la pasarela que toque. */
export async function iniciarCobroSuelto(
  reference: string
): Promise<SingleAnalysisCheckout> {
  return apiClient<SingleAnalysisCheckout>(`/single/${reference}/checkout`, {
    method: 'POST',
  });
}

/** Cobra la orden de PayPal ya aprobada. Wompi lo confirma por su webhook. */
export async function capturarPagoPayPal(
  reference: string
): Promise<{ status: 'paid'; yaEstaba: boolean }> {
  return apiClient<{ status: 'paid'; yaEstaba: boolean }>(
    `/single/${reference}/paypal/capture`,
    { method: 'POST' }
  );
}

/** El informe entero para la pantalla. No gasta la entrega. */
export async function obtenerInformeSuelto(
  reference: string
): Promise<SingleAnalysisReport> {
  return apiClient<SingleAnalysisReport>(`/single/${reference}/informe`);
}

/**
 * Descarga el PDF.
 *
 * Ojo: esto GASTA la entrega. El servidor cierra la orden y borra el
 * analisis en cuanto la respuesta sale completa, asi que quien llame no debe
 * ofrecer esto y el correo como si se pudieran hacer los dos.
 */
export async function descargarInformeSuelto(
  reference: string
): Promise<InformeDescargado> {
  const { blob, fileName } = await apiClientBlob(`/single/${reference}/pdf`);
  return { blob, fileName: fileName ?? 'analisis-clausum.pdf' };
}

/** Manda el informe por correo. Tambien gasta la entrega. */
export async function enviarInformeSuelto(
  reference: string,
  email: string
): Promise<void> {
  await apiClient<{ enviado: boolean }>(`/single/${reference}/email`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}
