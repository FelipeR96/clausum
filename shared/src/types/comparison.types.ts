import type {
  FirestoreDate,
  Importance,
  JobStatus,
  WithTimestamps,
} from './common.types';
import type { CountryCode, LawReference, LegalSearchMethod } from './legal.types';

export interface ComparisonDiffItem {
  title: string;
  content: string;
  importance: Importance;
  lawReferences?: LawReference[];
}

export interface ComparisonChangedItem {
  field: string;
  before: string;
  after: string;
  significance: Importance;
}

export interface ComparisonDiff {
  added: ComparisonDiffItem[];
  removed: ComparisonDiffItem[];
  changed: ComparisonChangedItem[];
  similarityScore?: number;
}

export type ComparisonReviewStatus = 'pending' | 'approved' | 'discarded';

export interface Comparison extends WithTimestamps {
  userId: string;
  contractIdA: string;
  contractIdB: string;
  title?: string;
  status: JobStatus;
  summary?: string;
  diff?: ComparisonDiff;
  country?: CountryCode;
  contractTypeId?: string;
  legalArticleIds?: string[];
  lawReferences?: LawReference[];
  legalSearchMethod?: LegalSearchMethod;
  resultStoragePath?: string;
  analysisId?: string;
  tokensUsed?: number;
  completedAt?: FirestoreDate;
  reviewStatus?: ComparisonReviewStatus;
  reviewedAt?: FirestoreDate;
}
