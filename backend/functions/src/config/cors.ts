import type { CorsOptions } from 'cors';

const DEFAULT_DEV_ORIGIN = 'http://localhost:5173';

function parseAllowedOrigins(): string[] {
  const raw =
    process.env.CORS_ORIGINS ??
    process.env.APP_URL ??
    DEFAULT_DEV_ORIGIN;

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getCorsOptions(): CorsOptions {
  const allowed = new Set(parseAllowedOrigins());

  return {
    origin(origin, callback) {
      if (!origin || allowed.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origen CORS no permitido: ${origin}`));
    },
    credentials: true,
  };
}
