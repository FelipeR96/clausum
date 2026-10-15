import type { FirestoreDate, LogLevel } from './common.types';

export type SystemLogService = 'api' | 'paypal' | 'wompi' | 'deepseek' | 'auth';

export interface SystemLog {
  level: LogLevel;
  service: SystemLogService;
  message: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, string | number | boolean>;
  stack?: string;
  createdAt: FirestoreDate;
  expiresAt: FirestoreDate;
}
