import { describe, expect, it } from 'vitest';
import {
  buildSingleAnalysisPreview,
  CAMPOS_CLAUSULA_DE_PAGO,
  CAMPOS_RIESGO_DE_PAGO,
} from './single-analysis';
import type { Analysis, AnalysisRisk } from '../types/analysis.types';

// ─────────────────────────────────────────────────────────────────────────
// Este objeto viaja al navegador. Todo lo que entre aqui es publico, por
// mucho que la pantalla lo pinte borroso: basta abrir las herramientas del
// navegador. Si alguien anade un campo de pago al tipo de la vista previa,
// el muro deja de existir sin que nadie lo note en la pantalla.
//
// De ahi la prueba principal: cada campo de pago lleva una cadena centinela
// unica, y se comprueba que NINGUNA aparece en la vista previa serializada.
// Un campo nuevo que se cuele la rompe sin que haya que acordarse de nada.
// ─────────────────────────────────────────────────────────────────────────

/** Textos que solo existen detras del muro. Si se ven, el muro fallo. */
const SECRETOS = {
  // Los tres que se escapaban enteros antes de que alguien mirara la
  // pantalla: el titulo ES el diagnostico en tres palabras, el motivo del
  // veredicto llegaba a nombrar las clausulas por su numero, y el resumen
  // ejecutivo cuenta de que va el contrato senalando de paso lo que esta mal.
  riesgoTitulo: 'CENTINELA_TITULO_DEL_RIESGO',
  veredictoPorque: 'CENTINELA_RAZON_DEL_VEREDICTO',
  resumenEjecutivo: 'CENTINELA_RESUMEN_EJECUTIVO',
  riesgoDescripcion: 'CENTINELA_DESCRIPCION_DEL_RIESGO',
  riesgoImpacto: 'CENTINELA_IMPACTO_CONCRETO',
  riesgoRecomendacion: 'CENTINELA_QUE_PEDIR',
  riesgoRedaccion: 'CENTINELA_REDACCION_SUGERIDA',
  clausulaContenido: 'CENTINELA_QUE_DICE_LA_CLAUSULA',
  clausulaSignificado: 'CENTINELA_QUE_IMPLICA_PARA_TI',
  clausulaCita: 'CENTINELA_CITA_DE_CLAUSULA',
} as const;

/** Textos que si deben verse sin pagar. */
const PUBLICOS = {
  descripcion: 'PUBLICO_DESCRIPCION_SIN_JUICIO',
  citaRiesgo: 'PUBLICO_CITA_DEL_CONTRATO',
  tituloClausula: 'PUBLICO_TITULO_DE_CLAUSULA',
  favoreceA: 'PUBLICO_EL_ARRENDADOR',
} as const;

function riesgo(over: Partial<AnalysisRisk> = {}): AnalysisRisk {
  return {
    level: 'high',
    title: SECRETOS.riesgoTitulo,
    description: SECRETOS.riesgoDescripcion,
    excerpt: PUBLICOS.citaRiesgo,
    impact: SECRETOS.riesgoImpacto,
    recommendation: SECRETOS.riesgoRecomendacion,
    suggestedWording: SECRETOS.riesgoRedaccion,
    ...over,
  };
}

function analisis(over: Partial<Analysis> = {}): Analysis {
  return {
    userId: 'u1',
    contractId: 'c1',
    mode: 'analyze',
    status: 'done',
    createdAt: new Date(),
    overview: PUBLICOS.descripcion,
    summary: SECRETOS.resumenEjecutivo,
    score: 65,
    favorability: {
      verdict: 'desfavorable',
      forWhom: PUBLICOS.favoreceA,
      rationale: SECRETOS.veredictoPorque,
    },
    parties: ['Arrendador S.A.S.', 'Juan Pérez'],
    country: 'CO',
    contractTypeId: 'arrendamiento',
    clauses: [
      {
        title: PUBLICOS.tituloClausula,
        content: SECRETOS.clausulaContenido,
        importance: 'high',
        assessment: 'desfavorable',
        meaning: SECRETOS.clausulaSignificado,
        excerpt: SECRETOS.clausulaCita,
      },
    ],
    ...over,
  } as Analysis;
}

describe('el muro de pago', () => {
  it('no deja escapar NINGUN texto de pago en la vista previa', () => {
    const previa = buildSingleAnalysisPreview({
      analysis: analisis(),
      risks: [riesgo(), riesgo({ level: 'medium' }), riesgo({ level: 'low' })],
    });

    const serializada = JSON.stringify(previa);
    for (const [campo, secreto] of Object.entries(SECRETOS)) {
      expect(serializada, `se filtro ${campo}`).not.toContain(secreto);
    }
  });

  it('distingue la descripcion del resumen ejecutivo', () => {
    // Los dos cuentan de que va el contrato, y por eso es facil confundirlos.
    // La diferencia es que el resumen ejecutivo ademas DIAGNOSTICA --"el valor
    // del canon esta en blanco, lo que genera incertidumbre"-- y eso es lo que
    // se cobra. Si alguien los intercambia, esta prueba lo dice.
    const previa = buildSingleAnalysisPreview({ analysis: analisis(), risks: [] });

    expect(previa.overview).toBe(PUBLICOS.descripcion);
    expect(JSON.stringify(previa)).not.toContain(SECRETOS.resumenEjecutivo);
  });

  it('el veredicto viaja sin su motivo', () => {
    // El motivo llegaba a nombrar las clausulas por su numero. Se copia campo
    // por campo justamente para que no venga de acompanante.
    const previa = buildSingleAnalysisPreview({ analysis: analisis(), risks: [] });

    expect(previa.favorability?.verdict).toBe('desfavorable');
    expect(previa.favorability).not.toHaveProperty('rationale');
    expect(JSON.stringify(previa)).not.toContain(SECRETOS.veredictoPorque);
  });

  it('un campo nuevo en el analisis no se cuela solo', () => {
    // La vista previa se construye campo por campo, no copiando y
    // borrando. Si manana alguien anade "playbook" al analisis, no sale
    // aqui hasta que lo anadan a proposito.
    const conCampoNuevo = {
      ...analisis(),
      playbookSecreto: 'CENTINELA_CAMPO_FUTURO',
    } as unknown as Analysis;

    const previa = buildSingleAnalysisPreview({ analysis: conCampoNuevo, risks: [] });
    expect(JSON.stringify(previa)).not.toContain('CENTINELA_CAMPO_FUTURO');
  });

  it('las clausulas no llevan ni el contenido ni la cita', () => {
    const previa = buildSingleAnalysisPreview({ analysis: analisis(), risks: [] });
    const clausula = previa.clauses[0]!;

    for (const campo of CAMPOS_CLAUSULA_DE_PAGO) {
      expect(clausula, campo).not.toHaveProperty(campo);
    }
    expect(clausula.title).toBe(PUBLICOS.tituloClausula);
    expect(clausula.assessment).toBe('desfavorable');
  });
});

describe('lo que si se ve sin pagar', () => {
  it('muestra la descripcion, el veredicto y de que lado esta', () => {
    const previa = buildSingleAnalysisPreview({ analysis: analisis(), risks: [] });

    expect(previa.overview).toBe(PUBLICOS.descripcion);
    expect(previa.favorability?.verdict).toBe('desfavorable');
    expect(previa.favorability?.forWhom).toBe(PUBLICOS.favoreceA);
    expect(previa.score).toBe(65);
  });

  it('muestra de cada riesgo el nivel y la cita, pero NO el titulo', () => {
    const previa = buildSingleAnalysisPreview({
      analysis: analisis(),
      risks: [riesgo()],
    });
    const r = previa.risks[0]!;

    expect(r.level).toBe('high');
    // El titulo no esta como campo vacio ni como bloqueado: no esta.
    expect(r).not.toHaveProperty('title');
    // La cita es lo que demuestra que leimos SU contrato; sin ella la
    // vista previa no prueba nada y el difuminado tampoco.
    expect(r.excerpt).toBe(PUBLICOS.citaRiesgo);
  });

  it('cuenta los riesgos por nivel', () => {
    const previa = buildSingleAnalysisPreview({
      analysis: analisis(),
      risks: [
        riesgo({ level: 'high' }),
        riesgo({ level: 'high' }),
        riesgo({ level: 'medium' }),
        riesgo({ level: 'low' }),
      ],
    });

    expect(previa.riskCounts).toEqual({ high: 2, medium: 1, low: 1 });
    expect(previa.lockedRiskCount).toBe(4);
  });

  it('ordena los riesgos de mas grave a menos', () => {
    const previa = buildSingleAnalysisPreview({
      analysis: analisis(),
      risks: [riesgo({ level: 'low' }), riesgo({ level: 'high' }), riesgo({ level: 'medium' })],
    });

    expect(previa.risks.map((r) => r.level)).toEqual(['high', 'medium', 'low']);
  });

  it('dice que campos quedan bloqueados, para poder pintarlos', () => {
    const previa = buildSingleAnalysisPreview({
      analysis: analisis(),
      risks: [riesgo()],
    });

    expect(previa.risks[0]!.locked).toEqual([...CAMPOS_RIESGO_DE_PAGO]);
  });

  it('no anuncia como bloqueado un campo que el analisis no trajo', () => {
    // Prometer "redaccion sugerida" y que al pagar no exista seria peor
    // que no ofrecerla.
    const previa = buildSingleAnalysisPreview({
      analysis: analisis(),
      risks: [riesgo({ suggestedWording: undefined, impact: '   ' })],
    });

    expect(previa.risks[0]!.locked).toEqual(['description', 'recommendation']);
  });
});

describe('analisis incompletos o viejos', () => {
  it('aguanta un analisis sin veredicto ni evaluacion de clausulas', () => {
    const viejo = analisis({
      favorability: undefined,
      clauses: [{ title: PUBLICOS.tituloClausula, content: SECRETOS.clausulaContenido, importance: 'low' }],
    });

    const previa = buildSingleAnalysisPreview({ analysis: viejo, risks: [] });
    expect(previa.favorability).toBeUndefined();
    expect(previa.clauses[0]!.assessment).toBeUndefined();
    expect(JSON.stringify(previa)).not.toContain(SECRETOS.clausulaContenido);
  });

  it('aguanta un contrato sin riesgos', () => {
    const previa = buildSingleAnalysisPreview({ analysis: analisis(), risks: [] });
    expect(previa.riskCounts).toEqual({ high: 0, medium: 0, low: 0 });
    expect(previa.risks).toEqual([]);
    expect(previa.lockedRiskCount).toBe(0);
  });

  it('aguanta que no le pasen riesgos en absoluto', () => {
    const previa = buildSingleAnalysisPreview({ analysis: analisis() });
    expect(previa.risks).toEqual([]);
  });

  it('aguanta un analisis sin descripcion', () => {
    const previa = buildSingleAnalysisPreview({
      analysis: analisis({ overview: undefined }),
      risks: [],
    });
    // Vacio y no el resumen ejecutivo: ante la duda se enseña menos.
    expect(previa.overview).toBe('');
  });

  it('aguanta un riesgo sin cita', () => {
    const previa = buildSingleAnalysisPreview({
      analysis: analisis(),
      risks: [riesgo({ excerpt: undefined as unknown as string })],
    });
    expect(previa.risks[0]!.excerpt).toBe('');
  });
});
