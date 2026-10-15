export type ClauseFilter = 'all' | 'risky' | 'standard';

export type ClauseSeverity = 'critical' | 'moderate' | 'standard';

export type AnalysisClauseItem = {
  id: string;
  severity: ClauseSeverity;
  section: string;
  title: string;
  excerpt: string;
  tags?: string[];
  suggestion?: string;
  lawRef?: string;
};

export type AnalysisResultData = {
  contractId: string;
  analysisId?: string;
  contractTypeLabel: string;
  contractTitle: string;
  analyzedAgo: string;
  parties?: [string, string];
  country: string;
  countryCode: string;
  summary: string;
  riskScore: number;
  totalClauses: number;
  revisionsSuggested: number;
  riskDistribution: { high: number; medium: number; safe: number };
  metadata: {
    effectiveDate: string;
    contractValue: string;
    jurisdiction: string;
    renewal: string;
  };
  lawReferences: string[];
  clauses: AnalysisClauseItem[];
  documentParagraphs: {
    intro: string;
    indemnity?: string;
    ip?: string;
    law?: string;
  };
};
