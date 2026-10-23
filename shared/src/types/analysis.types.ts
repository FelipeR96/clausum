import type {
  AnalysisMode,
  ClauseAssessment,
  FavorabilityVerdict,
  FirestoreDate,
  Importance,
  JobStatus,
  RiskLevel,
  WithTimestamps,
} from './common.types';
import type { CountryCode, LawReference, LegalSearchMethod } from './legal.types';
import type { ProcessingProgress } from './processing.types';

export interface AnalysisClause {
  title: string;
  /** Que DICE la clausula, en lenguaje claro y neutral. */
  content: string;
  importance: Importance;
  page?: number;
  excerpt?: string;
  /**
   * Que IMPLICA para quien firma. Opcional: los analisis guardados antes de
   * octubre de 2026 no lo tienen y la interfaz debe seguir pintandolos.
   */
  meaning?: string;
  /** Si la clausula es normal, esta inclinada en contra, o es abusiva. */
  assessment?: ClauseAssessment;
  lawReferences?: LawReference[];
}

export interface AnalysisRisk {
  level: RiskLevel;
  title: string;
  /** En que consiste el riesgo. */
  description: string;
  excerpt: string;
  clauseRef?: string;
  /** Que le pasa en concreto a quien firma si el riesgo se materializa. */
  impact?: string;
  recommendation?: string;
  /** Redaccion sustitutiva para llevar a la mesa, cuando aplique. */
  suggestedWording?: string;
  lawReferences?: LawReference[];
}

export interface AnalysisFavorability {
  verdict: FavorabilityVerdict;
  /** A que parte se inclina el contrato. */
  forWhom?: string;
  /** Una o dos frases nombrando las clausulas que sostienen el veredicto. */
  rationale?: string;
}

export interface AnalysisMetadata {
  effectiveDate?: string;
  contractValue?: string;
  jurisdiction?: string;
  renewal?: string;
}

export interface Analysis extends WithTimestamps {
  userId: string;
  contractId: string;
  mode: AnalysisMode;
  status: JobStatus;
  processingProgress?: ProcessingProgress;
  summary?: string;
  parties?: string[];
  metadata?: AnalysisMetadata;
  clauses?: AnalysisClause[];
  risks?: AnalysisRisk[];
  score?: number;
  /**
   * Veredicto de a quien favorece el contrato. Es la cifra de portada real:
   * "score" mide claridad, que es otra pregunta.
   */
  favorability?: AnalysisFavorability;
  country?: CountryCode;
  contractTypeId?: string;
  legalArticleIds?: string[];
  lawReferences?: LawReference[];
  legalSearchMethod?: LegalSearchMethod;
  resultStoragePath?: string;
  tokensUsed?: number;
  model?: string;
  processingMs?: number;
  errorMessage?: string;
  completedAt?: FirestoreDate;
}
