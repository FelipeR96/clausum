import type { Transporter } from 'nodemailer';
import { readSecret, smtpPasswordSecret } from '../config/env';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Envio de correo por SMTP.
 *
 * ── Por que SMTP propio y no un servicio de correo ──────────────────────
 * El buzon de Hostinger ya esta pagado. Meter un tercero (Resend, SendGrid)
 * seria una cuenta mas, una clave mas que rotar y un dominio mas que
 * autorizar en la salida de red, para hacer lo mismo.
 *
 * ── El puerto no es un detalle ──────────────────────────────────────────
 * Google Cloud bloquea el 25 SIEMPRE y no hay forma de abrirlo: un envio por
 * ahi no falla con un error claro, se queda colgado hasta que vence el
 * tiempo. El 465 y el 587 si estan permitidos. Por eso el valor por defecto
 * es 465 y no el 25 de costumbre.
 *
 * 465 es TLS desde el saludo (`secure: true`); 587 arranca en claro y sube a
 * TLS con STARTTLS (`secure: false`, que nodemailer resuelve solo). Pasarlos
 * al contrario hace que la conexion se quede esperando un saludo que no
 * llega, y el sintoma es de nuevo un tiempo agotado, no un error legible.
 */

export interface CorreoConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  /** Lo que ve quien recibe en el campo "De". */
  from: string;
}

const PUERTO_POR_DEFECTO = 465;

export function getCorreoConfig(): CorreoConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = readSecret(smtpPasswordSecret, 'SMTP_PASSWORD');

  if (!host || !user || !password) return null;

  const puertoCrudo = Number(process.env.SMTP_PORT ?? PUERTO_POR_DEFECTO);
  const port = Number.isInteger(puertoCrudo) && puertoCrudo > 0
    ? puertoCrudo
    : PUERTO_POR_DEFECTO;

  return {
    host,
    port,
    user,
    password,
    from: process.env.MAIL_FROM ?? `Clausum <${user}>`,
  };
}

export function isCorreoConfigured(): boolean {
  return getCorreoConfig() !== null;
}

/**
 * El transporte se guarda entre peticiones a proposito.
 *
 * Cloud Run reutiliza la instancia, y crear un transporte nuevo por correo
 * significa un saludo TLS nuevo cada vez: medio segundo largo que se nota
 * justo despues de pagar, que es el peor momento para hacer esperar.
 *
 * Se cachea con la configuracion que lo creo. Si cambia --otro buzon, otro
 * puerto-- se vuelve a crear, para que un cambio de secreto no quede
 * atrapado en una instancia viva.
 */
let cache: { clave: string; transporte: Transporter } | null = null;

async function getTransporte(config: CorreoConfig): Promise<Transporter> {
  const clave = `${config.host}:${config.port}:${config.user}`;
  if (cache && cache.clave === clave) return cache.transporte;

  // Importacion diferida: nodemailer solo se carga en las instancias que de
  // verdad mandan correo, no en cada arranque en frio de la API.
  const { createTransport } = await import('nodemailer');

  const transporte = createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.password },
  });

  cache = { clave, transporte };
  return transporte;
}

export interface CorreoAdjunto {
  filename: string;
  content: Buffer;
  contentType: string;
}

/**
 * Manda un correo y devuelve si el servidor lo acepto.
 *
 * Importa entender que significa "aceptado": el servidor de salida dice que
 * se encarga, no que haya llegado. Un rebote aparece despues y por otro
 * canal. Quien llame no puede tratar esto como entrega confirmada --es lo
 * mas cerca que se puede estar, y conviene no confundirlo.
 */
export async function enviarCorreo(input: {
  para: string;
  asunto: string;
  texto: string;
  adjuntos?: CorreoAdjunto[];
}): Promise<void> {
  const config = getCorreoConfig();
  if (!config) {
    throw new AppError(
      'El envío por correo no está configurado en el servidor',
      503,
      'MAIL_NOT_CONFIGURED'
    );
  }

  const transporte = await getTransporte(config);

  try {
    await transporte.sendMail({
      from: config.from,
      to: input.para,
      subject: input.asunto,
      text: input.texto,
      attachments: input.adjuntos,
    });
  } catch (error) {
    // El mensaje de error del servidor puede traer la direccion de destino,
    // y los registros se guardan: va solo el motivo, nunca el cuerpo ni el
    // destinatario.
    logger.error('api', 'Fallo el envío de correo', error, {
      metadata: { host: config.host, puerto: config.port },
    });
    throw new AppError(
      'No pudimos enviar el correo. Intenta descargarlo.',
      502,
      'MAIL_SEND_FAILED'
    );
  }
}
