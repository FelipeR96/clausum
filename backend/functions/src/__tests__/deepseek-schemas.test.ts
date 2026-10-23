import { describe, expect, it } from 'vitest';
import {
  analyzeResponseSchema,
  parseJsonResponse,
  risksResponseSchema,
} from '../integrations/deepseek/schemas';

// ─────────────────────────────────────────────────────────────────────────
// La respuesta del modelo es entrada no confiable: si se guarda sin validar,
// un campo ausente o de otro tipo acaba en Firestore y revienta en la UI,
// lejos del origen. Estas pruebas fijan el contrato.
// ─────────────────────────────────────────────────────────────────────────

const analisisValido = {
  summary: 'Contrato de arrendamiento de vivienda urbana por 12 meses.',
  score: 72,
  clauses: [
    {
      title: 'Canon de arrendamiento',
      content: 'El canon mensual será de $2.000.000.',
      importance: 'high',
    },
  ],
  parties: ['Arrendador S.A.S.', 'Juan Pérez'],
  lawReferences: [
    {
      lawId: 'ley820_18',
      codeName: 'Ley 820 de 2003',
      article: '18',
      relevance: 'Reajuste del canon',
    },
  ],
};

describe('parseJsonResponse', () => {
  it('parsea y valida una respuesta correcta', () => {
    const resultado = parseJsonResponse(
      JSON.stringify(analisisValido),
      analyzeResponseSchema
    );
    expect(resultado.score).toBe(72);
    expect(resultado.clauses).toHaveLength(1);
  });

  it('lanza un error legible si no es JSON', () => {
    expect(() => parseJsonResponse('esto no es json', analyzeResponseSchema)).toThrow(
      /no devolvió JSON válido/
    );
  });

  it('lanza si falta un campo obligatorio, nombrando el campo', () => {
    const sinResumen = { ...analisisValido } as Record<string, unknown>;
    delete sinResumen.summary;

    expect(() =>
      parseJsonResponse(JSON.stringify(sinResumen), analyzeResponseSchema)
    ).toThrow(/summary/);
  });

  it('lanza si un campo viene con el tipo equivocado', () => {
    expect(() =>
      parseJsonResponse(
        JSON.stringify({ ...analisisValido, score: 'alto' }),
        analyzeResponseSchema
      )
    ).toThrow(/score/);
  });

  it('rechaza JSON envuelto en vallas de markdown', () => {
    // No es un descuido: la llamada usa response_format json_object, así que
    // DeepSeek devuelve JSON crudo. Si algún día eso cambia, esta prueba
    // falla y avisa en vez de dejar el error aparecer en producción.
    const envuelto = '```json\n' + JSON.stringify(analisisValido) + '\n```';
    expect(() => parseJsonResponse(envuelto, analyzeResponseSchema)).toThrow(
      /no devolvió JSON válido/
    );
  });

  it('tolera campos extra que el modelo añada por su cuenta', () => {
    const conExtra = { ...analisisValido, comentarioDelModelo: 'espero que ayude' };
    expect(() =>
      parseJsonResponse(JSON.stringify(conExtra), analyzeResponseSchema)
    ).not.toThrow();
  });

  it('rechaza una referencia legal sin lawId', () => {
    // Sin lawId no se puede enlazar el hallazgo al artículo del corpus, que
    // es justo lo que distingue este producto de un resumen genérico.
    const malo = {
      ...analisisValido,
      lawReferences: [{ codeName: 'Ley 820 de 2003', article: '18' }],
    };
    expect(() =>
      parseJsonResponse(JSON.stringify(malo), analyzeResponseSchema)
    ).toThrow(/lawId/);
  });

  it('acepta un análisis sin partes ni referencias legales', () => {
    const minimo = {
      summary: 'Resumen.',
      score: 50,
      clauses: [],
    };
    expect(() =>
      parseJsonResponse(JSON.stringify(minimo), analyzeResponseSchema)
    ).not.toThrow();
  });
});

describe('esquema de riesgos', () => {
  const riesgosValido = {
    summary: 'Tres riesgos relevantes, uno crítico.',
    score: 45,
    risks: [
      {
        level: 'high',
        title: 'Cláusula de terminación unilateral sin preaviso',
        description: 'Permite al arrendador terminar sin aviso previo.',
        excerpt: 'El arrendador podrá dar por terminado el contrato en cualquier momento.',
      },
    ],
  };

  it('valida una respuesta de riesgos correcta', () => {
    const resultado = parseJsonResponse(
      JSON.stringify(riesgosValido),
      risksResponseSchema
    );
    expect(resultado.risks).toHaveLength(1);
    expect(resultado.score).toBe(45);
  });

  it('rechaza un nivel que no está en el enum', () => {
    const malo = {
      ...riesgosValido,
      risks: [{ ...riesgosValido.risks[0], level: 'catastrófico' }],
    };
    expect(() => parseJsonResponse(JSON.stringify(malo), risksResponseSchema)).toThrow();
  });

  it('rechaza un riesgo sin la cita textual que lo respalda', () => {
    // `excerpt` es obligatorio a propósito: un riesgo sin el fragmento del
    // contrato que lo sustenta no es auditable por el usuario.
    const sinCita = { ...riesgosValido.risks[0] } as Record<string, unknown>;
    delete sinCita.excerpt;
    expect(() =>
      parseJsonResponse(
        JSON.stringify({ ...riesgosValido, risks: [sinCita] }),
        risksResponseSchema
      )
    ).toThrow(/excerpt/);
  });

  it('rechaza un score fuera del rango 0-100', () => {
    expect(() =>
      parseJsonResponse(
        JSON.stringify({ ...riesgosValido, score: 140 }),
        risksResponseSchema
      )
    ).toThrow(/score/);
  });

  it('acepta una lista de riesgos vacía (contrato limpio)', () => {
    expect(() =>
      parseJsonResponse(
        JSON.stringify({ summary: 'Sin riesgos relevantes.', score: 95, risks: [] }),
        risksResponseSchema
      )
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Campos de profundidad (veredicto, impacto, redaccion sugerida).
//
// Todos son opcionales en el esquema aunque el prompt los exija: si el modelo
// se salta uno en una clausula de doce, preferimos guardar el analisis
// incompleto a perderlo entero. Estas pruebas fijan ese comportamiento, que
// es el que de verdad decide si un analisis llega al usuario o se cae.
// ─────────────────────────────────────────────────────────────────────────
describe('campos de profundidad', () => {
  it('trata null como campo ausente en vez de fallar', () => {
    const resultado = parseJsonResponse(
      JSON.stringify({
        ...analisisValido,
        favorability: null,
        clauses: [
          {
            title: 'Canon de arrendamiento',
            content: 'El canon mensual será de $2.000.000.',
            importance: 'high',
            meaning: null,
            assessment: null,
            excerpt: null,
          },
        ],
      }),
      analyzeResponseSchema
    );

    expect(resultado.clauses[0]?.meaning).toBeUndefined();
    expect(resultado.clauses[0]?.assessment).toBeUndefined();
    expect(resultado.favorability).toBeUndefined();
  });

  it('guarda el veredicto completo cuando el modelo lo devuelve', () => {
    const resultado = parseJsonResponse(
      JSON.stringify({
        ...analisisValido,
        favorability: {
          verdict: 'muy_desfavorable',
          forWhom: 'el arrendador',
          rationale: 'La terminación unilateral y la multa recaen solo en el arrendatario.',
        },
        clauses: [
          {
            title: 'Terminación',
            content: 'El arrendador puede terminar en cualquier momento.',
            importance: 'high',
            meaning: 'Te pueden sacar con 0 días de aviso.',
            assessment: 'abusiva',
          },
        ],
      }),
      analyzeResponseSchema
    );

    expect(resultado.favorability?.verdict).toBe('muy_desfavorable');
    expect(resultado.clauses[0]?.assessment).toBe('abusiva');
    expect(resultado.clauses[0]?.meaning).toMatch(/0 días/);
  });

  it('degrada a neutro un veredicto que el modelo se invente', () => {
    const resultado = parseJsonResponse(
      JSON.stringify({
        ...analisisValido,
        favorability: { verdict: 'catastrofico', forWhom: 'nadie', rationale: 'x' },
        clauses: [
          {
            title: 'Canon',
            content: 'El canon mensual será de $2.000.000.',
            importance: 'low',
            assessment: 'leonina',
          },
        ],
      }),
      analyzeResponseSchema
    );

    // Un valor fuera del enum no puede tumbar el analisis entero, pero
    // tampoco puede inventarse un juicio: cae al valor neutro.
    expect(resultado.favorability?.verdict).toBe('equilibrado');
    expect(resultado.clauses[0]?.assessment).toBe('estandar');
  });

  it('acepta un riesgo sin impacto ni redacción sugerida', () => {
    const resultado = parseJsonResponse(
      JSON.stringify({
        summary: 'Un riesgo menor.',
        score: 88,
        risks: [
          {
            level: 'low',
            title: 'Gastos notariales compartidos',
            description: 'Es lo acostumbrado.',
            excerpt: 'por partes iguales',
            impact: null,
            recommendation: null,
            suggestedWording: null,
          },
        ],
      }),
      risksResponseSchema
    );

    expect(resultado.risks[0]?.impact).toBeUndefined();
    expect(resultado.risks[0]?.recommendation).toBeUndefined();
  });

  it('conserva impacto y redacción sugerida cuando vienen', () => {
    const resultado = parseJsonResponse(
      JSON.stringify({
        summary: 'Un riesgo alto.',
        score: 40,
        risks: [
          {
            level: 'high',
            title: 'Cláusula penal desproporcionada',
            description: 'La pena del 20 % opera solo contra el comprador.',
            excerpt: 'veinte por ciento (20%)',
            impact: 'Perderías $84.000.000 sobre un precio de $420.000.000.',
            recommendation: 'Pide que la cuota inicial vaya a una fiducia.',
            suggestedWording: 'La cuota inicial se consignará en un encargo fiduciario.',
          },
        ],
      }),
      risksResponseSchema
    );

    expect(resultado.risks[0]?.impact).toMatch(/84\.000\.000/);
    expect(resultado.risks[0]?.suggestedWording).toMatch(/fiduciario/);
  });

  it('descarta un null suelto dentro de un arreglo', () => {
    const resultado = parseJsonResponse(
      JSON.stringify({
        ...analisisValido,
        parties: ['Arrendador S.A.S.', null, 'Juan Pérez'],
      }),
      analyzeResponseSchema
    );

    expect(resultado.parties).toEqual(['Arrendador S.A.S.', 'Juan Pérez']);
  });
});
