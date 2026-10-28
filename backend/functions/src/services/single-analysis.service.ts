import { randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  AnalysisRisk,
  BillingRegion,
  CountryCode,
  SingleAnalysisOrder,
  SingleAnalysisPreview,
} from '@clausum/shared';
import { buildSingleAnalysisPreview, COLLECTIONS } from '@clausum/shared';
import { getSingleAnalysisPricing } from '../config/pricing';
import { adminDb } from '../firebase/admin';
import { extractTextFromDocument } from '../integrations/document/extractor';
import { callDeepSeek } from '../integrations/deepseek/client';
import { buildProAnalyzePrompt, SYSTEM_LEGAL } from '../integrations/deepseek/legal-prompts';
import { parseJsonResponse, proAnalyzeResponseSchema } from '../integrations/deepseek/schemas';
import { buildLegalContext } from './legal-context.service';
import { AppError } from '../utils/errors';
import { firestoreDateToDate } from '../utils/firestore-date';
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
 * Si la orden ya paso su fecha de caducidad.
 *
 * Se comprueba AL LEER, y no se deja en manos del barrido nocturno. El
 * barrido libera espacio; esto decide que se entrega. Si solo existiera el
 * barrido, una orden caducada a las 06:00 seguiria sirviendo su vista
 * previa hasta las 04:00 del dia siguiente, que es lo contrario de lo que
 * se le promete a quien sube un contrato.
 *
 * Sin fecha legible se considera caducada. Es la unica direccion segura
 * para equivocarse: un campo corrupto no puede convertirse en acceso
 * perpetuo.
 */
function estaCaducada(orden: OrdenGuardada): boolean {
  const limite = firestoreDateToDate(orden.expiresAt);
  if (!limite) return true;
  return limite.getTime() <= Date.now();
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

  // El precio se congela AQUI, al subir el documento, y es lo que se cobrara
  // despues. Si el cobro volviera a leerlo, un cambio de precio entre la
  // vista previa y el pago cobraria algo distinto de lo que la persona vio
  // --y "conocer el precio antes de pagar" es justo lo que vende esto.
  const precio = await getSingleAnalysisPricing(input.region);

  const orden: OrdenGuardada = {
    reference,
    status: 'pending',
    provider: input.region === 'CO' ? 'wompi' : 'paypal',
    region: input.region,
    amountInCents: precio.amountInCents,
    currency: precio.currency,
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

  // Antes de nada: si caduco esperando en la cola, no se gasta una llamada
  // a DeepSeek en un analisis que ya nadie va a poder ver.
  if (estaCaducada(orden)) {
    logger.info('api', 'Orden caducada antes de analizarse; se descarta', {
      metadata: { reference },
    });
    await ordenRef(reference).update({
      status: 'expired',
      contractText: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

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

  if (orden.status === 'expired' || estaCaducada(orden)) return { estado: 'expirado' };
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

/**
 * Quien cobra esta orden, para que la ruta sepa a que pasarela ir.
 *
 * Aparte de datosParaCobro porque se consulta ANTES de decidir, cuando
 * todavia no se sabe si se puede cobrar. Las negativas las pone la otra.
 */
export async function proveedorDeLaOrden(
  reference: string
): Promise<'wompi' | 'paypal'> {
  return (await leerOrden(reference)).provider;
}

/**
 * Lo que el cobro necesita saber de la orden, con sus negativas.
 *
 * Vive aqui y no en el servicio de la pasarela para que las importaciones
 * vayan en una sola direccion: la pasarela conoce la orden, la orden no
 * conoce la pasarela. Al reves tendriamos un ciclo.
 *
 * Las tres negativas son el punto de la funcion:
 *
 *  - Caducada: no se cobra por algo que ya no se puede entregar.
 *  - Ya pagada: evita el segundo cobro si alguien recarga la pantalla de
 *    pago o vuelve atras en el navegador.
 *  - Sin analisis todavia: no se cobra por un analisis que aun podria
 *    fallar. Ademas nadie deberia llegar aqui sin haber visto la vista
 *    previa, que es donde se muestra el precio.
 */
export async function datosParaCobro(reference: string): Promise<{
  amountInCents: number;
  currency: string;
  provider: 'wompi' | 'paypal';
}> {
  const orden = await leerOrden(reference);

  if (estaCaducada(orden)) {
    throw new AppError('Este análisis ya expiró', 410, 'ORDER_EXPIRED');
  }
  if (orden.status === 'paid' || orden.status === 'delivered') {
    throw new AppError('Este análisis ya está pagado', 409, 'ALREADY_PAID');
  }
  if (!orden.analysis) {
    throw new AppError(
      'El análisis todavía no ha terminado',
      409,
      'ANALYSIS_NOT_READY'
    );
  }

  return {
    amountInCents: orden.amountInCents,
    currency: orden.currency,
    // Lo decide la region al crear la orden. Viaja de vuelta para que quien
    // cobre pueda negarse si no es el suyo: una orden de LATAM firmada por
    // Wompi se cobraria en pesos el importe en dolares.
    provider: orden.provider,
  };
}

/**
 * Marca la orden como pagada y le renueva el plazo.
 *
 * Lo segundo no es un adorno. El plazo empieza a contar al SUBIR el
 * documento, y entre subirlo, leer la vista previa, decidirse y pasar por
 * la pasarela se va un rato largo. Quien paga en la hora 23 tendria un
 * minuto para descargar, y si cierra la pestana se queda sin informe
 * habiendo pagado: una devolucion y un cliente perdido por un reloj que
 * arranco antes de que existiera la compra.
 *
 * Al confirmarse el pago el plazo vuelve a contar desde cero. La promesa
 * sigue siendo las mismas 24 horas, contadas desde lo ultimo que hizo la
 * persona, que es como cualquiera las entiende.
 *
 * Es idempotente a proposito: las pasarelas reenvian el mismo aviso varias
 * veces y el segundo no debe volver a mover el plazo.
 *
 * Si la orden ya no existe lanza ORDER_NOT_FOUND. Eso significa dinero
 * cobrado sobre un analisis ya borrado, asi que quien llame tiene que
 * registrarlo y NO devolver error a la pasarela: un fallo la haria
 * reintentar para siempre sobre algo que no va a aparecer.
 */
export async function marcarOrdenPagada(
  reference: string,
  datos?: { email?: string }
): Promise<{ yaEstaba: boolean }> {
  const ref = ordenRef(reference);

  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new AppError('Análisis no encontrado o ya expirado', 404, 'ORDER_NOT_FOUND');
    }

    const orden = snap.data() as OrdenGuardada;
    if (orden.status === 'paid' || orden.status === 'delivered') {
      return { yaEstaba: true };
    }

    const nuevoLimite = new Date(Date.now() + HORAS_DE_VIDA * 60 * 60 * 1000);

    tx.update(ref, {
      status: 'paid',
      paidAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(nuevoLimite),
      updatedAt: FieldValue.serverTimestamp(),
      ...(datos?.email ? { email: datos.email } : {}),
    });

    return { yaEstaba: false };
  });
}

/** Cuantos documentos borra el barrido como maximo en una pasada. */
const POR_LOTE = 300;
const LOTES_MAXIMOS = 5;

/**
 * Tope absoluto de vida, contado desde que se crea la orden y sin mirar
 * `expiresAt`. Es la red por si ese campo queda ilegible.
 */
const HORAS_TOPE_ABSOLUTO = 72;

function hace(horas: number): Timestamp {
  return Timestamp.fromMillis(Date.now() - horas * 60 * 60 * 1000);
}

/**
 * Borra las ordenes caducadas. Las borra de verdad: el documento entero.
 *
 * ── Por que no se conserva un registro ──────────────────────────────────
 * La tentacion es vaciar el contenido y dejar la cascara para contar
 * cuanta gente ve la vista previa y no compra. Se descarta por tres
 * razones, y la tercera es la que decide:
 *
 *  1. Lo que se cobro ya tiene su registro propio en la coleccion de
 *     pagos, que es donde vive la contabilidad. Conservar la orden
 *     duplicaria ese dato en dos sitios que pueden discrepar.
 *  2. Una cascara con `status` caducado volveria a salir en la consulta
 *     de este barrido todas las noches, para siempre. Filtrarla pediria
 *     un indice compuesto por una consulta de mantenimiento.
 *  3. Lo prometido es que no se guarda nada. Un documento con el pais, el
 *     tipo de contrato, el numero de paginas y una huella del origen no
 *     es "nada", aunque le falte el texto. Si mas adelante hacen falta
 *     metricas, se cuentan al crear la orden y se suman en un contador
 *     agregado, sin guardar una fila por contrato.
 *
 * Los contadores del freno por origen (`_limite_*`) viven en la misma
 * coleccion y caen en la misma consulta. Se borran igual: son mecanismo
 * puro, no hay nada que conservar en ellos.
 *
 * ── La hora a la que corre ──────────────────────────────────────────────
 * Va con el mantenimiento nocturno de las 04:00, asi que una orden puede
 * seguir fisicamente en Firestore unas horas despues de caducar. No
 * afecta a lo que ve nadie: `estaCaducada` ya cierra el acceso en el
 * instante exacto. Por eso la pantalla dice "deja de estar disponible a
 * las 24 horas y se borra esa misma noche" y no promete el borrado al
 * minuto, que seria mentira sin un programador propio --y uno propio
 * cuesta una funcion desplegada mas para no ganar nada.
 */
export async function borrarAnalisisCaducados(): Promise<{
  ordenes: number;
  contadores: number;
}> {
  const coleccion = adminDb().collection(COLLECTIONS.singleAnalysisOrders);
  let ordenes = 0;
  let contadores = 0;

  /**
   * Dos consultas, no una, y la segunda no es redundante.
   *
   * Firestore ordena por TIPO antes que por valor: una cadena va despues de
   * cualquier marca de tiempo. Si un fallo deja `expiresAt` como texto, ese
   * documento nunca entra en `expiresAt < ahora` y su analisis se queda
   * guardado para siempre --invisible, porque `estaCaducada` ya le cierra el
   * acceso, y por eso nadie se enteraria nunca.
   *
   * La segunda pasada mira `createdAt`, que lo escribimos nosotros y no
   * depende de nada. Una orden vive como maximo 24 horas desde que se crea,
   * y 24 mas si se paga justo antes de caducar: 48 en el peor caso legitimo.
   * A las 72 se borra sin preguntar por `expiresAt`.
   */
  const pasadas = [
    () => coleccion.where('expiresAt', '<', Timestamp.now()).limit(POR_LOTE),
    () => coleccion.where('createdAt', '<', hace(HORAS_TOPE_ABSOLUTO)).limit(POR_LOTE),
  ];

  // En lotes y con tope: si algun dia hay mas caducadas de las que caben, el
  // resto espera a la noche siguiente. Como el acceso ya esta cerrado, lo
  // unico que se retrasa es liberar espacio.
  for (const consulta of pasadas) {
    for (let lote = 0; lote < LOTES_MAXIMOS; lote += 1) {
      const snap = await consulta().get();
      if (snap.empty) break;

      const batch = adminDb().batch();
      for (const doc of snap.docs) {
        batch.delete(doc.ref);
        if (doc.id.startsWith('_limite_')) contadores += 1;
        else ordenes += 1;
      }
      await batch.commit();

      if (snap.size < POR_LOTE) break;
    }
  }

  return { ordenes, contadores };
}
