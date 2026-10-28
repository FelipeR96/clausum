import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import {
  BILLING_CURRENCY_LATAM,
  COLLECTIONS,
  type BillingInterval,
  type SingleAnalysisCheckout,
} from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import {
  paypalClientSecretSecret,
  paypalWebhookIdSecret,
  readSecret,
} from '../config/env';
import { setUserPlan } from './subscription.service';
import { datosParaCobro, marcarOrdenPagada } from './single-analysis.service';
import { AppError } from '../utils/errors';
import { firestoreDateToDate } from '../utils/firestore-date';
import { inicioDelNuevoPeriodo } from '../utils/billing-period';
import { importeCobradoPorPayPal } from '../utils/paypal-amount';
import { getAmountInCents } from '../config/pricing';
import { logger } from '../utils/logger';

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  mode: 'sandbox' | 'live';
  planIdMonthly: string;
  planIdAnnual: string;
  appUrl: string;
}

interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalLink {
  href: string;
  rel: string;
  method: string;
}

interface PayPalSubscriptionResponse {
  id: string;
  status: string;
  links: PayPalLink[];
}

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: Record<string, unknown>;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export function getPayPalConfig(): PayPalConfig | null {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = readSecret(paypalClientSecretSecret, 'PAYPAL_CLIENT_SECRET');
  const webhookId = readSecret(paypalWebhookIdSecret, 'PAYPAL_WEBHOOK_ID');
  const planIdMonthly = process.env.PAYPAL_PLAN_ID_MONTHLY;
  const planIdAnnual = process.env.PAYPAL_PLAN_ID_ANNUAL;
  const mode = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox';
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

  if (!clientId || !clientSecret || !webhookId || !planIdMonthly || !planIdAnnual) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    webhookId,
    mode,
    planIdMonthly,
    planIdAnnual,
    appUrl,
  };
}

export function isPayPalConfigured(): boolean {
  return getPayPalConfig() !== null;
}

function getPayPalBaseUrl(mode: 'sandbox' | 'live'): string {
  return mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getPayPalAccessToken(config: PayPalConfig): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const baseUrl = getPayPalBaseUrl(config.mode);
  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error('paypal', 'Error obteniendo token PayPal', new Error(body));
    throw new AppError('No se pudo conectar con PayPal', 502, 'PAYPAL_AUTH_FAILED');
  }

  const data = (await response.json()) as PayPalAccessTokenResponse;
  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function buildPaymentReference(userId: string, interval: BillingInterval): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `clausum_paypal_${userId.slice(0, 8)}_${Date.now()}_${interval}_${suffix}`;
}

function getPlanId(config: PayPalConfig, interval: BillingInterval): string {
  return interval === 'annual' ? config.planIdAnnual : config.planIdMonthly;
}

export async function createPayPalSubscription(
  userId: string,
  email: string,
  interval: BillingInterval
): Promise<{ approvalUrl: string; subscriptionId: string }> {
  const config = getPayPalConfig();
  if (!config) {
    throw new AppError('Los pagos con PayPal no están configurados en el servidor', 503);
  }

  const userDoc = await adminDb().collection(COLLECTIONS.users).doc(userId).get();
  const billingRegion = userDoc.data()?.billingRegion ?? 'CO';
  if (billingRegion !== 'LATAM') {
    throw new AppError(
      'PayPal solo está disponible para clientes fuera de Colombia. Selecciona Resto de LATAM en precios.',
      400,
      'PAYPAL_REGION_MISMATCH'
    );
  }

  const amountInCents = await getAmountInCents('LATAM', interval);
  const reference = buildPaymentReference(userId, interval);
  const token = await getPayPalAccessToken(config);
  const baseUrl = getPayPalBaseUrl(config.mode);
  const returnUrl = `${config.appUrl}/panel/configuracion?tab=billing&pago=ok`;
  const cancelUrl = `${config.appUrl}/panel/configuracion?tab=billing&pago=cancel`;

  const subscriptionResponse = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      plan_id: getPlanId(config, interval),
      custom_id: userId,
      subscriber: {
        email_address: email,
      },
      application_context: {
        brand_name: 'Clausum',
        locale: 'es-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!subscriptionResponse.ok) {
    const body = await subscriptionResponse.text();
    logger.error('paypal', 'Error creando suscripción PayPal', new Error(body), {
      userId,
      metadata: { interval },
    });
    throw new AppError('No se pudo iniciar la suscripción en PayPal', 502, 'PAYPAL_SUBSCRIBE_FAILED');
  }

  const subscription = (await subscriptionResponse.json()) as PayPalSubscriptionResponse;
  const approvalLink = subscription.links.find((link) => link.rel === 'approve');

  if (!approvalLink?.href) {
    throw new AppError('PayPal no devolvió URL de aprobación', 502, 'PAYPAL_NO_APPROVAL_URL');
  }

  await adminDb()
    .collection(COLLECTIONS.payments)
    .doc(reference)
    .set({
      userId,
      provider: 'paypal',
      reference,
      paypalSubscriptionId: subscription.id,
      amount: amountInCents,
      currency: BILLING_CURRENCY_LATAM,
      status: 'pending',
      planId: 'pro',
      billingInterval: interval,
      description:
        interval === 'annual'
          ? 'Clausum Pro — plan anual (LATAM)'
          : 'Clausum Pro — plan mensual (LATAM)',
      createdAt: FieldValue.serverTimestamp(),
    });

  logger.info('paypal', 'Suscripción PayPal creada', {
    userId,
    metadata: { reference, subscriptionId: subscription.id, interval },
  });

  return {
    approvalUrl: approvalLink.href,
    subscriptionId: subscription.id,
  };
}

async function findPaymentBySubscriptionId(
  subscriptionId: string
): Promise<{ ref: DocumentReference; data: Record<string, unknown> } | null> {
  const snap = await adminDb()
    .collection(COLLECTIONS.payments)
    .where('paypalSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  return { ref: doc.ref, data: doc.data() };
}

async function activateProFromPayment(
  userId: string,
  interval: BillingInterval,
  subscriptionId: string,
  paymentRef: DocumentReference,
  payment: Record<string, unknown>,
  saleId?: string,
  /** Lo que PayPal dice haber cobrado. Manda sobre lo que calculamos. */
  cobrado?: { amountInCents: number; currency?: string } | null
): Promise<void> {
  if (payment.status === 'succeeded') {
    return;
  }

  // Misma regla que Wompi: a nadie se le quita tiempo que ya pago. Aqui
  // era peor, porque reiniciaba el periodo incluso en las renovaciones.
  const userDoc = await adminDb().collection(COLLECTIONS.users).doc(userId).get();
  const currentEnd = firestoreDateToDate(userDoc.data()?.currentPeriodEnd);
  const periodEnd = addMonths(inicioDelNuevoPeriodo(currentEnd), interval === 'annual' ? 12 : 1);

  await setUserPlan(userId, 'pro', {
    subscriptionStatus: 'active',
    subscriptionId,
    currentPeriodEnd: periodEnd,
    billingProvider: 'paypal',
    billingInterval: interval,
    cancelAtPeriodEnd: false,
    clearCancellation: true,
    ...(cobrado ? { subscriptionAmountInCents: cobrado.amountInCents } : {}),
  });

  await paymentRef.update({
    status: 'succeeded',
    paypalSubscriptionId: subscriptionId,
    ...(saleId ? { paypalSaleId: saleId } : {}),
    // El importe se corrige con el real si PayPal lo manda: el que habia
    // es el que esperabamos cobrar cuando se creo la suscripcion.
    ...(cobrado
      ? {
          amount: cobrado.amountInCents,
          ...(cobrado.currency ? { currency: cobrado.currency } : {}),
        }
      : {}),
    paidAt: FieldValue.serverTimestamp(),
  });

  logger.info('paypal', 'Plan Pro activado vía PayPal', {
    userId,
    metadata: { subscriptionId, interval },
  });
}

async function extendProPeriod(
  userId: string,
  interval: BillingInterval,
  subscriptionId: string,
  cobrado?: { amountInCents: number; currency?: string } | null,
  saleId?: string
): Promise<void> {
  const userDoc = await adminDb().collection(COLLECTIONS.users).doc(userId).get();
  const user = userDoc.data();
  if (!user || user.planId !== 'pro') return;

  // Misma regla que en todas partes: el periodo nuevo arranca donde
  // termina el vigente. Contar desde hoy le quitaba a cada renovacion los
  // dias que le quedaban al cliente.
  const currentEnd = firestoreDateToDate(user.currentPeriodEnd);
  const periodEnd = addMonths(
    inicioDelNuevoPeriodo(currentEnd),
    interval === 'annual' ? 12 : 1
  );

  await setUserPlan(userId, 'pro', {
    subscriptionStatus: 'active',
    subscriptionId,
    currentPeriodEnd: periodEnd,
    billingProvider: 'paypal',
    billingInterval: interval,
    cancelAtPeriodEnd: false,
    clearCancellation: true,
    ...(cobrado ? { subscriptionAmountInCents: cobrado.amountInCents } : {}),
  });

  // Cada renovacion es un pago NUEVO.
  //
  // Antes se reescribia el documento del primer pago con un paidAt nuevo,
  // asi que una suscripcion de seis meses dejaba un unico pago con la
  // fecha del ultimo cobro: los ingresos de los cinco meses anteriores no
  // es que se borraran, es que nunca llegaban a existir.
  const referencia = buildPaymentReference(userId, interval);
  await adminDb()
    .collection(COLLECTIONS.payments)
    .doc(referencia)
    .set({
      userId,
      provider: 'paypal',
      reference: referencia,
      paypalSubscriptionId: subscriptionId,
      ...(saleId ? { paypalSaleId: saleId } : {}),
      amount: cobrado?.amountInCents ?? (user.subscriptionAmountInCents as number | undefined) ?? 0,
      currency: cobrado?.currency ?? BILLING_CURRENCY_LATAM,
      status: 'succeeded',
      planId: 'pro',
      billingInterval: interval,
      isRenewal: true,
      description:
        interval === 'annual'
          ? 'Clausum Pro — renovación anual (LATAM)'
          : 'Clausum Pro — renovación mensual (LATAM)',
      createdAt: FieldValue.serverTimestamp(),
      paidAt: FieldValue.serverTimestamp(),
    });

  logger.info('paypal', 'Periodo Pro extendido vía PayPal', {
    userId,
    metadata: { subscriptionId, interval, referencia },
  });
}

async function handleSubscriptionActivated(resource: Record<string, unknown>): Promise<void> {
  const subscriptionId = String(resource.id ?? '');
  if (!subscriptionId) return;

  const found = await findPaymentBySubscriptionId(subscriptionId);
  if (!found) {
    logger.warn('paypal', 'Pago no encontrado para suscripción activada', {
      metadata: { subscriptionId },
    });
    return;
  }

  const userId = found.data.userId as string;
  const interval = (found.data.billingInterval as BillingInterval) ?? 'monthly';

  await activateProFromPayment(
    userId,
    interval,
    subscriptionId,
    found.ref,
    found.data
  );
}

async function handlePaymentCompleted(resource: Record<string, unknown>): Promise<void> {
  const billingAgreementId = String(
    resource.billing_agreement_id ?? resource.billingAgreementId ?? ''
  );
  const saleId = String(resource.id ?? '');

  if (!billingAgreementId) return;

  const found = await findPaymentBySubscriptionId(billingAgreementId);
  if (!found) {
    logger.warn('paypal', 'Pago no encontrado para renovación PayPal', {
      metadata: { billingAgreementId, saleId },
    });
    return;
  }

  const userId = found.data.userId as string;
  const interval = (found.data.billingInterval as BillingInterval) ?? 'monthly';
  const cobrado = importeCobradoPorPayPal(resource);

  // Quien decide si esto es el primer cobro o una renovacion es el id de
  // venta, no el estado del pago.
  //
  // Al suscribirse, PayPal manda DOS eventos: BILLING.SUBSCRIPTION.ACTIVATED
  // y PAYMENT.SALE.COMPLETED. El primero ya deja el pago en 'succeeded', asi
  // que mirar el estado hacia que el segundo pareciera una renovacion y el
  // primer cobro se contara dos veces.
  const ventaYaRegistrada = found.data.paypalSaleId as string | undefined;

  // El mismo evento otra vez: PayPal reintenta si tardamos en responder.
  if (ventaYaRegistrada && ventaYaRegistrada === saleId) return;

  if (!ventaYaRegistrada) {
    // Primer cobro. activateProFromPayment no hace nada si ACTIVATED ya
    // activo el plan, asi que el importe real se escribe aqui en cualquier
    // caso.
    await activateProFromPayment(
      userId,
      interval,
      billingAgreementId,
      found.ref,
      found.data,
      saleId,
      cobrado
    );

    await found.ref.update({
      status: 'succeeded',
      paypalSaleId: saleId,
      ...(cobrado
        ? {
            amount: cobrado.amountInCents,
            ...(cobrado.currency ? { currency: cobrado.currency } : {}),
          }
        : {}),
      paidAt: FieldValue.serverTimestamp(),
    });

    if (cobrado) {
      await setUserPlan(userId, 'pro', {
        subscriptionAmountInCents: cobrado.amountInCents,
      });
    }
    return;
  }

  // Venta distinta a la ya registrada: es una renovacion de verdad. Se
  // registra como pago aparte y no se toca el original.
  await extendProPeriod(userId, interval, billingAgreementId, cobrado, saleId);
}

async function handleSubscriptionEnded(
  resource: Record<string, unknown>,
  reason: string
): Promise<void> {
  const subscriptionId = String(resource.id ?? '');
  if (!subscriptionId) return;

  const found = await findPaymentBySubscriptionId(subscriptionId);
  if (!found) return;

  const userId = found.data.userId as string;
  const userDoc = await adminDb().collection(COLLECTIONS.users).doc(userId).get();
  const user = userDoc.data();

  const periodEndRaw = user?.currentPeriodEnd;
  const periodEnd =
    periodEndRaw instanceof Date
      ? periodEndRaw
      : periodEndRaw?.toDate?.() ?? null;

  if (periodEnd && periodEnd.getTime() > Date.now()) {
    await adminDb()
      .collection(COLLECTIONS.users)
      .doc(userId)
      .set(
        {
          cancelAtPeriodEnd: true,
          subscriptionStatus: 'canceled',
          canceledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    logger.info('paypal', 'Suscripción PayPal cancelada — Pro hasta fin de periodo', {
      userId,
      metadata: { subscriptionId, reason, periodEnd: periodEnd.toISOString() },
    });
    return;
  }

  await setUserPlan(userId, 'free', {
    subscriptionStatus: 'canceled',
    subscriptionId,
  });

  await found.ref.update({
    status: 'failed',
    failureCode: reason,
  });

  logger.info('paypal', 'Suscripción PayPal finalizada', {
    userId,
    metadata: { subscriptionId, reason },
  });
}

export async function cancelPayPalSubscription(userId: string): Promise<void> {
  const config = getPayPalConfig();
  if (!config) {
    throw new AppError('Los pagos con PayPal no están configurados', 503);
  }

  const userDoc = await adminDb().collection(COLLECTIONS.users).doc(userId).get();
  const user = userDoc.data();

  if (!user || user.planId !== 'pro') {
    throw new AppError('No tienes un plan Pro activo', 400, 'NO_ACTIVE_SUBSCRIPTION');
  }

  if (user.billingProvider !== 'paypal') {
    throw new AppError(
      'La cancelación en línea solo aplica a suscripciones PayPal. Si pagaste con Wompi, usa el botón de cancelación en facturación.',
      400,
      'CANCEL_NOT_APPLICABLE'
    );
  }

  if (user.cancelAtPeriodEnd) {
    throw new AppError('La renovación automática ya está cancelada', 409, 'ALREADY_CANCELED');
  }

  const subscriptionId = user.subscriptionId as string | undefined;
  if (!subscriptionId) {
    throw new AppError('No se encontró la suscripción de PayPal', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  const token = await getPayPalAccessToken(config);
  const baseUrl = getPayPalBaseUrl(config.mode);

  const response = await fetch(
    `${baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'Cancelación solicitada por el usuario en Clausum' }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    logger.error('paypal', 'Error cancelando suscripción PayPal', new Error(body), {
      userId,
      metadata: { subscriptionId },
    });
    throw new AppError(
      'No se pudo cancelar la suscripción en PayPal. Intenta desde tu cuenta PayPal o contacta soporte.',
      502,
      'PAYPAL_CANCEL_FAILED'
    );
  }

  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .set(
      {
        cancelAtPeriodEnd: true,
        subscriptionStatus: 'canceled',
        canceledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  logger.info('paypal', 'Renovación PayPal cancelada por el usuario', {
    userId,
    metadata: { subscriptionId },
  });
}

export async function verifyPayPalWebhook(
  headers: Record<string, string | string[] | undefined>,
  body: PayPalWebhookEvent
): Promise<boolean> {
  const config = getPayPalConfig();
  if (!config) return false;

  const transmissionId = String(headers['paypal-transmission-id'] ?? '');
  const transmissionTime = String(headers['paypal-transmission-time'] ?? '');
  const certUrl = String(headers['paypal-cert-url'] ?? '');
  const authAlgo = String(headers['paypal-auth-algo'] ?? '');
  const transmissionSig = String(headers['paypal-transmission-sig'] ?? '');

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  const token = await getPayPalAccessToken(config);
  const baseUrl = getPayPalBaseUrl(config.mode);

  const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: config.webhookId,
      webhook_event: body,
    }),
  });

  if (!response.ok) {
    logger.warn('paypal', 'Verificación webhook PayPal falló', {
      metadata: { status: response.status },
    });
    return false;
  }

  const result = (await response.json()) as { verification_status?: string };
  return result.verification_status === 'SUCCESS';
}

export async function handlePayPalWebhook(
  headers: Record<string, string | string[] | undefined>,
  event: PayPalWebhookEvent
): Promise<void> {
  const config = getPayPalConfig();
  if (!config) {
    throw new AppError('Los pagos con PayPal no están configurados', 503);
  }

  const verified = await verifyPayPalWebhook(headers, event);
  if (!verified) {
    throw new AppError('Firma de webhook PayPal inválida', 401);
  }

  const eventType = event.event_type;
  const resource = event.resource ?? {};

  switch (eventType) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      await handleSubscriptionActivated(resource);
      break;
    case 'PAYMENT.SALE.COMPLETED':
      await handlePaymentCompleted(resource);
      break;
    // Las capturas son de Ordenes v2 --la compra suelta-- y las ventas son
    // de suscripciones v1. No se pisan.
    case 'PAYMENT.CAPTURE.COMPLETED':
      await handleSingleAnalysisCaptureCompleted(resource);
      break;
    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.EXPIRED':
    case 'BILLING.SUBSCRIPTION.SUSPENDED':
      await handleSubscriptionEnded(resource, eventType);
      break;
    default:
      logger.info('paypal', 'Evento PayPal ignorado', {
        metadata: { eventType, eventId: event.id },
      });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Compra de un analisis suelto, sin cuenta
//
// Es un flujo distinto del de las suscripciones de arriba, no una variante.
// Una suscripcion de PayPal se crea contra un PLAN, que lleva el precio
// dentro y se cobra solo cada mes. Aqui se cobra una vez y el precio es el
// que lleva la orden, asi que esto son Ordenes v2 con captura.
//
// El camino principal es la captura desde el servidor, y a proposito: la
// hacemos nosotros llamando a PayPal, asi que el monto que confirmamos lo
// dice PayPal y no el navegador. El webhook queda como red para cuando el
// navegador se muere despues de aprobar y la captura nunca llega.
// ─────────────────────────────────────────────────────────────────────────

interface PayPalOrderResponse {
  id: string;
  status: string;
  links?: PayPalLink[];
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units?: {
    payments?: {
      captures?: {
        id: string;
        status: string;
        amount?: { currency_code?: string; value?: string };
      }[];
    };
  }[];
  payer?: { email_address?: string };
}

function pagoSueltoRef(reference: string): DocumentReference {
  return adminDb().collection(COLLECTIONS.payments).doc(reference);
}

/**
 * Convierte centavos al decimal que espera PayPal.
 *
 * Solo USD, y la restriccion es deliberada. PayPal clasifica las monedas por
 * numero de decimales: el peso colombiano no admite decimales, asi que
 * mandar "9550.00" en COP seria rechazado --o peor, interpretado-- y el
 * error no se veria hasta que alguien intentara pagar. Aqui PayPal solo
 * atiende LATAM, que cobra en dolares; Colombia va por Wompi.
 */
function importeParaPayPal(amountInCents: number, currency: string): string {
  if (currency !== BILLING_CURRENCY_LATAM) {
    throw new AppError(
      `PayPal solo cobra en ${BILLING_CURRENCY_LATAM} en esta plataforma`,
      400,
      'PAYPAL_CURRENCY_UNSUPPORTED'
    );
  }
  return (amountInCents / 100).toFixed(2);
}

/**
 * Crea el pago pendiente del analisis suelto, SOLO si no existe.
 *
 * Mismo razonamiento que en Wompi: con un `set` normal, dos clics en pagar
 * devolverian a 'pending' un cobro ya procesado, y la idempotencia tanto de
 * la captura como del webhook mira exactamente ese campo.
 *
 * Guarda el id de la orden de PayPal, que es lo que se captura despues. No
 * se acepta el que mande el navegador: ver capturarOrdenDeAnalisisSuelto.
 */
async function crearPagoSueltoPendiente(input: {
  reference: string;
  amountInCents: number;
  currency: string;
  paypalOrderId: string;
}): Promise<void> {
  const ref = pagoSueltoRef(input.reference);

  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      // La orden de PayPal puede ser otra si la primera caduco sin pagarse.
      // El resto no cambia nunca, asi que solo se refresca ese id --y nunca
      // sobre un pago ya resuelto.
      if (snap.data()?.status === 'pending') {
        tx.update(ref, { paypalOrderId: input.paypalOrderId });
      }
      return;
    }

    tx.set(ref, {
      provider: 'paypal',
      // Sin userId: se compra sin cuenta.
      kind: 'single_analysis',
      reference: input.reference,
      paypalOrderId: input.paypalOrderId,
      amount: input.amountInCents,
      currency: input.currency,
      status: 'pending',
      description: 'Clausum — análisis de un documento',
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Abre la orden de PayPal para cobrar un analisis suelto.
 *
 * El monto sale de la orden nuestra, donde quedo congelado al subir el
 * documento: es el precio que la persona vio en la vista previa.
 *
 * `PayPal-Request-Id` con nuestra referencia hace la creacion idempotente en
 * su lado: dos clics en "pagar" devuelven la MISMA orden en vez de dejar
 * ordenes huerfanas sueltas por su panel.
 */
export async function createPayPalSingleAnalysisOrder(
  reference: string
): Promise<Extract<SingleAnalysisCheckout, { provider: 'paypal' }>> {
  const config = getPayPalConfig();
  if (!config) {
    throw new AppError('Los pagos con PayPal no están configurados en el servidor', 503);
  }

  const { amountInCents, currency, provider } = await datosParaCobro(reference);

  if (provider !== 'paypal') {
    throw new AppError(
      'Este análisis se cobra con otro medio de pago',
      400,
      'WRONG_PROVIDER'
    );
  }

  const token = await getPayPalAccessToken(config);
  const baseUrl = getPayPalBaseUrl(config.mode);
  const vuelta = `${config.appUrl}/analisis/${reference}`;

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': reference,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: reference,
          // custom_id es lo que vuelve dentro del evento de captura. Es como
          // el webhook encuentra que desbloquear.
          custom_id: reference,
          description: 'Clausum — análisis de un documento',
          amount: {
            currency_code: currency,
            value: importeParaPayPal(amountInCents, currency),
          },
        },
      ],
      application_context: {
        brand_name: 'Clausum',
        user_action: 'PAY_NOW',
        // Sin cuenta no hay panel al que volver: se vuelve al propio
        // analisis, que es donde esta el boton de descarga.
        return_url: `${vuelta}?pago=ok`,
        cancel_url: `${vuelta}?pago=cancelado`,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error('paypal', 'Error creando orden de análisis suelto', new Error(body), {
      metadata: { reference },
    });
    throw new AppError('No se pudo iniciar el pago con PayPal', 502, 'PAYPAL_ORDER_FAILED');
  }

  const order = (await response.json()) as PayPalOrderResponse;

  // PayPal nombra este enlace 'payer-action' en el flujo nuevo y 'approve' en
  // el clasico, y devuelve uno o el otro segun la cuenta. Aceptar los dos
  // evita que un cambio en su lado deje el boton de pagar sin destino.
  const approveUrl = order.links?.find(
    (l) => l.rel === 'payer-action' || l.rel === 'approve'
  )?.href;

  if (!approveUrl) {
    logger.error('paypal', 'La orden de PayPal llegó sin enlace de aprobación', undefined, {
      metadata: { reference, orderId: order.id },
    });
    throw new AppError('No se pudo iniciar el pago con PayPal', 502, 'PAYPAL_NO_APPROVE_URL');
  }

  await crearPagoSueltoPendiente({
    reference,
    amountInCents,
    currency,
    paypalOrderId: order.id,
  });

  logger.info('paypal', 'Orden de análisis suelto creada', {
    metadata: { reference, orderId: order.id, amountInCents, currency },
  });

  return {
    provider: 'paypal',
    orderId: order.id,
    approveUrl,
    reference,
    amountInCents,
    currency,
  };
}

/**
 * Cobra la orden y desbloquea el informe.
 *
 * ── El id de la orden NO lo manda el navegador ──────────────────────────
 * Se usa el que guardamos al crearla. Aceptar el que llegue en la peticion
 * dejaria desbloquear un informe con el id de una orden pagada de otra
 * persona: sin sesion, lo unico que ata el pago a este analisis es lo que
 * nosotros mismos guardamos.
 *
 * ── Y se comprueba el monto ─────────────────────────────────────────────
 * PayPal devuelve lo que cobro de verdad. Si no cuadra con lo que la orden
 * dice, no se desbloquea nada: es el equivalente a la comprobacion de monto
 * del webhook de Wompi, y sirve para lo mismo --que pagar menos no de un
 * informe completo.
 */
export async function capturePayPalSingleAnalysisOrder(
  reference: string
): Promise<{ status: 'paid'; yaEstaba: boolean }> {
  const config = getPayPalConfig();
  if (!config) {
    throw new AppError('Los pagos con PayPal no están configurados', 503);
  }

  const pagoSnap = await pagoSueltoRef(reference).get();
  if (!pagoSnap.exists) {
    throw new AppError('No hay un pago iniciado para este análisis', 404, 'PAYMENT_NOT_FOUND');
  }

  const pago = pagoSnap.data()!;
  if (pago.kind !== 'single_analysis') {
    throw new AppError('Referencia inválida', 400, 'BAD_REFERENCE');
  }

  // Ya cobrado: no se vuelve a llamar a PayPal. Pasa de verdad --el webhook
  // y el navegador compiten por llegar primero-- y las dos respuestas tienen
  // que ser la misma.
  if (pago.status === 'succeeded') {
    return { status: 'paid', yaEstaba: true };
  }

  const orderId = pago.paypalOrderId as string | undefined;
  if (!orderId) {
    throw new AppError('No hay un pago iniciado para este análisis', 409, 'NO_PAYPAL_ORDER');
  }

  const token = await getPayPalAccessToken(config);
  const baseUrl = getPayPalBaseUrl(config.mode);

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `${reference}-capture`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    // ORDER_ALREADY_CAPTURED significa que el cobro si ocurrio, casi siempre
    // porque el webhook llego primero. Tratarlo como fallo le diria a quien
    // ya pago que su pago no sirvio.
    if (body.includes('ORDER_ALREADY_CAPTURED')) {
      logger.info('paypal', 'Orden ya capturada; se resuelve con lo guardado', {
        metadata: { reference, orderId },
      });
      await marcarOrdenPagada(reference);
      await pagoSueltoRef(reference).update({
        status: 'succeeded',
        paidAt: FieldValue.serverTimestamp(),
      });
      return { status: 'paid', yaEstaba: true };
    }

    logger.error('paypal', 'Error capturando orden de análisis suelto', new Error(body), {
      metadata: { reference, orderId },
    });
    throw new AppError('No se pudo completar el pago con PayPal', 502, 'PAYPAL_CAPTURE_FAILED');
  }

  const captura = (await response.json()) as PayPalCaptureResponse;
  const detalle = captura.purchase_units?.[0]?.payments?.captures?.[0];

  if (captura.status !== 'COMPLETED' || detalle?.status !== 'COMPLETED') {
    logger.warn('paypal', 'Captura de análisis suelto no completada', {
      metadata: {
        reference,
        orderId,
        estadoOrden: String(captura.status),
        estadoCaptura: String(detalle?.status ?? 'sin captura'),
      },
    });
    throw new AppError('El pago no se completó', 402, 'PAYMENT_NOT_COMPLETED');
  }

  // Se le pasa el detalle COMPLETO, no detalle.amount: la funcion busca
  // `.amount` dentro de lo que recibe. Pasarle el amount suelto la hace
  // devolver null siempre, y entonces ninguna captura valida desbloquearia
  // nada --fallando por el lado de no entregar lo pagado.
  const cobrado = importeCobradoPorPayPal(detalle as unknown as Record<string, unknown>);
  const esperado = pago.amount as number;

  if (!cobrado || cobrado.amountInCents !== esperado) {
    logger.error(
      'paypal',
      'Monto capturado distinto del esperado: no se desbloquea el informe',
      undefined,
      {
        metadata: {
          reference,
          orderId,
          esperado,
          cobrado: cobrado?.amountInCents ?? -1,
        },
      }
    );
    await pagoSueltoRef(reference).update({
      status: 'failed',
      failureCode: 'AMOUNT_MISMATCH',
      paypalCaptureId: detalle.id,
    });
    throw new AppError('El monto cobrado no coincide', 409, 'AMOUNT_MISMATCH');
  }

  await marcarOrdenPagada(reference, { email: captura.payer?.email_address });

  await pagoSueltoRef(reference).update({
    status: 'succeeded',
    paypalCaptureId: detalle.id,
    paidAt: FieldValue.serverTimestamp(),
  });

  logger.info('paypal', 'Pago de análisis suelto capturado', {
    metadata: { reference, orderId, captureId: detalle.id, cobrado: esperado },
  });

  return { status: 'paid', yaEstaba: false };
}

/**
 * Red por si el navegador muere despues de aprobar y nunca pide la captura.
 *
 * PayPal captura de todas formas y manda este evento. Sin esta rama, alguien
 * que cierra la pestana justo despues de aprobar quedaria pagado en PayPal y
 * sin informe aqui.
 *
 * No llama a PayPal: el evento ya viene verificado contra su firma y trae el
 * monto cobrado, asi que se comprueba igual que en la captura.
 */
async function handleSingleAnalysisCaptureCompleted(
  resource: Record<string, unknown>
): Promise<void> {
  const reference = typeof resource.custom_id === 'string' ? resource.custom_id : '';
  if (!reference) return;

  const snap = await pagoSueltoRef(reference).get();
  if (!snap.exists) return;

  const pago = snap.data()!;
  if (pago.kind !== 'single_analysis') return;

  // El navegador suele llegar antes. Terminal es terminal.
  if (pago.status === 'succeeded') {
    logger.info('paypal', 'Captura ya resuelta; se ignora el evento', {
      metadata: { reference },
    });
    return;
  }

  const cobrado = importeCobradoPorPayPal(resource);
  const esperado = pago.amount as number;

  if (!cobrado || cobrado.amountInCents !== esperado) {
    logger.error(
      'paypal',
      'Evento de captura con monto distinto del esperado: no se desbloquea',
      undefined,
      {
        metadata: {
          reference,
          esperado,
          cobrado: cobrado?.amountInCents ?? -1,
        },
      }
    );
    await pagoSueltoRef(reference).update({
      status: 'failed',
      failureCode: 'AMOUNT_MISMATCH',
    });
    return;
  }

  try {
    await marcarOrdenPagada(reference);
  } catch (error) {
    if (error instanceof AppError && error.code === 'ORDER_NOT_FOUND') {
      // Dinero cobrado sobre un analisis ya borrado. Se registra y el pago se
      // marca cobrado, porque lo fue: queda visible en ingresos para
      // devolverlo a mano. Lanzar haria que PayPal reintentara para siempre.
      logger.error(
        'paypal',
        'Captura de un análisis cuyo informe ya había caducado',
        undefined,
        { metadata: { reference } }
      );
      await pagoSueltoRef(reference).update({
        status: 'succeeded',
        paidAt: FieldValue.serverTimestamp(),
        failureCode: 'ORDER_EXPIRED',
      });
      return;
    }
    throw error;
  }

  await pagoSueltoRef(reference).update({
    status: 'succeeded',
    paidAt: FieldValue.serverTimestamp(),
    ...(typeof resource.id === 'string' ? { paypalCaptureId: resource.id } : {}),
  });

  logger.info('paypal', 'Pago de análisis suelto confirmado por webhook', {
    metadata: { reference, esperado },
  });
}
