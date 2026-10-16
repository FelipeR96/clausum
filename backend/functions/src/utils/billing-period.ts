/**
 * Desde cuándo cuenta el periodo que se acaba de pagar.
 *
 * La regla es una sola y vale para los dos proveedores: **a nadie se le
 * quita tiempo que ya pagó**. Si le queda periodo vigente, el nuevo empieza
 * donde termina ese; si no —cliente nuevo, o uno que dejó vencer— empieza
 * hoy.
 *
 * Importa sobre todo al cambiar de mensual a anual a mitad de periodo:
 * antes el periodo se reiniciaba y el cliente perdía los días restantes sin
 * que nadie se lo dijera.
 *
 * Es deliberadamente generosa. Lo contrario —prorratear— obligaría a cobrar
 * un importe distinto a cada persona, y ese importe queda guardado como su
 * precio de renovación: al año siguiente se le cobraría de menos.
 */
export function inicioDelNuevoPeriodo(
  periodoActualTermina: Date | null,
  ahora: Date = new Date()
): Date {
  if (periodoActualTermina && periodoActualTermina.getTime() > ahora.getTime()) {
    return periodoActualTermina;
  }
  return ahora;
}
