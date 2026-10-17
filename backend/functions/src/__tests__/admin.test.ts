import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import {
  getPricing,
  invalidatePricingCache,
  FALLBACK_PRICING,
  PRICING_DOC,
} from '../config/pricing';
import {
  getIngresos,
  setUserPlanAsAdmin,
  updateComisiones,
  updatePricing,
} from '../services/admin.service';
import {
  COMISIONES_DOC,
  comisionDe,
  COMISIONES_POR_DEFECTO,
  invalidarCacheComisiones,
} from '../config/comisiones';
import { setUserPlan } from '../services/subscription.service';
import { adminAuth } from '../firebase/admin';
import { expirarPagosPendientes } from '../schedulers/storage-cleanup.scheduler';
import { Timestamp } from 'firebase-admin/firestore';

// ─────────────────────────────────────────────────────────────────────────
// El modulo de administracion mueve precios y planes. Un error aqui no se
// nota al momento: se nota en la factura del mes siguiente, o en un cliente
// que paga y sigue viendo limites de Free.
//
// Necesita los emuladores: correr con `pnpm test:emulators`.
// ─────────────────────────────────────────────────────────────────────────

const ADMIN = 'admin-test-uid';
const TARGET = 'admin-test-target';

const PRECIOS_VALIDOS = {
  CO: { monthlyAmountInCents: 3_500_000, yearlyAmountInCents: 35_000_000, currency: 'COP' },
  LATAM: { monthlyAmountInCents: 1_000, yearlyAmountInCents: 10_000, currency: 'USD' },
};

function pricingRef() {
  return adminDb().collection('config').doc(PRICING_DOC);
}

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'Estas pruebas tocan Firestore: correr dentro de firebase emulators:exec'
    );
  }
});

beforeEach(async () => {
  invalidatePricingCache();
  await pricingRef().delete();
  await adminDb().collection(COLLECTIONS.users).doc(TARGET).set({
    email: 'objetivo@ejemplo.com',
    planId: 'free',
  });
});

afterEach(async () => {
  invalidatePricingCache();
  await pricingRef().delete();
  await adminDb().collection(COLLECTIONS.users).doc(TARGET).delete();
});

describe('precios', () => {
  it('sin documento, devuelve lo que dice el codigo', async () => {
    const pricing = await getPricing();
    expect(pricing.CO.monthlyAmountInCents).toBe(
      FALLBACK_PRICING.CO.monthlyAmountInCents
    );
  });

  it('guarda y lee el precio nuevo', async () => {
    await updatePricing(ADMIN, {
      ...PRECIOS_VALIDOS,
      CO: { ...PRECIOS_VALIDOS.CO, monthlyAmountInCents: 4_000_000 },
    });

    const pricing = await getPricing();
    expect(pricing.CO.monthlyAmountInCents).toBe(4_000_000);
    expect(pricing.CO.yearlyAmountInCents).toBe(35_000_000);
  });

  // Un precio con decimales llegaria tal cual a la firma de integridad de
  // Wompi y el cobro fallaria mucho despues, lejos de aqui.
  it('rechaza centavos con decimales', async () => {
    await expect(
      updatePricing(ADMIN, {
        ...PRECIOS_VALIDOS,
        CO: { ...PRECIOS_VALIDOS.CO, monthlyAmountInCents: 3_500_000.5 },
      })
    ).rejects.toThrow(/entero/i);
  });

  it('rechaza cero y negativos', async () => {
    for (const monto of [0, -1]) {
      await expect(
        updatePricing(ADMIN, {
          ...PRECIOS_VALIDOS,
          CO: { ...PRECIOS_VALIDOS.CO, monthlyAmountInCents: monto },
        })
      ).rejects.toThrow();
    }
  });

  it('rechaza si falta una region entera', async () => {
    await expect(updatePricing(ADMIN, { CO: PRECIOS_VALIDOS.CO })).rejects.toThrow();
  });

  it('un documento a medio escribir no deja la plataforma cobrando cero', async () => {
    // Solo CO, y mal: getPricing tiene que ignorarlo ENTERO, no mezclar.
    await pricingRef().set({ CO: { monthlyAmountInCents: 0 } });
    invalidatePricingCache();

    const pricing = await getPricing();
    expect(pricing.CO.monthlyAmountInCents).toBe(
      FALLBACK_PRICING.CO.monthlyAmountInCents
    );
    expect(pricing.LATAM.monthlyAmountInCents).toBe(
      FALLBACK_PRICING.LATAM.monthlyAmountInCents
    );
  });

  it('deja constancia de quien lo cambio', async () => {
    await updatePricing(ADMIN, PRECIOS_VALIDOS);
    const snap = await pricingRef().get();
    expect(snap.get('updatedBy')).toBe(ADMIN);
  });
});

describe('cambio de plan', () => {
  // resolveEffectivePlanId exige las tres cosas a la vez. Escribir solo
  // planId es el error facil al editar Firestore a mano: el usuario se queda
  // en Pro de mentira, con limites de Free y sin entender por que.
  it('conceder Pro escribe plan, estado y periodo futuro', async () => {
    await setUserPlanAsAdmin(ADMIN, TARGET, 'pro', { days: 15 });

    const snap = await adminDb().collection(COLLECTIONS.users).doc(TARGET).get();
    expect(snap.get('planId')).toBe('pro');
    expect(snap.get('subscriptionStatus')).toBe('active');

    const fin = snap.get('currentPeriodEnd').toDate() as Date;
    expect(fin.getTime()).toBeGreaterThan(Date.now());
  });

  it('una concesion manual no finge un pago', async () => {
    await setUserPlanAsAdmin(ADMIN, TARGET, 'pro');

    const snap = await adminDb().collection(COLLECTIONS.users).doc(TARGET).get();
    expect(snap.get('planGrantedBy')).toBe(ADMIN);
    expect(snap.get('subscriptionId')).toBeUndefined();
    expect(snap.get('billingProvider')).toBeUndefined();
  });

  it('retirar el plan limpia la concesion', async () => {
    await setUserPlanAsAdmin(ADMIN, TARGET, 'pro');
    await setUserPlanAsAdmin(ADMIN, TARGET, 'free');

    const snap = await adminDb().collection(COLLECTIONS.users).doc(TARGET).get();
    expect(snap.get('planId')).toBe('free');
    expect(snap.get('currentPeriodEnd')).toBeUndefined();
    expect(snap.get('planGrantedBy')).toBeUndefined();
  });

  // El cambio se escribe en Firestore; Auth solo aporta el correo y la
  // fecha de alta. Si la respuesta dependiera de Auth, un documento sin
  // cuenta de Auth daria un 404 despues de haber movido el plan: el admin
  // veria un error y el plan cambiado. Paso exactamente eso.
  it('devuelve el estado aunque el usuario no exista en Auth', async () => {
    const vista = await setUserPlanAsAdmin(ADMIN, TARGET, 'pro');
    expect(vista.uid).toBe(TARGET);
    expect(vista.planId).toBe('pro');
    expect(vista.email).toBe('objetivo@ejemplo.com');
  });

  it('falla si el usuario no existe en Firestore', async () => {
    await expect(
      setUserPlanAsAdmin(ADMIN, 'no-existe-este-uid', 'pro')
    ).rejects.toThrow();
  });
});

describe('claims', () => {
  // setCustomUserClaims reemplaza el objeto entero. Escribir solo
  // { planId } borraba el claim de administrador en cuanto esa persona
  // pagaba: paso de verdad, y el sintoma aparecia lejos de la causa —
  // el menu seguia ahi y la API respondia 404 a todo.
  it('cambiar el plan no borra el claim de administrador', async () => {
    const uid = 'claims-test-uid';
    const auth = adminAuth();

    try {
      await auth.deleteUser(uid);
    } catch {
      // no existia
    }
    await auth.createUser({ uid, email: 'claims@ejemplo.com' });
    await auth.setCustomUserClaims(uid, { admin: true });

    await adminDb()
      .collection(COLLECTIONS.users)
      .doc(uid)
      .set({ email: 'claims@ejemplo.com', planId: 'free' });

    await setUserPlan(uid, 'pro', { subscriptionStatus: 'active' });

    const claims = (await auth.getUser(uid)).customClaims ?? {};
    expect(claims.admin).toBe(true);
    expect(claims.planId).toBe('pro');

    await auth.deleteUser(uid);
    await adminDb().collection(COLLECTIONS.users).doc(uid).delete();
  });
});

describe('pagos pendientes abandonados', () => {
  const VIEJO = 'pago-pendiente-viejo';
  const NUEVO = 'pago-pendiente-nuevo';
  const COBRADO = 'pago-ya-cobrado';

  const pagos = () => adminDb().collection(COLLECTIONS.payments);

  afterEach(async () => {
    await Promise.all([
      pagos().doc(VIEJO).delete(),
      pagos().doc(NUEVO).delete(),
      pagos().doc(COBRADO).delete(),
    ]);
  });

  it('caduca los pendientes viejos y no toca los demas', async () => {
    const hace30h = Timestamp.fromMillis(Date.now() - 30 * 60 * 60 * 1000);
    const haceUnaHora = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

    await pagos().doc(VIEJO).set({ status: 'pending', createdAt: hace30h });
    // Recien creado: puede estar pagandose ahora mismo.
    await pagos().doc(NUEVO).set({ status: 'pending', createdAt: haceUnaHora });
    // Un cobro real de hace meses no se toca jamas.
    await pagos().doc(COBRADO).set({ status: 'succeeded', createdAt: hace30h });

    await expirarPagosPendientes();

    expect((await pagos().doc(VIEJO).get()).get('status')).toBe('expired');
    expect((await pagos().doc(NUEVO).get()).get('status')).toBe('pending');
    expect((await pagos().doc(COBRADO).get()).get('status')).toBe('succeeded');
  });
});

describe('ingresos', () => {
  const pagos = () => adminDb().collection(COLLECTIONS.payments);
  const IDS = [
    'ing-cobrado',
    'ing-fallido',
    'ing-pendiente',
    'ing-fuera',
    'ing-usd',
    'ing-pse',
    'ing-renovacion',
  ];

  const DESDE = new Date('2026-10-01T00:00:00Z');
  const HASTA = new Date('2026-10-31T23:59:59Z');

  function comisionesRef() {
    return adminDb().collection(COLLECTIONS.config).doc(COMISIONES_DOC);
  }

  /** Sin esto cada prueba heredaria la cache de la anterior. */
  beforeEach(async () => {
    invalidarCacheComisiones();
    await comisionesRef().set(COMISIONES_POR_DEFECTO);
    invalidarCacheComisiones();
  });

  afterEach(async () => {
    await Promise.all(IDS.map((id) => pagos().doc(id).delete()));
    await comisionesRef().delete();
    invalidarCacheComisiones();
  });

  function moneda(r: Awaited<ReturnType<typeof getIngresos>>, cual: string) {
    const m = r.monedas.find((x) => x.moneda === cual);
    if (!m) throw new Error(`no hay bloque de ${cual}: ${JSON.stringify(r.monedas)}`);
    return m;
  }

  it('cuenta solo lo cobrado, dentro del periodo', async () => {
    await pagos().doc('ing-cobrado').set({
      status: 'succeeded',
      amount: 3_300_000,
      currency: 'COP',
      provider: 'wompi',
      paymentMethodType: 'CARD',
      billingInterval: 'monthly',
      userId: 'cliente-1',
      paidAt: Timestamp.fromDate(new Date('2026-10-16T12:00:00Z')),
    });
    // Un intento fallido no es un ingreso.
    await pagos().doc('ing-fallido').set({
      status: 'failed',
      amount: 3_300_000,
      currency: 'COP',
      userId: 'cliente-2',
      paidAt: Timestamp.fromDate(new Date('2026-10-17T12:00:00Z')),
    });
    // Uno a medias tampoco.
    await pagos().doc('ing-pendiente').set({
      status: 'pending',
      amount: 3_300_000,
      currency: 'COP',
      userId: 'cliente-3',
      paidAt: Timestamp.fromDate(new Date('2026-10-18T12:00:00Z')),
    });
    // Cobrado, pero en otro mes: es ingreso de ese mes, no de este.
    await pagos().doc('ing-fuera').set({
      status: 'succeeded',
      amount: 9_900_000,
      currency: 'COP',
      provider: 'wompi',
      paymentMethodType: 'CARD',
      userId: 'cliente-4',
      paidAt: Timestamp.fromDate(new Date('2026-09-16T12:00:00Z')),
    });

    const r = await getIngresos({ desde: DESDE, hasta: HASTA });
    const cop = moneda(r, 'COP');

    expect(cop.brutoEnCentavos).toBe(3_300_000);
    expect(cop.pagos).toBe(1);
    expect(cop.clientes).toBe(1);
    expect(cop.porProveedor.wompi.brutoEnCentavos).toBe(3_300_000);
    expect(cop.porIntervalo.monthly.pagos).toBe(1);
  });

  // La razon de ser de todo este bloque: 33.000 pesos y 10 dolares no se
  // suman. Antes salia "33.001.000" y eso no es plata de nadie.
  it('no mezcla monedas: un bloque por cada una', async () => {
    await pagos().doc('ing-cobrado').set({
      status: 'succeeded',
      amount: 3_300_000,
      currency: 'COP',
      provider: 'wompi',
      paymentMethodType: 'CARD',
      billingInterval: 'monthly',
      userId: 'cliente-1',
      paidAt: Timestamp.fromDate(new Date('2026-10-16T12:00:00Z')),
    });
    await pagos().doc('ing-usd').set({
      status: 'succeeded',
      amount: 1_000,
      currency: 'USD',
      provider: 'paypal',
      billingInterval: 'monthly',
      userId: 'cliente-9',
      paidAt: Timestamp.fromDate(new Date('2026-10-17T12:00:00Z')),
    });

    const r = await getIngresos({ desde: DESDE, hasta: HASTA });

    expect(r.monedas).toHaveLength(2);
    expect(moneda(r, 'COP').brutoEnCentavos).toBe(3_300_000);
    expect(moneda(r, 'USD').brutoEnCentavos).toBe(1_000);
    // Y la mas grande primero, que es la que uno mira.
    expect(r.monedas[0].moneda).toBe('COP');
  });

  it('resta la comision de cada medio de pago, con IVA', async () => {
    await pagos().doc('ing-cobrado').set({
      status: 'succeeded',
      amount: 3_300_000,
      currency: 'COP',
      provider: 'wompi',
      paymentMethodType: 'CARD',
      userId: 'cliente-1',
      paidAt: Timestamp.fromDate(new Date('2026-10-16T12:00:00Z')),
    });
    await pagos().doc('ing-pse').set({
      status: 'succeeded',
      amount: 3_300_000,
      currency: 'COP',
      provider: 'wompi',
      paymentMethodType: 'PSE',
      userId: 'cliente-2',
      paidAt: Timestamp.fromDate(new Date('2026-10-17T12:00:00Z')),
    });

    const r = await getIngresos({ desde: DESDE, hasta: HASTA });
    const cop = moneda(r, 'COP');

    const tarjeta = comisionDe(3_300_000, COMISIONES_POR_DEFECTO.wompi.tarjeta, 19);
    const pse = comisionDe(3_300_000, COMISIONES_POR_DEFECTO.wompi.pse, 19);

    // PSE cobra menos que tarjeta: si estos dos salieran iguales, el medio
    // de pago no se estaria leyendo.
    expect(pse).toBeLessThan(tarjeta);
    expect(cop.comisionEnCentavos).toBe(tarjeta + pse);
    expect(cop.netoEnCentavos).toBe(6_600_000 - tarjeta - pse);
    expect(cop.comisionIncompleta).toBe(false);
  });

  // Mentir hacia arriba es peor que no saber: si PayPal no tiene tarifa, el
  // neto sale inflado y hay que decirlo en pantalla.
  it('avisa cuando un proveedor no tiene tarifa configurada', async () => {
    await pagos().doc('ing-usd').set({
      status: 'succeeded',
      amount: 1_000,
      currency: 'USD',
      provider: 'paypal',
      userId: 'cliente-9',
      paidAt: Timestamp.fromDate(new Date('2026-10-17T12:00:00Z')),
    });

    const r = await getIngresos({ desde: DESDE, hasta: HASTA });
    const usd = moneda(r, 'USD');

    expect(usd.comisionEnCentavos).toBe(0);
    expect(usd.netoEnCentavos).toBe(1_000);
    expect(usd.comisionIncompleta).toBe(true);
    expect(usd.porProveedor.paypal.sinTarifa).toBe(true);
  });

  it('usa la tarifa guardada, no la de por defecto', async () => {
    await updateComisiones(ADMIN, {
      ...COMISIONES_POR_DEFECTO,
      paypal: { porcentaje: 5, fijoEnCentavos: 49 },
      ivaSobreComision: 0,
    });

    await pagos().doc('ing-usd').set({
      status: 'succeeded',
      amount: 1_000,
      currency: 'USD',
      provider: 'paypal',
      userId: 'cliente-9',
      paidAt: Timestamp.fromDate(new Date('2026-10-17T12:00:00Z')),
    });

    const r = await getIngresos({ desde: DESDE, hasta: HASTA });
    const usd = moneda(r, 'USD');

    // 5 % de 10,00 USD = 0,50 + 0,49 fijo = 0,99, sin IVA.
    expect(usd.comisionEnCentavos).toBe(99);
    expect(usd.netoEnCentavos).toBe(901);
    expect(usd.comisionIncompleta).toBe(false);
  });

  it('separa primeros pagos de renovaciones', async () => {
    await pagos().doc('ing-cobrado').set({
      status: 'succeeded',
      amount: 3_300_000,
      currency: 'COP',
      provider: 'wompi',
      paymentMethodType: 'CARD',
      userId: 'cliente-1',
      paidAt: Timestamp.fromDate(new Date('2026-10-02T12:00:00Z')),
    });
    await pagos().doc('ing-renovacion').set({
      status: 'succeeded',
      amount: 3_300_000,
      currency: 'COP',
      provider: 'wompi',
      paymentMethodType: 'CARD',
      isRenewal: true,
      userId: 'cliente-1',
      paidAt: Timestamp.fromDate(new Date('2026-10-20T12:00:00Z')),
    });

    const cop = moneda(await getIngresos({ desde: DESDE, hasta: HASTA }), 'COP');

    expect(cop.primeros).toEqual({ pagos: 1, brutoEnCentavos: 3_300_000 });
    expect(cop.renovaciones).toEqual({ pagos: 1, brutoEnCentavos: 3_300_000 });
    // El mismo usuario pagando dos veces es un cliente, no dos.
    expect(cop.clientes).toBe(1);
  });

  // Una concesion manual no crea documento en payments, asi que no puede
  // colarse en los ingresos. Esta prueba fija esa garantia.
  it('una cortesia no aparece como ingreso', async () => {
    await setUserPlanAsAdmin(ADMIN, TARGET, 'pro');
    const r = await getIngresos({ desde: DESDE, hasta: HASTA });
    expect(r.monedas).toHaveLength(0);
  });
});
