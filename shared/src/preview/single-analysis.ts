import type { Analysis, AnalysisMetadata, AnalysisRisk } from '../types/analysis.types';
import type {
  ClauseAssessment,
  FavorabilityVerdict,
  Importance,
  RiskLevel,
} from '../types/common.types';

/**
 * Lo que ve quien todavia no ha pagado.
 *
 * ── El reparto: se SENALA, no se DIAGNOSTICA ───────────────────────────
 * Gratis va lo que dice QUE hay delante: que tipo de contrato es, a quien
 * favorece, cuantos riesgos hay y de que nivel, y la CITA TEXTUAL de cada
 * clausula marcada.
 *
 * Se cobra todo lo que explica: como se llama el problema, en que consiste,
 * que te pasa si se aplica, que pedir y con que redaccion pedirlo.
 *
 * La cita se queda, y conviene no quitarla para "dar menos". Es texto del
 * documento que la persona acaba de subir, asi que no se le regala nada que
 * no tenga; lo que hace es demostrar que leimos SU contrato y no ensenarle
 * una plantilla. Un difuminado no demuestra eso: debajo podria no haber
 * nada. Para una marca que nadie conoce, ese es el problema de conversion
 * real.
 *
 * ── Los tres campos que se escapaban ────────────────────────────────────
 * La primera version clasificaba con cuidado los campos de los riesgos y de
 * las clausulas, y dejaba pasar enteros el RESUMEN EJECUTIVO, el MOTIVO del
 * veredicto y el TITULO de cada riesgo. Los tres diagnostican:
 *
 *  - El resumen cuenta de que va el contrato y de paso senala lo que esta
 *    mal ("el valor del canon esta en blanco, lo que genera incertidumbre").
 *    Por eso existe `overview`, que describe sin juzgar.
 *  - El motivo del veredicto llegaba a nombrar las clausulas por su numero
 *    ("la renuncia a la constitucion en mora (novena)").
 *  - El titulo del riesgo ES el diagnostico en tres palabras: "Renuncia a la
 *    constitucion en mora" dice que buscar y como se llama.
 *
 * El muro era solido donde se reviso y transparente donde nadie miro. La
 * leccion esta en la forma de este archivo: se construye campo por campo y
 * lo que no se nombra, no viaja.
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

/**
 * Campos que NO viajan y que tampoco se anuncian como bloqueados.
 *
 * Estan aparte de CAMPOS_RIESGO_DE_PAGO porque esa lista alimenta las
 * etiquetas que se pintan con candado, y un candado sobre el titulo seria
 * raro: el candado va sobre lo que explica el riesgo, no sobre su nombre.
 * Esta lista existe para que las pruebas puedan comprobarlos y para que
 * quede escrito que su ausencia es deliberada.
 */
export const CAMPOS_RIESGO_OCULTOS = ['title'] as const;

/** Campos de una clausula que NO viajan sin pagar. */
export const CAMPOS_CLAUSULA_DE_PAGO = ['content', 'meaning', 'excerpt'] as const;

/**
 * Un riesgo sin su titulo, a proposito.
 *
 * El titulo no esta como campo bloqueado: no esta en absoluto. Un campo que
 * no existe en el tipo no se puede rellenar por descuido, que es mas fuerte
 * que acordarse de borrarlo.
 */
export type PreviewRisk = {
  level: RiskLevel;
  /** Cita textual del contrato. Vacia si el analisis no la trajo. */
  excerpt: string;
  /** Que queda detras del muro, por nombre, para pintarlo bloqueado. */
  locked: readonly string[];
};

/**
 * El veredicto sin su motivo.
 *
 * El veredicto en si --a quien favorece-- es lo que la persona vino a saber
 * y se regala. El motivo explica POR QUE, nombrando las clausulas que lo
 * sostienen, y eso es el informe.
 */
export type PreviewVerdict = {
  verdict: FavorabilityVerdict;
  forWhom?: string;
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
  /** Que ES el contrato, sin juicio. Nunca el resumen ejecutivo. */
  overview: string;
  /** Indice de claridad. Mide como esta redactado, no si conviene. */
  score?: number;
  /** A quien favorece el contrato. Es el titular real del informe. */
  favorability?: PreviewVerdict;
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

  const fav = analysis.favorability;

  return {
    // overview y NO summary. El resumen ejecutivo diagnostica.
    overview: analysis.overview ?? '',
    score: analysis.score,
    // Campo por campo: copiar el objeto entero traeria el motivo.
    favorability: fav ? { verdict: fav.verdict, forWhom: fav.forWhom } : undefined,
    parties: analysis.parties,
    metadata: analysis.metadata,
    country: analysis.country,
    contractTypeId: analysis.contractTypeId,
    riskCounts: contarPorNivel(risks),
    risks: ordenados.map((r) => ({
      level: r.level,
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
