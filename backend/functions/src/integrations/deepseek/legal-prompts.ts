import type { LegalContext } from '@clausum/shared';
import { SYSTEM_BASE } from './prompts';

export const SYSTEM_LEGAL = `${SYSTEM_BASE}

CONTEXTO JURÍDICO (RAG)
- Cuando haya artículos en CONTEXTO JURÍDICO, úsalos como referencia principal.
- El campo "lawId" DEBE coincidir EXACTAMENTE con el id entre corchetes [id] del listado (ej. si ves "[co_cst_art_123]", lawId = "co_cst_art_123").
- Solo cita un artículo si aplica directamente a la cláusula o riesgo analizado.
- Si un artículo del listado no aplica, no lo cites.
- Si el contexto jurídico está vacío:
  * Analiza con prudencia general a partir del contrato.
  * NO cites leyes de Colombia ni de otros países salvo las mencionadas literalmente en el contrato.
  * "lawReferences" debe ser [] en raíz y en cada ítem, salvo leyes citadas en el propio contrato.
- NUNCA inventes artículos, códigos, números de artículo ni jurisprudencia.`;

const ANALYSIS_METHODOLOGY = `METODOLOGÍA DE ANÁLISIS
1. Identifica tipo de contrato, partes y objeto principal.
2. Extrae metadata solo si aparece de forma explícita (fechas, valor, jurisdicción, renovación).
3. Descompón el contrato en cláusulas sustantivas. Prioriza, si existen en el texto:
   - Objeto y alcance
   - Precio, pagos y reajustes
   - Plazo, vigencia y terminación
   - Obligaciones de cada parte
   - Confidencialidad y datos personales
   - Propiedad intelectual
   - Responsabilidad, indemnización y limitación de responsabilidad
   - Penalidades e intereses moratorios
   - Garantías y seguros
   - Fuerza mayor
   - Resolución de disputas y jurisdicción
   - Cesión, subcontratación y no competencia
   - Renovación automática y condiciones de salida
4. Incluye entre 5 y 15 cláusulas. Omite las que no aparezcan; no rellenes con genéricos.
5. "importance":
   - high: afecta dinero, plazo, terminación unilateral, responsabilidad o derechos esenciales
   - medium: obligaciones operativas relevantes pero menos críticas
   - low: formalidades, definiciones o cláusulas accesorias

RÚBRICA "score" (análisis: claridad y equilibrio, 0–100)
- 90–100: redacción clara, obligaciones balanceadas, pocas ambigüedades
- 70–89: usable con algunas zonas grises o leve desequilibrio
- 50–69: ambigüedades relevantes o desequilibrio notable entre partes
- 30–49: vacíos importantes, cláusulas potencialmente leoninas o muy confusas
- 0–29: texto muy incompleto, ilegible o gravemente desfavorable/desbalanceado
Califica con el contrato en la mano; no infles el score por defecto.`;

const ANALYSIS_EXTRA_RULES = `REGLAS ADICIONALES (análisis)
- "parties": nombres o roles tal como aparecen (persona natural/jurídica, arrendador/arrendatario, etc.).
- "summary": 2–4 párrafos. Párrafo 1 = qué es y quién participa; 2 = obligaciones clave; 3 = plazos/pagos; 4 (opcional) = puntos de atención general sin repetir el listado de riesgos.
- "lawReferences" global: solo artículos del contexto que apliquen al contrato en general (máx. 5).
- En cada cláusula, "lawReferences" solo si hay artículo del contexto directamente aplicable.`;

const RISKS_METHODOLOGY = `METODOLOGÍA DE RIESGOS
Enfócate en riesgos para quien firma o cumple el contrato (perspectiva prudente del contratista/cliente salvo que el texto indique claramente a favor de la otra parte).

Busca activamente (solo si aparecen o están ausentes de forma relevante):
- Terminación unilateral desbalanceada o sin preaviso razonable
- Penalidades, multas o intereses desproporcionados
- Renuncia amplia a derechos, reclamaciones o garantías legales
- Limitación de responsabilidad one-sided o exclusión total de daños indirectos
- Ambigüedad en alcance, entregables o criterios de aceptación
- Renovación automática con cancelación difícil
- Cesión unilateral de IP o datos sin contraprestación clara
- Cláusulas de no competencia / exclusividad excesivas
- Jurisdicción desfavorable o arbitraje con costos asimétricos
- Vacíos: confidencialidad, protección de datos, SLA, garantías, devolución de anticipos
- Plazos de pago largos o condicionados a requisitos subjetivos

Incluye entre 3 y 12 riesgos materiales. No dupliques la misma cláusula con distinto título.
Si no hay riesgos materiales, devuelve pocos ítems "low" y score alto (cercano a 100).

"level":
- high: exposición económica grave, pérdida de derechos clave o terminación inmediata
- medium: desventaja negociable pero relevante
- low: riesgo menor, formal o de seguimiento

"recommendation": acción concreta (negociar, eliminar, acotar, definir plazo, pedir anexo). Debe ser específica al excerpt citado, no genérica.

RÚBRICA "score" (riesgos: 100 = sin riesgos relevantes)
- 90–100: sin riesgos materiales
- 70–89: riesgos menores o fácilmente negociables
- 50–69: varios riesgos medios o uno alto moderado
- 30–49: riesgos altos o combinación de varios medios graves
- 0–29: múltiples riesgos altos o cláusulas potencialmente abusivas`;

const PRO_UNIFIED_RULES = `RESPUESTA UNIFICADA (Pro)
Devuelve UN solo JSON: { "analysis": {...}, "risks": {...} }

COHERENCIA
- "analysis" describe QUÉ dice el contrato; "risks" evalúa QUÉ puede salir mal.
- No copies la misma cláusula como riesgo con el mismo texto: el riesgo debe explicar el perjuicio.
- Si "analysis.score" es bajo (<60), "risks.score" no debería ser muy alto (>80) salvo motivo claro.
- Usa el mismo criterio de excerpts y lawId en ambas secciones.`;

const COMPARE_METHODOLOGY = `METODOLOGÍA DE COMPARACIÓN
- CONTRATO A y CONTRATO B pueden ser versiones distintas o contratos diferentes del mismo tipo.
- Si una versión parece más reciente (fechas, numeración, "segunda versión"), indícalo en el summary.
- "similarityScore": 100 = prácticamente idénticos; 0 = completamente distintos en lo sustancial.
- En "diff", prioriza cambios MATERIALES (precio, plazo, terminación, responsabilidad, IP, garantías).
- Máximo 8 ítems por categoría (added / removed / changed); omite typos menores.
- "changed": "field" = nombre descriptivo de la cláusula o tema; "before"/"after" = esencia del cambio.
- En el summary indica si los cambios, en conjunto, mejoran o empeoran la posición del contratante (o cuál parte se beneficia si es evidente).
- "lawReferences": artículos del contexto afectados por cambios significativos (máx. 5).
- Si un cambio elimina protecciones o agrega obligaciones desbalanceadas, marca importance/significance "high".`;

const ANALYSIS_JSON_SCHEMA = `{
  "summary": "resumen ejecutivo en 2-4 párrafos",
  "parties": ["parte 1", "parte 2"],
  "metadata": {
    "effectiveDate": "fecha de vigencia si aparece; si no, cadena vacía",
    "contractValue": "valor económico si aparece; si no, cadena vacía",
    "jurisdiction": "jurisdicción o ley aplicable si aparece; si no, cadena vacía",
    "renewal": "condición de renovación si aparece; si no, cadena vacía"
  },
  "score": número del 0 al 100 indicando claridad y equilibrio del contrato,
  "clauses": [
    {
      "title": "nombre de la cláusula",
      "content": "explicación en lenguaje claro",
      "importance": "high" | "medium" | "low",
      "page": número opcional,
      "excerpt": "cita textual breve del contrato",
      "lawReferences": [
        {
          "lawId": "id del artículo en contexto jurídico",
          "article": "número de artículo",
          "codeName": "nombre del código",
          "excerpt": "cita breve del artículo",
          "relevance": "por qué aplica"
        }
      ]
    }
  ],
  "lawReferences": [
    {
      "lawId": "id",
      "article": "número",
      "codeName": "código",
      "relevance": "resumen de aplicación al contrato"
    }
  ]
}`;

const RISKS_JSON_SCHEMA = `{
  "summary": "resumen de riesgos principales",
  "score": número del 0 al 100 (100 = sin riesgos relevantes),
  "risks": [
    {
      "level": "high" | "medium" | "low",
      "title": "título del riesgo",
      "description": "explicación del riesgo",
      "excerpt": "cita textual del contrato",
      "clauseRef": "referencia opcional",
      "recommendation": "qué negociar o revisar",
      "lawReferences": [
        {
          "lawId": "id del artículo",
          "article": "número",
          "codeName": "código",
          "relevance": "norma que podría vulnerarse"
        }
      ]
    }
  ],
  "lawReferences": []
}`;

function formatArticlesBlock(context: LegalContext): string {
  if (!context.articles.length) {
    return `ARTÍCULOS LEGALES RELEVANTES: (ninguno cargado en el sistema para ${context.country} — analiza solo con el texto del contrato y principios generales; NO cites leyes de Colombia ni de otros países salvo las mencionadas explícitamente en el contrato)`;
  }

  const lines = context.articles.map(
    (a) =>
      `- [${a.id}] ${a.codeName} — Art. ${a.article}${a.title ? ` (${a.title})` : ''}\n  ${a.summary ?? a.content.slice(0, 500)}`
  );
  return `ARTÍCULOS LEGALES RELEVANTES:\n${lines.join('\n')}`;
}

function formatContractTypeBlock(context: LegalContext): string {
  if (!context.contractTypeName) {
    return 'TIPO DE CONTRATO: no detectado automáticamente';
  }
  return `TIPO DE CONTRATO: ${context.contractTypeName} (id: ${context.contractTypeId ?? 'n/a'})`;
}

function formatTopicsBlock(context: LegalContext): string {
  if (!context.topics.length) return '';
  const names = context.topics.map((t) => t.name).join(', ');
  return `TEMAS LEGALES DETECTADOS: ${names}`;
}

export function formatLegalContextSection(context: LegalContext): string {
  return [
    '--- CONTEXTO JURÍDICO ---',
    `PAÍS: ${context.country}`,
    formatContractTypeBlock(context),
    formatTopicsBlock(context),
    formatArticlesBlock(context),
    '--- FIN CONTEXTO JURÍDICO ---',
  ]
    .filter(Boolean)
    .join('\n');
}

function formatContractBlock(contractText: string): string {
  return `CONTRATO:
---
${contractText}
---`;
}

export function buildAnalyzePrompt(contractText: string, legalContext: LegalContext): string {
  return `Analiza el siguiente contrato y devuelve JSON con esta estructura exacta:
${ANALYSIS_JSON_SCHEMA}

${ANALYSIS_METHODOLOGY}

${ANALYSIS_EXTRA_RULES}

${formatLegalContextSection(legalContext)}

${formatContractBlock(contractText)}`;
}

export function buildRisksPrompt(contractText: string, legalContext: LegalContext): string {
  return `Detecta riesgos legales en el siguiente contrato. Devuelve JSON con esta estructura exacta:
${RISKS_JSON_SCHEMA}

${RISKS_METHODOLOGY}

Contrasta cada riesgo con el contexto jurídico cuando haya artículos disponibles.

${formatLegalContextSection(legalContext)}

${formatContractBlock(contractText)}`;
}

export function buildProAnalyzePrompt(contractText: string, legalContext: LegalContext): string {
  return `Analiza el siguiente contrato y devuelve UN solo JSON con dos secciones: "analysis" y "risks".

La sección "analysis" debe seguir esta estructura:
${ANALYSIS_JSON_SCHEMA}

La sección "risks" debe seguir esta estructura:
${RISKS_JSON_SCHEMA}

${ANALYSIS_METHODOLOGY}

${ANALYSIS_EXTRA_RULES}

${RISKS_METHODOLOGY}

${PRO_UNIFIED_RULES}

${formatLegalContextSection(legalContext)}

${formatContractBlock(contractText)}`;
}

export function buildComparePrompt(
  textA: string,
  textB: string,
  legalContext: LegalContext
): string {
  return `Compara estos dos contratos o versiones. Devuelve JSON con esta estructura exacta:
{
  "summary": "resumen de diferencias principales",
  "similarityScore": número del 0 al 100,
  "diff": {
    "added": [{ "title": "", "content": "", "importance": "high|medium|low" }],
    "removed": [{ "title": "", "content": "", "importance": "high|medium|low" }],
    "changed": [{ "field": "", "before": "", "after": "", "significance": "high|medium|low" }]
  },
  "lawReferences": []
}

${COMPARE_METHODOLOGY}

${formatLegalContextSection(legalContext)}

CONTRATO A:
---
${textA}
---

CONTRATO B:
---
${textB}
---`;
}
