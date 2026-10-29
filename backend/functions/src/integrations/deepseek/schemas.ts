import { z } from 'zod';

const importanceSchema = z.enum(['high', 'medium', 'low']);
const riskLevelSchema = z.enum(['high', 'medium', 'low']);

// Los campos de profundidad van OPCIONALES a proposito. Lo que obliga al
// modelo a llenarlos es el prompt, no el esquema; el esquema solo decide si
// un analisis por lo demas bueno se tira a la basura porque falto "meaning"
// en una clausula de doce. Preferimos guardarlo incompleto que perderlo.
//
// Los enums llevan .catch() por lo mismo: un valor que el modelo se invente
// degrada a neutro en vez de reventar el analisis completo.
//
// Y los null NO se tratan campo por campo: se quitan del JSON entero antes
// de validar, en parseJsonResponse. Ver el comentario de quitarNulos.
const clauseAssessmentSchema = z
  .enum(['estandar', 'desfavorable', 'abusiva'])
  .catch('estandar');

const favorabilitySchema = z.object({
  verdict: z
    .enum(['favorable', 'equilibrado', 'desfavorable', 'muy_desfavorable'])
    .catch('equilibrado'),
  forWhom: z.string().optional(),
  rationale: z.string().optional(),
});

export const lawReferenceSchema = z.object({
  lawId: z.string(),
  article: z.string(),
  codeName: z.string(),
  excerpt: z.string().optional(),
  relevance: z.string().optional(),
});

export const analyzeResponseSchema = z.object({
  // Opcional porque los analisis anteriores a la compra sin cuenta no lo
  // traen. Si falta, la vista previa se queda sin la descripcion y enseña
  // menos: fallar hacia contar de menos es la unica direccion segura en un
  // campo que existe para decidir que se regala.
  overview: z.string().optional(),
  summary: z.string().min(1),
  parties: z.array(z.string()).optional(),
  metadata: z
    .object({
      effectiveDate: z.string().optional(),
      contractValue: z.string().optional(),
      jurisdiction: z.string().optional(),
      renewal: z.string().optional(),
    })
    .optional(),
  score: z.number().min(0).max(100),
  favorability: favorabilitySchema.optional(),
  clauses: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      importance: importanceSchema,
      page: z.number().optional(),
      excerpt: z.string().optional(),
      meaning: z.string().optional(),
      assessment: clauseAssessmentSchema.optional(),
      lawReferences: z.array(lawReferenceSchema).optional(),
    })
  ),
  lawReferences: z.array(lawReferenceSchema).optional(),
});

export const risksResponseSchema = z.object({
  summary: z.string().min(1),
  score: z.number().min(0).max(100),
  risks: z.array(
    z.object({
      level: riskLevelSchema,
      title: z.string(),
      description: z.string(),
      excerpt: z.string(),
      clauseRef: z.string().optional(),
      impact: z.string().optional(),
      recommendation: z.string().optional(),
      suggestedWording: z.string().optional(),
      lawReferences: z.array(lawReferenceSchema).optional(),
    })
  ),
  lawReferences: z.array(lawReferenceSchema).optional(),
});

/** Pro: análisis contractual + perfil de riesgo en una sola respuesta. */
export const proAnalyzeResponseSchema = z.object({
  analysis: analyzeResponseSchema,
  risks: risksResponseSchema,
});

export const compareResponseSchema = z.object({
  summary: z.string().min(1),
  similarityScore: z.number().min(0).max(100),
  diff: z.object({
    added: z.array(
      z.object({
        title: z.string(),
        content: z.string(),
        importance: importanceSchema,
        lawReferences: z.array(lawReferenceSchema).optional(),
      })
    ),
    removed: z.array(
      z.object({
        title: z.string(),
        content: z.string(),
        importance: importanceSchema,
        lawReferences: z.array(lawReferenceSchema).optional(),
      })
    ),
    changed: z.array(
      z.object({
        field: z.string(),
        before: z.string(),
        after: z.string(),
        significance: importanceSchema,
      })
    ),
  }),
  lawReferences: z.array(lawReferenceSchema).optional(),
});

export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
export type RisksResponse = z.infer<typeof risksResponseSchema>;
export type ProAnalyzeResponse = z.infer<typeof proAnalyzeResponseSchema>;
export type CompareResponse = z.infer<typeof compareResponseSchema>;

/**
 * Quita los null del JSON del modelo, tratandolos como "campo ausente".
 *
 * Los modelos devuelven null cuando quieren decir "no aplica", y null no pasa
 * por .optional(): un null en un campo accesorio tumbaba el analisis entero.
 * Esto se resuelve en un solo sitio y no campo por campo, por dos razones:
 * los .optional() quedan planos (sin transforms cuya inferencia de tipo haya
 * que pelear), y la proteccion cubre TODOS los campos del esquema, incluidos
 * los que ya existian (clauseRef, page, relevance, los de metadata) y los que
 * se agreguen despues sin acordarse de este problema.
 *
 * Ninguno de los esquemas usa .nullable(), asi que no hay campo para el que
 * null sea un valor legitimo que esto estropee.
 */
function quitarNulos(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    // Un null suelto dentro de un arreglo tampoco pasa el esquema del
    // elemento, asi que se descarta en vez de dejarlo romper el arreglo.
    return valor.filter((v) => v !== null).map(quitarNulos);
  }
  if (valor !== null && typeof valor === 'object') {
    const limpio: Record<string, unknown> = {};
    for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
      if (v === null) continue;
      limpio[clave] = quitarNulos(v);
    }
    return limpio;
  }
  return valor;
}

export function parseJsonResponse<T>(
  raw: string,
  schema: z.ZodSchema<T>
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Sin una pista, este error no distingue "el modelo se corto" de "algo
    // corrompio el texto al reinsertar los datos personales". Se informa la
    // FORMA, nunca el contenido: la respuesta ya lleva nombres y cedulas
    // restaurados y no puede acabar en los registros.
    const abiertas = (raw.match(/\{/g) ?? []).length;
    const cerradas = (raw.match(/\}/g) ?? []).length;
    throw new Error(
      `DeepSeek no devolvió JSON válido (${raw.length} caracteres, ` +
        `llaves ${abiertas} abiertas / ${cerradas} cerradas` +
        `${abiertas !== cerradas ? ', parece cortado a la mitad' : ''})`
    );
  }
  const result = schema.safeParse(quitarNulos(parsed));
  if (!result.success) {
    throw new Error(
      `JSON de DeepSeek inválido: ${result.error.errors.map((e) => e.path.join('.')).join(', ')}`
    );
  }
  return result.data;
}
