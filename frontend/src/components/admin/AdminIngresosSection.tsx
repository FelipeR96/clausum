import { useCallback, useEffect, useState } from 'react';
import {
  fetchIngresos,
  type IngresosPorMoneda,
  type IngresosResumen,
} from '@/services/admin.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

/**
 * Fecha en texto, en la zona de QUIEN MIRA, no en UTC.
 *
 * toISOString() convierte a UTC antes de cortar. En Bogota (UTC-5) son
 * cinco horas adelante: a las 19:58 del 16 devolvia "2026-10-17". La
 * casilla "Hasta" aparecia con la fecha de manana.
 */
function iso(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * El instante exacto en que empieza o termina ese dia AQUI.
 *
 * `${d}T00:00:00.000Z` es medianoche en Londres: en Bogota son las 7 de la
 * tarde del dia anterior. Un pago cobrado el 30 de septiembre a las 8 de la
 * noche caia dentro de octubre, y al cuadrar con el extracto de Wompi los
 * meses no daban. new Date(ano, mes, dia) sí usa la zona local.
 */
function instante(texto: string, finDelDia: boolean): string {
  const [a, m, d] = texto.split('-').map(Number);
  return finDelDia
    ? new Date(a, m - 1, d, 23, 59, 59, 999).toISOString()
    : new Date(a, m - 1, d, 0, 0, 0, 0).toISOString();
}

function dinero(centavos: number, moneda: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: moneda === 'COP' ? 0 : 2,
  }).format(centavos / 100);
}

/** Atajos: lo que uno mira de verdad, sin teclear fechas. */
function rangos(): { etiqueta: string; desde: Date; hasta: Date }[] {
  const hoy = new Date();
  return [
    {
      etiqueta: 'Este mes',
      desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
      hasta: hoy,
    },
    {
      etiqueta: 'Mes pasado',
      desde: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1),
      hasta: new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59),
    },
    { etiqueta: 'Este año', desde: new Date(hoy.getFullYear(), 0, 1), hasta: hoy },
  ];
}

function Cifra({
  etiqueta,
  valor,
  detalle,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        destacado
          ? 'border-primary/40 bg-primary/5'
          : 'border-outline-variant/60 bg-surface/60'
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-on-surface-variant">
        {etiqueta}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-on-surface">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-on-surface-variant">{detalle}</p>}
    </div>
  );
}

function BloqueMoneda({ m }: { m: IngresosPorMoneda }) {
  return (
    <div className="mt-6 rounded-2xl border border-outline-variant/60 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-bold text-on-surface">{m.moneda}</h3>
        <span className="text-xs text-on-surface-variant">
          {m.pagos} pago{m.pagos === 1 ? '' : 's'} · {m.clientes} cliente
          {m.clientes === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Cifra etiqueta="Cobrado" valor={dinero(m.brutoEnCentavos, m.moneda)} />
        <Cifra
          etiqueta="Comisiones"
          valor={`− ${dinero(m.comisionEnCentavos, m.moneda)}`}
          detalle="estimadas, IVA incluido"
        />
        <Cifra
          etiqueta="Te queda"
          valor={dinero(m.netoEnCentavos, m.moneda)}
          destacado
        />
      </div>

      {m.comisionIncompleta && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Hay pagos sin tarifa configurada: su comisión cuenta como cero y el
          neto sale más alto de lo real. Configúrala abajo.
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Por proveedor
          </h4>
          <ul className="mt-2 space-y-1.5 text-sm">
            {Object.entries(m.porProveedor).map(([k, v]) => (
              <li key={k}>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">
                    {k}
                    {v.sinTarifa && (
                      <span className="ml-1 text-amber-700 dark:text-amber-400">
                        sin tarifa
                      </span>
                    )}
                  </span>
                  <span className="text-on-surface">
                    {dinero(v.netoEnCentavos, m.moneda)}
                  </span>
                </div>
                <div className="text-xs text-on-surface-variant">
                  {v.pagos} · bruto {dinero(v.brutoEnCentavos, m.moneda)} · comisión{' '}
                  {dinero(v.comisionEnCentavos, m.moneda)}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Mensual vs anual
          </h4>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(m.porIntervalo).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span className="text-on-surface-variant">
                  {k === 'annual' ? 'anual' : k === 'monthly' ? 'mensual' : k}
                </span>
                <span className="text-on-surface">
                  {dinero(v.brutoEnCentavos, m.moneda)} · {v.pagos}
                </span>
              </li>
            ))}
          </ul>

          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Nuevos vs renovaciones
          </h4>
          <ul className="mt-2 space-y-1 text-sm">
            <li className="flex justify-between">
              <span className="text-on-surface-variant">primeros pagos</span>
              <span className="text-on-surface">
                {dinero(m.primeros.brutoEnCentavos, m.moneda)} · {m.primeros.pagos}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-on-surface-variant">renovaciones</span>
              <span className="text-on-surface">
                {dinero(m.renovaciones.brutoEnCentavos, m.moneda)} ·{' '}
                {m.renovaciones.pagos}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function AdminIngresosSection() {
  const atajos = rangos();
  const [desde, setDesde] = useState(iso(atajos[0].desde));
  const [hasta, setHasta] = useState(iso(atajos[0].hasta));
  const [datos, setDatos] = useState<IngresosResumen | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (d: string, h: string) => {
    setCargando(true);
    setError(null);
    try {
      // El fin del dia, no el principio: si no, el ultimo dia no cuenta.
      setDatos(await fetchIngresos(instante(d, false), instante(h, true)));
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'cargar los ingresos' }));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(desde, hasta);
    // Solo al montar: después se recarga al pulsar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="glass-panel rounded-2xl p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-on-surface">Ingresos</h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        Solo pagos cobrados, por su fecha de cobro. Las cortesías no cuentan.
        Cada moneda va por separado: sumarlas no significaría nada.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {atajos.map((r) => (
          <button
            key={r.etiqueta}
            type="button"
            onClick={() => {
              setDesde(iso(r.desde));
              setHasta(iso(r.hasta));
              void cargar(iso(r.desde), iso(r.hasta));
            }}
            className="rounded-full border border-outline-variant px-4 py-1.5 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-container"
          >
            {r.etiqueta}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-on-surface-variant">
          Desde
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="mt-1 block rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm text-on-surface"
          />
        </label>
        <label className="text-xs text-on-surface-variant">
          Hasta
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="mt-1 block rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm text-on-surface"
          />
        </label>
        <button
          type="button"
          disabled={cargando}
          onClick={() => void cargar(desde, hasta)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary/90 disabled:opacity-60"
        >
          {cargando ? 'Calculando…' : 'Ver'}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {datos?.monedas.length === 0 && !cargando && (
        <p className="mt-6 text-sm text-on-surface-variant">
          No hay cobros en este periodo.
        </p>
      )}

      {datos?.monedas.map((m) => (
        <BloqueMoneda key={m.moneda} m={m} />
      ))}
    </section>
  );
}
