import { COLLECTIONS } from '@clausum/shared';
import { adminDb } from '../firebase/admin';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────
// Comisiones de las pasarelas.
//
// Van en Firestore y no en el codigo porque son TUS tarifas, no las de
// nadie: dependen del contrato que tengas firmado y cambian sin avisar al
// programador. Un numero escrito aqui envejeceria en silencio y los
// informes de ingresos netos mentirian sin que nada lo delatara.
//
// Los valores por defecto son los publicados de Wompi, aproximados. PayPal
// se deja sin configurar a proposito: sus tarifas dependen del pais y de si
// el pago es internacional, y preferimos decir "sin configurar" antes que
// restar una comision inventada.
// ─────────────────────────────────────────────────────────────────────────

export const COMISIONES_DOC = 'comisiones';

export interface Tarifa {
  /** Porcentaje sobre el importe. 2.99 significa 2,99 %. */
  porcentaje: number;
  /** Importe fijo por transaccion, en centavos de la moneda del cobro. */
  fijoEnCentavos: number;
}

export interface Comisiones {
  /** Wompi cobra distinto por medio de pago. */
  wompi: {
    tarjeta: Tarifa;
    pse: Tarifa;
    nequi: Tarifa;
    /** Para medios que no reconocemos. */
    otro: Tarifa;
  };
  paypal: Tarifa | null;
  /**
   * IVA sobre la comision, en porcentaje. En Colombia la pasarela factura
   * su servicio con IVA, asi que el coste real es la comision mas esto.
   */
  ivaSobreComision: number;
  updatedAt?: FirebaseFirestore.Timestamp;
  updatedBy?: string;
}

export const COMISIONES_POR_DEFECTO: Comisiones = {
  wompi: {
    tarjeta: { porcentaje: 2.99, fijoEnCentavos: 90000 },
    pse: { porcentaje: 1.99, fijoEnCentavos: 90000 },
    nequi: { porcentaje: 1.99, fijoEnCentavos: 90000 },
    otro: { porcentaje: 2.99, fijoEnCentavos: 90000 },
  },
  paypal: null,
  ivaSobreComision: 19,
};

function esTarifa(v: unknown): v is Tarifa {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.porcentaje === 'number' &&
    Number.isFinite(t.porcentaje) &&
    t.porcentaje >= 0 &&
    typeof t.fijoEnCentavos === 'number' &&
    Number.isInteger(t.fijoEnCentavos) &&
    t.fijoEnCentavos >= 0
  );
}

/** Todo o nada, igual que los precios: medio documento no se usa. */
function parse(data: unknown): Comisiones | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  const w = d.wompi as Record<string, unknown> | undefined;

  if (
    !w ||
    !esTarifa(w.tarjeta) ||
    !esTarifa(w.pse) ||
    !esTarifa(w.nequi) ||
    !esTarifa(w.otro) ||
    typeof d.ivaSobreComision !== 'number' ||
    d.ivaSobreComision < 0
  ) {
    return null;
  }

  return {
    wompi: {
      tarjeta: w.tarjeta,
      pse: w.pse,
      nequi: w.nequi,
      otro: w.otro,
    },
    paypal: esTarifa(d.paypal) ? d.paypal : null,
    ivaSobreComision: d.ivaSobreComision,
    updatedAt: d.updatedAt as FirebaseFirestore.Timestamp | undefined,
    updatedBy: d.updatedBy as string | undefined,
  };
}

let cache: { valor: Comisiones; hasta: number } | null = null;
const CACHE_MS = 60_000;

export async function getComisiones(): Promise<Comisiones> {
  if (cache && cache.hasta > Date.now()) return cache.valor;

  try {
    const snap = await adminDb()
      .collection(COLLECTIONS.config)
      .doc(COMISIONES_DOC)
      .get();
    const valor = parse(snap.data()) ?? COMISIONES_POR_DEFECTO;
    cache = { valor, hasta: Date.now() + CACHE_MS };
    return valor;
  } catch (error) {
    logger.error('api', 'No se pudieron leer las comisiones', error);
    return COMISIONES_POR_DEFECTO;
  }
}

export function invalidarCacheComisiones(): void {
  cache = null;
}

/** La tarifa que aplica a un pago concreto. null si no esta configurada. */
export function tarifaPara(
  c: Comisiones,
  proveedor: string | undefined,
  medio: string | undefined
): Tarifa | null {
  if (proveedor === 'paypal') return c.paypal;
  if (proveedor !== 'wompi') return null;

  switch ((medio ?? '').toUpperCase()) {
    case 'CARD':
      return c.wompi.tarjeta;
    case 'PSE':
      return c.wompi.pse;
    case 'NEQUI':
      return c.wompi.nequi;
    default:
      return c.wompi.otro;
  }
}

/** Comision de un cobro, IVA incluido, redondeada a centavos. */
export function comisionDe(
  importeEnCentavos: number,
  tarifa: Tarifa,
  ivaSobreComision: number
): number {
  const base = (importeEnCentavos * tarifa.porcentaje) / 100 + tarifa.fijoEnCentavos;
  return Math.round(base * (1 + ivaSobreComision / 100));
}
