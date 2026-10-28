import type { SingleAnalysisPreview } from '../preview/single-analysis';
import type { Analysis, AnalysisRisk } from './analysis.types';
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

/**
 * Lo que devuelve consultar una orden con su referencia.
 *
 * Vive en shared y no en el servidor porque es un contrato entre los dos
 * lados: la pantalla tiene que distinguir "todavia analizando" de "listo
 * pero sin pagar" de "ya caduco", y cada uno se pinta distinto.
 */
export type SingleAnalysisState =
  | { estado: 'analizando' }
  | {
      estado: 'listo';
      pagado: boolean;
      /** El contrato se corto por largo: hay que avisarlo ANTES del pago. */
      truncado: boolean;
      /**
       * El precio CONGELADO en la orden, no el vigente.
       *
       * Viaja aqui y no lo consulta la pantalla aparte porque es el que se
       * va a cobrar: si la pantalla leyera el precio actual, un cambio entre
       * la vista previa y el pago ensenaria una cifra y cobraria otra.
       */
      amountInCents: number;
      currency: string;
      /**
       * Quien cobra. La pantalla lo necesita para saber que hacer al volver
       * del pago: con PayPal hay que pedir la captura, con Wompi lo confirma
       * su webhook y solo hay que esperar.
       */
      provider: 'wompi' | 'paypal';
      preview: SingleAnalysisPreview;
    }
  | { estado: 'expirado' };

/**
 * El informe entero, una vez pagado.
 *
 * Es lo contrario de SingleAnalysisPreview y conviene verlos juntos: alli se
 * cuenta cuantos riesgos hay y se cita el contrato; aqui va el juicio --en
 * que consiste cada riesgo, que pasa si se aplica, que pedir y con que
 * redaccion--, que es lo que se cobra.
 */
export interface SingleAnalysisReport {
  analysis: Analysis;
  risks: AnalysisRisk[];
  risksSummary?: string;
  risksScore?: number;
  truncated: boolean;
}

/**
 * Lo que necesita el navegador para cobrar, segun la pasarela que toque.
 *
 * Union discriminada y no un objeto con todo opcional: asi la pantalla no
 * puede olvidarse de mirar el proveedor y acabar pasandole al widget de
 * Wompi una orden de PayPal con la firma vacia.
 */
export type SingleAnalysisCheckout =
  | {
      provider: 'wompi';
      reference: string;
      amountInCents: number;
      currency: string;
      checkoutUrl: string;
      publicKey: string;
      integritySignature: string;
      redirectUrl: string;
    }
  | {
      provider: 'paypal';
      reference: string;
      amountInCents: number;
      currency: string;
      orderId: string;
      /**
       * Donde manda al navegador para que apruebe el pago.
       *
       * Con esto no hace falta cargar el SDK de PayPal: se redirige igual que
       * con Wompi y se vuelve a la pantalla del analisis. Un script de
       * terceros menos en una pagina por la que pasan contratos.
       */
      approveUrl: string;
    };

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
   * El extractor corto el contrato por largo, asi que el analisis cubre
   * solo una parte.
   *
   * Se guarda porque hay que AVISARLO antes del pago. Cobrar por un
   * analisis parcial sin decirlo es exactamente lo que no se puede
   * permitir un producto legal: quien paga cree que se reviso su contrato
   * entero.
   */
  truncated?: boolean;

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
