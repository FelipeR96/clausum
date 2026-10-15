import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BILLING_CURRENCY,
  PRO_BILLING,
  PRO_BILLING_LATAM,
  formatCopFromCents,
  formatUsdFromCents,
  getBillingCurrency,
  getProAmountForRegion,
  proAnnualSavingsPercentForRegion,
} from '@clausum/shared';
import {
  buildTransactionIntegritySignature,
  getWompiApiBase,
} from '../integrations/wompi/wompi-api';
import { verifyWompiEventChecksum } from '../services/wompi.service';

// ─────────────────────────────────────────────────────────────────────────
// Aquí vive el dinero. Un error en la firma de integridad hace que Wompi
// rechace todos los cobros; un error en la verificación del checksum del
// evento hace algo peor: aceptar un webhook falsificado y activar Pro
// gratis. Ambos son silenciosos sin estas pruebas.
// ─────────────────────────────────────────────────────────────────────────

describe('firma de integridad de transacción', () => {
  it('encadena referencia + monto + moneda + secreto en ese orden', () => {
    const esperado = createHash('sha256')
      .update('REF-123' + '4000000' + 'COP' + 'secreto_de_prueba')
      .digest('hex');

    expect(
      buildTransactionIntegritySignature('REF-123', 4_000_000, 'COP', 'secreto_de_prueba')
    ).toBe(esperado);
  });

  it('cambia si cambia el monto', () => {
    const a = buildTransactionIntegritySignature('REF-1', 4_000_000, 'COP', 's');
    const b = buildTransactionIntegritySignature('REF-1', 4_000_001, 'COP', 's');
    expect(a).not.toBe(b);
  });

  it('cambia si cambia la referencia', () => {
    const a = buildTransactionIntegritySignature('REF-1', 4_000_000, 'COP', 's');
    const b = buildTransactionIntegritySignature('REF-2', 4_000_000, 'COP', 's');
    expect(a).not.toBe(b);
  });

  it('devuelve un hex de 64 caracteres', () => {
    const firma = buildTransactionIntegritySignature('R', 1, 'COP', 's');
    expect(firma).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('selección de entorno de Wompi', () => {
  it('una llave de prueba apunta a sandbox', () => {
    expect(getWompiApiBase('pub_test_abc')).toContain('sandbox');
  });

  it('una llave de producción apunta a producción', () => {
    expect(getWompiApiBase('pub_prod_abc')).toContain('production');
    expect(getWompiApiBase('pub_prod_abc')).not.toContain('sandbox');
  });
});

describe('verificación del checksum de un evento de Wompi', () => {
  const SECRETO = 'eventos_secreto';

  /** Construye un evento con checksum correcto para los datos dados. */
  function eventoValido(id = 'txn_1', status = 'APPROVED', amount = 4_000_000) {
    const propiedades = [
      'transaction.id',
      'transaction.status',
      'transaction.amount_in_cents',
    ];
    const timestamp = 1_700_000_000;
    const cadena = `${id}${status}${amount}${timestamp}${SECRETO}`;
    const checksum = createHash('sha256').update(cadena).digest('hex').toUpperCase();

    return {
      event: 'transaction.updated',
      data: {
        transaction: { id, status, amount_in_cents: amount, reference: 'REF-1' },
      },
      environment: 'test',
      signature: { properties: propiedades, checksum },
      timestamp,
    };
  }

  it('acepta un evento con checksum correcto', () => {
    expect(verifyWompiEventChecksum(eventoValido() as never, SECRETO)).toBe(true);
  });

  it('rechaza un checksum alterado', () => {
    const evento = eventoValido();
    evento.signature.checksum = evento.signature.checksum.replace(/^./, '0');
    expect(verifyWompiEventChecksum(evento as never, SECRETO)).toBe(false);
  });

  it('rechaza si se manipula el estado de la transacción', () => {
    // El ataque directo: coger un evento real de rechazo y cambiarlo a
    // aprobado dejando el checksum original.
    const evento = eventoValido('txn_1', 'DECLINED');
    evento.data.transaction.status = 'APPROVED';
    expect(verifyWompiEventChecksum(evento as never, SECRETO)).toBe(false);
  });

  it('rechaza si se manipula el monto', () => {
    const evento = eventoValido();
    evento.data.transaction.amount_in_cents = 100;
    expect(verifyWompiEventChecksum(evento as never, SECRETO)).toBe(false);
  });

  it('rechaza si se manipula el timestamp', () => {
    const evento = eventoValido();
    evento.timestamp = 1_700_000_001;
    expect(verifyWompiEventChecksum(evento as never, SECRETO)).toBe(false);
  });

  it('rechaza con el secreto equivocado', () => {
    expect(verifyWompiEventChecksum(eventoValido() as never, 'otro_secreto')).toBe(false);
  });

  it('rechaza un checksum de longitud distinta sin lanzar', () => {
    // timingSafeEqual lanza si los buffers no miden igual: la comprobación
    // de longitud previa tiene que atajarlo.
    const evento = eventoValido();
    evento.signature.checksum = 'ABC';
    expect(() => verifyWompiEventChecksum(evento as never, SECRETO)).not.toThrow();
    expect(verifyWompiEventChecksum(evento as never, SECRETO)).toBe(false);
  });

  it('es insensible a mayúsculas en el checksum recibido', () => {
    const evento = eventoValido();
    evento.signature.checksum = evento.signature.checksum.toLowerCase();
    expect(verifyWompiEventChecksum(evento as never, SECRETO)).toBe(true);
  });
});

describe('precios por región', () => {
  it('Colombia cobra en COP', () => {
    expect(getBillingCurrency('CO')).toBe('COP');
    expect(getProAmountForRegion('CO', 'monthly')).toBe(PRO_BILLING.monthlyAmountInCents);
    expect(getProAmountForRegion('CO', 'annual')).toBe(PRO_BILLING.yearlyAmountInCents);
  });

  it('el resto de LATAM cobra en USD', () => {
    expect(getBillingCurrency('LATAM')).toBe('USD');
    expect(getProAmountForRegion('LATAM', 'monthly')).toBe(
      PRO_BILLING_LATAM.monthlyAmountInCents
    );
    expect(getProAmountForRegion('LATAM', 'annual')).toBe(
      PRO_BILLING_LATAM.yearlyAmountInCents
    );
  });

  it('el plan anual equivale a 10 meses en ambas regiones', () => {
    expect(PRO_BILLING.yearlyAmountInCents).toBe(PRO_BILLING.monthlyAmountInCents * 10);
    expect(PRO_BILLING_LATAM.yearlyAmountInCents).toBe(
      PRO_BILLING_LATAM.monthlyAmountInCents * 10
    );
  });

  it('el ahorro anual anunciado es ~17 % en ambas regiones', () => {
    expect(proAnnualSavingsPercentForRegion('CO')).toBe(17);
    expect(proAnnualSavingsPercentForRegion('LATAM')).toBe(17);
  });

  it('los montos están en centavos, no en unidades', () => {
    // $40.000 COP son 4.000.000 de centavos. Confundir esto cobra 100x
    // de menos (o de más) y no salta a la vista en la UI.
    expect(PRO_BILLING.monthlyAmountInCents).toBe(4_000_000);
    expect(PRO_BILLING_LATAM.monthlyAmountInCents).toBe(1_100);
  });

  it('formatea gratis como texto, no como cero', () => {
    expect(formatCopFromCents(0)).toBe('Gratis');
    expect(formatUsdFromCents(0)).toBe('Gratis');
  });

  it('formatea los importes sin decimales en COP', () => {
    const texto = formatCopFromCents(PRO_BILLING.monthlyAmountInCents);
    expect(texto).toContain('40.000');
    expect(texto).not.toContain(',00');
  });

  it('la moneda base del producto es COP', () => {
    expect(BILLING_CURRENCY).toBe('COP');
  });
});
