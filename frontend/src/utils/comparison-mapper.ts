import type { Comparison, Importance } from '@clausum/shared';
import type {
  ComparisonViewData,
  ComparisonRiskVectorItem,
  DocBlock,
} from '@/types/comparison-view.types';

function importanceToSeverity(
  importance: Importance
): 'high' | 'medium' | 'info' {
  if (importance === 'high') return 'high';
  if (importance === 'medium') return 'medium';
  return 'info';
}

function countBySeverity(comparison: Comparison) {
  const counts = { high: 0, medium: 0, info: 0 };
  const diff = comparison.diff;
  if (!diff) return counts;

  for (const item of [...diff.added, ...diff.removed]) {
    const key = importanceToSeverity(item.importance);
    if (key === 'high') counts.high += 1;
    else if (key === 'medium') counts.medium += 1;
    else counts.info += 1;
  }
  for (const item of diff.changed) {
    const key = importanceToSeverity(item.significance);
    if (key === 'high') counts.high += 1;
    else if (key === 'medium') counts.medium += 1;
    else counts.info += 1;
  }
  return counts;
}

function buildInsights(comparison: Comparison) {
  const diff = comparison.diff;
  if (!diff) return [];

  const items: Array<{
    id: string;
    level: 'critical' | 'moderate' | 'low';
    title: string;
    description: string;
    sectionRef?: string;
  }> = [];

  const push = (
    id: string,
    importance: Importance,
    title: string,
    description: string
  ) => {
    const sev = importanceToSeverity(importance);
    items.push({
      id,
      level: sev === 'high' ? 'critical' : sev === 'medium' ? 'moderate' : 'low',
      title,
      description,
    });
  };

  diff.removed.forEach((item, i) =>
    push(`rm-${i}`, item.importance, item.title, item.content)
  );
  diff.added.forEach((item, i) =>
    push(`add-${i}`, item.importance, item.title, item.content)
  );
  diff.changed.forEach((item, i) =>
    push(
      `chg-${i}`,
      item.significance,
      item.field,
      `Antes: ${item.before} → Después: ${item.after}`
    )
  );

  return items.slice(0, 6);
}

function buildRiskVectors(comparison: Comparison): ComparisonRiskVectorItem[] {
  const diff = comparison.diff;
  if (!diff) return [];

  const vectors: ComparisonRiskVectorItem[] = [];

  diff.removed.forEach((item, i) => {
    const sev = importanceToSeverity(item.importance);
    if (sev === 'info') return;
    vectors.push({
      id: `rv-rm-${i}`,
      severity: sev === 'high' ? 'high' : 'medium',
      section: item.title,
      title: `Eliminado: ${item.title}`,
      description: item.content,
      recommendation:
        item.lawReferences?.[0]?.excerpt ??
        'Revisa si la eliminación es aceptable para tu posición contractual.',
      lawRef: item.lawReferences?.[0]
        ? `${item.lawReferences[0].codeName}, art. ${item.lawReferences[0].article}`
        : undefined,
    });
  });

  diff.added.forEach((item, i) => {
    const sev = importanceToSeverity(item.importance);
    if (sev === 'info') return;
    vectors.push({
      id: `rv-add-${i}`,
      severity: sev === 'high' ? 'high' : 'medium',
      section: item.title,
      title: `Añadido: ${item.title}`,
      description: item.content,
      recommendation:
        item.lawReferences?.[0]?.excerpt ??
        'Evalúa el impacto de esta nueva redacción antes de aprobar.',
      lawRef: item.lawReferences?.[0]
        ? `${item.lawReferences[0].codeName}, art. ${item.lawReferences[0].article}`
        : undefined,
    });
  });

  diff.changed.forEach((item, i) => {
    const sev = importanceToSeverity(item.significance);
    if (sev === 'info') return;
    vectors.push({
      id: `rv-chg-${i}`,
      severity: sev === 'high' ? 'high' : 'medium',
      section: item.field,
      title: `Modificado: ${item.field}`,
      description: `Antes: ${item.before}. Después: ${item.after}.`,
      recommendation: 'Negocia un equilibrio entre ambas redacciones si el cambio no te conviene.',
    });
  });

  return vectors;
}

export function mapComparisonToViewData(
  comparison: Comparison & { id: string },
  leftFileName: string,
  rightFileName: string,
  contractId?: string
): ComparisonViewData {
  const diff = comparison.diff;
  const severityCounts = countBySeverity(comparison);

  const leftDocument: DocBlock[] = [
    ...(diff?.removed ?? []).map((item, i) => ({
      type: 'paragraph' as const,
      label: `${i + 1}. ${item.title}`,
      parts: [{ text: item.content, diff: 'removed' as const }],
    })),
    ...(diff?.changed ?? []).map((item) => ({
      type: 'paragraph' as const,
      label: item.field,
      parts: [{ text: item.before, diff: 'removed' as const }],
    })),
  ];

  const rightDocument: DocBlock[] = [
    ...(diff?.added ?? []).map((item, i) => ({
      type: 'paragraph' as const,
      label: `${i + 1}. ${item.title}`,
      parts: [{ text: item.content, diff: 'added' as const }],
    })),
    ...(diff?.changed ?? []).map((item) => ({
      type: 'paragraph' as const,
      label: item.field,
      parts: [{ text: item.after, diff: 'added' as const }],
    })),
  ];

  if (leftDocument.length === 0) {
    leftDocument.push({
      type: 'paragraph',
      parts: [{ text: comparison.summary ?? 'Sin eliminaciones detectadas.' }],
    });
  }
  if (rightDocument.length === 0) {
    rightDocument.push({
      type: 'paragraph',
      parts: [{ text: comparison.summary ?? 'Sin adiciones detectadas.' }],
    });
  }

  const unifiedChanges = [
    ...(diff?.changed ?? []).map((item, i) => ({
      id: `u-chg-${i}`,
      level:
        importanceToSeverity(item.significance) === 'high'
          ? ('critical' as const)
          : importanceToSeverity(item.significance) === 'medium'
            ? ('moderate' as const)
            : ('low' as const),
      section: item.field,
      summary: `Cambio en ${item.field}`,
      before: item.before,
      after: item.after,
    })),
    ...(diff?.removed ?? []).map((item, i) => ({
      id: `u-rm-${i}`,
      level:
        importanceToSeverity(item.importance) === 'high'
          ? ('critical' as const)
          : importanceToSeverity(item.importance) === 'medium'
            ? ('moderate' as const)
            : ('low' as const),
      section: item.title,
      summary: `Eliminación: ${item.title}`,
      before: item.content,
    })),
    ...(diff?.added ?? []).map((item, i) => ({
      id: `u-add-${i}`,
      level:
        importanceToSeverity(item.importance) === 'high'
          ? ('critical' as const)
          : importanceToSeverity(item.importance) === 'medium'
            ? ('moderate' as const)
            : ('low' as const),
      section: item.title,
      summary: `Adición: ${item.title}`,
      after: item.content,
    })),
  ];

  return {
    comparisonId: comparison.id,
    contractId: contractId ?? comparison.contractIdA,
    updatedAgo: 'recién',
    leftFileName,
    rightFileName,
    additionsCount: diff?.added.length ?? 0,
    deletionsCount: diff?.removed.length ?? 0,
    leftLabel: 'Original',
    rightLabel: 'Revisión de la contraparte',
    scannedSummary:
      comparison.summary ??
      `Comparación entre ${leftFileName} y ${rightFileName}.`,
    severityCounts,
    insights: buildInsights(comparison),
    missingClauses: [],
    risks: buildRiskVectors(comparison),
    unifiedChanges,
    leftDocument,
    rightDocument,
    status: comparison.status,
    reviewStatus: comparison.reviewStatus ?? 'pending',
    similarityScore: diff?.similarityScore,
  };
}
