import type { ComparisonReviewStatus } from '@clausum/shared';

export type ComparisonViewMode = 'split' | 'unified';

export type ComparisonRiskLevel = 'critical' | 'moderate' | 'low';

export type ComparisonRiskInsight = {
  id: string;
  level: ComparisonRiskLevel;
  title: string;
  description: string;
  sectionRef?: string;
};

export type DocTextPart = {
  text: string;
  diff?: 'removed' | 'added';
};

export type DocBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; label?: string; parts: DocTextPart[] }
  | { type: 'newProvision'; text: string };

export type ComparisonChangeItem = {
  id: string;
  level: ComparisonRiskLevel;
  section: string;
  summary: string;
  before?: string;
  after?: string;
};

export type ComparisonRiskVectorItem = {
  id: string;
  severity: 'high' | 'medium';
  section: string;
  title: string;
  description: string;
  recommendation: string;
  lawRef?: string;
  showComparisonHistory?: boolean;
};

export type ComparisonViewData = {
  comparisonId?: string;
  contractId: string;
  updatedAgo: string;
  leftFileName: string;
  rightFileName: string;
  additionsCount: number;
  deletionsCount: number;
  leftLabel: string;
  rightLabel: string;
  scannedSummary: string;
  severityCounts: { high: number; medium: number; info: number };
  insights: ComparisonRiskInsight[];
  missingClauses: Array<{ id: string; title: string; description: string }>;
  risks: ComparisonRiskVectorItem[];
  unifiedChanges: ComparisonChangeItem[];
  leftDocument: DocBlock[];
  rightDocument: DocBlock[];
  status?: string;
  reviewStatus?: ComparisonReviewStatus;
  similarityScore?: number;
};
