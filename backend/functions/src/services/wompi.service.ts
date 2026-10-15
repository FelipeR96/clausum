import { createHash, timingSafeEqual } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  BILLING_CURRENCY,
  COLLECTIONS,
  WOMPI_CHECKOUT_URL,
  getProAmountInCents,
  type BillingInterval,
} from '@clausum/shared';
import type { User } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import {
  readSecret,
  wompiEventsSecret,
  wompiIntegritySecret,
  wompiPrivateKeySecret,
} from '../config/env';
import { setUserPlan } from './subscription.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import {
  createWompiPaymentSource,
  createWompiRecurrentTransaction,
  fetchWompiAcceptanceTokens,
  voidWompiPaymentSource,
  type WompiApiConfig,
} from '../integrations/wompi/wompi-api';

export interface WompiConfig {
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  eventsSecret: string;
  appUrl: string;
}

export interface WompiCheckoutPayload {
  checkoutUrl: string;
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  integritySignature: string;
  redirectUrl: string;
  customerEmail?: string;
  customerFullName?: string;
}

export interface WompiSubscribeConfigPayload {
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  interval: BillingInterval;
  acceptancePermalink: string;
  personalDataPermalink: string;
  widgetUrl: string;
}

export interface WompiSubscribeResult {
  status: 'pending' | 'redirect';
  reference: string;
  transactionId?: string;
  asyncPaymentUrl?: string;
}

interface WompiTransaction {
  id: string;
  amount_in_cents: number;
  reference: string;
  customer_email?: string;
  currency: string;
  status: string;
  payment_source_id?: number;
}

export interface WompiWebhookEvent {
  event: string;
  data: {
    transaction?: WompiTransaction;
  };
  environment: string;
  signature: {
    properties: string[];
    checksum: string;
  };
  timestamp: number;
}

const WOMPI_WIDGET_URL = 'https://checkout.wompi.co/widget.js';
const RENEWAL_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;
const RENEWAL_RETRY_GRACE_MS = 3 * 24 * 60 * 60 * 1000;
const RENEWAL_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export function getWompiConfig(): WompiConfig | null {
  // La llave pública no es secreta (va al widget del navegador); las otras
  // tres salen de Secret Manager, con fallback a .env.local en emulador.
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const privateKey = readSecret(wompiPrivateKeySecret, 'WOMPI_PRIVATE_KEY');
  const integritySecret = readSecret(wompiIntegritySecret, 'WOMPI_INTEGRITY_SECRET');
  const eventsSecret = readSecret(wompiEventsSecret, 'WOMPI_EVENTS_SECRET');
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

  if (!publicKey || !integritySecret || !eventsSecret) {
    return null;
  }

  return {
    publicKey,
    privateKey: privateKey ?? '',
    integritySecret,
    eventsSecret,
    appUrl,
  };
}

export function isWompiConfigured(): boolean {
  return getWompiConfig() !== null;
}

export function isWompiRecurrentConfigured(): boolean {
  const config = getWompiConfig();
  return Boolean(config?.privateKey);
}

function toApiConfig(config: WompiConfig): WompiApiConfig {
  if (!config.privateKey) {
    throw new AppError(
      'WOMPI_PRIVATE_KEY no configurada — necesaria para suscripciones recurrentes',
      503,
      'WOMPI_PRIVATE_KEY_MISSING'
    );
  }
  return {
    publicKey: config.publicKey,
    privateKey: config.privateKey,
    integritySecret: config.integritySecret,
  };
}

export function buildIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string
): string {
  const chain = `${reference}${amountInCents}${currency}${integritySecret}`;
  return createHash('sha256').update(chain).digest('hex');
}

function getNestedStringValue(data: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let current: unknown = data;

  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return '';
    }
    current = (current as Record<string, unknown>)[part];
  }

  return String(current ?? '');
}

export function verifyWompiEventChecksum(
  event: WompiWebhookEvent,
  eventsSecret: string
): boolean {
  let chain = '';

  for (const prop of event.signature.properties) {
    chain += getNestedStringValue(event.data as Record<string, unknown>, prop);
  }

  chain += String(event.timestamp);
  chain += eventsSecret;

  const calculated = createHash('sha256').update(chain).digest('hex').toUpperCase();
  const provided = event.signature.checksum.toUpperCase();

  if (calculated.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(calculated), Buffer.from(provided));
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function buildPaymentReference(
  userId: string,
  interval: BillingInterval,
  kind: 'checkout' | 'subscribe' | 'renew' = 'checkout'
): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  const prefix =
    kind === 'renew' ? 'clausum_renew' : kind === 'subscribe' ? 'clausum_sub' : 'clausum';
  return `${prefix}_${userId.slice(0, 8)}_${Date.now()}_${interval}_${suffix}`;
}

function periodEndFromInterval(interval: BillingInterval, base = new Date()): Date {
  return addMonths(base, interval === 'annual' ? 12 : 1);
}

function firestoreDateToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}

async function createPendingPayment(input: {
  userId: string;
  reference: string;
  interval: BillingInterval;
  amountInCents: number;
  isRenewal?: boolean;
  wompiPaymentSourceId?: number;
}): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.payments)
    .doc(input.reference)
    .set({
      userId: input.userId,
      provider: 'wompi',
      reference: input.reference,
      amount: input.amountInCents,
      currency: BILLING_CURRENCY,
      status: 'pending',
      planId: 'pro',
      billingInterval: input.interval,
      isRenewal: Boolean(input.isRenewal),
      ...(input.wompiPaymentSourceId
        ? { wompiPaymentSourceId: input.wompiPaymentSourceId }
        : {}),
      description:
        input.interval === 'annual'
          ? input.isRenewal
            ? 'Clausum Pro — renovación anual'
            : 'Clausum Pro — suscripción anual'
          : input.isRenewal
            ? 'Clausum Pro — renovación mensual'
            : 'Clausum Pro — suscripción mensual',
      createdAt: FieldValue.serverTimestamp(),
    });
}

async function activateProFromPayment(
  userId: string,
  interval: BillingInterval,
  transactionId: string,
  payment: Record<string, unknown>,
  options?: {
    wompiPaymentSourceId?: number;
    extendFromCurrent?: boolean;
  }
): Promise<void> {
  if (payment.status === 'succeeded') {
    return;
  }

  let periodEnd = periodEndFromInterval(interval);
  if (options?.extendFromCurrent) {
    const userDoc = await adminDb().collection(COLLECTIONS.users).doc(userId).get();
    const currentEnd = firestoreDateToDate(userDoc.data()?.currentPeriodEnd);
    const base =
      currentEnd && currentEnd.getTime() > Date.now() ? currentEnd : new Date();
    periodEnd = periodEndFromInterval(interval, base);
  }

  await setUserPlan(userId, 'pro', {
    subscriptionStatus: 'active',
    subscriptionId: transactionId,
    currentPeriodEnd: periodEnd,
    billingProvider: 'wompi',
    cancelAtPeriodEnd: false,
    clearCancellation: true,
    ...(options?.wompiPaymentSourceId
      ? {
          wompiPaymentSourceId: options.wompiPaymentSourceId,
          wompiBillingInterval: interval,
        }
      : {}),
  });
}

export async function createWompiCheckout(
  userId: string,
  email: string,
  displayName: string | undefined,
  interval: BillingInterval
): Promise<WompiCheckoutPayload> {
  const config = getWompiConfig();
  if (!config) {
    throw new AppError('Los pagos con Wompi no están configurados en el servidor', 503);
  }

  const amountInCents = getProAmountInCents(interval);
  const reference = buildPaymentReference(userId, interval, 'checkout');
  const integritySignature = buildIntegritySignature(
    reference,
    amountInCents,
    BILLING_CURRENCY,
    config.integritySecret
  );
  const redirectUrl = `${config.appUrl}/panel/configuracion?tab=billing&pago=ok`;

  await createPendingPayment({
    userId,
    reference,
    interval,
    amountInCents,
  });

  logger.info('wompi', 'Checkout Wompi creado', {
    userId,
    metadata: { reference, interval, amountInCents },
  });

  return {
    checkoutUrl: WOMPI_CHECKOUT_URL,
    publicKey: config.publicKey,
    currency: BILLING_CURRENCY,
    amountInCents,
    reference,
    integritySignature,
    redirectUrl,
    customerEmail: email,
    customerFullName: displayName,
  };
}

export async function getWompiSubscribeConfig(
  userId: string,
  interval: BillingInterval
): Promise<WompiSubscribeConfigPayload> {
  const config = getWompiConfig();
  if (!config) {
    throw new AppError('Los pagos con Wompi no están configurados en el servidor', 503);
  }
  if (!config.privateKey) {
    throw new AppError(
      'Suscripción recurrente Wompi no disponible (falta WOMPI_PRIVATE_KEY)',
      503,
      'WOMPI_PRIVATE_KEY_MISSING'
    );
  }

  const amountInCents = getProAmountInCents(interval);
  const reference = buildPaymentReference(userId, interval, 'subscribe');
  const acceptance = await fetchWompiAcceptanceTokens(toApiConfig(config));

  await createPendingPayment({
    userId,
    reference,
    interval,
    amountInCents,
  });

  return {
    publicKey: config.publicKey,
    currency: BILLING_CURRENCY,
    amountInCents,
    reference,
    interval,
    acceptancePermalink: acceptance.acceptancePermalink,
    personalDataPermalink: acceptance.personalDataPermalink,
    widgetUrl: WOMPI_WIDGET_URL,
  };
}

export async function completeWompiSubscription(
  userId: string,
  email: string,
  interval: BillingInterval,
  reference: string,
  cardToken: string
): Promise<WompiSubscribeResult> {
  const config = getWompiConfig();
  if (!config) {
    throw new AppError('Los pagos con Wompi no están configurados en el servidor', 503);
  }

  const apiConfig = toApiConfig(config);
  const paymentRef = adminDb().collection(COLLECTIONS.payments).doc(reference);
  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists) {
    throw new AppError('Referencia de pago no encontrada o expirada', 404, 'PAYMENT_NOT_FOUND');
  }

  const payment = paymentSnap.data()!;
  if (payment.userId !== userId) {
    throw new AppError('Referencia de pago inválida', 403, 'PAYMENT_FORBIDDEN');
  }
  if (payment.status !== 'pending') {
    throw new AppError('Este pago ya fue procesado', 409, 'PAYMENT_ALREADY_PROCESSED');
  }

  const amountInCents = payment.amount as number;
  const acceptance = await fetchWompiAcceptanceTokens(apiConfig);
  const paymentSourceId = await createWompiPaymentSource(apiConfig, {
    customerEmail: email,
    cardToken,
    acceptanceToken: acceptance.acceptanceToken,
    personalAuthToken: acceptance.personalAuthToken,
  });

  await paymentRef.update({ wompiPaymentSourceId: paymentSourceId });

  const transaction = await createWompiRecurrentTransaction(apiConfig, {
    reference,
    amountInCents,
    customerEmail: email,
    paymentSourceId,
    acceptanceToken: acceptance.acceptanceToken,
    personalAuthToken: acceptance.personalAuthToken,
  });

  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .set(
      {
        wompiPaymentSourceId: paymentSourceId,
        wompiBillingInterval: interval,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  if (transaction.status === 'APPROVED') {
    await activateProFromPayment(userId, interval, transaction.transactionId, payment, {
      wompiPaymentSourceId: paymentSourceId,
    });
    await paymentRef.update({
      status: 'succeeded',
      wompiTransactionId: transaction.transactionId,
      paidAt: FieldValue.serverTimestamp(),
    });
    return { status: 'pending', reference, transactionId: transaction.transactionId };
  }

  if (transaction.asyncPaymentUrl) {
    return {
      status: 'redirect',
      reference,
      transactionId: transaction.transactionId,
      asyncPaymentUrl: transaction.asyncPaymentUrl,
    };
  }

  return {
    status: 'pending',
    reference,
    transactionId: transaction.transactionId,
  };
}

export async function cancelWompiSubscription(userId: string): Promise<void> {
  const config = getWompiConfig();
  if (!config) {
    throw new AppError('Los pagos con Wompi no están configurados', 503);
  }

  const userDoc = await adminDb().collection(COLLECTIONS.users).doc(userId).get();
  const user = userDoc.data() as Partial<User> | undefined;

  if (!user || user.planId !== 'pro') {
    throw new AppError('No tienes un plan Pro activo', 400, 'NO_ACTIVE_SUBSCRIPTION');
  }

  if (user.billingProvider !== 'wompi') {
    throw new AppError(
      'La cancelación en línea solo aplica a suscripciones Wompi. Usa PayPal si pagaste en LATAM.',
      400,
      'CANCEL_NOT_APPLICABLE'
    );
  }

  if (user.cancelAtPeriodEnd) {
    throw new AppError('La renovación automática ya está cancelada', 409, 'ALREADY_CANCELED');
  }

  const paymentSourceId = user.wompiPaymentSourceId;
  if (paymentSourceId && config.privateKey) {
    try {
      await voidWompiPaymentSource(toApiConfig(config), paymentSourceId);
    } catch (error) {
      logger.error('wompi', 'Error anulando fuente de pago Wompi', error, {
        userId,
        metadata: { paymentSourceId },
      });
      throw new AppError(
        'No se pudo cancelar la suscripción en Wompi. Contacta soporte.',
        502,
        'WOMPI_CANCEL_FAILED'
      );
    }
  }

  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .set(
      {
        cancelAtPeriodEnd: true,
        subscriptionStatus: 'canceled',
        canceledAt: FieldValue.serverTimestamp(),
        wompiPaymentSourceId: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  logger.info('wompi', 'Renovación Wompi cancelada por el usuario', {
    userId,
    ...(paymentSourceId !== undefined
      ? { metadata: { paymentSourceId } }
      : {}),
  });
}

async function chargeWompiRenewal(
  userId: string,
  user: Partial<User>,
  interval: BillingInterval
): Promise<void> {
  const config = getWompiConfig();
  if (!config?.privateKey) return;

  const paymentSourceId = user.wompiPaymentSourceId;
  const email = user.email;
  if (!paymentSourceId || !email) return;

  const apiConfig = toApiConfig(config);
  const amountInCents = getProAmountInCents(interval);
  const reference = buildPaymentReference(userId, interval, 'renew');

  await createPendingPayment({
    userId,
    reference,
    interval,
    amountInCents,
    isRenewal: true,
    wompiPaymentSourceId: paymentSourceId,
  });

  const acceptance = await fetchWompiAcceptanceTokens(apiConfig);
  const transaction = await createWompiRecurrentTransaction(apiConfig, {
    reference,
    amountInCents,
    customerEmail: email,
    paymentSourceId,
    acceptanceToken: acceptance.acceptanceToken,
    personalAuthToken: acceptance.personalAuthToken,
  });

  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(userId)
    .set({ wompiLastRenewalAttemptAt: FieldValue.serverTimestamp() }, { merge: true });

  logger.info('wompi', 'Cobro de renovación Wompi iniciado', {
    userId,
    metadata: { reference, transactionId: transaction.transactionId, status: transaction.status },
  });
}

export async function processDueWompiRenewals(): Promise<{ attempted: number }> {
  const config = getWompiConfig();
  if (!config?.privateKey) {
    return { attempted: 0 };
  }

  const snap = await adminDb()
    .collection(COLLECTIONS.users)
    .where('billingProvider', '==', 'wompi')
    .where('planId', '==', 'pro')
    .get();

  const now = Date.now();
  let attempted = 0;

  for (const doc of snap.docs) {
    const user = doc.data() as Partial<User>;
    const userId = doc.id;

    if (user.cancelAtPeriodEnd) continue;
    if (!user.wompiPaymentSourceId) continue;
    if (user.subscriptionStatus !== 'active') continue;

    const periodEnd = firestoreDateToDate(user.currentPeriodEnd);
    if (!periodEnd) continue;

    const msUntilEnd = periodEnd.getTime() - now;
    if (msUntilEnd > RENEWAL_LOOKAHEAD_MS) continue;
    if (msUntilEnd < -RENEWAL_RETRY_GRACE_MS) continue;

    const lastAttempt = firestoreDateToDate(user.wompiLastRenewalAttemptAt);
    if (lastAttempt && now - lastAttempt.getTime() < RENEWAL_COOLDOWN_MS) {
      continue;
    }

    const interval = (user.wompiBillingInterval as BillingInterval) ?? 'monthly';

    try {
      await chargeWompiRenewal(userId, user, interval);
      attempted += 1;
    } catch (error) {
      logger.error('wompi', 'Error en renovación automática Wompi', error, {
        userId,
        metadata: { interval },
      });
    }
  }

  return { attempted };
}

export async function handleWompiWebhook(event: WompiWebhookEvent): Promise<void> {
  const config = getWompiConfig();
  if (!config) {
    throw new AppError('Los pagos con Wompi no están configurados', 503);
  }

  if (!verifyWompiEventChecksum(event, config.eventsSecret)) {
    throw new AppError('Firma de evento Wompi inválida', 401);
  }

  if (event.event !== 'transaction.updated') {
    return;
  }

  const transaction = event.data.transaction;
  if (!transaction?.reference) {
    return;
  }

  const paymentRef = adminDb()
    .collection(COLLECTIONS.payments)
    .doc(transaction.reference);
  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists) {
    logger.warn('wompi', 'Pago no encontrado para referencia Wompi', {
      metadata: { reference: transaction.reference },
    });
    return;
  }

  const payment = paymentSnap.data()!;
  const userId = payment.userId as string;
  const interval = (payment.billingInterval as BillingInterval) ?? 'monthly';
  const isRenewal = Boolean(payment.isRenewal);
  const expectedAmount = payment.amount as number | undefined;
  const expectedCurrency = payment.currency as string | undefined;
  const paymentSourceId =
    (payment.wompiPaymentSourceId as number | undefined) ??
    transaction.payment_source_id;

  if (
    typeof expectedAmount === 'number' &&
    transaction.amount_in_cents !== expectedAmount
  ) {
    logger.warn('wompi', 'Monto Wompi no coincide con el pago registrado', {
      userId,
      metadata: {
        reference: transaction.reference,
        expectedAmount,
        receivedAmount: transaction.amount_in_cents,
      },
    });
    await paymentRef.update({
      status: 'failed',
      wompiTransactionId: transaction.id,
      failureCode: 'AMOUNT_MISMATCH',
    });
    return;
  }

  if (
    expectedCurrency &&
    transaction.currency &&
    transaction.currency !== expectedCurrency
  ) {
    logger.warn('wompi', 'Moneda Wompi no coincide con el pago registrado', {
      userId,
      metadata: {
        reference: transaction.reference,
        expectedCurrency,
        receivedCurrency: transaction.currency,
      },
    });
    await paymentRef.update({
      status: 'failed',
      wompiTransactionId: transaction.id,
      failureCode: 'CURRENCY_MISMATCH',
    });
    return;
  }

  if (transaction.status === 'APPROVED') {
    if (payment.status === 'succeeded') {
      return;
    }

    await activateProFromPayment(userId, interval, transaction.id, payment, {
      wompiPaymentSourceId: paymentSourceId,
      extendFromCurrent: isRenewal,
    });

    await paymentRef.update({
      status: 'succeeded',
      wompiTransactionId: transaction.id,
      paidAt: FieldValue.serverTimestamp(),
      ...(paymentSourceId ? { wompiPaymentSourceId: paymentSourceId } : {}),
    });

    logger.info('wompi', isRenewal ? 'Renovación Wompi aprobada' : 'Pago Wompi aprobado — Pro activo', {
      userId,
      metadata: {
        reference: transaction.reference,
        transactionId: transaction.id,
        interval,
        isRenewal,
      },
    });
    return;
  }

  if (['DECLINED', 'VOIDED', 'ERROR'].includes(transaction.status)) {
    if (payment.status !== 'pending') {
      return;
    }

    await paymentRef.update({
      status: 'failed',
      wompiTransactionId: transaction.id,
      failureCode: transaction.status,
    });

    logger.info('wompi', 'Pago Wompi no aprobado', {
      userId,
      metadata: {
        reference: transaction.reference,
        status: transaction.status,
        isRenewal,
      },
    });
  }
}
