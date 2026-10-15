import { doc, onSnapshot } from 'firebase/firestore';
import type { ProcessingProgress } from '@clausum/shared';
import { getFirebaseFirestore } from '@/firebase/firestore';
import { ApiError } from '@/services/api/errors';

// ─────────────────────────────────────────────────────────────────────────
// Espera a que termine un trabajo de IA (análisis, riesgos o comparación).
//
// La vía principal es un listener de Firestore: las reglas ya permiten al
// dueño leer sus documentos de `analyses` y `comparisons`, así que el
// progreso llega al instante y cuesta una suscripción en vez de ~350
// invocaciones de Cloud Function por trabajo (que es lo que costaba el
// polling HTTP cada 900 ms).
//
// Si el listener no se puede abrir —reglas, red, un bloqueador— se cae a
// polling HTTP contra la API, que es el camino que siempre funcionó.
// ─────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 1_500;
const DEFAULT_TIMEOUT_MS = 540_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type JobDoc = {
  status?: string;
  errorMessage?: string;
  processingProgress?: ProcessingProgress;
};

export type WaitForJobOptions<T> = {
  /** Colección de Firestore donde vive el documento. */
  collection: 'analyses' | 'comparisons';
  docId: string;
  /** Lectura por HTTP, usada como respaldo y para devolver el resultado. */
  fetchViaApi: () => Promise<T>;
  onProgress?: (progress: ProcessingProgress | undefined) => void;
  timeoutMs?: number;
  timeoutMessage?: string;
};

export async function waitForJob<T>(options: WaitForJobOptions<T>): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    await watchUntilSettled(options, timeoutMs);
  } catch (error) {
    if (error instanceof ApiError) {
      // Estado terminal legítimo (el trabajo falló, o se agotó el tiempo):
      // no es un problema del listener, así que no se reintenta por HTTP.
      throw error;
    }
    // El listener no se pudo abrir: respaldo por HTTP.
    await pollUntilSettled(options, timeoutMs);
  }

  return options.fetchViaApi();
}

/** Resuelve cuando el documento llega a `done`. Rechaza en `error`. */
function watchUntilSettled<T>(
  options: WaitForJobOptions<T>,
  timeoutMs: number
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const db = getFirebaseFirestore();
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      fn();
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new ApiError(
            options.timeoutMessage ??
              'El proceso está tardando más de lo habitual. Vuelve a intentarlo en unos minutos.',
            504,
            'JOB_TIMEOUT'
          )
        )
      );
    }, timeoutMs);

    const unsubscribe = onSnapshot(
      doc(db, options.collection, options.docId),
      (snapshot) => {
        const data = snapshot.data() as JobDoc | undefined;
        if (!data) return;

        options.onProgress?.(data.processingProgress);

        if (data.status === 'done') {
          finish(resolve);
          return;
        }

        if (data.status === 'error') {
          finish(() =>
            reject(
              new ApiError(
                data.errorMessage ?? 'No se pudo completar el proceso.',
                500,
                'JOB_FAILED'
              )
            )
          );
        }
      },
      (error) => {
        // Error de suscripción: lo resuelve el respaldo por HTTP.
        finish(() => reject(error));
      }
    );
  });
}

/** Respaldo: pregunta por HTTP hasta que el trabajo termina. */
async function pollUntilSettled<T>(
  options: WaitForJobOptions<T>,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const payload = (await options.fetchViaApi()) as unknown;
    const data = extractJobDoc(payload);

    options.onProgress?.(data?.processingProgress);

    if (data?.status === 'done') return;

    if (data?.status === 'error') {
      throw new ApiError(
        data.errorMessage ?? 'No se pudo completar el proceso.',
        500,
        'JOB_FAILED'
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new ApiError(
    options.timeoutMessage ??
      'El proceso está tardando más de lo habitual. Vuelve a intentarlo en unos minutos.',
    504,
    'JOB_TIMEOUT'
  );
}

/**
 * Las respuestas de la API envuelven el documento (`{ analysis }`,
 * `{ comparison }`). Esto saca el documento sin que quien llama tenga que
 * desenvolverlo.
 */
function extractJobDoc(payload: unknown): JobDoc | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  const inner = record.analysis ?? record.comparison ?? record;
  return inner && typeof inner === 'object' ? (inner as JobDoc) : undefined;
}
