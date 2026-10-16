/**
 * El importe que PayPal dice haber cobrado, en centavos.
 *
 * Importa porque en PayPal el precio vive dentro del plan, no en cada
 * cobro: lo que calculemos nosotros desde `config/pricing` es lo que
 * *esperábamos* cobrar, y puede no ser lo que se cobró. El evento
 * `PAYMENT.SALE.COMPLETED` trae la cifra real y es la única que no miente.
 *
 * Devuelve null si el evento no la trae o viene ilegible: ante la duda es
 * mejor conservar lo que ya hubiera que escribir un cero, porque un cero
 * en un informe de ingresos parece un dato y no un hueco.
 */
export function importeCobradoPorPayPal(
  resource: Record<string, unknown>
): { amountInCents: number; currency?: string } | null {
  const amount = resource.amount as Record<string, unknown> | undefined;
  if (!amount) return null;

  // PayPal manda el total como cadena decimal ("10.00"), a veces en
  // `total` y a veces en `value` segun el tipo de evento.
  const bruto = amount.total ?? amount.value;
  if (typeof bruto !== 'string' && typeof bruto !== 'number') return null;

  const valor = Number(bruto);
  if (!Number.isFinite(valor) || valor < 0) return null;

  // Math.round y no Math.trunc: 10.00 en coma flotante puede llegar como
  // 9.999999, y truncar convertiria 10 dolares en 9,99.
  const amountInCents = Math.round(valor * 100);

  const currency =
    typeof amount.currency === 'string'
      ? amount.currency
      : typeof amount.currency_code === 'string'
        ? amount.currency_code
        : undefined;

  return { amountInCents, currency };
}
