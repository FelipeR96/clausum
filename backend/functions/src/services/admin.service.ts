import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS, type PlanSlug } from '@clausum/shared';
import { adminAuth, adminDb } from '../firebase/admin';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { invalidatePlanCache } from '../config/plans';
import {
  getPricing,
  invalidatePricingCache,
  PRICING_DOC,
  type Pricing,
  type RegionPricing,
} from '../config/pricing';

// ─────────────────────────────────────────────────────────────────────────
// Operaciones de administracion.
//
// Dos reglas que valen para todo este archivo:
//
// 1. Cada cambio queda registrado con quien lo hizo. Un panel que cambia
//    precios y planes sin rastro es imposible de auditar cuando algo sale
//    mal, y lo que sale mal aqui es dinero.
//
// 2. Conceder Pro a mano NO finge una suscripcion. No se inventa un
//    subscriptionId ni un billingProvider: queda marcado como concesion
//    manual. Si no, en tres meses nadie sabria distinguir a los clientes de
//    las cortesias, y los informes de ingresos mentirian.
// ─────────────────────────────────────────────────────────────────────────

export interface AdminUserView {
  uid: string;
  email?: string;
  displayName?: string;
  disabled: boolean;
  createdAt?: string;
  lastSignInAt?: string;
  isAdmin: boolean;
  planId: PlanSlug;
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
  billingProvider?: string;
  subscriptionAmountInCents?: number;
  /** Presente solo si el plan lo concedio un administrador, no un pago. */
  planGrantedBy?: string;
}

/**
 * Sincrona a proposito: logger.info escribe en consola y lanza la
 * persistencia en Firestore sin esperarla. Marcarla async sugeriria que el
 * registro esta guardado al volver, y no lo esta.
 */
function registrarAccion(
  adminUid: string,
  accion: string,
  metadata: Record<string, string | number | boolean>
): void {
  logger.info('api', `[admin] ${accion}`, {
    userId: adminUid,
    metadata,
  });
}

/**
 * Arma la vista de un usuario a partir de su uid.
 *
 * Auth es opcional a proposito. La cuenta de Auth puede no existir (se
 * borro, o es un documento de prueba) y eso no debe impedir ver ni cambiar
 * el plan: lo que cobra y lo que limita vive en Firestore. Si falta Auth se
 * devuelve lo que hay en Firestore, no un error.
 */
async function buildUserView(uid: string): Promise<AdminUserView> {
  const [record, doc] = await Promise.all([
    adminAuth()
      .getUser(uid)
      .catch(() => null),
    adminDb().collection(COLLECTIONS.users).doc(uid).get(),
  ]);

  const data = doc.data() ?? {};
  const periodEnd = data.currentPeriodEnd as Timestamp | undefined;

  return {
    uid,
    email: record?.email ?? (data.email as string | undefined),
    displayName: record?.displayName ?? (data.displayName as string | undefined),
    disabled: record?.disabled ?? false,
    createdAt: record?.metadata.creationTime,
    lastSignInAt: record?.metadata.lastSignInTime,
    isAdmin: record?.customClaims?.admin === true,
    planId: (data.planId as PlanSlug) ?? 'free',
    subscriptionStatus: data.subscriptionStatus as string | undefined,
    currentPeriodEnd: periodEnd?.toDate?.().toISOString(),
    billingProvider: data.billingProvider as string | undefined,
    subscriptionAmountInCents: data.subscriptionAmountInCents as number | undefined,
    planGrantedBy: data.planGrantedBy as string | undefined,
  };
}

/** Busca por correo exacto. No hay listado completo a proposito. */
export async function findUserByEmail(email: string): Promise<AdminUserView> {
  let record;
  try {
    record = await adminAuth().getUserByEmail(email);
  } catch {
    throw new AppError('No hay ningún usuario con ese correo', 404, 'USER_NOT_FOUND');
  }

  return buildUserView(record.uid);
}

/**
 * Cambia el plan de un usuario a mano.
 *
 * Para que Pro surta efecto hacen falta tres cosas a la vez: `planId`,
 * un `subscriptionStatus` activo y un `currentPeriodEnd` que no haya
 * vencido (ver resolveEffectivePlanId). Cambiar solo el plan no hace nada,
 * y es un error facil de cometer editando Firestore a mano.
 */
export async function setUserPlanAsAdmin(
  adminUid: string,
  targetUid: string,
  planId: PlanSlug,
  options?: { days?: number }
): Promise<AdminUserView> {
  const ref = adminDb().collection(COLLECTIONS.users).doc(targetUid);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError('El usuario no tiene documento en Firestore', 404, 'USER_NOT_FOUND');
  }

  const anterior = (snap.get('planId') as string) ?? 'free';

  if (planId === 'pro') {
    const days = options?.days ?? 30;
    const fin = new Date();
    fin.setDate(fin.getDate() + days);

    await ref.update({
      planId: 'pro',
      subscriptionStatus: 'active',
      currentPeriodEnd: Timestamp.fromDate(fin),
      cancelAtPeriodEnd: false,
      // Marca de concesion manual: ni subscriptionId ni billingProvider,
      // porque no hay pago detras. Permite distinguir cortesias de clientes.
      planGrantedBy: adminUid,
      planGrantedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    registrarAccion(adminUid, 'plan concedido', {
      usuario: targetUid,
      de: anterior,
      a: 'pro',
      days,
    });
  } else {
    await ref.update({
      planId: 'free',
      subscriptionStatus: 'canceled',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: FieldValue.delete(),
      planGrantedBy: FieldValue.delete(),
      planGrantedAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    registrarAccion(adminUid, 'plan retirado', {
      usuario: targetUid,
      de: anterior,
      a: 'free',
    });
  }

  // Se relee por uid, no por correo: el cambio ya esta hecho y dar la
  // vuelta por Auth haria fallar la respuesta de algo que si ocurrio.
  return buildUserView(targetUid);
}


export interface AdminUserRow {
  uid: string;
  email?: string;
  displayName?: string;
  planId: PlanSlug;
  subscriptionStatus?: string;
  currentPeriodEnd?: string;
  billingProvider?: string;
  billingInterval?: string;
  subscriptionId?: string;
  subscriptionAmountInCents?: number;
  /** Presente solo si el plan lo concedio un administrador, no un pago. */
  planGrantedBy?: string;
  createdAt?: string;
}

/**
 * Lista usuarios, paginada.
 *
 * Lee de Firestore y no de Auth a proposito: todo lo que interesa aqui
 * —plan, estado, vencimiento, proveedor— vive en el documento del usuario.
 * Listar desde Auth obligaria a una lectura extra por persona y no
 * permitiria filtrar por plan.
 *
 * El cursor es el id del ultimo documento devuelto. Paginar por numero de
 * pagina seria mas comodo de programar y mentiria en cuanto alguien se
 * registre entre dos consultas.
 */
export async function listUsers(options?: {
  planId?: PlanSlug;
  limit?: number;
  cursor?: string;
}): Promise<{ usuarios: AdminUserRow[]; siguienteCursor?: string }> {
  const limite = Math.min(Math.max(options?.limit ?? 25, 1), 100);

  let q = adminDb()
    .collection(COLLECTIONS.users)
    .orderBy('createdAt', 'desc')
    .limit(limite + 1);

  if (options?.planId) {
    q = adminDb()
      .collection(COLLECTIONS.users)
      .where('planId', '==', options.planId)
      .orderBy('createdAt', 'desc')
      .limit(limite + 1);
  }

  if (options?.cursor) {
    const ancla = await adminDb()
      .collection(COLLECTIONS.users)
      .doc(options.cursor)
      .get();
    if (ancla.exists) q = q.startAfter(ancla);
  }

  const snap = await q.get();
  const docs = snap.docs.slice(0, limite);
  const hayMas = snap.docs.length > limite;

  const usuarios = docs.map((doc) => {
    const d = doc.data();
    const fin = d.currentPeriodEnd as Timestamp | undefined;
    const alta = d.createdAt as Timestamp | undefined;
    return {
      uid: doc.id,
      email: d.email as string | undefined,
      displayName: d.displayName as string | undefined,
      planId: (d.planId as PlanSlug) ?? 'free',
      subscriptionStatus: d.subscriptionStatus as string | undefined,
      currentPeriodEnd: fin?.toDate?.().toISOString(),
      billingProvider: d.billingProvider as string | undefined,
      billingInterval: d.billingInterval as string | undefined,
      subscriptionId: d.subscriptionId as string | undefined,
      subscriptionAmountInCents: d.subscriptionAmountInCents as number | undefined,
      planGrantedBy: d.planGrantedBy as string | undefined,
      createdAt: alta?.toDate?.().toISOString(),
    };
  });

  return {
    usuarios,
    siguienteCursor: hayMas ? docs[docs.length - 1]?.id : undefined,
  };
}

// ── Precios ──────────────────────────────────────────────────────────────

function validarRegion(region: string, valor: unknown): RegionPricing {
  if (typeof valor !== 'object' || valor === null) {
    throw new AppError(`Faltan los precios de ${region}`, 400, 'PRICING_INVALID');
  }
  const v = valor as Record<string, unknown>;
  const mensual = v.monthlyAmountInCents;
  const anual = v.yearlyAmountInCents;
  const moneda = v.currency;

  // En centavos y enteros: un precio con decimales o negativo llegaria tal
  // cual a la firma de integridad de Wompi y el cobro fallaria mas tarde,
  // lejos de aqui y sin explicacion.
  for (const [nombre, monto] of [
    ['mensual', mensual],
    ['anual', anual],
  ] as const) {
    if (typeof monto !== 'number' || !Number.isInteger(monto) || monto <= 0) {
      throw new AppError(
        `El precio ${nombre} de ${region} tiene que ser un entero de centavos mayor que cero`,
        400,
        'PRICING_INVALID'
      );
    }
  }
  if (typeof moneda !== 'string' || moneda.length !== 3) {
    throw new AppError(`Moneda inválida en ${region}`, 400, 'PRICING_INVALID');
  }

  return {
    monthlyAmountInCents: mensual as number,
    yearlyAmountInCents: anual as number,
    currency: moneda,
  };
}

export async function updatePricing(
  adminUid: string,
  entrada: unknown
): Promise<Pricing> {
  if (typeof entrada !== 'object' || entrada === null) {
    throw new AppError('Cuerpo inválido', 400, 'PRICING_INVALID');
  }
  const body = entrada as Record<string, unknown>;

  const nuevo = {
    CO: validarRegion('Colombia', body.CO),
    LATAM: validarRegion('LATAM', body.LATAM),
  };

  const anterior = await getPricing();

  await adminDb()
    .collection('config')
    .doc(PRICING_DOC)
    .set(
      {
        ...nuevo,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: adminUid,
      },
      { merge: true }
    );

  // Esta instancia ve el precio nuevo de inmediato; las demas, al expirar
  // su cache de 60s.
  invalidatePricingCache();

  registrarAccion(adminUid, 'precios actualizados', {
    coMensualAntes: anterior.CO.monthlyAmountInCents,
    coMensualDespues: nuevo.CO.monthlyAmountInCents,
    coAnualAntes: anterior.CO.yearlyAmountInCents,
    coAnualDespues: nuevo.CO.yearlyAmountInCents,
    latamMensualAntes: anterior.LATAM.monthlyAmountInCents,
    latamMensualDespues: nuevo.LATAM.monthlyAmountInCents,
  });

  return { ...nuevo };
}

// ── Limites de los planes ────────────────────────────────────────────────

const LIMITES_NUMERICOS = [
  'analysesPerMonth',
  'comparisonsPerMonth',
  'maxFileSizeMb',
  'maxContracts',
  'historyMaxEntries',
] as const;

const LIMITES_BOOLEANOS = [
  'exportPdf',
  'fullHistory',
  'alertsAdvanced',
  'apiAccess',
  'ocrScannedPdf',
] as const;

export async function updatePlanLimits(
  adminUid: string,
  slug: PlanSlug,
  entrada: unknown
): Promise<Record<string, unknown>> {
  if (typeof entrada !== 'object' || entrada === null) {
    throw new AppError('Cuerpo inválido', 400, 'LIMITS_INVALID');
  }
  const body = entrada as Record<string, unknown>;
  const limits: Record<string, number | boolean> = {};

  for (const clave of LIMITES_NUMERICOS) {
    const valor = body[clave];
    if (valor === undefined) continue;
    // -1 significa ilimitado; es un valor valido y deliberado.
    if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < -1) {
      throw new AppError(
        `${clave} tiene que ser un entero (-1 para ilimitado)`,
        400,
        'LIMITS_INVALID'
      );
    }
    limits[clave] = valor;
  }

  for (const clave of LIMITES_BOOLEANOS) {
    const valor = body[clave];
    if (valor === undefined) continue;
    if (typeof valor !== 'boolean') {
      throw new AppError(`${clave} tiene que ser verdadero o falso`, 400, 'LIMITS_INVALID');
    }
    limits[clave] = valor;
  }

  if (Object.keys(limits).length === 0) {
    throw new AppError('No se envió ningún límite reconocido', 400, 'LIMITS_INVALID');
  }

  const ref = adminDb().collection(COLLECTIONS.plans).doc(slug);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError(
      `El plan ${slug} no existe en Firestore. Correr el seed primero.`,
      404,
      'PLAN_NOT_FOUND'
    );
  }

  const anteriores = (snap.get('limits') as Record<string, unknown>) ?? {};

  await ref.set(
    { limits: { ...anteriores, ...limits }, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  invalidatePlanCache(slug);

  registrarAccion(adminUid, 'límites actualizados', {
    plan: slug,
    campos: Object.keys(limits).join(', '),
  });

  return { ...anteriores, ...limits };
}
