import type { CorsOptions } from 'cors';
import { isEmulator } from './env';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const DEFAULT_DEV_ORIGIN = 'http://localhost:5173';

/**
 * En desarrollo la app se sirve desde varios orígenes locales según cómo se
 * arranque: Vite en 5173, el emulador de Hosting en 5000, y cada uno con
 * `localhost` o `127.0.0.1` indistintamente según lo que escriba quien
 * navega. Mantener una lista fija obliga a adivinar la combinación correcta
 * y falla de una forma especialmente confusa, porque el navegador solo manda
 * la cabecera `Origin` en peticiones que no son GET ni HEAD: la app parece
 * funcionar hasta que algo intenta escribir.
 */
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function parseAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? process.env.APP_URL ?? DEFAULT_DEV_ORIGIN;

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin: string, allowed: Set<string>): boolean {
  if (allowed.has(origin)) return true;
  // Solo en emulador: cualquier puerto local vale. En producción la lista
  // explícita es la única fuente.
  return isEmulator() && LOCAL_ORIGIN.test(origin);
}

export function getCorsOptions(): CorsOptions {
  const origins = parseAllowedOrigins();
  const allowed = new Set(origins);

  // Desplegado y con la lista en el valor por defecto = nadie puede escribir
  // desde el sitio real. Paso: el sitio de dev se rechazaba a si mismo con
  // "Origen no permitido" al subir un contrato o borrar una cuenta, porque
  // ni CORS_ORIGINS ni APP_URL estaban definidas en el entorno desplegado.
  //
  // Es un error de configuracion, no de codigo, y hasta ahora solo se
  // manifestaba como un fallo del usuario. Que deje rastro al arrancar.
  if (!isEmulator() && origins.length === 1 && origins[0] === DEFAULT_DEV_ORIGIN) {
    logger.error(
      'api',
      'CORS sin configurar: el unico origen permitido es el de desarrollo. ' +
        'Toda peticion que no sea GET desde el sitio desplegado sera rechazada. ' +
        'Definir CORS_ORIGINS en el .env del proyecto.',
      undefined,
      { metadata: { origenPermitido: DEFAULT_DEV_ORIGIN } }
    );
  }

  return {
    origin(origin, callback) {
      // Sin cabecera `Origin` es una petición que no viene de un navegador
      // (o es del mismo origen en un GET): no hay nada que validar.
      if (!origin || isOriginAllowed(origin, allowed)) {
        callback(null, true);
        return;
      }

      // Un origen no permitido es un 403, no un 500: el servidor funciona,
      // lo que pasa es que quien llama no esta autorizado a hacerlo desde
      // ahi. Devolver 500 hacia que la app dijera "error en el servidor" y
      // mandaba a buscar el fallo en el sitio equivocado.
      callback(
        new AppError(
          `Origen no permitido: ${origin}`,
          403,
          'CORS_ORIGIN_NOT_ALLOWED'
        )
      );
    },
    credentials: true,
  };
}
