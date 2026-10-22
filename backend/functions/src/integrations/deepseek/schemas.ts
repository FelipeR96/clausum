import { z } from 'zod';

const importanceSchema = z.enum(['high', 'medium', 'low']);
const riskLevelSchema = z.enum(['high', 'medium', 'low']);

export const lawReferenceSchema = z.object({
  lawId: z.string(),
  article: z.string(),
  codeName: z.string(),
  excerpt: z.string().optional(),
  relevance: z.string().optional(),
});

export const analyzeResponseSchema = z.object({
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
  clauses: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      importance: importanceSchema,
      page: z.number().optional(),
      excerpt: z.string().optional(),
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
      recommendation: z.string().optional(),
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
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `JSON de DeepSeek inválido: ${result.error.errors.map((e) => e.path.join('.')).join(', ')}`
    );
  }
  return result.data;
}
