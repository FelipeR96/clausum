import { useEffect, useState } from 'react';
import {
  fetchAdminPricing,
  savePricing,
  type Pricing,
} from '@/services/admin.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

/**
 * Los precios se guardan en centavos, pero escribirlos en centavos es como
 * se cobra 100 veces de mas sin darse cuenta. Aqui se escribe en la unidad
 * normal de la moneda (35.000 COP, 10 USD) y debajo se muestra en todo
 * momento lo que se va a guardar.
 */
function aUnidades(centavos: number): string {
  return String(centavos / 100);
}

function aCentavos(unidades: string): number {
  return Math.round(Number(unidades) * 100);
}

interface CampoProps {
  etiqueta: string;
  moneda: string;
  valor: string;
  onChange: (v: string) => void;
}

function CampoPrecio({ etiqueta, moneda, valor, onChange }: CampoProps) {
  const centavos = aCentavos(valor);
  const valido = Number.isInteger(centavos) && centavos > 0;

  return (
    <label className="block">
      <span className="text-sm font-medium text-on-surface">{etiqueta}</span>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="number"
          min={0}
          step="any"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="w-40 rounded-xl border border-outline/40 bg-surface px-4 py-2 text-sm text-on-surface"
        />
        <span className="text-sm text-on-surface-variant">{moneda}</span>
      </div>
      <span
        className={
          valido
            ? 'mt-1 block text-xs text-on-surface-variant'
            : 'mt-1 block text-xs text-error'
        }
      >
        {valido
          ? `Se guardará como ${centavos.toLocaleString('es-CO')} centavos`
          : 'Tiene que ser un número mayor que cero'}
      </span>
    </label>
  );
}

export function AdminPricingSection() {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [coMensual, setCoMensual] = useState('');
  const [coAnual, setCoAnual] = useState('');
  const [latamMensual, setLatamMensual] = useState('');
  const [latamAnual, setLatamAnual] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    fetchAdminPricing()
      .then((p) => {
        if (!vigente) return;
        setPricing(p);
        setCoMensual(aUnidades(p.CO.monthlyAmountInCents));
        setCoAnual(aUnidades(p.CO.yearlyAmountInCents));
        setLatamMensual(aUnidades(p.LATAM.monthlyAmountInCents));
        setLatamAnual(aUnidades(p.LATAM.yearlyAmountInCents));
      })
      .catch((err) => {
        if (vigente) setError(getUserFacingErrorMessage(err));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  async function guardar() {
    if (!pricing) return;
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const resultado = await savePricing({
        CO: {
          monthlyAmountInCents: aCentavos(coMensual),
          yearlyAmountInCents: aCentavos(coAnual),
          currency: pricing.CO.currency,
        },
        LATAM: {
          monthlyAmountInCents: aCentavos(latamMensual),
          yearlyAmountInCents: aCentavos(latamAnual),
          currency: pricing.LATAM.currency,
        },
      });
      setPricing(resultado);
      setAviso(resultado.message);
    } catch (err) {
      setError(getUserFacingErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <section className="glass-panel rounded-2xl p-6 sm:p-8">
        <p className="text-sm text-on-surface-variant">Cargando precios…</p>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-2xl p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-on-surface">Precios</h2>
      <p className="mt-1 text-sm text-on-surface-variant">
        Es la misma fuente que usa el cobro. Afecta a cobros nuevos y usuarios
        nuevos; quien ya está suscrito mantiene el precio al que se suscribió.
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Colombia · {pricing?.CO.currency}
          </h3>
          <CampoPrecio
            etiqueta="Mensual"
            moneda={pricing?.CO.currency ?? ''}
            valor={coMensual}
            onChange={setCoMensual}
          />
          <CampoPrecio
            etiqueta="Anual"
            moneda={pricing?.CO.currency ?? ''}
            valor={coAnual}
            onChange={setCoAnual}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Resto de LATAM · {pricing?.LATAM.currency}
          </h3>
          <CampoPrecio
            etiqueta="Mensual"
            moneda={pricing?.LATAM.currency ?? ''}
            valor={latamMensual}
            onChange={setLatamMensual}
          />
          <CampoPrecio
            etiqueta="Anual"
            moneda={pricing?.LATAM.currency ?? ''}
            valor={latamAnual}
            onChange={setLatamAnual}
          />
        </div>
      </div>

      {error && (
        <p className="mt-5 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      {aviso && <p className="mt-5 text-sm text-primary">{aviso}</p>}

      <div className="mt-6 flex items-center gap-4 border-t border-outline/20 pt-5">
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={guardando}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar precios'}
        </button>
        {pricing?.updatedAt && (
          <span className="text-xs text-on-surface-variant">
            Último cambio:{' '}
            {new Intl.DateTimeFormat('es-CO', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(pricing.updatedAt))}
          </span>
        )}
      </div>
    </section>
  );
}
