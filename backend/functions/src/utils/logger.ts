import { FieldValue } from 'firebase-admin/firestore';
import type { LogLevel, SystemLogService } from '@clausum/shared';
import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';

interface LogContext {
  userId?: string;
  requestId?: string;
  metadata?: Record<string, string | number | boolean>;
}

function logToConsole(
  level: LogLevel,
  service: SystemLogService,
  message: string,
  context?: LogContext,
  error?: unknown
): void {
  const payload = { service, ...context };
  const line = `[${service}] ${message}`;

  switch (level) {
    case 'error':
      // El error va como argumento aparte para que Node imprima el stack.
      // Sin esto un 500 no deja rastro en la consola y hay que adivinar.
      if (error !== undefined) {
        console.error(line, payload, error);
      } else {
        console.error(line, payload);
      }
      break;
    case 'warn':
      console.warn(line, payload);
      break;
    case 'debug':
      console.debug(line, payload);
      break;
    default:
      console.info(line, payload);
  }
}

async function persistLog(
  level: LogLevel,
  service: SystemLogService,
  message: string,
  context?: LogContext,
  stack?: string
): Promise<void> {
  if (level === 'debug') return;

  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await adminDb().collection(COLLECTIONS.systemLogs).add({
      level,
      service,
      message,
      userId: context?.userId,
      requestId: context?.requestId,
      metadata: context?.metadata,
      stack,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });
  } catch {
    // No bloquear el flujo principal si falla el log en Firestore
  }
}

export const logger = {
  info(service: SystemLogService, message: string, context?: LogContext): void {
    logToConsole('info', service, message, context);
    void persistLog('info', service, message, context);
  },

  warn(service: SystemLogService, message: string, context?: LogContext): void {
    logToConsole('warn', service, message, context);
    void persistLog('warn', service, message, context);
  },

  error(
    service: SystemLogService,
    message: string,
    error?: unknown,
    context?: LogContext
  ): void {
    const stack = error instanceof Error ? error.stack : undefined;
    logToConsole('error', service, message, context, error);
    void persistLog('error', service, message, context, stack);
  },
};
