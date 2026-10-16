import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import {
  getPricing,
  invalidatePricingCache,
  FALLBACK_PRICING,
  PRICING_DOC,
} from '../config/pricing';
import { setUserPlanAsAdmin, updatePricing } from '../services/admin.service';
import { setUserPlan } from '../services/subscription.service';
import { adminAuth } from '../firebase/admin';

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
