import { useEffect, useState } from 'react';
import {
  fetchComisiones,
  saveComisiones,
  type Comisiones,
  type Tarifa,
} from '@/services/admin.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

/** Lo que el formulario maneja: texto, para no pelear con el input. */
type TarifaTexto = { porcentaje: string; fijo: string };

const VACIA: TarifaTexto = { porcentaje: '', fijo: '' };

function aTexto(t: Tarifa | null): TarifaTexto {
  if (!t) return VACIA;
  return { porcentaje: String(t.porcentaje), fijo: String(t.fijoEnCentavos / 100) };
}

function aTarifa(t: TarifaTexto): Tarifa | null {
  const p = Number(t.porcentaje);
  const f = Number(t.fijo);
  if (t.porcentaje.trim() === '' && t.fijo.trim() === '') return null;
  if (!Number.isFinite(p) || !Number.isFinite(f)) return null;
  return { porcentaje: p, fijoEnCentavos: Math.round(f * 100) };
}

function FilaTarifa({
  etiqueta,
  moneda,
  valor,
  onChange,
  opcional,
}: {
  etiqueta: string;
  moneda: string;
  valor: TarifaTexto;
  onChange: (v: TarifaTexto) => void;
  opcional?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <span className="w-28 text-sm text-on-surface">{etiqueta}</span>
      <label className="text-xs text-on-surface-variant">
        %
        <input
          type="number"
          step="0.01"
          min="0"
          value={valor.porcentaje}
          onChange={(e) => onChange({ ...valor, porcentaje: e.target.value })}
          className="mt-1 block w-24 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm text-on-surface"
        />
      </label>
      <label className="text-xs text-on-surface-variant">
        Fijo ({moneda})
        <input
          type="number"
          step="0.01"
          min="0"
          value={valor.fijo}
          onChange={(e) => onChange({ ...valor, fijo: e.target.value })}
          className="mt-1 block w-32 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm text-on-surface"
        />
      </label>
      {opcional && valor.porcentaje.trim() === '' && valor.fijo.trim() === '' && (
        <span className="pb-2 text-xs text-amber-700 dark:text-amber-400">
          sin configurar
        </span>
      )}
    </div>
  );
}

export function AdminComisionesSection() {
  const [wompi, setWompi] = useState<Record<string, TarifaTexto>>({
    tarjeta: VACIA,
    pse: VACIA,
    nequi: VACIA,
    otro: VACIA,
  });
  const [paypal, setPaypal] = useState<TarifaTexto>(VACIA);
  const [iva, setIva] = useState('19');
  const [meta, setMeta] = useState<{ updatedAt?: string; updatedBy?: string }>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function aplicar(c: Comisiones) {
    setWompi({
      tarjeta: aTexto(c.wompi.tarjeta),
      pse: aTexto(c.wompi.pse),
      nequi: aTexto(c.wompi.nequi),
      otro: aTexto(c.wompi.otro),
    });
    setPaypal(aTexto(c.paypal));
    setIva(String(c.ivaSobreComision));
    setMeta({ updatedAt: c.updatedAt, updatedBy: c.updatedBy });
  }

  useEffect(() => {
    void (async () => {
      try {
        aplicar(await fetchComisiones());
      } catch (err) {
        setError(getUserFacingErrorMessage(err, { action: 'cargar las comisiones' }));
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function guardar() {
    setGuardando(true);
    setError(null);
    setOk(false);
    try {
      const t = (k: string) => aTarifa(wompi[k]);
      if (!t('tarjeta') || !t('pse') || !t('nequi') || !t('otro')) {
        setError('Las cuatro tarifas de Wompi son obligatorias.');
        return;
      }
      aplicar(
        await saveComisiones({
          wompi: {
            tarjeta: t('tarjeta')!,
            pse: t('pse')!,
            nequi: t('nequi')!,
            otro: t('otro')!,
          },
          paypal: aTarifa(paypal),
          ivaSobreComision: Number(iva),
        }),
      );
      setOk(true);
    } catch (err) {
      setError(getUserFacingErrorMessage(err, { action: 'guardar las comisiones' }));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="glass-panel rounded-2xl p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-on-surface">
        Comisiones de las pasarelas
      </h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        Lo que cobra cada pasarela por recibir el pago. Se usa para calcular el
        neto en Ingresos. Si una queda sin configurar, su comisión cuenta como
        cero y el neto sale más alto de lo real.{' '}
        <strong>Pon aquí lo que diga tu contrato</strong>, no lo que diga la
        página pública: la tarifa se negocia.
      </p>

      {cargando ? (
        <p className="mt-6 text-sm text-on-surface-variant">Cargando…</p>
      ) : (
        <>
          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Wompi (COP)
          </h3>
          <div className="mt-3 space-y-3">
            <FilaTarifa
              etiqueta="Tarjeta"
              moneda="COP"
              valor={wompi.tarjeta}
              onChange={(v) => setWompi({ ...wompi, tarjeta: v })}
            />
            <FilaTarifa
              etiqueta="PSE"
              moneda="COP"
              valor={wompi.pse}
              onChange={(v) => setWompi({ ...wompi, pse: v })}
            />
            <FilaTarifa
              etiqueta="Nequi"
              moneda="COP"
              valor={wompi.nequi}
              onChange={(v) => setWompi({ ...wompi, nequi: v })}
            />
            <FilaTarifa
              etiqueta="Otros medios"
              moneda="COP"
              valor={wompi.otro}
              onChange={(v) => setWompi({ ...wompi, otro: v })}
            />
          </div>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            PayPal (USD)
          </h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            Depende del país del comprador y de tu cuenta. Míralo en tu panel de
            PayPal y cópialo aquí; mientras esté vacío no se resta nada.
          </p>
          <div className="mt-3">
            <FilaTarifa
              etiqueta="Internacional"
              moneda="USD"
              valor={paypal}
              onChange={setPaypal}
              opcional
            />
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-3">
            <label className="text-xs text-on-surface-variant">
              IVA sobre la comisión (%)
              <input
                type="number"
                step="1"
                min="0"
                value={iva}
                onChange={(e) => setIva(e.target.value)}
                className="mt-1 block w-24 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm text-on-surface"
              />
            </label>
            <button
              type="button"
              disabled={guardando}
              onClick={() => void guardar()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary/90 disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            {ok && (
              <span className="pb-2 text-sm text-green-700 dark:text-green-400">
                Guardado.
              </span>
            )}
          </div>

          {meta.updatedAt && (
            <p className="mt-3 text-xs text-on-surface-variant">
              Última modificación: {new Date(meta.updatedAt).toLocaleString('es-CO')}
              {meta.updatedBy ? ` · ${meta.updatedBy}` : ''}
            </p>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </>
      )}
    </section>
  );
}
