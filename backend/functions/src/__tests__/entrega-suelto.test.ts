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
  enviarInformePorCorreo,
  generarPdfDelInforme,
  marcarEntregado,
  obtenerInformeCompleto,
} from '../services/single-analysis.service';

// ─────────────────────────────────────────────────────────────────────────
// La entrega es donde se decide si quien pago se queda con algo.
//
// La regla es que el analisis se borra al completarse la PRIMERA entrega, y
// eso pone el peso en dos sitios:
//
//  1. Que un envio fallido NO gaste la entrega. Si la gastara, un correo mal
//     escrito dejaria a alguien habiendo pagado y sin informe.
//  2. Que despues de entregar, la negativa diga "ya se entrego" y no "falta
//     pagar". Habiendo pagado, lo segundo parece un cobro doble.
//
// Necesita los emuladores: `pnpm test:emulators`.
// ─────────────────────────────────────────────────────────────────────────

// El correo que se mando de verdad, para poder mirarlo.
const enviados: Record<string, unknown>[] = [];

vi.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: (mensaje: Record<string, unknown>) => {
      enviados.push(mensaje);
      return Promise.resolve({ accepted: [mensaje.to] });
    },
  }),
}));

const SECRETOS = {
  descripcion: 'CENTINELA_DESCRIPCION_ENTREGA',
  impacto: 'CENTINELA_IMPACTO_ENTREGA',
  recomendacion: 'CENTINELA_RECOMENDACION_ENTREGA',
};

const previo: Record<string, string | undefined> = {};
const CLAVES = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM'];

function configurarCorreo(): void {
  process.env.SMTP_HOST = 'smtp.ejemplo.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_USER = 'informes@ejemplo.com';
  process.env.SMTP_PASSWORD = 'clave_de_prueba';
  process.env.MAIL_FROM = 'Clausum <informes@ejemplo.com>';
}

function desconfigurarCorreo(): void {
  for (const clave of CLAVES) delete process.env[clave];
}

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Estas pruebas tocan Firestore: correr con pnpm test:emulators');
  }
  for (const clave of CLAVES) previo[clave] = process.env[clave];
});

afterAll(() => {
  for (const [clave, valor] of Object.entries(previo)) {
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
});

const ordenes = () => adminDb().collection(COLLECTIONS.singleAnalysisOrders);

function ref(sufijo: string): string {
  return `clausum_doc_${sufijo.repeat(32).slice(0, 32)}`;
}

function enHoras(horas: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() + horas * 60 * 60 * 1000));
}

function analisisCompleto() {
  return {
    summary: 'Contrato de arrendamiento con cláusulas desfavorables al arrendatario.',
    score: 58,
    favorability: {
      verdict: 'desfavorable',
      forWhom: 'arrendador',
      reason: 'Traslada todos los costes de reparación al arrendatario.',
    },
    parties: ['Inmobiliaria Ejemplo S.A.S.', 'María Gómez'],
    metadata: {
      effectiveDate: '2026-01-15',
      contractValue: '$2.400.000 mensuales',
      jurisdiction: 'Bogotá D.C.',
      renewal: 'Prórroga automática por un año',
    },
    country: 'CO',
    contractTypeId: 'arrendamiento',
    clauses: [
      {
        title: 'Reparaciones y mantenimiento',
        importance: 'high',
        assessment: 'desfavorable',
        content: 'El arrendatario asumirá toda reparación, locativa o estructural.',
        meaning: 'Te toca pagar incluso lo que por ley corresponde al dueño.',
      },
      {
        title: 'Duración',
        importance: 'medium',
        assessment: 'estandar',
        content: 'El término será de un año contado desde la entrega.',
        meaning: 'Plazo habitual en arrendamiento de vivienda.',
      },
    ],
  };
}

function riesgosCompletos() {
  return [
    {
      level: 'high',
      title: 'Reparaciones estructurales a tu cargo',
      excerpt: 'El arrendatario asumirá toda reparación, locativa o estructural.',
      description: SECRETOS.descripcion,
      impact: SECRETOS.impacto,
      recommendation: SECRETOS.recomendacion,
      suggestedWording:
        'Las reparaciones estructurales serán a cargo del arrendador, conforme al artículo 1985 del Código Civil.',
    },
    {
      level: 'medium',
      title: 'Prórroga automática sin aviso',
      excerpt: 'El contrato se prorrogará automáticamente por igual término.',
      description: SECRETOS.descripcion,
      impact: SECRETOS.impacto,
    },
  ];
}

async function sembrarPagada(
  reference: string,
  campos: Record<string, unknown> = {}
): Promise<void> {
  await ordenes()
    .doc(reference)
    .set({
      reference,
      status: 'paid',
      provider: 'wompi',
      region: 'CO',
      amountInCents: 955_000,
      currency: 'COP',
      pageCount: 6,
      expiresAt: enHoras(24),
      createdAt: Timestamp.now(),
      paidAt: Timestamp.now(),
      clientFingerprint: 'huella-que-debe-desaparecer',
      analysis: analisisCompleto(),
      risks: riesgosCompletos(),
      risksSummary: 'Dos riesgos relevantes, uno alto.',
      risksScore: 64,
      ...campos,
    });
}

async function vaciar(): Promise<void> {
  const snap = await ordenes().get();
  if (snap.empty) return;
  const batch = adminDb().batch();
  for (const doc of snap.docs) batch.delete(doc.ref);
  await batch.commit();
}

beforeEach(async () => {
  enviados.length = 0;
  configurarCorreo();
  await vaciar();
});

afterEach(vaciar);

describe('el informe completo', () => {
  it('sí entrega lo que se cobró', async () => {
    // Es el espejo de la prueba del muro de pago: allí estos centinelas NO
    // pueden aparecer; aquí tienen que aparecer todos, porque es lo que se
    // pagó.
    const r = ref('1');
    await sembrarPagada(r);

    const informe = await obtenerInformeCompleto(r);
    const serializado = JSON.stringify(informe);

    for (const [campo, secreto] of Object.entries(SECRETOS)) {
      expect(serializado, `falta ${campo}`).toContain(secreto);
    }
    expect(informe.risks).toHaveLength(2);
    expect(informe.risksScore).toBe(64);
  });

  it('sin pagar responde que falta pagar, no que no existe', async () => {
    const r = ref('2');
    await sembrarPagada(r, { status: 'pending' });

    await expect(obtenerInformeCompleto(r)).rejects.toMatchObject({
      code: 'PAYMENT_REQUIRED',
      statusCode: 402,
    });
  });

  it('caducado manda antes que la falta de pago', async () => {
    const r = ref('3');
    await sembrarPagada(r, { status: 'pending', expiresAt: enHoras(-1) });

    await expect(obtenerInformeCompleto(r)).rejects.toMatchObject({
      code: 'ORDER_EXPIRED',
    });
  });

  it('ya entregado dice ya entregado, no falta pagar', async () => {
    // El orden de las comprobaciones importa: a quien ya descargó su informe
    // decirle "falta pagar" habiendo pagado parece un cobro doble.
    const r = ref('4');
    await sembrarPagada(r);
    await marcarEntregado(r, 'download');

    await expect(obtenerInformeCompleto(r)).rejects.toMatchObject({
      code: 'ALREADY_DELIVERED',
      statusCode: 410,
    });
  });
});

describe('cierre de la orden', () => {
  it('borra el análisis y la huella, y deja el recibo', async () => {
    const r = ref('5');
    await sembrarPagada(r);

    await marcarEntregado(r, 'download');

    const orden = (await ordenes().doc(r).get()).data();
    expect(orden?.status).toBe('delivered');
    expect(orden?.deliveredBy).toBe('download');

    // Nada del contrato sobrevive.
    expect(orden?.analysis).toBeUndefined();
    expect(orden?.risks).toBeUndefined();
    expect(orden?.risksSummary).toBeUndefined();
    expect(orden?.risksScore).toBeUndefined();
    expect(orden?.clientFingerprint).toBeUndefined();

    // El recibo sí, y eso no es contenido de nadie.
    expect(orden?.amountInCents).toBe(955_000);
    expect(orden?.currency).toBe('COP');
    expect(orden?.reference).toBe(r);
  });
});

describe('el PDF', () => {
  it('sale un PDF de verdad', async () => {
    const r = ref('6');
    await sembrarPagada(r);

    const pdf = await generarPdfDelInforme(r);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    // Un PDF con portada, resumen, dos riesgos y dos cláusulas no baja de
    // unos pocos kilobytes. Si saliera casi vacío sería que se renderizó sin
    // contenido y el tipo de archivo no lo delataría.
    expect(pdf.length).toBeGreaterThan(5_000);
  });

  it('generar el PDF no entrega ni borra nada', async () => {
    // La descarga se cierra cuando la respuesta HTTP sale completa, no
    // cuando se arma el archivo. Si generar ya borrara, un fallo al enviar
    // la respuesta dejaría a la persona sin informe.
    const r = ref('7');
    await sembrarPagada(r);

    await generarPdfDelInforme(r);

    expect((await ordenes().doc(r).get()).data()?.status).toBe('paid');
  });
});

describe('envío por correo', () => {
  it('manda el PDF adjunto y cierra la orden', async () => {
    const r = ref('8');
    await sembrarPagada(r);

    await enviarInformePorCorreo(r, 'maria@ejemplo.com');

    expect(enviados).toHaveLength(1);
    const mensaje = enviados[0]!;
    expect(mensaje.to).toBe('maria@ejemplo.com');

    const adjuntos = mensaje.attachments as { filename: string; content: Buffer }[];
    expect(adjuntos).toHaveLength(1);
    expect(adjuntos[0]!.content.subarray(0, 5).toString()).toBe('%PDF-');

    const orden = (await ordenes().doc(r).get()).data();
    expect(orden?.status).toBe('delivered');
    expect(orden?.deliveredBy).toBe('email');
    expect(orden?.analysis).toBeUndefined();
  });

  it('el cuerpo dice que no queda copia, porque es verdad', async () => {
    const r = ref('9');
    await sembrarPagada(r);

    await enviarInformePorCorreo(r, 'maria@ejemplo.com');

    expect(String(enviados[0]!.text)).toContain('no conservamos ninguna copia');
  });

  it('avisa del recorte si el contrato se cortó por largo', async () => {
    const r = ref('a');
    await sembrarPagada(r, { truncated: true });

    await enviarInformePorCorreo(r, 'maria@ejemplo.com');

    expect(String(enviados[0]!.text)).toContain('solo la primera parte');
  });

  it('un envío que falla NO gasta la entrega', async () => {
    // El caso que de verdad importa. Si el fallo cerrara la orden, alguien
    // que escribió mal su correo quedaría habiendo pagado y sin informe.
    const r = ref('b');
    await sembrarPagada(r);
    desconfigurarCorreo();

    await expect(enviarInformePorCorreo(r, 'maria@ejemplo.com')).rejects.toMatchObject({
      code: 'MAIL_NOT_CONFIGURED',
    });

    const orden = (await ordenes().doc(r).get()).data();
    expect(orden?.status).toBe('paid');
    expect(orden?.analysis).toBeDefined();
    expect(enviados).toHaveLength(0);
  });

  it('no manda nada de un informe sin pagar', async () => {
    const r = ref('c');
    await sembrarPagada(r, { status: 'pending' });

    await expect(enviarInformePorCorreo(r, 'maria@ejemplo.com')).rejects.toMatchObject({
      code: 'PAYMENT_REQUIRED',
    });
    expect(enviados).toHaveLength(0);
  });

  it('no manda dos veces el mismo informe', async () => {
    // La entrega es una. El segundo intento tiene que explicar por qué.
    const r = ref('d');
    await sembrarPagada(r);

    await enviarInformePorCorreo(r, 'maria@ejemplo.com');
    await expect(enviarInformePorCorreo(r, 'otra@ejemplo.com')).rejects.toMatchObject({
      code: 'ALREADY_DELIVERED',
    });

    expect(enviados).toHaveLength(1);
  });
});
