import { Timestamp } from 'firebase-admin/firestore';

export function firestoreDateToIso(
  value: Date | { seconds: number; nanoseconds?: number } | undefined
): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'object' && 'seconds' in value) {
    return new Date(value.seconds * 1000).toISOString();
  }
  return undefined;
}

/** Igual que firestoreDateToIso, pero devuelve Date. */
export function firestoreDateToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}
