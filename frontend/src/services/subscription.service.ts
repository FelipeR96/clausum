import type { BillingInterval } from '@clausum/shared';
import { apiClient } from '@/services/api/client';

export type WompiCheckoutPayload = {
  checkoutUrl: string;
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  integritySignature: string;
  redirectUrl: string;
  customerEmail?: string;
  customerFullName?: string;
};

export type WompiSubscribeConfigPayload = {
  publicKey: string;
  currency: string;
  amountInCents: number;
  reference: string;
  interval: BillingInterval;
  acceptancePermalink: string;
  personalDataPermalink: string;
  widgetUrl: string;
};

export type WompiSubscribeResult = {
  status: 'pending' | 'redirect';
  reference: string;
  transactionId?: string;
  asyncPaymentUrl?: string;
};

export type PayPalSubscribePayload = {
  approvalUrl: string;
  subscriptionId: string;
};

export async function fetchWompiStatus(): Promise<{
  configured: boolean;
  recurrent: boolean;
}> {
  return apiClient<{ configured: boolean; recurrent: boolean }>('/billing/wompi/status');
}

export async function fetchPayPalStatus(): Promise<{ configured: boolean }> {
  return apiClient<{ configured: boolean }>('/billing/paypal/status');
}

export async function createWompiCheckout(
  interval: BillingInterval
): Promise<WompiCheckoutPayload> {
  return apiClient<WompiCheckoutPayload>('/billing/wompi/checkout', {
    method: 'POST',
    body: JSON.stringify({ interval }),
  });
}

export async function getWompiSubscribeConfig(
  interval: BillingInterval
): Promise<WompiSubscribeConfigPayload> {
  return apiClient<WompiSubscribeConfigPayload>('/billing/wompi/subscribe-config', {
    method: 'POST',
    body: JSON.stringify({ interval }),
  });
}

export async function completeWompiSubscription(
  interval: BillingInterval,
  reference: string,
  paymentToken: string
): Promise<WompiSubscribeResult> {
  return apiClient<WompiSubscribeResult>('/billing/wompi/subscribe', {
    method: 'POST',
    body: JSON.stringify({ interval, reference, paymentToken }),
  });
}

export async function cancelWompiSubscription(): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/billing/wompi/cancel', {
    method: 'POST',
  });
}

export async function createPayPalSubscription(
  interval: BillingInterval
): Promise<PayPalSubscribePayload> {
  return apiClient<PayPalSubscribePayload>('/billing/paypal/subscribe', {
    method: 'POST',
    body: JSON.stringify({ interval }),
  });
}

export async function cancelPayPalSubscription(): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/billing/paypal/cancel', {
    method: 'POST',
  });
}

export function submitWompiCheckoutForm(payload: WompiCheckoutPayload): void {
  const form = document.createElement('form');
  form.method = 'GET';
  form.action = payload.checkoutUrl;

  const fields: Record<string, string> = {
    'public-key': payload.publicKey,
    currency: payload.currency,
    'amount-in-cents': String(payload.amountInCents),
    reference: payload.reference,
    'signature:integrity': payload.integritySignature,
    'redirect-url': payload.redirectUrl,
  };

  if (payload.customerEmail) {
    fields['customer-data:email'] = payload.customerEmail;
  }
  if (payload.customerFullName) {
    fields['customer-data:full-name'] = payload.customerFullName;
  }

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
