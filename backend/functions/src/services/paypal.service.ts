import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import {
  BILLING_CURRENCY_LATAM,
  COLLECTIONS,
  getProAmountForRegion,
  type BillingInterval,
} from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { setUserPlan } from './subscription.service';
import { AppError } from '../utils/errors';
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
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
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

  const amountInCents = getProAmountForRegion('LATAM', interval);
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
  saleId?: string
): Promise<void> {
  if (payment.status === 'succeeded') {
    return;
  }

  const periodEnd = addMonths(new Date(), interval === 'annual' ? 12 : 1);

  await setUserPlan(userId, 'pro', {
    subscriptionStatus: 'active',
    subscriptionId,
    currentPeriodEnd: periodEnd,
    billingProvider: 'paypal',
    cancelAtPeriodEnd: false,
    clearCancellation: true,
  });

  await paymentRef.update({
    status: 'succeeded',
    paypalSubscriptionId: subscriptionId,
    ...(saleId ? { paypalSaleId: saleId } : {}),
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
  subscriptionId: string
): Promise<void> {
  const userDoc = await adminDb().collection(COLLECTIONS.users).doc(userId).get();
  const user = userDoc.data();
  if (!user || user.planId !== 'pro') return;

  const periodEnd = addMonths(new Date(), interval === 'annual' ? 12 : 1);

  await setUserPlan(userId, 'pro', {
    subscriptionStatus: 'active',
    subscriptionId,
    currentPeriodEnd: periodEnd,
    billingProvider: 'paypal',
    cancelAtPeriodEnd: false,
    clearCancellation: true,
  });

  logger.info('paypal', 'Periodo Pro extendido vía PayPal', {
    userId,
    metadata: { subscriptionId, interval },
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

  if (found.data.status === 'pending') {
    await activateProFromPayment(
      userId,
      interval,
      billingAgreementId,
      found.ref,
      found.data,
      saleId
    );
    return;
  }

  await found.ref.update({
    paypalSaleId: saleId,
    paidAt: FieldValue.serverTimestamp(),
  });

  await extendProPeriod(userId, interval, billingAgreementId);
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
