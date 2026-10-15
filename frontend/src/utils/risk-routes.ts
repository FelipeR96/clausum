/** Ruta al perfil de riesgo profundo de un contrato. */
export function contractRiskProfilePath(contractId: string) {
  return `/panel/contratos/${contractId}/riesgos`;
}

/** Ruta al análisis general de un contrato. */
export function contractAnalysisPath(contractId: string) {
  return `/panel/contratos/${contractId}/resultado`;
}
