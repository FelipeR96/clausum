import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { getFunctions } from 'firebase-admin/functions';
import type { CountryCode } from '@clausum/shared';
import { ALL_SECRETS, isEmulator } from '../config/env';
import { executeAnalyzeContract } from '../services/analysis.service';
import { ejecutarAnalisisSuelto } from '../services/single-analysis.service';
import { executeDetectRisks } from '../services/risks.service';
import { executeCompareContracts } from '../services/comparison.service';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────
// Por qué existe este archivo
//
// El trabajo de IA tarda de segundos a minutos: descarga del archivo, OCR,
// búsqueda en el corpus legal y la llamada a DeepSeek. Cloud Functions v2
// corre sobre Cloud Run, donde la CPU se estrangula en cuanto la respuesta
// HTTP se cierra y la instancia puede reciclarse. Hacer el trabajo después
// de `res.json()` funciona en emuladores y falla de forma intermitente en
// producción, dejando trabajos colgados en `processing`.
//
// Cloud Tasks resuelve eso: la request solo encola y responde 202; el
// trabajo corre en una invocación propia con su propio presupuesto de CPU
// y tiempo, y con reintentos.
// ─────────────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3;

/**
 * Región de las colas. Tiene que coincidir con la de `taskOptions`.
 *
 * Al encolar hay que dar el nombre con la región: el SDK admin, si recibe
 * solo el nombre de la función, asume `us-central1` y el encolado falla
 * apuntando a una cola que no existe.
 */
const TASKS_REGION = 'us-east1';

/** Opciones compartidas por las tres colas. */
const taskOptions = {
  region: TASKS_REGION,
  memory: '2GiB' as const,
  // Más holgado que los 300s del endpoint: aquí ya nadie espera al otro lado.
  timeoutSeconds: 540,
  secrets: ALL_SECRETS,
  retryConfig: {
    maxAttempts: MAX_ATTEMPTS,
    minBackoffSeconds: 10,
    maxBackoffSeconds: 120,
  },
  rateLimits: {
    // Techo de trabajos de IA simultáneos en toda la plataforma. Es el
    // control de coste más directo que hay sobre DeepSeek.
    maxConcurrentDispatches: 10,
  },
};

type AnalyzeJob = {
  userId: string;
  contractId: string;
  analysisId: string;
  country?: CountryCode;
  contractTypeId?: string;
};

/**
 * Analisis comprado suelto, sin cuenta. No lleva userId porque no hay
 * usuario: la referencia de la orden es lo unico que lo identifica.
 */
type SingleAnalysisJob = {
  reference: string;
};

type CompareJob = {
  userId: string;
  contractIdA: string;
  contractIdB: string;
  comparisonId: string;
  country?: CountryCode;
  contractTypeId?: string;
};

/**
 * `retryCount` llega en 0 en el primer intento. En el último, el trabajo debe
 * persistir el estado de error y devolver la cuota; en los intermedios se
 * deja en `processing` para que el usuario no vea un fallo que la cola
 * todavía puede resolver.
 */
function execOptionsFor(retryCount: number) {
  return {
    attempt: retryCount + 1,
    markErrorOnFailure: retryCount >= MAX_ATTEMPTS - 1,
  };
}

export const processAnalysisTask = onTaskDispatched<AnalyzeJob>(
  taskOptions,
  async (req) => {
    const { userId, contractId, analysisId, country, contractTypeId } = req.data;
    const { retryCount } = req;

    logger.info('api', 'Tarea de análisis recibida', {
      userId,
      metadata: { analysisId, contractId, attempt: retryCount + 1 },
    });

    await executeAnalyzeContract(
      userId,
      contractId,
      analysisId,
      { country, contractTypeId },
      execOptionsFor(retryCount)
    );
  }
);

export const processSingleAnalysisTask = onTaskDispatched<SingleAnalysisJob>(
  taskOptions,
  async (req) => {
    const { reference } = req.data;
    const { retryCount } = req;

    logger.info('api', 'Tarea de analisis suelto recibida', {
      metadata: { reference, attempt: retryCount + 1 },
    });

    // Sin cuota que devolver ni documento de analisis que marcar en error:
    // si los reintentos se agotan, la orden se queda sin resultado y el
    // barrido de expiracion la limpia. Nadie ha pagado todavia a estas
    // alturas, asi que no hay dinero retenido por un fallo.
    await ejecutarAnalisisSuelto(reference);
  }
);

export const processRisksTask = onTaskDispatched<AnalyzeJob>(
  taskOptions,
  async (req) => {
    const { userId, contractId, analysisId, country, contractTypeId } = req.data;
    const { retryCount } = req;

    logger.info('api', 'Tarea de riesgos recibida', {
      userId,
      metadata: { analysisId, contractId, attempt: retryCount + 1 },
    });

    await executeDetectRisks(
      userId,
      contractId,
      analysisId,
      { country, contractTypeId },
      execOptionsFor(retryCount)
    );
  }
);

export const processComparisonTask = onTaskDispatched<CompareJob>(
  taskOptions,
  async (req) => {
    const { userId, contractIdA, contractIdB, comparisonId, country, contractTypeId } =
      req.data;
    const { retryCount } = req;

    logger.info('api', 'Tarea de comparación recibida', {
      userId,
      metadata: { comparisonId, contractIdA, contractIdB, attempt: retryCount + 1 },
    });

    await executeCompareContracts(
      userId,
      contractIdA,
      contractIdB,
      comparisonId,
      { country, contractTypeId },
      execOptionsFor(retryCount)
    );
  }
);

export type JobQueueName =
  | 'processAnalysisTask'
  | 'processRisksTask'
  | 'processComparisonTask'
  | 'processSingleAnalysisTask';

/**
 * Encola un trabajo.
 *
 * En el emulador las colas de Cloud Tasks no siempre están disponibles, así
 * que ahí se ejecuta en línea sin esperar: el endpoint responde igual de
 * rápido y el desarrollo no depende de la infraestructura de la cola. El
 * `markErrorOnFailure: true` implícito hace que un fallo en local sí se vea
 * reflejado en el documento.
 */
export async function enqueueJob(
  queue: JobQueueName,
  payload: AnalyzeJob | CompareJob | SingleAnalysisJob,
  runInline: () => Promise<unknown>
): Promise<void> {
  if (isEmulator()) {
    void runInline().catch((error: unknown) => {
      logger.error('api', `Trabajo en línea falló (emulador): ${queue}`, error, {
        metadata: { queue },
      });
    });
    return;
  }

  await getFunctions()
    .taskQueue(`locations/${TASKS_REGION}/functions/${queue}`)
    .enqueue(payload);
}
