import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { BILLING_GATEWAY_FIELDS, COLLECTIONS, type PlanSlug } from '@clausum/shared';
import { adminAuth, adminDb } from '../firebase/admin';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { invalidatePlanCache } from '../config/plans';
import {
  comisionDe,
  COMISIONES_DOC,
  getComisiones,
  invalidarCacheComisiones,
  tarifaPara,
  type Comisiones,
  type Tarifa,
} from '../config/comisiones';
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
    // Se desata tambien de la pasarela. Dejar `billingProvider` y
    // `wompiPaymentSourceId` colgando no era solo desorden en la tabla de
    // admin: bastaba con volver a conceder Pro a mano para que el
    // programador de renovaciones tomara a esa persona por cliente de pago
    // y le cobrara la tarjeta guardada. Ver BILLING_GATEWAY_FIELDS.
    const desligar: Record<string, FieldValue> = {};
    for (const campo of BILLING_GATEWAY_FIELDS) {
      desligar[campo] = FieldValue.delete();
    }

    await ref.update({
      planId: 'free',
      subscriptionStatus: 'canceled',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: FieldValue.delete(),
      planGrantedBy: FieldValue.delete(),
      planGrantedAt: FieldValue.delete(),
      ...desligar,
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
export type OrdenUsuarios = 'recientes' | 'vencimiento';

/**
 * Lista usuarios, paginada y filtrada.
 *
 * Lee de Firestore y no de Auth a proposito: todo lo que interesa aqui
 * —plan, estado, vencimiento, proveedor— vive en el documento del usuario.
 *
 * Sobre el orden: cada combinacion de filtro y orden necesita su indice en
 * Firestore, asi que la lista de combinaciones es deliberadamente corta.
 * Buscar por correo IGNORA el resto de filtros: cuando buscas a alguien
 * concreto no quieres que no aparezca por estar en otro plan del que
 * tenias seleccionado.
 *
 * El cursor es el id del ultimo documento devuelto. Paginar por numero de
 * pagina seria mas comodo de programar y mentiria en cuanto alguien se
 * registre entre dos consultas.
 */
export async function listUsers(options?: {
  planId?: PlanSlug;
  estado?: string;
  /** Prefijo de correo. Firestore no busca "contiene", solo "empieza por". */
  email?: string;
  orden?: OrdenUsuarios;
  limit?: number;
  cursor?: string;
}): Promise<{ usuarios: AdminUserRow[]; siguienteCursor?: string }> {
  const limite = Math.min(Math.max(options?.limit ?? 25, 1), 100);
  const col = adminDb().collection(COLLECTIONS.users);
  const busqueda = options?.email?.trim().toLowerCase();

  let q: FirebaseFirestore.Query = col;

  if (busqueda) {
    // \uf8ff es el ultimo carácter del rango Unicode usable: delimita el
    // "empieza por" sin tener que guardar un campo aparte.
    q = col.orderBy('email').startAt(busqueda).endAt(busqueda + '\uf8ff');
  } else {
    if (options?.planId) q = q.where('planId', '==', options.planId);
    if (options?.estado) q = q.where('subscriptionStatus', '==', options.estado);

    q =
      options?.orden === 'vencimiento'
        ? // Ascendente: lo que vence antes, primero. Los que no tienen
          // periodo quedan fuera, que es lo correcto — no vencen.
          q.orderBy('currentPeriodEnd', 'asc')
        : q.orderBy('createdAt', 'desc');
  }

  q = q.limit(limite + 1);

  if (options?.cursor) {
    const ancla = await col.doc(options.cursor).get();
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


export interface DesgloseProveedor {
  pagos: number;
  brutoEnCentavos: number;
  comisionEnCentavos: number;
  netoEnCentavos: number;
  /** true si falta configurar la tarifa de este proveedor. */
  sinTarifa: boolean;
}

export interface IngresosPorMoneda {
  moneda: string;
  pagos: number;
  clientes: number;
  brutoEnCentavos: number;
  comisionEnCentavos: number;
  netoEnCentavos: number;
  /** true si algun pago de esta moneda no tenia tarifa configurada. */
  comisionIncompleta: boolean;
  porProveedor: Record<string, DesgloseProveedor>;
  porIntervalo: Record<string, { pagos: number; brutoEnCentavos: number }>;
  renovaciones: { pagos: number; brutoEnCentavos: number };
  primeros: { pagos: number; brutoEnCentavos: number };
}

export interface IngresosResumen {
  desde: string;
  hasta: string;
  /** Una entrada por moneda. Nunca se suman entre si. */
  monedas: IngresosPorMoneda[];
}

/**
 * Ingresos de un periodo, por moneda y netos de comisiones.
 *
 * Tres decisiones que determinan si el numero es verdad:
 *
 * 1. Solo pagos en 'succeeded'. Un intento fallido no es un ingreso.
 * 2. Por paidAt, no por createdAt: un pago creado el 31 y cobrado el 1 es
 *    ingreso del mes nuevo.
 * 3. Las cortesias no entran. No generan documento en 'payments', y por eso
 *    se concedieron sin inventar subscriptionId ni billingProvider.
 *
 * Y una cuarta sobre la forma: los importes NO se suman entre monedas.
 * Sumar pesos con dolares da un numero que no significa nada; antes se
 * hacia y se avisaba, que es menos malo pero sigue siendo un numero falso
 * en pantalla. Ahora cada moneda va por su lado.
 *
 * La comision es una ESTIMACION con las tarifas configuradas, no lo que la
 * pasarela cobro de verdad: ellas no lo informan en el webhook. Sirve para
 * saber con que te quedas, no para cuadrar con su extracto al centavo.
 */
export async function getIngresos(options: {
  desde: Date;
  hasta: Date;
}): Promise<IngresosResumen> {
  const [snap, comisiones] = await Promise.all([
    adminDb()
      .collection(COLLECTIONS.payments)
      .where('status', '==', 'succeeded')
      .where('paidAt', '>=', Timestamp.fromDate(options.desde))
      .where('paidAt', '<=', Timestamp.fromDate(options.hasta))
      .get(),
    getComisiones(),
  ]);

  const porMoneda = new Map<
    string,
    IngresosPorMoneda & { clientesSet: Set<string> }
  >();

  const vacia = (moneda: string) => ({
    moneda,
    pagos: 0,
    clientes: 0,
    clientesSet: new Set<string>(),
    brutoEnCentavos: 0,
    comisionEnCentavos: 0,
    netoEnCentavos: 0,
    comisionIncompleta: false,
    porProveedor: {} as Record<string, DesgloseProveedor>,
    porIntervalo: {} as Record<string, { pagos: number; brutoEnCentavos: number }>,
    renovaciones: { pagos: 0, brutoEnCentavos: 0 },
    primeros: { pagos: 0, brutoEnCentavos: 0 },
  });

  for (const doc of snap.docs) {
    const d = doc.data();
    const moneda = (d.currency as string) ?? 'COP';
    const bruto = typeof d.amount === 'number' ? d.amount : 0;
    const proveedor = (d.provider as string) ?? 'desconocido';

    if (!porMoneda.has(moneda)) porMoneda.set(moneda, vacia(moneda));
    const m = porMoneda.get(moneda)!;

    const tarifa = tarifaPara(comisiones, proveedor, d.paymentMethodType as string | undefined);
    const comision = tarifa
      ? comisionDe(bruto, tarifa, comisiones.ivaSobreComision)
      : 0;

    m.pagos += 1;
    m.brutoEnCentavos += bruto;
    m.comisionEnCentavos += comision;
    if (!tarifa) m.comisionIncompleta = true;
    if (typeof d.userId === 'string') m.clientesSet.add(d.userId);

    m.porProveedor[proveedor] ??= {
      pagos: 0,
      brutoEnCentavos: 0,
      comisionEnCentavos: 0,
      netoEnCentavos: 0,
      sinTarifa: false,
    };
    const prov = m.porProveedor[proveedor];
    prov.pagos += 1;
    prov.brutoEnCentavos += bruto;
    prov.comisionEnCentavos += comision;
    if (!tarifa) prov.sinTarifa = true;

    const intervalo = (d.billingInterval as string) ?? 'desconocido';
    m.porIntervalo[intervalo] ??= { pagos: 0, brutoEnCentavos: 0 };
    m.porIntervalo[intervalo].pagos += 1;
    m.porIntervalo[intervalo].brutoEnCentavos += bruto;

    const destino = d.isRenewal ? m.renovaciones : m.primeros;
    destino.pagos += 1;
    destino.brutoEnCentavos += bruto;
  }

  const monedas = [...porMoneda.values()]
    .map(({ clientesSet, ...m }) => {
      for (const prov of Object.values(m.porProveedor)) {
        prov.netoEnCentavos = prov.brutoEnCentavos - prov.comisionEnCentavos;
      }
      return {
        ...m,
        clientes: clientesSet.size,
        netoEnCentavos: m.brutoEnCentavos - m.comisionEnCentavos,
      };
    })
    // La moneda con mas ingreso primero: es la que uno mira.
    .sort((a, b) => b.brutoEnCentavos - a.brutoEnCentavos);

  return {
    desde: options.desde.toISOString(),
    hasta: options.hasta.toISOString(),
    monedas,
  };
}


function validarTarifa(nombre: string, v: unknown): Tarifa {
  if (typeof v !== 'object' || v === null) {
    throw new AppError(`Falta la tarifa de ${nombre}`, 400, 'COMISION_INVALIDA');
  }
  const t = v as Record<string, unknown>;

  if (
    typeof t.porcentaje !== 'number' ||
    !Number.isFinite(t.porcentaje) ||
    t.porcentaje < 0 ||
    t.porcentaje > 100
  ) {
    throw new AppError(
      `El porcentaje de ${nombre} debe estar entre 0 y 100`,
      400,
      'COMISION_INVALIDA'
    );
  }

  // En centavos y entero, igual que los precios: un fijo con decimales
  // produce comisiones que no cuadran con ningun extracto.
  if (
    typeof t.fijoEnCentavos !== 'number' ||
    !Number.isInteger(t.fijoEnCentavos) ||
    t.fijoEnCentavos < 0
  ) {
    throw new AppError(
      `El monto fijo de ${nombre} debe ser un entero de centavos`,
      400,
      'COMISION_INVALIDA'
    );
  }

  return { porcentaje: t.porcentaje, fijoEnCentavos: t.fijoEnCentavos };
}

export async function updateComisiones(
  adminUid: string,
  entrada: unknown
): Promise<Comisiones> {
  if (typeof entrada !== 'object' || entrada === null) {
    throw new AppError('Comisiones inválidas', 400, 'COMISION_INVALIDA');
  }
  const e = entrada as Record<string, unknown>;
  const w = (e.wompi ?? {}) as Record<string, unknown>;

  const iva = e.ivaSobreComision;
  if (typeof iva !== 'number' || !Number.isFinite(iva) || iva < 0 || iva > 100) {
    throw new AppError('El IVA debe estar entre 0 y 100', 400, 'COMISION_INVALIDA');
  }

  const valor: Comisiones = {
    wompi: {
      tarjeta: validarTarifa('tarjeta', w.tarjeta),
      pse: validarTarifa('PSE', w.pse),
      nequi: validarTarifa('Nequi', w.nequi),
      otro: validarTarifa('otros medios', w.otro),
    },
    // PayPal puede quedarse sin configurar: mejor decirlo que restar una
    // comision inventada.
    paypal: e.paypal == null ? null : validarTarifa('PayPal', e.paypal),
    ivaSobreComision: iva,
  };

  await adminDb()
    .collection(COLLECTIONS.config)
    .doc(COMISIONES_DOC)
    .set(
      { ...valor, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid },
      { merge: false }
    );

  invalidarCacheComisiones();
  registrarAccion(adminUid, 'comisiones actualizadas', {
    paypalConfigurado: valor.paypal !== null,
    iva: valor.ivaSobreComision,
  });

  return valor;
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
