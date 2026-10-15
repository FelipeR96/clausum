import type {
  AnalysisMode,
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
  content: string;
  importance: Importance;
  page?: number;
  excerpt?: string;
  lawReferences?: LawReference[];
}

export interface AnalysisRisk {
  level: RiskLevel;
  title: string;
  description: string;
  excerpt: string;
  clauseRef?: string;
  recommendation?: string;
  lawReferences?: LawReference[];
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
