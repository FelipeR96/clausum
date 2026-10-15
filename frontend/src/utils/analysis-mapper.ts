import type { Analysis, Contract, FirestoreDate, Importance, LawReference } from '@clausum/shared';
import { CONTRACT_TYPE_CATALOG } from '@clausum/shared';
import type {
  AnalysisClauseItem,
  AnalysisResultData,
  ClauseSeverity,
} from '@/types/analysis-view.types';

const COUNTRY_LABELS: Record<string, string> = {
  CO: 'Colombia',
  MX: 'México',
  ES: 'España',
  CL: 'Chile',
  PE: 'Perú',
  AR: 'Argentina',
  BR: 'Brasil',
  US: 'Estados Unidos',
};

function toDate(value: FirestoreDate | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'seconds' in value) {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === 'object' && '_seconds' in value) {
    return new Date((value as { _seconds: number })._seconds * 1000);
  }
  return null;
}

function formatRelativeDate(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'hace unos minutos';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays} días`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatLawReference(ref: LawReference): string {
  const article = ref.article ? `, art. ${ref.article}` : '';
  return `${ref.codeName}${article}`;
}

function mapImportanceToSeverity(importance: Importance): ClauseSeverity {
  if (importance === 'high') return 'critical';
  if (importance === 'medium') return 'moderate';
  return 'standard';
}

function mapContractTypeLabel(contract: Contract): string {
  const typeId = contract.detectedContractTypeId ?? contract.contractTypeId;
  if (!typeId) return 'Contrato';
  const fromCatalog = CONTRACT_TYPE_CATALOG.find((ct) => ct.id === typeId);
  return fromCatalog?.name ?? typeId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapClause(
  clause: NonNullable<Analysis['clauses']>[number],
  index: number
): AnalysisClauseItem {
  const lawRef = clause.lawReferences?.[0]
    ? formatLawReference(clause.lawReferences[0])
    : undefined;

  return {
    id: `cl-${index}`,
    severity: mapImportanceToSeverity(clause.importance),
    section: clause.page ? `Pág. ${clause.page}` : 'Cláusula',
    title: clause.title,
    excerpt: clause.excerpt ?? clause.content.slice(0, 280),
    suggestion: clause.importance !== 'low' ? clause.content : undefined,
    lawRef,
  };
}

function collectLawReferenceLabels(analysis: Analysis): string[] {
  const labels = new Set<string>();
  for (const ref of analysis.lawReferences ?? []) {
    labels.add(formatLawReference(ref));
  }
  for (const clause of analysis.clauses ?? []) {
    for (const ref of clause.lawReferences ?? []) {
      labels.add(formatLawReference(ref));
    }
  }
  return [...labels];
}

function buildDocumentParagraphs(
  summary: string,
  clauses: AnalysisClauseItem[]
): AnalysisResultData['documentParagraphs'] {
  const risky = clauses.filter((c) => c.severity !== 'standard');
  const standard = clauses.filter((c) => c.severity === 'standard');

  return {
    intro: summary.split('\n')[0]?.slice(0, 400) ?? summary.slice(0, 400),
    indemnity: risky[0]?.excerpt,
    ip: risky[1]?.excerpt,
    law: standard[0]?.excerpt ?? risky[2]?.excerpt,
  };
}

export function mapAnalysisToResultView(
  analysis: Analysis,
  contract: Contract & { id: string },
  analysisId?: string
): AnalysisResultData {
  const clauses = (analysis.clauses ?? []).map(mapClause);
  const high = clauses.filter((c) => c.severity === 'critical').length;
  const medium = clauses.filter((c) => c.severity === 'moderate').length;
  const safe = clauses.filter((c) => c.severity === 'standard').length;
  const completed = toDate(analysis.completedAt ?? analysis.updatedAt ?? analysis.createdAt);
  const countryCode = analysis.country ?? contract.country ?? 'CO';
  const metadata = analysis.metadata ?? {};
  const parties =
    analysis.parties && analysis.parties.length >= 2
      ? ([analysis.parties[0], analysis.parties[1]] as [string, string])
      : undefined;
  const attentionScore =
    contract.riskScore ?? (analysis.score != null ? 100 - analysis.score : 50);

  return {
    contractId: contract.id,
    analysisId,
    contractTypeLabel: mapContractTypeLabel(contract),
    contractTitle: contract.title,
    analyzedAgo: completed ? formatRelativeDate(completed) : 'reciente',
    parties,
    country: COUNTRY_LABELS[countryCode] ?? countryCode,
    countryCode,
    summary: analysis.summary ?? 'Sin resumen disponible.',
    riskScore: Math.round(attentionScore),
    totalClauses: clauses.length,
    revisionsSuggested: high + medium,
    riskDistribution: { high, medium, safe },
    metadata: {
      effectiveDate: metadata.effectiveDate || 'No aparece en el contrato',
      contractValue: metadata.contractValue || 'No aparece en el contrato',
      jurisdiction:
        metadata.jurisdiction || COUNTRY_LABELS[countryCode] || countryCode,
      renewal: metadata.renewal || 'No aparece en el contrato',
    },
    lawReferences: collectLawReferenceLabels(analysis),
    clauses,
    documentParagraphs: buildDocumentParagraphs(
      analysis.summary ?? '',
      clauses
    ),
  };
}
