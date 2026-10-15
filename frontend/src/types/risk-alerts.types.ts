export type RiskSeverityLevel = 'high' | 'medium' | 'info';

export type RiskSortOption = 'severity' | 'clause' | 'compliance';

export type MissingClauseItem = {
  id: string;
  title: string;
  description: string;
};

export type RiskVectorItem = {
  id: string;
  severity: 'high' | 'medium';
  section: string;
  title: string;
  description: string;
  recommendation: string;
  lawRef?: string;
  showComparisonHistory?: boolean;
};

export type RiskAlertsData = {
  analysisId: string;
  contractId: string;
  contractTitle: string;
  contractType: string;
  scannedSummary: string;
  /** Puntuación de seguridad del contrato (0–100, mayor = más favorable). */
  safetyScore?: number;
  severityCounts: {
    high: number;
    medium: number;
    info: number;
  };
  missingClauses: MissingClauseItem[];
  risks: RiskVectorItem[];
};
