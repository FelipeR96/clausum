import { randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  AnalysisRisk,
  BillingRegion,
  CountryCode,
  SingleAnalysisOrder,
  SingleAnalysisPreview,
} from '@clausum/shared';
import {
  buildSingleAnalysisPreview,
  COLLECTIONS,
  getSingleAnalysisAmount,
  SINGLE_ANALYSIS_BILLING,
} from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { extractTextFromDocument } from '../integrations/document/extractor';
import { callDeepSeek } from '../integrations/deepseek/client';
import { buildProAnalyzePrompt, SYSTEM_LEGAL } from '../integrations/deepseek/legal-prompts';
import { parseJsonResponse, proAnalyzeResponseSchema } from '../integrations/deepseek/schemas';
import { buildLegalContext } from './legal-context.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Analisis de un contrato pagado suelto, sin cuenta.
 *
 * ── Que NO hace, y por que importa ──────────────────────────────────────
 * No escribe el archivo en Storage. Llega en la peticion, se extrae el
 * texto en memoria y el buffer se descarta. Esa parte de la promesa de
 * privacidad se cumple al pie de la letra.
 *
 * El TEXTO extraido si se guarda, y solo mientras dura el analisis. No es
 * un descuido: el analisis tarda entre 26 y 177 segundos y la API corta a
 * los 120, asi que el trabajo va a la cola igual que el resto. Para que el
 * trabajo lo recoja despues, el texto tiene que estar en algun sitio. Se
 * borra en la MISMA escritura que guarda el resultado, de modo que nunca
 * conviven mucho rato ni se puede quedar olvidado si algo falla despues.
 *
 * ── Sin OCR, a proposito ────────────────────────────────────────────────
 * El analisis corre ANTES de que nadie pague, para poder ensenar la vista
 * previa. Conceder OCR aqui seria gastar hasta 540 segundos de CPU en
 * gente que quiza no compre, y ese si es un vector de abuso real. Un PDF
 * escaneado se rechaza al subirlo, con el mismo aviso que ve el plan
 * gratuito.
 *
 * ── La anonimizacion viene de serie ─────────────────────────────────────
 * No se ve en este archivo porque vive dentro de callDeepSeek: cualquier
 * camino que pase por ahi redacta nombres y cedulas antes de salir, y los
 * restaura al volver. No hay que acordarse.
 */

/** Horas que vive el analisis si nadie lo paga ni lo descarga. */
export const HORAS_DE_VIDA = 24;

/**
 * Referencia de la orden, que es TAMBIEN el token de acceso.
 *
 * Y por eso no se construye como las de suscripcion. Aquellas usan
 * Math.random() y da igual: el acceso al informe lo protege la sesion del
 * usuario. Aqui no hay sesion, asi que quien conozca la referencia ve el
 * informe. Una referencia adivinable seria dejar los analisis de todos
 * abiertos a quien pruebe cadenas.
 */
function nuevaReferencia(): string {
  return `clausum_doc_${randomBytes(16).toString('hex')}`;
}

function ordenRef(reference: string) {
  return adminDb().collection(COLLECTIONS.singleAnalysisOrders).doc(reference);
}

type OrdenGuardada = SingleAnalysisOrder & {
  truncated?: boolean;
  contractText?: string;
  analysis?: Record<string, unknown>;
  risks?: AnalysisRisk[];
};

async function leerOrden(reference: string): Promise<OrdenGuardada> {
  const snap = await ordenRef(reference).get();
  if (!snap.exists) {
    throw new AppError('Análisis no encontrado o ya expirado', 404, 'ORDER_NOT_FOUND');
  }
  return snap.data() as OrdenGuardada;
}

/**
 * Recibe el archivo, extrae el texto y deja la orden lista para analizar.
 *
 * Es sincrono y rapido: extraer texto de un PDF digital son segundos. El
 * analisis, que es lo lento, lo encola quien llama.
 */
export async function crearOrdenDeAnalisis(input: {
  buffer: Buffer;
  fileName: string;
  region: BillingRegion;
  country?: CountryCode;
  contractTypeId?: string;
  clientFingerprint?: string;
}): Promise<{ reference: string; pageCount: number }> {
  const reference = nuevaReferencia();

  const extraccion = await extractTextFromDocument(input.buffer, input.fileName, {
    userId: 'anonimo',
    contractId: reference,
    // Sin OCR: ver la cabecera de este archivo.
    ocrAllowed: false,
  });

  if (!extraccion.text.trim()) {
    throw new AppError(
      'No pudimos leer texto en el documento. Si es un PDF escaneado, sube un PDF digital o un Word.',
      422,
      'EMPTY_DOCUMENT'
    );
  }

  const expira = new Date(Date.now() + HORAS_DE_VIDA * 60 * 60 * 1000);

  const orden: OrdenGuardada = {
    reference,
    status: 'pending',
    provider: input.region === 'CO' ? 'wompi' : 'paypal',
    region: input.region,
    amountInCents: getSingleAnalysisAmount(input.region),
    currency: SINGLE_ANALYSIS_BILLING[input.region].currency,
    country: input.country,
    contractTypeId: input.contractTypeId,
    pageCount: extraccion.pageCount,
    // Si el extractor corto el texto, el analisis cubre solo una parte del
    // contrato. Se guarda para poder avisarlo antes del pago: cobrar 9.550
    // por un analisis parcial sin decirlo es la clase de cosa que destruye
    // la confianza de un producto legal.
    truncated: extraccion.truncated,
    expiresAt: Timestamp.fromDate(expira),
    createdAt: FieldValue.serverTimestamp() as unknown as Date,
    clientFingerprint: input.clientFingerprint,
    contractText: extraccion.text,
  };

  await ordenRef(reference).set(orden);

  logger.info('api', 'Orden de analisis suelto creada', {
    metadata: {
      reference,
      pageCount: extraccion.pageCount,
      method: extraccion.method,
      truncated: extraccion.truncated,
      region: input.region,
    },
  });

  return { reference, pageCount: extraccion.pageCount };
}

/**
 * Corre el analisis y borra el texto del contrato en la misma escritura.
 *
 * Usa el prompt unificado Pro --analisis y riesgos en una sola llamada--
 * porque la vista previa necesita las dos cosas: el resumen por un lado y
 * el conteo de riesgos por otro. Dos llamadas costarian el doble y
 * tardarian el doble sin dar nada mas.
 */
export async function ejecutarAnalisisSuelto(reference: string): Promise<void> {
  const orden = await leerOrden(reference);

  if (orden.analysis) {
    logger.info('api', 'Analisis suelto ya completado; se omite el reintento', {
      metadata: { reference },
    });
    return;
  }

  const texto = orden.contractText;
  if (!texto) {
    throw new AppError(
      'El texto del contrato ya no está disponible',
      410,
      'CONTRACT_TEXT_GONE'
    );
  }

  const legalContext = await buildLegalContext({
    contractText: texto,
    country: orden.country,
    contractTypeId: orden.contractTypeId,
  });

  const deepseek = await callDeepSeek(buildProAnalyzePrompt(texto, legalContext), {
    userId: `anonimo:${reference}`,
    operation: 'single_analysis',
    systemPrompt: SYSTEM_LEGAL,
  });

  const parsed = parseJsonResponse(deepseek.content, proAnalyzeResponseSchema);

  // El texto se borra en la MISMA escritura que guarda el resultado. Si
  // fueran dos operaciones, un fallo entre ambas dejaria el contrato
  // guardado sin que nada lo vuelva a tocar.
  await ordenRef(reference).update({
    contractText: FieldValue.delete(),
    analysis: {
      ...parsed.analysis,
      country: legalContext.country,
      contractTypeId: legalContext.contractTypeId,
      legalArticleIds: legalContext.articleIds,
      legalSearchMethod: legalContext.searchMethod,
      tokensUsed: deepseek.tokensUsed,
      model: deepseek.model,
    },
    risks: parsed.risks.risks,
    risksSummary: parsed.risks.summary,
    risksScore: parsed.risks.score,
    analyzedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info('api', 'Analisis suelto completado', {
    metadata: {
      reference,
      riskCount: parsed.risks.risks.length,
      tokensUsed: deepseek.tokensUsed,
    },
  });
}

export type EstadoDeOrden =
  | { estado: 'analizando' }
  | {
      estado: 'listo';
      pagado: boolean;
      /** El contrato se corto por largo: el analisis cubre solo una parte. */
      truncado: boolean;
      preview: SingleAnalysisPreview;
    }
  | { estado: 'expirado' };

/**
 * Lo que se le devuelve a quien consulta con su token.
 *
 * Nunca entrega el analisis completo, ni aunque la orden este pagada: para
 * eso esta obtenerInformeCompleto, que es otra ruta. Asi, un error en la
 * pantalla de la vista previa no puede filtrar lo que se cobra.
 */
export async function obtenerEstado(reference: string): Promise<EstadoDeOrden> {
  const orden = await leerOrden(reference);

  if (orden.status === 'expired') return { estado: 'expirado' };
  if (!orden.analysis) return { estado: 'analizando' };

  return {
    estado: 'listo',
    pagado: orden.status === 'paid' || orden.status === 'delivered',
    truncado: orden.truncated === true,
    preview: buildSingleAnalysisPreview({
      analysis: orden.analysis as never,
      risks: orden.risks ?? [],
    }),
  };
}

/**
 * Freno de abuso por origen.
 *
 * Es un badén, no una fortaleza, y conviene no confundirlo. Una IP se
 * comparte (oficinas, operadores móviles) y se cambia, asi que esto no
 * detiene a quien se empeñe. Detiene lo que de verdad pasa: un script
 * ingenuo o alguien curioso subiendo veinte documentos seguidos.
 *
 * Y el coste de equivocarse es bajo en los dos sentidos. Cada analisis
 * cuesta entre 9 y 36 pesos de DeepSeek, asi que dejar pasar de mas no
 * arruina a nadie; y bloquear de mas solo molesta a quien comparte salida
 * con otro, que puede volver luego.
 */
export const MAX_ANALISIS_POR_ORIGEN_AL_DIA = 5;

export async function comprobarLimitePorOrigen(fingerprint: string): Promise<void> {
  if (!fingerprint) return;

  const dia = new Date().toISOString().slice(0, 10);
  const ref = adminDb()
    .collection(COLLECTIONS.singleAnalysisOrders)
    .doc(`_limite_${dia}_${fingerprint}`);

  const permitido = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const usados = (snap.data()?.count as number | undefined) ?? 0;

    if (usados >= MAX_ANALISIS_POR_ORIGEN_AL_DIA) return false;

    tx.set(
      ref,
      {
        count: usados + 1,
        // El propio contador caduca con el barrido, para no dejar un
        // documento por IP y por dia creciendo para siempre.
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000)),
      },
      { merge: true }
    );
    return true;
  });

  if (!permitido) {
    throw new AppError(
      `Has alcanzado el límite de ${MAX_ANALISIS_POR_ORIGEN_AL_DIA} análisis gratuitos por día. Vuelve mañana o crea una cuenta Pro.`,
      429,
      'RATE_LIMITED'
    );
  }
}
