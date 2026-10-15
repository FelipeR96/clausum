/** Acciones que el backend valida contra el plan (nunca confiar en el frontend). */
export type EntitlementAction =
  | 'analysis.run'
  | 'comparison.run'
  | 'export.pdf'
  | 'history.full'
  | 'alerts.advanced';

export const ENTITLEMENT_ACTIONS = {
  ANALYSIS: 'analysis.run',
  COMPARISON: 'comparison.run',
  EXPORT_PDF: 'export.pdf',
  HISTORY_FULL: 'history.full',
  ALERTS_ADVANCED: 'alerts.advanced',
} as const satisfies Record<string, EntitlementAction>;
