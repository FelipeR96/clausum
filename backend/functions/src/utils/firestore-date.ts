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
