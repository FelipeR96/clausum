import { createHash } from 'crypto';
import { BILLING_CURRENCY } from '@clausum/shared';

export type WompiApiConfig = {
  publicKey: string;
  privateKey: string;
  integritySecret: string;
};

export type WompiAcceptanceTokens = {
  acceptanceToken: string;
  personalAuthToken: string;
  acceptancePermalink: string;
  personalDataPermalink: string;
};

type WompiApiResponse<T> = {
  data?: T;
  error?: { type?: string; reason?: string };
};

export function getWompiApiBase(publicKey: string): string {
  const isSandbox = publicKey.includes('test') || publicKey.includes('_dev_');
  return isSandbox ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1';
}

export function buildTransactionIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string
): string {
  const chain = `${reference}${amountInCents}${currency}${integritySecret}`;
  return createHash('sha256').update(chain).digest('hex');
}

export async function fetchWompiAcceptanceTokens(
  config: WompiApiConfig
): Promise<WompiAcceptanceTokens> {
  const baseUrl = getWompiApiBase(config.publicKey);
  const response = await fetch(`${baseUrl}/merchants/${config.publicKey}`, {
    headers: { Authorization: `Bearer ${config.publicKey}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WOMPI_MERCHANT_FETCH_FAILED:${response.status}:${body}`);
  }

  const payload = (await response.json()) as {
    data?: {
      presigned_acceptance?: { acceptance_token?: string; permalink?: string };
      presigned_personal_data_auth?: { acceptance_token?: string; permalink?: string };
    };
  };

  const acceptanceToken = payload.data?.presigned_acceptance?.acceptance_token;
  const personalAuthToken = payload.data?.presigned_personal_data_auth?.acceptance_token;

  if (!acceptanceToken || !personalAuthToken) {
    throw new Error('WOMPI_ACCEPTANCE_TOKENS_MISSING');
  }

  return {
    acceptanceToken,
    personalAuthToken,
    acceptancePermalink:
      payload.data?.presigned_acceptance?.permalink ??
      'https://wompi.co/wp-content/uploads/2019/09/TERMINOS-Y-CONDICIONES-DE-USO-USUARIOS-WOMPI.pdf',
    personalDataPermalink:
      payload.data?.presigned_personal_data_auth?.permalink ??
      'https://wompi.com/assets/downloadble/autorizacion-administracion-datos-personales.pdf',
  };
}

export async function createWompiPaymentSource(
  config: WompiApiConfig,
  input: {
    customerEmail: string;
    cardToken: string;
    acceptanceToken: string;
    personalAuthToken: string;
  }
): Promise<number> {
  const baseUrl = getWompiApiBase(config.publicKey);
  const response = await fetch(`${baseUrl}/payment_sources`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.privateKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'CARD',
      token: input.cardToken,
      customer_email: input.customerEmail,
      acceptance_token: input.acceptanceToken,
      accept_personal_auth: input.personalAuthToken,
    }),
  });

  const payload = (await response.json()) as WompiApiResponse<{
    id: number;
    status: string;
  }>;

  if (!response.ok || !payload.data?.id) {
    const reason = payload.error?.reason ?? JSON.stringify(payload);
    throw new Error(`WOMPI_PAYMENT_SOURCE_FAILED:${reason}`);
  }

  if (payload.data.status !== 'AVAILABLE') {
    throw new Error(`WOMPI_PAYMENT_SOURCE_UNAVAILABLE:${payload.data.status}`);
  }

  return payload.data.id;
}

export async function createWompiRecurrentTransaction(
  config: WompiApiConfig,
  input: {
    reference: string;
    amountInCents: number;
    customerEmail: string;
    paymentSourceId: number;
    acceptanceToken: string;
    personalAuthToken: string;
    currency?: string;
  }
): Promise<{
  transactionId: string;
  status: string;
  asyncPaymentUrl?: string;
}> {
  const currency = input.currency ?? BILLING_CURRENCY;
  const signature = buildTransactionIntegritySignature(
    input.reference,
    input.amountInCents,
    currency,
    config.integritySecret
  );

  const baseUrl = getWompiApiBase(config.publicKey);
  const response = await fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.privateKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      acceptance_token: input.acceptanceToken,
      accept_personal_auth: input.personalAuthToken,
      amount_in_cents: input.amountInCents,
      currency,
      signature,
      customer_email: input.customerEmail,
      reference: input.reference,
      payment_source_id: input.paymentSourceId,
      recurrent: true,
      payment_method: {
        installments: 1,
      },
    }),
  });

  const payload = (await response.json()) as WompiApiResponse<{
    id: string;
    status: string;
    payment_method?: { extra?: { async_payment_url?: string } };
  }>;

  if (!response.ok || !payload.data?.id) {
    const reason = payload.error?.reason ?? JSON.stringify(payload);
    throw new Error(`WOMPI_TRANSACTION_FAILED:${reason}`);
  }

  return {
    transactionId: payload.data.id,
    status: payload.data.status,
    asyncPaymentUrl: payload.data.payment_method?.extra?.async_payment_url,
  };
}

export async function voidWompiPaymentSource(
  config: WompiApiConfig,
  paymentSourceId: number
): Promise<void> {
  const baseUrl = getWompiApiBase(config.publicKey);
  const response = await fetch(`${baseUrl}/payment_sources/${paymentSourceId}/void`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.privateKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WOMPI_VOID_PAYMENT_SOURCE_FAILED:${response.status}:${body}`);
  }
}
