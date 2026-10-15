import type { Analysis, Contract, LawReference } from '@clausum/shared';
import { CONTRACT_TYPE_CATALOG } from '@clausum/shared';
import type { MissingClauseItem, RiskAlertsData, RiskVectorItem } from '@/types/risk-alerts.types';

function formatLawReference(ref: LawReference): string {
  const article = ref.article ? `, art. ${ref.article}` : '';
  return `${ref.codeName}${article}`;
}

function mapContractTypeLabel(contract: Contract): string {
  const typeId = contract.detectedContractTypeId ?? contract.contractTypeId;
  if (!typeId) return 'Sin clasificar';
  const fromCatalog = CONTRACT_TYPE_CATALOG.find((ct) => ct.id === typeId);
  return fromCatalog?.name ?? typeId.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferMissingClauses(risks: RiskVectorItem[]): MissingClauseItem[] {
  return risks
    .filter((risk) => /ausente|falta|no se encontró|no establece/i.test(risk.description))
    .slice(0, 4)
    .map((risk, index) => ({
      id: `mc-${index}`,
      title: risk.title,
      description: risk.recommendation || risk.description,
    }));
}

export function mapRisksToAlertsView(
  analysis: Analysis,
  contract: Contract & { id: string },
  analysisId: string
): RiskAlertsData {
  const risks: RiskVectorItem[] = (analysis.risks ?? []).map((risk, index) => {
    const lawRef = risk.lawReferences?.[0]
      ? formatLawReference(risk.lawReferences[0])
      : undefined;

    return {
      id: `rv-${index}`,
      severity: risk.level === 'high' ? 'high' : 'medium',
      section: risk.clauseRef ?? 'Cláusula',
      title: risk.title,
      description: risk.description,
      recommendation: risk.recommendation ?? 'Revisar con asesoría legal antes de firmar.',
      lawRef,
    };
  });

  const severityCounts = {
    high: (analysis.risks ?? []).filter((r) => r.level === 'high').length,
    medium: (analysis.risks ?? []).filter((r) => r.level === 'medium').length,
    info: (analysis.risks ?? []).filter((r) => r.level === 'low').length,
  };

  const missingClauses = inferMissingClauses(risks);

  return {
    analysisId,
    contractId: contract.id,
    contractTitle: contract.title,
    contractType: mapContractTypeLabel(contract),
    safetyScore: analysis.score,
    scannedSummary:
      analysis.summary ??
      `Perfil de riesgo del contrato «${contract.title}» con ${risks.length} alertas detectadas.`,
    severityCounts,
    missingClauses,
    risks,
  };
}
