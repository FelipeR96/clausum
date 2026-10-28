import type { BillingRegion } from '../constants/billing';
import type { CountryCode } from './legal.types';
import type { FirestoreDate, WithTimestamps } from './common.types';

/**
 * Compra de un analisis suelto, sin cuenta.
 *
 * ── Por que existe un documento de orden ────────────────────────────────
 * La promesa al usuario es que no guardamos su contrato. El archivo, en
 * efecto, no toca disco: se extrae el texto en memoria y se descarta.
 *
 * Pero el RESULTADO del analisis si tiene que vivir en el servidor un rato,
 * y conviene entender por que, porque parece contradecir la promesa:
 *
 *  1. Si mandaramos el analisis completo al navegador y solo escondieramos
 *     la mitad en pantalla, cualquiera lo lee con las herramientas del
 *     navegador. Eso no es un muro de pago, es un borron.
 *  2. Entre que la persona ve la vista previa y paga, se va a la pasarela y
 *     vuelve. El aviso del pago llega por detras, asincrono. Sin nada
 *     guardado no habria que desbloquear cuando regrese.
 *
 * Por eso el analisis se guarda atado a esta orden y se borra solo:
 * `expiresAt` como tope duro, y antes de eso en cuanto se entrega.
 */
export type SingleAnalysisOrderStatus =
  /** Creada y mostrada como vista previa; nadie ha pagado todavia. */
  | 'pending'
  /** Pago confirmado por la pasarela: el informe esta desbloqueado. */
  | 'paid'
  /** Entregado y analisis borrado. La orden queda como registro contable. */
  | 'delivered'
  /** La pasarela rechazo el cobro. */
  | 'failed'
  /** Nadie pago dentro del plazo; el analisis se borro. */
  | 'expired';

/** Como se le hizo llegar el informe a quien pago. */
export type SingleAnalysisDelivery = 'download' | 'email';

export interface SingleAnalysisOrder extends WithTimestamps {
  /**
   * Referencia del pago, y a la vez el id del documento.
   *
   * Es la misma pieza que usa el webhook de la pasarela para encontrar
   * que desbloquear, igual que hacen los pagos de suscripcion.
   */
  reference: string;
  status: SingleAnalysisOrderStatus;
  provider: 'wompi' | 'paypal';
  region: BillingRegion;
  amountInCents: number;
  currency: string;

  /**
   * Correo de quien compra. Se pide al ENTREGAR, no antes: sin cuenta no
   * hay correo previo, y pedirlo para ver la vista previa anade la
   * friccion que esta funcionalidad viene justo a quitar.
   */
  email?: string;

  /** Del contrato analizado, para el registro y las metricas. */
  country?: CountryCode;
  contractTypeId?: string;
  pageCount?: number;

  /**
   * Tope duro de vida del analisis. Pasada esta fecha se borra aunque
   * nadie haya pagado y aunque nadie lo haya descargado.
   */
  expiresAt: FirestoreDate;

  paidAt?: FirestoreDate;
  deliveredAt?: FirestoreDate;
  deliveredBy?: SingleAnalysisDelivery;

  /**
   * Huella del cliente para limitar abuso por volumen. No identifica a
   * nadie ni se usa para otra cosa: sin cuenta, el unico freno posible a
   * que alguien automatice miles de vistas previas es contar por origen.
   */
  clientFingerprint?: string;
}
