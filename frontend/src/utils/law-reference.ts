import type { LawReference } from '@clausum/shared';

/**
 * Como se nombra un articulo de ley en pantalla.
 *
 * Estaba copiado en analysis-mapper y en risk-alerts-mapper, y al anadir el
 * informe de compra suelta iba a ser la tercera. Con tres copias, el dia que
 * cambie el formato cambia en una o en dos, y la que se quede atras sera la
 * que alguien tenga delante.
 *
 * El articulo es opcional porque hay referencias a un codigo entero.
 */
export function formatLawReference(ref: LawReference): string {
  const articulo = ref.article ? `, art. ${ref.article}` : '';
  return `${ref.codeName}${articulo}`;
}
