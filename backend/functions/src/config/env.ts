import { defineSecret } from 'firebase-functions/params';
import type { SecretParam } from 'firebase-functions/lib/params/types';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────
// Secretos
//
// Todo lo que sea una credencial va aquí y se inyecta explícitamente en la
// función que lo necesita (`secrets: ALL_SECRETS`). Un `process.env.X` suelto
// NO llega al runtime desplegado: los `.env.local` son exclusivos del
// emulador y Firebase no los sube.
//
// Cargar en producción:
//   firebase functions:secrets:set NOMBRE --config backend/firebase/firebase.json
// Verificar:
//   firebase functions:secrets:access NOMBRE --config backend/firebase/firebase.json
// ─────────────────────────────────────────────────────────────────────────

export const deepseekApiKeySecret = defineSecret('DEEPSEEK_API_KEY');
export const wompiPrivateKeySecret = defineSecret('WOMPI_PRIVATE_KEY');
export const wompiIntegritySecret = defineSecret('WOMPI_INTEGRITY_SECRET');
export const wompiEventsSecret = defineSecret('WOMPI_EVENTS_SECRET');
export const paypalClientSecretSecret = defineSecret('PAYPAL_CLIENT_SECRET');
export const paypalWebhookIdSecret = defineSecret('PAYPAL_WEBHOOK_ID');
/** Contrasena del buzon de Hostinger desde el que se envian los informes. */
export const smtpPasswordSecret = defineSecret('SMTP_PASSWORD');

/**
 * Lista completa de secretos. Toda función que toque DeepSeek, Wompi o PayPal
 * debe declararla, incluidos los schedulers: la renovación recurrente de
 * Wompi necesita la llave privada igual que el endpoint de checkout.
 */
export const ALL_SECRETS: SecretParam[] = [
  deepseekApiKeySecret,
  wompiPrivateKeySecret,
  wompiIntegritySecret,
  wompiEventsSecret,
  paypalClientSecretSecret,
  paypalWebhookIdSecret,
  smtpPasswordSecret,
];

/**
 * Lee un secreto con fallback a `process.env`.
 *
 * En el runtime desplegado el valor viene de Secret Manager vía `.value()`.
 * En emulador `.value()` lanza o devuelve vacío, y el valor sale del
 * `.env.local`. Devuelve `undefined` si no hay ninguno de los dos, para que
 * cada servicio decida si eso es fatal o solo significa "no configurado".
 */
export function readSecret(
  secret: SecretParam,
  envKey: string
): string | undefined {
  try {
    const value = secret.value();
    if (value) return value;
  } catch {
    // Sin secret vinculado (emulador, o función que no lo declaró).
  }
  return process.env[envKey] || undefined;
}

// ─────────────────────────────────────────────────────────────────────────
// Configuración no sensible
//
// Esto sí puede vivir en un `.env` desplegado junto a la función.
// ─────────────────────────────────────────────────────────────────────────

const envSchema = z.object({
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-v4-flash'),
  DEEPSEEK_TIMEOUT_MS: z.coerce.number().default(120_000),
  DEEPSEEK_MAX_RETRIES: z.coerce.number().default(3),
  MAX_PDF_TEXT_CHARS: z.coerce.number().default(100_000),
  MIN_PDF_TEXT_CHARS: z.coerce.number().default(80),
  OCR_MAX_PAGES: z.coerce.number().default(15),
  WOMPI_PUBLIC_KEY: z.string().optional(),
  WOMPI_PRIVATE_KEY: z.string().optional(),
  WOMPI_INTEGRITY_SECRET: z.string().optional(),
  WOMPI_EVENTS_SECRET: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
  PAYPAL_PLAN_ID_MONTHLY: z.string().optional(),
  PAYPAL_PLAN_ID_ANNUAL: z.string().optional(),
  APP_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().optional(),
  STORAGE_EXPORT_RETENTION_DAYS: z.coerce.number().optional(),
  LEGAL_SEARCH_PROVIDER: z.enum(['firestore', 'vector']).default('firestore'),
  LEGAL_DEFAULT_COUNTRY: z.string().default('CO'),
  LEGAL_MAX_ARTICLES: z.coerce.number().default(25),
  LEGAL_CLASSIFIER_MIN_SCORE: z.coerce.number().default(2),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  return envSchema.parse(process.env);
}

export function getDeepSeekApiKey(): string {
  const key = readSecret(deepseekApiKeySecret, 'DEEPSEEK_API_KEY');
  if (!key) {
    throw new Error('DEEPSEEK_API_KEY no configurada en el servidor');
  }
  return key;
}

export const isEmulator = (): boolean => Boolean(process.env.FIRESTORE_EMULATOR_HOST);

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';
