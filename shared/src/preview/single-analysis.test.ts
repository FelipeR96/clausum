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
  resumen: 'PUBLICO_RESUMEN_EJECUTIVO',
  tituloRiesgo: 'PUBLICO_TITULO_DEL_RIESGO',
  citaRiesgo: 'PUBLICO_CITA_DEL_CONTRATO',
  tituloClausula: 'PUBLICO_TITULO_DE_CLAUSULA',
  favoreceA: 'PUBLICO_EL_ARRENDADOR',
  porque: 'PUBLICO_RAZON_DEL_VEREDICTO',
} as const;

function riesgo(over: Partial<AnalysisRisk> = {}): AnalysisRisk {
  return {
    level: 'high',
    title: PUBLICOS.tituloRiesgo,
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
    summary: PUBLICOS.resumen,
    score: 65,
    favorability: {
      verdict: 'desfavorable',
      forWhom: PUBLICOS.favoreceA,
      rationale: PUBLICOS.porque,
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
  it('muestra el resumen, el veredicto y de que lado esta', () => {
    const previa = buildSingleAnalysisPreview({ analysis: analisis(), risks: [] });

    expect(previa.summary).toBe(PUBLICOS.resumen);
    expect(previa.favorability?.verdict).toBe('desfavorable');
    expect(previa.favorability?.forWhom).toBe(PUBLICOS.favoreceA);
    expect(previa.favorability?.rationale).toBe(PUBLICOS.porque);
    expect(previa.score).toBe(65);
  });

  it('muestra de cada riesgo el nivel, el titulo y la cita del contrato', () => {
    const previa = buildSingleAnalysisPreview({
      analysis: analisis(),
      risks: [riesgo()],
    });
    const r = previa.risks[0]!;

    expect(r.level).toBe('high');
    expect(r.title).toBe(PUBLICOS.tituloRiesgo);
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

  it('aguanta un analisis sin resumen', () => {
    const previa = buildSingleAnalysisPreview({
      analysis: analisis({ summary: undefined }),
      risks: [],
    });
    expect(previa.summary).toBe('');
  });

  it('aguanta un riesgo sin cita', () => {
    const previa = buildSingleAnalysisPreview({
      analysis: analisis(),
      risks: [riesgo({ excerpt: undefined as unknown as string })],
    });
    expect(previa.risks[0]!.excerpt).toBe('');
  });
});
