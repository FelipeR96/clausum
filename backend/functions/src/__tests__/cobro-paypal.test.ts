import { Timestamp } from 'firebase-admin/firestore';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import {
  capturePayPalSingleAnalysisOrder,
  createPayPalSingleAnalysisOrder,
} from '../services/paypal.service';

// ─────────────────────────────────────────────────────────────────────────
// PayPal no tiene emulador, asi que aqui se finge SU HTTP y nada mas: el
// resto --Firestore, la orden, el pago-- es de verdad.
//
// Fingir ese limite es lo que permite probar las dos cosas que no se pueden
// probar a mano sin arriesgar dinero real:
//
//  1. El formato del importe. PayPal clasifica las monedas por decimales, y
//     equivocarse ahi cobra cien veces de mas o de menos.
//  2. Que un monto capturado distinto del esperado NO desbloquee el
//     informe. Es el equivalente del control de monto de Wompi.
//
// El camino completo contra el sandbox se prueba a mano, como se hizo con
// Wompi: esto cubre la logica, no la integracion.
//
// Necesita los emuladores: `pnpm test:emulators`.
// ─────────────────────────────────────────────────────────────────────────

const ORDEN_PAYPAL = 'ORDEN_PAYPAL_DE_PRUEBA';
const APROBACION = 'https://www.sandbox.paypal.com/checkoutnow?token=ORDEN_PAYPAL_DE_PRUEBA';
const CAPTURA_PAYPAL = 'CAPTURA_PAYPAL_DE_PRUEBA';
const PRECIO = 299; // USD 2,99

const previo: Record<string, string | undefined> = {};
const CLAVES = [
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_WEBHOOK_ID',
  'PAYPAL_PLAN_ID_MONTHLY',
  'PAYPAL_PLAN_ID_ANNUAL',
  'PAYPAL_MODE',
  'APP_URL',
];

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Estas pruebas tocan Firestore: correr con pnpm test:emulators');
  }
  for (const clave of CLAVES) previo[clave] = process.env[clave];
  process.env.PAYPAL_CLIENT_ID = 'cliente_de_prueba';
  process.env.PAYPAL_CLIENT_SECRET = 'secreto_de_prueba';
  process.env.PAYPAL_WEBHOOK_ID = 'webhook_de_prueba';
  process.env.PAYPAL_PLAN_ID_MONTHLY = 'P-MENSUAL';
  process.env.PAYPAL_PLAN_ID_ANNUAL = 'P-ANUAL';
  process.env.PAYPAL_MODE = 'sandbox';
  process.env.APP_URL = 'https://clausumlegal.com';
});

afterAll(() => {
  for (const [clave, valor] of Object.entries(previo)) {
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
  vi.unstubAllGlobals();
});

// ─── El PayPal de mentira ────────────────────────────────────────────────

type Llamada = { url: string; cuerpo: unknown };

let llamadas: Llamada[] = [];
/** Lo que responde la captura. Cada prueba lo ajusta a lo que necesita. */
let respuestaDeCaptura: { ok: boolean; cuerpo: unknown } = { ok: true, cuerpo: {} };
/** Para probar que una orden sin enlace de aprobacion no pasa de ahi. */
let respuestaDeCreacionSinEnlaces = false;

function capturaCompletada(valor = '2.99', correo?: string) {
  return {
    ok: true,
    cuerpo: {
      id: ORDEN_PAYPAL,
      status: 'COMPLETED',
      purchase_units: [
        {
          payments: {
            captures: [
              {
                id: CAPTURA_PAYPAL,
                status: 'COMPLETED',
                amount: { currency_code: 'USD', value: valor },
              },
            ],
          },
        },
      ],
      ...(correo ? { payer: { email_address: correo } } : {}),
    },
  };
}

function fingirPayPal(): void {
  vi.stubGlobal(
    'fetch',
    // Sin async: no hay nada que esperar aqui dentro, y await sobre una
    // Response sin envolver funciona igual. Promise.resolve lo deja explicito.
    vi.fn((url: string | URL, init?: RequestInit) => {
      const dir = String(url);
      let cuerpo: unknown;
      try {
        cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined;
      } catch {
        cuerpo = String(init?.body ?? '');
      }
      llamadas.push({ url: dir, cuerpo });

      if (dir.includes('/v1/oauth2/token')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              access_token: 'token_de_prueba',
              token_type: 'Bearer',
              expires_in: 3600,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      if (dir.includes('/capture')) {
        return Promise.resolve(
          new Response(JSON.stringify(respuestaDeCaptura.cuerpo), {
            status: respuestaDeCaptura.ok ? 201 : 422,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (dir.includes('/v2/checkout/orders')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: ORDEN_PAYPAL,
              status: 'CREATED',
              links: respuestaDeCreacionSinEnlaces
                ? []
                : [
                    { href: 'https://api.sandbox.paypal.com/...', rel: 'self', method: 'GET' },
                    { href: APROBACION, rel: 'payer-action', method: 'GET' },
                  ],
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          )
        );
      }

      return Promise.resolve(new Response('no previsto', { status: 404 }));
    })
  );
}

// ─── Datos ───────────────────────────────────────────────────────────────

const ordenes = () => adminDb().collection(COLLECTIONS.singleAnalysisOrders);
const pagos = () => adminDb().collection(COLLECTIONS.payments);

function ref(sufijo: string): string {
  return `clausum_doc_${sufijo.repeat(32).slice(0, 32)}`;
}

function enHoras(horas: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() + horas * 60 * 60 * 1000));
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
      provider: 'paypal',
      region: 'LATAM',
      amountInCents: PRECIO,
      currency: 'USD',
      pageCount: 2,
      expiresAt: enHoras(24),
      createdAt: Timestamp.now(),
      analysis: { summary: 'Resumen de prueba' },
      risks: [],
      ...campos,
    });
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

beforeEach(async () => {
  llamadas = [];
  respuestaDeCaptura = capturaCompletada();
  respuestaDeCreacionSinEnlaces = false;
  fingirPayPal();
  await vaciar();
});

afterEach(vaciar);

// ─── Pruebas ─────────────────────────────────────────────────────────────

describe('apertura de la orden en PayPal', () => {
  it('manda el importe como decimal de dos cifras, no en centavos', async () => {
    // Si se mandaran los centavos, PayPal cobraría 299 dólares por un
    // análisis de 2,99. Es el error de cien veces que no se ve en el código.
    const r = ref('1');
    await sembrarOrden(r);

    await createPayPalSingleAnalysisOrder(r);

    const creacion = llamadas.find((l) => l.url.endsWith('/v2/checkout/orders'));
    const unidad = (
      creacion?.cuerpo as { purchase_units: { amount: Record<string, string> }[] }
    ).purchase_units[0];

    expect(unidad.amount.value).toBe('2.99');
    expect(unidad.amount.currency_code).toBe('USD');
  });

  it('pasa la referencia como custom_id, que es lo que vuelve en el webhook', async () => {
    const r = ref('2');
    await sembrarOrden(r);

    await createPayPalSingleAnalysisOrder(r);

    const creacion = llamadas.find((l) => l.url.endsWith('/v2/checkout/orders'));
    const unidad = (
      creacion?.cuerpo as { purchase_units: Record<string, string>[] }
    ).purchase_units[0];

    expect(unidad.custom_id).toBe(r);
  });

  it('guarda el pago pendiente con el id de la orden de PayPal', async () => {
    const r = ref('3');
    await sembrarOrden(r);

    await createPayPalSingleAnalysisOrder(r);

    const pago = (await pagos().doc(r).get()).data();
    expect(pago?.kind).toBe('single_analysis');
    expect(pago?.provider).toBe('paypal');
    expect(pago?.paypalOrderId).toBe(ORDEN_PAYPAL);
    expect(pago?.amount).toBe(PRECIO);
    expect(pago?.userId).toBeUndefined();
  });

  it('devuelve el enlace de aprobación al que redirigir', async () => {
    // Con este enlace no hace falta cargar el SDK de PayPal: se redirige
    // igual que con Wompi. Un script de terceros menos en una página por la
    // que pasan contratos.
    const r = ref('g');
    await sembrarOrden(r);

    const checkout = await createPayPalSingleAnalysisOrder(r);

    expect(checkout.approveUrl).toBe(APROBACION);
    expect(checkout.provider).toBe('paypal');
  });

  it('una orden sin enlace de aprobación no se da por buena', async () => {
    // Sin el enlace, el botón de pagar se quedaría sin destino y el fallo
    // aparecería al pulsarlo, no al crearla.
    const r = ref('h');
    await sembrarOrden(r);
    respuestaDeCreacionSinEnlaces = true;

    await expect(createPayPalSingleAnalysisOrder(r)).rejects.toMatchObject({
      code: 'PAYPAL_NO_APPROVE_URL',
    });
  });

  it('se niega a cobrar por PayPal una orden de Colombia', async () => {
    const r = ref('4');
    await sembrarOrden(r, { provider: 'wompi', region: 'CO', currency: 'COP' });

    await expect(createPayPalSingleAnalysisOrder(r)).rejects.toMatchObject({
      code: 'WRONG_PROVIDER',
    });
  });

  it('se niega a cobrar en pesos aunque la orden diga PayPal', async () => {
    // El peso no admite decimales en PayPal: "9550.00" en COP sería
    // rechazado o, peor, interpretado. Mejor negarse antes de pedirlo.
    const r = ref('5');
    await sembrarOrden(r, { currency: 'COP', amountInCents: 955_000 });

    await expect(createPayPalSingleAnalysisOrder(r)).rejects.toMatchObject({
      code: 'PAYPAL_CURRENCY_UNSUPPORTED',
    });
  });

  it('no cobra un análisis ya pagado', async () => {
    const r = ref('6');
    await sembrarOrden(r, { status: 'paid' });

    await expect(createPayPalSingleAnalysisOrder(r)).rejects.toMatchObject({
      code: 'ALREADY_PAID',
    });
  });
});

describe('captura del pago', () => {
  it('desbloquea el informe y guarda el correo del pagador', async () => {
    const r = ref('7');
    await sembrarOrden(r, { expiresAt: enHoras(0.5) });
    await createPayPalSingleAnalysisOrder(r);
    respuestaDeCaptura = capturaCompletada('2.99', 'pagador@ejemplo.com');

    const resultado = await capturePayPalSingleAnalysisOrder(r);

    expect(resultado).toEqual({ status: 'paid', yaEstaba: false });

    const orden = (await ordenes().doc(r).get()).data();
    expect(orden?.status).toBe('paid');
    expect(orden?.email).toBe('pagador@ejemplo.com');
    // El plazo vuelve a contar desde el pago.
    expect((orden?.expiresAt as Timestamp).toMillis() - Date.now()).toBeGreaterThan(
      23 * 60 * 60 * 1000
    );

    const pago = (await pagos().doc(r).get()).data();
    expect(pago?.status).toBe('succeeded');
    expect(pago?.paypalCaptureId).toBe(CAPTURA_PAYPAL);
  });

  it('captura el id de orden GUARDADO, no uno que venga de fuera', async () => {
    // Sin esto se podría desbloquear este informe con el id de una compra
    // pagada por otra persona: sin sesión, lo único que ata el pago a este
    // análisis es lo que guardamos nosotros.
    const r = ref('8');
    await sembrarOrden(r);
    await createPayPalSingleAnalysisOrder(r);

    await capturePayPalSingleAnalysisOrder(r);

    const captura = llamadas.find((l) => l.url.includes('/capture'));
    expect(captura?.url).toContain(`/orders/${ORDEN_PAYPAL}/capture`);
  });

  it('un monto distinto del esperado NO desbloquea el informe', async () => {
    const r = ref('9');
    await sembrarOrden(r);
    await createPayPalSingleAnalysisOrder(r);
    respuestaDeCaptura = capturaCompletada('0.99');

    await expect(capturePayPalSingleAnalysisOrder(r)).rejects.toMatchObject({
      code: 'AMOUNT_MISMATCH',
    });

    expect((await ordenes().doc(r).get()).data()?.status).toBe('pending');
    const pago = (await pagos().doc(r).get()).data();
    expect(pago?.status).toBe('failed');
    expect(pago?.failureCode).toBe('AMOUNT_MISMATCH');
  });

  it('una captura que no quedó COMPLETED no desbloquea nada', async () => {
    const r = ref('a');
    await sembrarOrden(r);
    await createPayPalSingleAnalysisOrder(r);
    respuestaDeCaptura = {
      ok: true,
      cuerpo: {
        id: ORDEN_PAYPAL,
        status: 'PENDING',
        purchase_units: [
          { payments: { captures: [{ id: CAPTURA_PAYPAL, status: 'PENDING' }] } },
        ],
      },
    };

    await expect(capturePayPalSingleAnalysisOrder(r)).rejects.toMatchObject({
      code: 'PAYMENT_NOT_COMPLETED',
    });
    expect((await ordenes().doc(r).get()).data()?.status).toBe('pending');
  });

  it('si ya estaba cobrado no vuelve a llamar a PayPal', async () => {
    // El webhook y el navegador compiten por llegar primero, así que esto
    // pasa de verdad. Volver a capturar sería pedirle a PayPal que cobre
    // otra vez.
    const r = ref('b');
    await sembrarOrden(r);
    await createPayPalSingleAnalysisOrder(r);
    await pagos().doc(r).update({ status: 'succeeded' });

    llamadas = [];
    const resultado = await capturePayPalSingleAnalysisOrder(r);

    expect(resultado).toEqual({ status: 'paid', yaEstaba: true });
    expect(llamadas).toHaveLength(0);
  });

  it('ORDER_ALREADY_CAPTURED se resuelve como pagado, no como fallo', async () => {
    // El cobro sí ocurrió; casi siempre porque el webhook llegó primero.
    // Tratarlo como fallo le diría a quien ya pagó que su pago no sirvió.
    const r = ref('c');
    await sembrarOrden(r);
    await createPayPalSingleAnalysisOrder(r);
    respuestaDeCaptura = {
      ok: false,
      cuerpo: {
        name: 'UNPROCESSABLE_ENTITY',
        details: [{ issue: 'ORDER_ALREADY_CAPTURED' }],
      },
    };

    const resultado = await capturePayPalSingleAnalysisOrder(r);

    expect(resultado).toEqual({ status: 'paid', yaEstaba: true });
    expect((await ordenes().doc(r).get()).data()?.status).toBe('paid');
  });

  it('sin pago iniciado no hay nada que capturar', async () => {
    const r = ref('d');
    await sembrarOrden(r);

    await expect(capturePayPalSingleAnalysisOrder(r)).rejects.toMatchObject({
      code: 'PAYMENT_NOT_FOUND',
    });
  });

  it('no captura sobre un pago que no es de un análisis suelto', async () => {
    // La referencia llega de fuera. Sin esta comprobación, apuntaría a un
    // pago de suscripción y lo trataría como una compra de documento.
    const r = ref('e');
    await pagos().doc(r).set({
      userId: 'alguien',
      provider: 'paypal',
      amount: 1000,
      currency: 'USD',
      status: 'pending',
      createdAt: Timestamp.now(),
    });

    await expect(capturePayPalSingleAnalysisOrder(r)).rejects.toMatchObject({
      code: 'BAD_REFERENCE',
    });
  });
});
