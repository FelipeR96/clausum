import { defineSecret } from 'firebase-functions/params';
import { z } from 'zod';

export const deepseekApiKeySecret = defineSecret('DEEPSEEK_API_KEY');

const envSchema = z.object({
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-v4-flash'),
  DEEPSEEK_TIMEOUT_MS: z.coerce.number().default(120_000),
  DEEPSEEK_MAX_RETRIES: z.coerce.number().default(3),
  MAX_PDF_TEXT_CHARS: z.coerce.number().default(100_000),
  MIN_PDF_TEXT_CHARS: z.coerce.number().default(80),
  OCR_MAX_PAGES: z.coerce.number().default(7),
  WOMPI_PUBLIC_KEY: z.string().optional(),
  WOMPI_INTEGRITY_SECRET: z.string().optional(),
  WOMPI_EVENTS_SECRET: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
  PAYPAL_PLAN_ID_MONTHLY: z.string().optional(),
  PAYPAL_PLAN_ID_ANNUAL: z.string().optional(),
  APP_URL: z.string().url().optional(),
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
  const fromSecret = process.env.DEEPSEEK_API_KEY;
  try {
    const secretValue = deepseekApiKeySecret.value();
    if (secretValue) return secretValue;
  } catch {
    // En emulador o sin secret vinculado, usar .env
  }
  if (fromSecret) return fromSecret;
  throw new Error('DEEPSEEK_API_KEY no configurada en el servidor');
}

export const isEmulator = (): boolean =>
  Boolean(process.env.FIRESTORE_EMULATOR_HOST);

export const isProduction = (): boolean =>
  process.env.NODE_ENV === 'production';
