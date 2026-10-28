import type {
  FirestoreDate,
  PaymentStatus,
} from './common.types';
import type { PlanSlug } from './plan.types';
import type { BillingInterval } from '../constants/billing';

export type PaymentProvider = 'wompi' | 'paypal';

/**
 * Que se cobro.
 *
 * Ausente significa suscripcion, que es lo que eran todos los pagos antes de
 * que existiera la compra suelta. Asi los documentos ya guardados siguen
 * leyendose bien sin tener que tocarlos uno a uno.
 */
export type PaymentKind = 'subscription' | 'single_analysis';

export interface Payment {
  /**
   * Quien pago. Opcional porque un analisis suelto se compra SIN cuenta: no
   * hay uid que guardar.
   *
   * Conviene no esperar que el compilador avise de los sitios que suponen
   * que esta. Casi todos leen de doc.data(), que es DocumentData y no este
   * tipo, asi que un cast `as string` los silencia igual. Lo que protege de
   * verdad es la comprobacion en tiempo de ejecucion del webhook.
   */
  userId?: string;
  kind?: PaymentKind;
  provider?: PaymentProvider;
  reference?: string;
  wompiTransactionId?: string;
  paypalSubscriptionId?: string;
  paypalSaleId?: string;
  billingInterval?: BillingInterval;
  amount: number;
  currency: string;
  status: PaymentStatus;
  planId?: PlanSlug;
  description?: string;
  receiptUrl?: string;
  failureCode?: string;
  createdAt: FirestoreDate;
  paidAt?: FirestoreDate;
}
