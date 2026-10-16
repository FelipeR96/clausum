import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { resolveEffectivePlanId } from './subscription.service';

// ─────────────────────────────────────────────────────────────────────────
// Reportes de errores de los usuarios.
//
// El uid, el correo y el plan los pone el servidor a partir del token: si
// vinieran del navegador, cualquiera podria reportar a nombre de otro.
// Del cliente solo se acepta lo que el cliente sabe — que le paso y donde.
// ─────────────────────────────────────────────────────────────────────────

const MAX_DESCRIPCION = 4000;
const MAX_POR_DIA = 20;

export type BugReportEstado = 'abierto' | 'resuelto';

export interface BugReport {
  id: string;
  userId: string;
  email?: string;
  planId: string;
  descripcion: string;
  /** Ruta de la app desde la que reporto, p. ej. /panel/contratos. */
  ruta?: string;
  userAgent?: string;
  estado: BugReportEstado;
  createdAt?: string;
  resueltoPor?: string;
  resueltoAt?: string;
}

export async function crearBugReport(input: {
  userId: string;
  email?: string;
  descripcion: string;
  ruta?: string;
  userAgent?: string;
}): Promise<{ id: string }> {
  const descripcion = input.descripcion.trim();
  if (descripcion.length < 10) {
    throw new AppError(
      'Cuéntanos un poco más: con una frase corta no podemos reproducirlo.',
      400,
      'BUG_REPORT_TOO_SHORT'
    );
  }

  // Techo por usuario y dia. No es un sistema antiabuso serio, pero evita
  // que un script o un boton con doble clic llenen la coleccion.
  const hace24h = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const recientes = await adminDb()
    .collection(COLLECTIONS.bugReports)
    .where('userId', '==', input.userId)
    .where('createdAt', '>=', hace24h)
    .count()
    .get();

  if (recientes.data().count >= MAX_POR_DIA) {
    throw new AppError(
      'Has enviado muchos reportes hoy. Inténtalo mañana o escríbenos.',
      429,
      'BUG_REPORT_RATE_LIMIT'
    );
  }

  const planId = await resolveEffectivePlanId(input.userId);
  const ref = adminDb().collection(COLLECTIONS.bugReports).doc();

  await ref.set({
    userId: input.userId,
    email: input.email,
    planId,
    descripcion: descripcion.slice(0, MAX_DESCRIPCION),
    ruta: input.ruta?.slice(0, 200),
    userAgent: input.userAgent?.slice(0, 300),
    estado: 'abierto' satisfies BugReportEstado,
    createdAt: FieldValue.serverTimestamp(),
  });

  logger.info('api', 'Reporte de error recibido', {
    userId: input.userId,
    metadata: { reportId: ref.id, ruta: input.ruta ?? '(sin ruta)', planId },
  });

  return { id: ref.id };
}

export async function listarBugReports(options?: {
  estado?: BugReportEstado;
  limit?: number;
}): Promise<{ reportes: BugReport[] }> {
  const limite = Math.min(Math.max(options?.limit ?? 50, 1), 200);

  let q = adminDb()
    .collection(COLLECTIONS.bugReports)
    .orderBy('createdAt', 'desc')
    .limit(limite);

  if (options?.estado) {
    q = adminDb()
      .collection(COLLECTIONS.bugReports)
      .where('estado', '==', options.estado)
      .orderBy('createdAt', 'desc')
      .limit(limite);
  }

  const snap = await q.get();

  return {
    reportes: snap.docs.map((doc) => {
      const d = doc.data();
      const creado = d.createdAt as Timestamp | undefined;
      const resuelto = d.resueltoAt as Timestamp | undefined;
      return {
        id: doc.id,
        userId: d.userId as string,
        email: d.email as string | undefined,
        planId: (d.planId as string) ?? 'free',
        descripcion: (d.descripcion as string) ?? '',
        ruta: d.ruta as string | undefined,
        userAgent: d.userAgent as string | undefined,
        estado: (d.estado as BugReportEstado) ?? 'abierto',
        createdAt: creado?.toDate?.().toISOString(),
        resueltoPor: d.resueltoPor as string | undefined,
        resueltoAt: resuelto?.toDate?.().toISOString(),
      };
    }),
  };
}

export async function cambiarEstadoBugReport(
  adminUid: string,
  reportId: string,
  estado: BugReportEstado
): Promise<void> {
  const ref = adminDb().collection(COLLECTIONS.bugReports).doc(reportId);
  if (!(await ref.get()).exists) {
    throw new AppError('Ese reporte no existe', 404, 'BUG_REPORT_NOT_FOUND');
  }

  await ref.update(
    estado === 'resuelto'
      ? {
          estado,
          resueltoPor: adminUid,
          resueltoAt: FieldValue.serverTimestamp(),
        }
      : {
          estado,
          resueltoPor: FieldValue.delete(),
          resueltoAt: FieldValue.delete(),
        }
  );
}
