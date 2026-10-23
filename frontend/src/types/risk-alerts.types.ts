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
  /** En que consiste el riesgo. */
  description: string;
  /** Cita textual del contrato que lo origina. */
  excerpt?: string;
  /** Que le pasa en concreto a quien firma si el riesgo se materializa. */
  impact?: string;
  /**
   * Opcional a proposito. Antes era obligatorio y el mapper rellenaba los
   * huecos con "Revisar con asesoría legal antes de firmar.", que es lo que
   * la primera usuaria describio como "muy general y no ayuda mucho".
   * Mas vale no pintar la caja que pintarla con relleno.
   */
  recommendation?: string;
  /** Redaccion sustitutiva lista para copiar. */
  suggestedWording?: string;
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
