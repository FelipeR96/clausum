import express, { Router } from 'express';
import { createHash } from 'node:crypto';
import type { BillingRegion, CountryCode } from '@clausum/shared';
import { isSupportedContractFileName } from '@clausum/shared';
import { asyncHandler } from '../middleware/asyncHandler';
import { createWompiSingleAnalysisCheckout } from '../services/wompi.service';
import {
  capturePayPalSingleAnalysisOrder,
  createPayPalSingleAnalysisOrder,
} from '../services/paypal.service';
import {
  comprobarLimitePorOrigen,
  crearOrdenDeAnalisis,
  ejecutarAnalisisSuelto,
  obtenerEstado,
  proveedorDeLaOrden,
} from '../services/single-analysis.service';
import { enqueueJob } from '../tasks/jobs.task';
import { AppError } from '../utils/errors';

export const singleAnalysisRouter = Router();

/**
 * Analisis comprado suelto, sin cuenta.
 *
 * ── Por que el archivo viaja en la peticion ─────────────────────────────
 * El resto de la aplicacion sube a Firebase Storage desde el navegador y
 * luego le dice a la API donde quedo. Eso exige sesion, que aqui no hay.
 *
 * Que pase por la API resulta ser mejor para lo que prometemos: el archivo
 * nunca toca Storage. Llega, se extrae el texto en memoria y el buffer se
 * descarta en el mismo tick.
 *
 * ── Sin libreria de multipart, a proposito ──────────────────────────────
 * express.raw() viene en Express y basta: el cuerpo son los bytes y el
 * nombre del archivo va en la consulta. Anadir multer por un solo endpoint
 * seria una dependencia mas que mantener, auditar y desplegar.
 */

/** Tope del archivo. Cloud Run admite 32 MB; 10 deja margen de sobra. */
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Huella del origen para el freno de abuso.
 *
 * Es un hash, no la IP: sirve para contar y no para identificar, asi que no
 * hay motivo para guardar la direccion en claro. Detras de Firebase Hosting
 * la IP real viene en X-Forwarded-For; el primer valor es el cliente.
 */
function huellaDeOrigen(req: express.Request): string {
  const reenviada = String(req.headers['x-forwarded-for'] ?? '')
    .split(',')[0]
    ?.trim();
  const origen = reenviada || req.ip || '';
  if (!origen) return '';
  return createHash('sha256').update(origen).digest('hex').slice(0, 32);
}

function referenciaValida(valor: string): string {
  // Se usa como id de documento y llega de fuera: si no se comprueba, una
  // cadena con barras apunta a otra coleccion.
  if (!/^clausum_doc_[a-f0-9]{32}$/.test(valor)) {
    throw new AppError('Referencia inválida', 400, 'BAD_REFERENCE');
  }
  return valor;
}

singleAnalysisRouter.post(
  '/single/analyze',
  express.raw({ type: '*/*', limit: MAX_BYTES }),
  asyncHandler(async (req, res) => {
    const fileName = String(req.query.fileName ?? '').trim();
    if (!fileName || !isSupportedContractFileName(fileName)) {
      throw new AppError(
        'Formato no soportado. Usa PDF o Word (.doc, .docx).',
        422,
        'UNSUPPORTED_FORMAT'
      );
    }

    const buffer = req.body as Buffer;
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new AppError('No recibimos el archivo', 400, 'EMPTY_BODY');
    }

    const huella = huellaDeOrigen(req);
    await comprobarLimitePorOrigen(huella);

    const region: BillingRegion = req.query.region === 'LATAM' ? 'LATAM' : 'CO';
    const country = (String(req.query.country ?? '') || undefined) as
      | CountryCode
      | undefined;
    const contractTypeId = String(req.query.contractTypeId ?? '') || undefined;

    const { reference, pageCount } = await crearOrdenDeAnalisis({
      buffer,
      fileName,
      region,
      country,
      contractTypeId,
      clientFingerprint: huella,
    });

    await enqueueJob('processSingleAnalysisTask', { reference }, () =>
      ejecutarAnalisisSuelto(reference)
    );

    // 202 y no 200: el analisis todavia no existe. El cliente consulta el
    // estado con la referencia, igual que hace el resto de la aplicacion
    // con su documento de Firestore --solo que aqui, sin sesion, no puede
    // leer Firestore y tiene que preguntarle a la API.
    res.status(202).json({ reference, pageCount, status: 'processing' });
  })
);

/**
 * Arranca el cobro del informe completo.
 *
 * Sin `authenticate`, como todo lo de aqui: la referencia es la credencial.
 * Y por eso no hay nada que robar aunque alguien la adivine --que no puede,
 * son 128 bits-- mas alla de ver un informe: este endpoint no cobra nada,
 * solo devuelve lo que el widget necesita. El cobro lo confirma el webhook
 * con la firma de la pasarela.
 *
 * Va antes que GET /single/:reference a proposito. Express resuelve por
 * orden de registro, y aunque aqui no choquen, dejar las rutas con mas
 * segmentos primero evita que una futura ruta comodin se las coma.
 */
singleAnalysisRouter.post(
  '/single/:reference/checkout',
  asyncHandler(async (req, res) => {
    const reference = referenciaValida(String(req.params.reference ?? ''));
    // La region de la orden decide la pasarela, y se decidio al subir el
    // documento. La respuesta lleva el proveedor dentro para que la pantalla
    // no tenga que adivinar que widget abrir.
    const proveedor = await proveedorDeLaOrden(reference);
    res.json(
      proveedor === 'paypal'
        ? await createPayPalSingleAnalysisOrder(reference)
        : await createWompiSingleAnalysisCheckout(reference)
    );
  })
);

/**
 * Cobra la orden de PayPal que ya aprobo la persona.
 *
 * El id de la orden NO viene en el cuerpo: se usa el que guardamos al
 * crearla. Aceptar el que mande el navegador dejaria desbloquear este
 * informe con el id de una compra pagada por otro --sin sesion, lo unico
 * que ata el pago a este analisis es lo que guardamos nosotros.
 *
 * Wompi no necesita equivalente: alli el cobro lo confirma su webhook.
 */
singleAnalysisRouter.post(
  '/single/:reference/paypal/capture',
  asyncHandler(async (req, res) => {
    const reference = referenciaValida(String(req.params.reference ?? ''));
    res.json(await capturePayPalSingleAnalysisOrder(reference));
  })
);

singleAnalysisRouter.get(
  '/single/:reference',
  asyncHandler(async (req, res) => {
    // String() a proposito: req.params tipa como string|string[]. Si
    // llegara un arreglo se convierte en algo que el patron rechaza, que
    // es exactamente lo que debe pasar.
    const reference = referenciaValida(String(req.params.reference ?? ''));
    res.json(await obtenerEstado(reference));
  })
);
