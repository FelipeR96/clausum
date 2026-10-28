import type {
  Analysis,
  AnalysisFavorability,
  AnalysisMetadata,
  AnalysisRisk,
} from '../types/analysis.types';
import type { ClauseAssessment, Importance, RiskLevel } from '../types/common.types';

/**
 * Lo que ve quien todavia no ha pagado.
 *
 * ── El reparto, y por que esta donde esta ───────────────────────────────
 * Gratis va lo DESCRIPTIVO: que tipo de contrato es, que dice en resumen,
 * a quien favorece, cuantos riesgos hay y de que nivel, y de cada riesgo su
 * titulo y la CITA TEXTUAL del propio documento.
 *
 * Se cobra lo que es JUICIO Y ACCION: en que consiste cada riesgo, que te
 * pasa si se aplica, que pedir y con que redaccion pedirlo.
 *
 * La cita es la pieza clave y conviene no quitarla para "dar menos". Es
 * texto del documento que la persona acaba de subir, asi que no se le esta
 * regalando nada que no tenga; lo que hace es demostrar que leimos SU
 * contrato y no que le estamos ensenando una plantilla. Un difuminado no
 * demuestra eso: debajo podria no haber nada. Para una marca que nadie
 * conoce, ese es el problema de conversion real.
 *
 * ── La propiedad que no se puede romper ─────────────────────────────────
 * Este objeto viaja al navegador. Todo lo que entre aqui es publico, por
 * mucho que la pantalla lo pinte borroso. Si alguien anade un campo de los
 * de pago a este tipo, el muro deja de existir sin que nadie lo note.
 * Por eso la prueba principal serializa la vista previa entera y comprueba
 * que ningun texto de pago aparece dentro.
 */

/**
 * Campos de un riesgo que NO viajan sin pagar.
 *
 * Se indexan directamente contra AnalysisRisk, sin cast: asi el compilador
 * comprueba que estos nombres existen de verdad en el tipo. Si manana
 * alguien renombra "impact", esto deja de compilar en vez de dejar un campo
 * de pago sin bloquear.
 */
export const CAMPOS_RIESGO_DE_PAGO = [
  'description',
  'impact',
  'recommendation',
  'suggestedWording',
] as const;

/** Campos de una clausula que NO viajan sin pagar. */
export const CAMPOS_CLAUSULA_DE_PAGO = ['content', 'meaning', 'excerpt'] as const;

export type PreviewRisk = {
  level: RiskLevel;
  title: string;
  /** Cita textual del contrato. Vacia si el analisis no la trajo. */
  excerpt: string;
  /** Que queda detras del muro, por nombre, para pintarlo bloqueado. */
  locked: readonly string[];
};

export type PreviewClause = {
  title: string;
  importance: Importance;
  /** Habitual, en tu contra o posiblemente abusiva. Ausente en analisis viejos. */
  assessment?: ClauseAssessment;
};

export type RiskCounts = {
  high: number;
  medium: number;
  low: number;
};

export type SingleAnalysisPreview = {
  summary: string;
  /** Indice de claridad. Mide como esta redactado, no si conviene. */
  score?: number;
  /** A quien favorece el contrato. Es el titular real del informe. */
  favorability?: AnalysisFavorability;
  parties?: string[];
  metadata?: AnalysisMetadata;
  country?: string;
  contractTypeId?: string;
  riskCounts: RiskCounts;
  risks: PreviewRisk[];
  clauses: PreviewClause[];
  totalClauses: number;
  /** Cuantos riesgos quedan por desbloquear. Cero si el contrato esta limpio. */
  lockedRiskCount: number;
};

function contarPorNivel(risks: AnalysisRisk[]): RiskCounts {
  const cuenta: RiskCounts = { high: 0, medium: 0, low: 0 };
  for (const r of risks) {
    if (r.level === 'high' || r.level === 'medium' || r.level === 'low') {
      cuenta[r.level] += 1;
    }
  }
  return cuenta;
}

const ORDEN_NIVEL = { high: 0, medium: 1, low: 2 } as const;

const tieneTexto = (valor: string | undefined): boolean =>
  typeof valor === 'string' && valor.trim().length > 0;

/**
 * Arma lo que se le muestra a quien no ha pagado.
 *
 * Construye un objeto nuevo campo por campo en vez de copiar y borrar. La
 * diferencia importa: con `delete` sobre una copia, un campo nuevo en el
 * analisis se cuela solo en la vista previa. Asi, un campo nuevo hay que
 * anadirlo aqui a proposito para que salga.
 */
export function buildSingleAnalysisPreview(input: {
  analysis: Analysis;
  risks?: AnalysisRisk[];
}): SingleAnalysisPreview {
  const { analysis } = input;
  const risks = input.risks ?? [];

  const ordenados = [...risks].sort(
    (a, b) => (ORDEN_NIVEL[a.level] ?? 3) - (ORDEN_NIVEL[b.level] ?? 3)
  );

  return {
    summary: analysis.summary ?? '',
    score: analysis.score,
    favorability: analysis.favorability,
    parties: analysis.parties,
    metadata: analysis.metadata,
    country: analysis.country,
    contractTypeId: analysis.contractTypeId,
    riskCounts: contarPorNivel(risks),
    risks: ordenados.map((r) => ({
      level: r.level,
      title: r.title,
      excerpt: r.excerpt ?? '',
      locked: CAMPOS_RIESGO_DE_PAGO.filter((campo) => tieneTexto(r[campo])),
    })),
    clauses: (analysis.clauses ?? []).map((c) => ({
      title: c.title,
      importance: c.importance,
      assessment: c.assessment,
    })),
    totalClauses: (analysis.clauses ?? []).length,
    lockedRiskCount: risks.length,
  };
}
