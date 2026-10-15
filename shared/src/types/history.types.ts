import type {
  FirestoreDate,
  HistoryAction,
  HistoryEntityType,
} from './common.types';

export interface HistoryEntry {
  action: HistoryAction;
  entityType: HistoryEntityType;
  entityId: string;
  metadata?: Record<string, string | number | boolean>;
  ipHash?: string;
  userAgent?: string;
  createdAt: FirestoreDate;
}
