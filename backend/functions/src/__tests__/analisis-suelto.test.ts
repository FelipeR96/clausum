import { Timestamp } from 'firebase-admin/firestore';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import {
  borrarAnalisisCaducados,
  comprobarLimitePorOrigen,
  ejecutarAnalisisSuelto,
  HORAS_DE_VIDA,
  marcarOrdenPagada,
  MAX_ANALISIS_POR_ORIGEN_AL_DIA,
  obtenerEstado,
} from '../services/single-analysis.service';

// ─────────────────────────────────────────────────────────────────────────
// La compra de un analisis suelto no tiene sesion que la proteja: la
// referencia es el acceso, y la caducidad es la unica promesa de
// privacidad que le hacemos a quien sube un contrato sin cuenta.
//
// Las dos cosas se rompen en silencio. Una caducidad que no se respeta al
// leer sigue devolviendo el informe con normalidad; un muro de pago con una
// fuga devuelve la respuesta de siempre, solo con un campo de mas dentro.
// Ninguna de las dos se ve mirando la pantalla, y por eso estan aqui.
//
// Necesita los emuladores: `pnpm test:emulators`.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Centinelas en los campos de pago.
 *
 * Son cadenas que no pueden aparecer por casualidad. Guardarlas en
 * Firestore y comprobar que no vuelven en la vista previa prueba el camino
 * COMPLETO --guardado, lectura, construccion de la vista-- y no solo la
 * funcion que la arma, que es lo que ya cubre la prueba de shared.
 */
const SECRETOS = {
  descripcion: 'CENTINELA_DESCRIPCION_SUELTO',
  impacto: 'CENTINELA_IMPACTO_SUELTO',
  recomendacion: 'CENTINELA_RECOMENDACION_SUELTO',
  redaccion: 'CENTINELA_REDACCION_SUELTO',
  contenidoClausula: 'CENTINELA_CONTENIDO_CLAUSULA_SUELTO',
  significadoClausula: 'CENTINELA_SIGNIFICADO_CLAUSULA_SUELTO',
} as const;

const RESUMEN_PUBLICO = 'Contrato de arrendamiento con tres riesgos relevantes.';
const CITA_PUBLICA = 'El arrendatario renuncia a cualquier reclamación posterior.';

function analisisDePrueba() {
  return {
    summary: RESUMEN_PUBLICO,
    score: 62,
    favorability: { verdict: 'desfavorable', forWhom: 'arrendador' },
    parties: ['Arrendador S.A.S.', 'Juan Pérez'],
    country: 'CO',
    contractTypeId: 'arrendamiento',
    clauses: [
      {
        title: 'Cláusula de renuncia',
        importance: 'high',
        assessment: 'abusiva',
        content: SECRETOS.contenidoClausula,
        meaning: SECRETOS.significadoClausula,
      },
    ],
  };
}

function riesgosDePrueba() {
  return [
    {
      level: 'medium',
      title: 'Prórroga automática',
      excerpt: 'El contrato se prorroga por igual término.',
      description: SECRETOS.descripcion,
      impact: SECRETOS.impacto,
      recommendation: SECRETOS.recomendacion,
      suggestedWording: SECRETOS.redaccion,
    },
    {
      level: 'high',
      title: 'Renuncia a reclamar',
      excerpt: CITA_PUBLICA,
      description: SECRETOS.descripcion,
      impact: SECRETOS.impacto,
    },
  ];
}

function enHoras(horas: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() + horas * 60 * 60 * 1000));
}

const coleccion = () => adminDb().collection(COLLECTIONS.singleAnalysisOrders);

/**
 * Crea una orden directamente en Firestore.
 *
 * No pasa por crearOrdenDeAnalisis a proposito: esa funcion necesita un PDF
 * de verdad y una llamada a DeepSeek, que son justo las dos cosas que no se
 * pueden pedir dentro de una prueba. Lo que se esta probando aqui es el
 * ciclo de vida de la orden, no la extraccion de texto.
 */
async function sembrarOrden(
  reference: string,
  campos: Record<string, unknown>
): Promise<void> {
  await coleccion()
    .doc(reference)
    .set({
      reference,
      status: 'pending',
      provider: 'wompi',
      region: 'CO',
      amountInCents: 955_000,
      currency: 'COP',
      pageCount: 4,
      expiresAt: enHoras(HORAS_DE_VIDA),
      createdAt: Timestamp.now(),
      ...campos,
    });
}

/** La coleccion entera, porque el barrido consulta sobre toda ella. */
async function vaciarColeccion(): Promise<void> {
  const snap = await coleccion().get();
  if (snap.empty) return;
  const batch = adminDb().batch();
  for (const doc of snap.docs) batch.delete(doc.ref);
  await batch.commit();
}

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Estas pruebas tocan Firestore: correr con pnpm test:emulators');
  }
});

beforeEach(vaciarColeccion);
afterEach(vaciarColeccion);

describe('caducidad del análisis suelto', () => {
  it('se decide por la fecha, no por el campo status', async () => {
    // Una orden que caducó hace una hora pero a la que el barrido nocturno
    // todavía no ha llegado: status sigue en 'pending' y el análisis está.
    // Es exactamente el estado en el que vive una orden la mayor parte de
    // la noche, y antes devolvía el informe con total normalidad.
    await sembrarOrden('clausum_doc_' + 'a'.repeat(32), {
      expiresAt: enHoras(-1),
      analysis: analisisDePrueba(),
      risks: riesgosDePrueba(),
    });

    const estado = await obtenerEstado('clausum_doc_' + 'a'.repeat(32));
    expect(estado.estado).toBe('expirado');
  });

  it('una orden sin fecha legible se trata como caducada', async () => {
    // Fallar hacia el acceso abierto sería lo grave: un campo corrupto no
    // puede convertirse en un informe accesible para siempre.
    await sembrarOrden('clausum_doc_' + 'b'.repeat(32), {
      expiresAt: 'no-es-una-fecha',
      analysis: analisisDePrueba(),
      risks: riesgosDePrueba(),
    });

    const estado = await obtenerEstado('clausum_doc_' + 'b'.repeat(32));
    expect(estado.estado).toBe('expirado');
  });

  it('entrega la vista previa mientras el plazo está vivo', async () => {
    await sembrarOrden('clausum_doc_' + 'c'.repeat(32), {
      analysis: analisisDePrueba(),
      risks: riesgosDePrueba(),
    });

    const estado = await obtenerEstado('clausum_doc_' + 'c'.repeat(32));
    expect(estado.estado).toBe('listo');
    if (estado.estado !== 'listo') return;
    expect(estado.pagado).toBe(false);
    expect(estado.preview.summary).toBe(RESUMEN_PUBLICO);
  });

  it('responde "analizando" mientras no hay resultado', async () => {
    await sembrarOrden('clausum_doc_' + 'd'.repeat(32), {
      contractText: 'texto del contrato en espera de la cola',
    });

    const estado = await obtenerEstado('clausum_doc_' + 'd'.repeat(32));
    expect(estado.estado).toBe('analizando');
  });

  it('una referencia que no existe da ORDER_NOT_FOUND', async () => {
    await expect(obtenerEstado('clausum_doc_' + 'e'.repeat(32))).rejects.toMatchObject({
      code: 'ORDER_NOT_FOUND',
    });
  });

  it('no gasta una llamada a DeepSeek si la orden caducó en la cola', async () => {
    // Si el guardia no estuviera, esta llamada seguiría hasta callDeepSeek y
    // reventaría por falta de credenciales. Que resuelva limpia ES la
    // prueba de que cortó antes de gastar dinero.
    const ref = 'clausum_doc_' + 'f'.repeat(32);
    await sembrarOrden(ref, {
      expiresAt: enHoras(-2),
      contractText: 'texto que ya no debe analizarse',
    });

    await ejecutarAnalisisSuelto(ref);

    const doc = (await coleccion().doc(ref).get()).data();
    expect(doc?.status).toBe('expired');
    expect(doc?.contractText).toBeUndefined();
    expect(doc?.analysis).toBeUndefined();
  });
});

describe('el muro de pago sobre datos guardados', () => {
  it('no deja escapar ningún texto de pago en la vista previa', async () => {
    const ref = 'clausum_doc_' + '1'.repeat(32);
    await sembrarOrden(ref, {
      analysis: analisisDePrueba(),
      risks: riesgosDePrueba(),
    });

    const estado = await obtenerEstado(ref);
    expect(estado.estado).toBe('listo');
    if (estado.estado !== 'listo') return;

    const serializada = JSON.stringify(estado.preview);
    for (const [campo, secreto] of Object.entries(SECRETOS)) {
      expect(serializada, `se filtró ${campo}`).not.toContain(secreto);
    }
  });

  it('sigue tapado después de pagar: el informe completo va por otra ruta', async () => {
    // obtenerEstado no entrega lo de pago ni con la orden pagada. Así, un
    // error en la pantalla de la vista previa no puede filtrar nada.
    const ref = 'clausum_doc_' + '2'.repeat(32);
    await sembrarOrden(ref, {
      status: 'paid',
      analysis: analisisDePrueba(),
      risks: riesgosDePrueba(),
    });

    const estado = await obtenerEstado(ref);
    expect(estado.estado).toBe('listo');
    if (estado.estado !== 'listo') return;
    expect(estado.pagado).toBe(true);
    expect(JSON.stringify(estado.preview)).not.toContain(SECRETOS.impacto);
  });

  it('sí entrega lo que se regala: cita textual y conteo de riesgos', async () => {
    // El gancho tiene que funcionar. Si por tapar de más se queda sin citas
    // ni conteo, la vista previa deja de convencer a nadie.
    const ref = 'clausum_doc_' + '3'.repeat(32);
    await sembrarOrden(ref, {
      analysis: analisisDePrueba(),
      risks: riesgosDePrueba(),
    });

    const estado = await obtenerEstado(ref);
    if (estado.estado !== 'listo') throw new Error('se esperaba listo');

    expect(estado.preview.riskCounts).toEqual({ high: 1, medium: 1, low: 0 });
    expect(estado.preview.lockedRiskCount).toBe(2);
    expect(JSON.stringify(estado.preview)).toContain(CITA_PUBLICA);
    // Y el riesgo más grave primero, que es el que convence.
    expect(estado.preview.risks[0]?.level).toBe('high');
    expect(estado.preview.risks[0]?.locked).toContain('impact');
  });

  it('avisa del recorte cuando el contrato se cortó por largo', async () => {
    const ref = 'clausum_doc_' + '4'.repeat(32);
    await sembrarOrden(ref, {
      truncated: true,
      analysis: analisisDePrueba(),
      risks: riesgosDePrueba(),
    });

    const estado = await obtenerEstado(ref);
    if (estado.estado !== 'listo') throw new Error('se esperaba listo');
    expect(estado.truncado).toBe(true);
  });
});

describe('confirmación del pago', () => {
  it('renueva el plazo al pagar', async () => {
    // Quien paga en la hora 23 no puede quedarse con un minuto para
    // descargar. El plazo cuenta desde lo último que hizo la persona.
    const ref = 'clausum_doc_' + '5'.repeat(32);
    await sembrarOrden(ref, {
      expiresAt: enHoras(0.5),
      analysis: analisisDePrueba(),
      risks: riesgosDePrueba(),
    });

    await marcarOrdenPagada(ref);

    const doc = (await coleccion().doc(ref).get()).data();
    expect(doc?.status).toBe('paid');
    const limite = (doc?.expiresAt as Timestamp).toMillis();
    const esperado = Date.now() + HORAS_DE_VIDA * 60 * 60 * 1000;
    // Margen de un minuto: lo que importa es que son ~24 horas y no media.
    expect(Math.abs(limite - esperado)).toBeLessThan(60_000);
  });

  it('el aviso repetido de la pasarela no vuelve a mover el plazo', async () => {
    const ref = 'clausum_doc_' + '6'.repeat(32);
    await sembrarOrden(ref, { analysis: analisisDePrueba() });

    const primero = await marcarOrdenPagada(ref);
    const limiteTrasPrimero = (
      (await coleccion().doc(ref).get()).data()?.expiresAt as Timestamp
    ).toMillis();

    const segundo = await marcarOrdenPagada(ref);
    const limiteTrasSegundo = (
      (await coleccion().doc(ref).get()).data()?.expiresAt as Timestamp
    ).toMillis();

    expect(primero.yaEstaba).toBe(false);
    expect(segundo.yaEstaba).toBe(true);
    expect(limiteTrasSegundo).toBe(limiteTrasPrimero);
  });

  it('pagar sobre una orden ya borrada avisa en vez de crearla', async () => {
    // Dinero cobrado sobre un análisis que ya no existe. Tiene que gritar,
    // no escribir una orden nueva desde cero con datos inventados.
    await expect(
      marcarOrdenPagada('clausum_doc_' + '7'.repeat(32))
    ).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });

    const snap = await coleccion().doc('clausum_doc_' + '7'.repeat(32)).get();
    expect(snap.exists).toBe(false);
  });

  it('guarda el correo cuando llega con el pago', async () => {
    const ref = 'clausum_doc_' + '8'.repeat(32);
    await sembrarOrden(ref, { analysis: analisisDePrueba() });

    await marcarOrdenPagada(ref, { email: 'quien.pago@ejemplo.com' });

    const doc = (await coleccion().doc(ref).get()).data();
    expect(doc?.email).toBe('quien.pago@ejemplo.com');
  });
});

describe('barrido de caducados', () => {
  it('borra el documento entero, no solo su contenido', async () => {
    // La promesa es que no se guarda nada. Una cáscara con el país, el tipo
    // de contrato y la huella del origen no es "nada".
    const caducada = 'clausum_doc_' + '9'.repeat(32);
    await sembrarOrden(caducada, {
      expiresAt: enHoras(-3),
      analysis: analisisDePrueba(),
      risks: riesgosDePrueba(),
      clientFingerprint: 'huella-de-prueba',
    });

    const resultado = await borrarAnalisisCaducados();

    expect(resultado.ordenes).toBe(1);
    expect((await coleccion().doc(caducada).get()).exists).toBe(false);
  });

  it('no toca las que todavía están vivas', async () => {
    const viva = 'clausum_doc_' + 'ab'.repeat(16);
    const muerta = 'clausum_doc_' + 'ba'.repeat(16);
    await sembrarOrden(viva, { analysis: analisisDePrueba() });
    await sembrarOrden(muerta, { expiresAt: enHoras(-1) });

    await borrarAnalisisCaducados();

    expect((await coleccion().doc(viva).get()).exists).toBe(true);
    expect((await coleccion().doc(muerta).get()).exists).toBe(false);
  });

  it('también barre los contadores del freno por origen', async () => {
    // Viven en la misma colección y caen en la misma consulta. Si no se
    // contaran aparte, un pico de contadores parecería un pico de órdenes
    // borradas en los registros.
    await coleccion()
      .doc('_limite_2020-01-01_huellavieja')
      .set({ count: 3, expiresAt: enHoras(-5) });

    const resultado = await borrarAnalisisCaducados();

    expect(resultado.contadores).toBe(1);
    expect(resultado.ordenes).toBe(0);
    expect((await coleccion().doc('_limite_2020-01-01_huellavieja').get()).exists).toBe(
      false
    );
  });

  it('borra por fecha de creación aunque expiresAt quedara ilegible', async () => {
    // Firestore ordena las cadenas después de las marcas de tiempo, así que
    // esta orden no entra en la consulta por expiresAt. Sin la segunda
    // pasada su análisis se quedaría guardado para siempre, y en silencio,
    // porque el acceso ya está cerrado y nadie lo echaría de menos.
    const corrupta = 'clausum_doc_' + 'cc'.repeat(16);
    await sembrarOrden(corrupta, {
      expiresAt: 'no-es-una-fecha',
      createdAt: enHoras(-96),
      analysis: analisisDePrueba(),
    });

    const resultado = await borrarAnalisisCaducados();

    expect(resultado.ordenes).toBe(1);
    expect((await coleccion().doc(corrupta).get()).exists).toBe(false);
  });

  it('no borra por creación una orden recién pagada', async () => {
    // El tope absoluto son 72 horas justamente para no pisar el caso
    // legítimo más largo: creada, pagada en la hora 23 y con el plazo
    // renovado hasta la 47.
    const reciente = 'clausum_doc_' + 'dd'.repeat(16);
    await sembrarOrden(reciente, {
      status: 'paid',
      createdAt: enHoras(-30),
      expiresAt: enHoras(17),
      analysis: analisisDePrueba(),
    });

    await borrarAnalisisCaducados();

    expect((await coleccion().doc(reciente).get()).exists).toBe(true);
  });

  it('no falla cuando no hay nada que barrer', async () => {
    await expect(borrarAnalisisCaducados()).resolves.toEqual({
      ordenes: 0,
      contadores: 0,
    });
  });
});

describe('freno de abuso por origen', () => {
  it('permite exactamente el máximo del día y rechaza el siguiente', async () => {
    const huella = 'huella-limite-prueba';

    for (let i = 0; i < MAX_ANALISIS_POR_ORIGEN_AL_DIA; i += 1) {
      await comprobarLimitePorOrigen(huella);
    }

    await expect(comprobarLimitePorOrigen(huella)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });

  it('cuenta por origen, no en global', async () => {
    // Un operador móvil mete a mucha gente detrás de la misma salida, pero
    // dos orígenes distintos no pueden gastarse la cuota del otro.
    const uno = 'huella-uno';
    const otro = 'huella-otro';

    for (let i = 0; i < MAX_ANALISIS_POR_ORIGEN_AL_DIA; i += 1) {
      await comprobarLimitePorOrigen(uno);
    }

    await expect(comprobarLimitePorOrigen(otro)).resolves.toBeUndefined();
  });

  it('sin huella no bloquea a nadie', async () => {
    // Si no se pudo calcular el origen, el freno se desactiva en vez de
    // bloquear a todo el mundo con la cadena vacía como clave compartida.
    for (let i = 0; i < MAX_ANALISIS_POR_ORIGEN_AL_DIA + 3; i += 1) {
      await expect(comprobarLimitePorOrigen('')).resolves.toBeUndefined();
    }
  });
});
