import type { AnalysisFavorability, ClauseAssessment } from '@clausum/shared';

export type ClauseFilter = 'all' | 'risky' | 'standard';

export type ClauseSeverity = 'critical' | 'moderate' | 'standard';

export type AnalysisClauseItem = {
  id: string;
  /** Cuanto PESA la clausula. Sale de "importance" y no dice de que lado esta. */
  severity: ClauseSeverity;
  /** De que lado esta: habitual, en tu contra, o posiblemente abusiva. */
  assessment?: ClauseAssessment;
  section: string;
  title: string;
  /** Cita textual del contrato. */
  excerpt: string;
  /** Que DICE la clausula, en lenguaje claro. */
  explanation?: string;
  /** Que IMPLICA para quien firma. */
  meaning?: string;
  tags?: string[];
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
  /** A quien favorece el contrato. Ausente en analisis anteriores a oct/2026. */
  favorability?: AnalysisFavorability;
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
