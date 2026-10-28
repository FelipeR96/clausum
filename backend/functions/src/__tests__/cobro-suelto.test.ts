import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { datosParaCobro } from '../services/single-analysis.service';
import {
  createWompiSingleAnalysisCheckout,
  handleWompiWebhook,
  type WompiWebhookEvent,
} from '../services/wompi.service';

// ─────────────────────────────────────────────────────────────────────────
// Aqui se cobra sin cuenta, y eso quita las dos redes de las que depende el
// resto del cobro: no hay sesion que ate el pago a una persona, y la
// referencia es la unica credencial.
//
// Las tres cosas que se prueban son las tres que harian perder dinero o
// confianza sin hacer ruido:
//
//  1. Que se cobre el precio que la persona vio, y no el que haya ahora.
//  2. Que pulsar "pagar" dos veces no devuelva a pendiente un cobro ya
//     procesado --lo que dejaria al webhook volviendo a desbloquear.
//  3. Que una compra suelta no conceda plan Pro.
//
// Necesita los emuladores: `pnpm test:emulators`.
// ─────────────────────────────────────────────────────────────────────────

const SECRETO_INTEGRIDAD = 'secreto_integridad_de_prueba';
const SECRETO_EVENTOS = 'secreto_eventos_de_prueba';

const previo: Record<string, string | undefined> = {};

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Estas pruebas tocan Firestore: correr con pnpm test:emulators');
  }
  // readSecret() cae a process.env cuando no hay secreto vinculado, que es
  // justo el caso del emulador. Se guardan y se restauran para no pisarle
  // la configuracion a otro archivo de pruebas.
  for (const clave of [
    'WOMPI_PUBLIC_KEY',
    'WOMPI_INTEGRITY_SECRET',
    'WOMPI_EVENTS_SECRET',
    'APP_URL',
  ]) {
    previo[clave] = process.env[clave];
  }
  process.env.WOMPI_PUBLIC_KEY = 'pub_test_claveDePrueba';
  process.env.WOMPI_INTEGRITY_SECRET = SECRETO_INTEGRIDAD;
  process.env.WOMPI_EVENTS_SECRET = SECRETO_EVENTOS;
  process.env.APP_URL = 'https://clausumlegal.com';
});

afterAll(() => {
  for (const [clave, valor] of Object.entries(previo)) {
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
});

const ordenes = () => adminDb().collection(COLLECTIONS.singleAnalysisOrders);
const pagos = () => adminDb().collection(COLLECTIONS.payments);

const PRECIO_CONGELADO = 955_000;

function enHoras(horas: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() + horas * 60 * 60 * 1000));
}

function ref(sufijo: string): string {
  return `clausum_doc_${sufijo.repeat(32).slice(0, 32)}`;
}

async function sembrarOrden(
  reference: string,
  campos: Record<string, unknown> = {}
): Promise<void> {
  await ordenes()
    .doc(reference)
    .set({
      reference,
      status: 'pending',
      provider: 'wompi',
      region: 'CO',
      amountInCents: PRECIO_CONGELADO,
      currency: 'COP',
      pageCount: 3,
      expiresAt: enHoras(24),
      createdAt: Timestamp.now(),
      // Con analisis: sin el, el cobro se niega a proposito.
      analysis: { summary: 'Resumen de prueba' },
      risks: [],
      ...campos,
    });
}

/** Evento de Wompi con un checksum que verifica de verdad. */
function eventoAprobado(input: {
  reference: string;
  amountInCents?: number;
  status?: string;
  email?: string;
}): WompiWebhookEvent {
  const transaction = {
    id: 'tx_de_prueba_123',
    amount_in_cents: input.amountInCents ?? PRECIO_CONGELADO,
    reference: input.reference,
    currency: 'COP',
    status: input.status ?? 'APPROVED',
    customer_email: input.email,
    payment_method_type: 'CARD',
  };
  const timestamp = 1_700_000_000;
  const properties = [
    'transaction.id',
    'transaction.status',
    'transaction.amount_in_cents',
  ];
  const cadena =
    String(transaction.id) +
    String(transaction.status) +
    String(transaction.amount_in_cents) +
    String(timestamp) +
    SECRETO_EVENTOS;

  return {
    event: 'transaction.updated',
    data: { transaction },
    environment: 'test',
    signature: {
      properties,
      checksum: createHash('sha256').update(cadena).digest('hex').toUpperCase(),
    },
    timestamp,
  };
}

async function vaciar(): Promise<void> {
  for (const coleccion of [ordenes(), pagos()]) {
    const snap = await coleccion.get();
    if (snap.empty) continue;
    const batch = adminDb().batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
  }
}

beforeEach(vaciar);
afterEach(vaciar);

describe('qué se puede cobrar y qué no', () => {
  it('devuelve el precio congelado en la orden, no el vigente', async () => {
    // Es la promesa de la pantalla: conocer el precio antes de pagar. Si el
    // cobro volviera a consultar el precio, un cambio entre la vista previa
    // y el pago cobraria otra cosa de la que se mostró.
    const r = ref('1');
    await sembrarOrden(r, { amountInCents: 777_000 });

    const datos = await datosParaCobro(r);

    expect(datos.amountInCents).toBe(777_000);
    expect(datos.currency).toBe('COP');
    expect(datos.provider).toBe('wompi');
  });

  it('no cobra un análisis que ya expiró', async () => {
    const r = ref('2');
    await sembrarOrden(r, { expiresAt: enHoras(-1) });

    await expect(datosParaCobro(r)).rejects.toMatchObject({
      code: 'ORDER_EXPIRED',
    });
  });

  it('no cobra dos veces el mismo análisis', async () => {
    // Recargar la pantalla de pago o volver atrás en el navegador no puede
    // acabar en un segundo cargo.
    const r = ref('3');
    await sembrarOrden(r, { status: 'paid' });

    await expect(datosParaCobro(r)).rejects.toMatchObject({
      code: 'ALREADY_PAID',
    });
  });

  it('no cobra un análisis que todavía no terminó', async () => {
    // Podría fallar aún. Y nadie debería llegar al pago sin haber visto la
    // vista previa, que es donde se muestra el precio.
    const r = ref('4');
    await sembrarOrden(r, { analysis: undefined, contractText: 'en cola' });

    await expect(datosParaCobro(r)).rejects.toMatchObject({
      code: 'ANALYSIS_NOT_READY',
    });
  });
});

describe('arranque del cobro en Wompi', () => {
  it('firma el monto guardado, con la moneda de la orden', async () => {
    const r = ref('5');
    await sembrarOrden(r);

    const checkout = await createWompiSingleAnalysisCheckout(r);

    const esperada = createHash('sha256')
      .update(`${r}${PRECIO_CONGELADO}COP${SECRETO_INTEGRIDAD}`)
      .digest('hex');

    expect(checkout.integritySignature).toBe(esperada);
    expect(checkout.amountInCents).toBe(PRECIO_CONGELADO);
    expect(checkout.currency).toBe('COP');
    expect(checkout.reference).toBe(r);
  });

  it('devuelve a la pantalla del propio análisis, no al panel', async () => {
    // Quien compra así no tiene cuenta: no hay panel al que mandarlo.
    const r = ref('6');
    await sembrarOrden(r);

    const checkout = await createWompiSingleAnalysisCheckout(r);

    expect(checkout.redirectUrl).toContain(`/analisis/${r}`);
  });

  it('deja el pago pendiente marcado como compra de documento', async () => {
    const r = ref('7');
    await sembrarOrden(r);

    await createWompiSingleAnalysisCheckout(r);

    const pago = (await pagos().doc(r).get()).data();
    expect(pago?.kind).toBe('single_analysis');
    expect(pago?.status).toBe('pending');
    expect(pago?.amount).toBe(PRECIO_CONGELADO);
    // Sin cuenta no hay uid, y el agregado de ingresos ya lo tolera.
    expect(pago?.userId).toBeUndefined();
  });

  it('pulsar pagar otra vez NO devuelve a pendiente un cobro ya procesado', async () => {
    // Este es el que de verdad importa. Con un set normal, el segundo clic
    // reescribiría status a 'pending', y como la idempotencia del webhook
    // mira justo ese campo, el siguiente reenvío de Wompi volvería a tratar
    // el cobro como nuevo.
    const r = ref('8');
    await sembrarOrden(r);

    await createWompiSingleAnalysisCheckout(r);
    await pagos().doc(r).update({ status: 'succeeded' });

    await createWompiSingleAnalysisCheckout(r);

    expect((await pagos().doc(r).get()).data()?.status).toBe('succeeded');
  });

  it('se niega a cobrar en pesos una orden de LATAM', async () => {
    // Sin esta negativa, el importe en dólares se firmaría y se cobraría
    // como si fueran pesos.
    const r = ref('9');
    await sembrarOrden(r, {
      provider: 'paypal',
      region: 'LATAM',
      currency: 'USD',
      amountInCents: 299,
    });

    await expect(createWompiSingleAnalysisCheckout(r)).rejects.toMatchObject({
      code: 'WRONG_PROVIDER',
    });
  });
});

describe('el webhook sobre una compra suelta', () => {
  it('desbloquea el informe y renueva el plazo', async () => {
    const r = ref('a');
    await sembrarOrden(r, { expiresAt: enHoras(0.5) });
    await createWompiSingleAnalysisCheckout(r);

    await handleWompiWebhook(eventoAprobado({ reference: r }));

    const orden = (await ordenes().doc(r).get()).data();
    expect(orden?.status).toBe('paid');

    // El plazo vuelve a contar desde el pago: quien paga en la hora 23 no
    // puede quedarse con medio minuto para descargar.
    const limite = (orden?.expiresAt as Timestamp).toMillis();
    expect(limite - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);

    expect((await pagos().doc(r).get()).data()?.status).toBe('succeeded');
  });

  it('NO concede plan Pro a nadie', async () => {
    // Una compra suelta no crea usuario ni toca planes. Si la rama del
    // webhook se equivocara, intentaría conceder Pro con un uid vacío.
    const r = ref('b');
    await sembrarOrden(r);
    await createWompiSingleAnalysisCheckout(r);

    await handleWompiWebhook(eventoAprobado({ reference: r }));

    const usuarios = await adminDb().collection(COLLECTIONS.users).get();
    expect(usuarios.docs.filter((d) => d.data().planId === 'pro')).toHaveLength(0);
  });

  it('guarda el correo que vino con la transacción', async () => {
    const r = ref('c');
    await sembrarOrden(r);
    await createWompiSingleAnalysisCheckout(r);

    await handleWompiWebhook(
      eventoAprobado({ reference: r, email: 'comprador@ejemplo.com' })
    );

    expect((await ordenes().doc(r).get()).data()?.email).toBe(
      'comprador@ejemplo.com'
    );
  });

  it('el reenvío del mismo evento no vuelve a procesar el cobro', async () => {
    const r = ref('d');
    await sembrarOrden(r);
    await createWompiSingleAnalysisCheckout(r);

    await handleWompiWebhook(eventoAprobado({ reference: r }));
    const primerPlazo = (
      (await ordenes().doc(r).get()).data()?.expiresAt as Timestamp
    ).toMillis();

    await handleWompiWebhook(eventoAprobado({ reference: r }));
    const segundoPlazo = (
      (await ordenes().doc(r).get()).data()?.expiresAt as Timestamp
    ).toMillis();

    expect(segundoPlazo).toBe(primerPlazo);
  });

  it('un monto distinto del esperado no desbloquea nada', async () => {
    // Pagar 100 pesos no puede dar un informe de 9.550.
    const r = ref('e');
    await sembrarOrden(r);
    await createWompiSingleAnalysisCheckout(r);

    await handleWompiWebhook(
      eventoAprobado({ reference: r, amountInCents: 10_000 })
    );

    expect((await ordenes().doc(r).get()).data()?.status).toBe('pending');
    const pago = (await pagos().doc(r).get()).data();
    expect(pago?.status).toBe('failed');
    expect(pago?.failureCode).toBe('AMOUNT_MISMATCH');
  });

  it('un checksum falsificado se rechaza', async () => {
    const r = ref('f');
    await sembrarOrden(r);
    await createWompiSingleAnalysisCheckout(r);

    const falso = eventoAprobado({ reference: r });
    falso.signature.checksum = 'F'.repeat(64);

    await expect(handleWompiWebhook(falso)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect((await ordenes().doc(r).get()).data()?.status).toBe('pending');
  });

  it('un pago rechazado deja la orden intacta para reintentar', async () => {
    // Se puede volver a intentar con otra tarjeta mientras no caduque.
    const r = ref('0');
    await sembrarOrden(r);
    await createWompiSingleAnalysisCheckout(r);

    await handleWompiWebhook(eventoAprobado({ reference: r, status: 'DECLINED' }));

    expect((await ordenes().doc(r).get()).data()?.status).toBe('pending');
    expect((await pagos().doc(r).get()).data()?.status).toBe('failed');
  });
});
