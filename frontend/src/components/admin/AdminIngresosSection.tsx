import { useCallback, useEffect, useState } from 'react';
import { fetchIngresos, type IngresosResumen } from '@/services/admin.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dinero(centavos: number, moneda: string): string {
  if (moneda === 'MIXTA') return `${(centavos / 100).toLocaleString('es-CO')} (mixta)`;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: moneda === 'MIXTA' ? 'COP' : moneda,
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}

/** Atajos: lo que uno mira de verdad, sin teclear fechas. */
function rangos(): { etiqueta: string; desde: Date; hasta: Date }[] {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const finMesPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59);
  const inicioAno = new Date(hoy.getFullYear(), 0, 1);
  return [
    { etiqueta: 'Este mes', desde: inicioMes, hasta: hoy },
    { etiqueta: 'Mes pasado', desde: inicioMesPasado, hasta: finMesPasado },
    { etiqueta: 'Este año', desde: inicioAno, hasta: hoy },
  ];
}

function Cifra({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface/60 p-4">
      <p className="text-xs uppercase tracking-wide text-on-surface-variant">
        {etiqueta}
      </p>
      <p className="mt-1 font-display text-2xl font-bold text-on-surface">{valor}</p>
      {detalle && (
        <p className="mt-0.5 text-xs text-on-surface-variant">{detalle}</p>
      )}
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
      // El fin de día, no el principio: si no, el último día no cuenta.
      setDatos(await fetchIngresos(`${d}T00:00:00.000Z`, `${h}T23:59:59.999Z`));
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

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {datos && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Cifra
              etiqueta="Total cobrado"
              valor={dinero(datos.totalEnCentavos, datos.moneda)}
              detalle={`${datos.pagos} pago${datos.pagos === 1 ? '' : 's'}`}
            />
            <Cifra
              etiqueta="Clientes"
              valor={String(datos.clientes)}
              detalle="distintos en el periodo"
            />
            <Cifra
              etiqueta="Renovaciones"
              valor={dinero(datos.renovaciones.totalEnCentavos, datos.moneda)}
              detalle={`${datos.renovaciones.pagos} de ${datos.pagos}`}
            />
          </div>

          {datos.moneda === 'MIXTA' && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Hay pagos en más de una moneda en este periodo. El total suma
              importes que no son comparables; míralo por proveedor.
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Por proveedor
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(datos.porProveedor).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="text-on-surface-variant">{k}</span>
                    <span className="text-on-surface">
                      {dinero(v.totalEnCentavos, datos.moneda)} · {v.pagos}
                    </span>
                  </li>
                ))}
                {Object.keys(datos.porProveedor).length === 0 && (
                  <li className="text-on-surface-variant">Sin pagos.</li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Mensual vs anual
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(datos.porIntervalo).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="text-on-surface-variant">
                      {k === 'annual' ? 'anual' : k === 'monthly' ? 'mensual' : k}
                    </span>
                    <span className="text-on-surface">
                      {dinero(v.totalEnCentavos, datos.moneda)} · {v.pagos}
                    </span>
                  </li>
                ))}
                {Object.keys(datos.porIntervalo).length === 0 && (
                  <li className="text-on-surface-variant">Sin pagos.</li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
