import { useState } from 'react';
import { formatAmount, type SingleAnalysisPreview } from '@clausum/shared';
import { AnalysisVerdictBanner } from '@/components/analysis-result/AnalysisVerdictBanner';
import { AvisoAntesDePagar } from '@/components/billing/AvisoAntesDePagar';
import { PreviewRiskCard } from '@/components/single/PreviewRiskCard';
import { iniciarCobroSuelto } from '@/services/single-analysis.service';
import { submitWompiCheckoutForm } from '@/services/subscription.service';
import { getUserFacingErrorMessage } from '@/services/api/user-facing-errors';

/**
 * Lo que ve quien ya tiene su analisis hecho y todavia no ha pagado.
 *
 * El orden de la pantalla es el argumento de venta, y no es arbitrario:
 *
 *  1. El VEREDICTO primero. Es lo que la persona vino a saber --si le
 *     conviene firmar-- y se da gratis.
 *  2. El conteo de riesgos. Una cifra concreta sobre SU contrato.
 *  3. Cada riesgo con su cita textual del documento, y debajo, con candado,
 *     los nombres de lo que falta: que te pasa si se aplica, que pedir, con
 *     que redaccion.
 *
 * Primero se demuestra que leimos su contrato; el precio aparece despues.
 * Al reves --precio arriba, pruebas abajo-- se pide confianza antes de
 * haberla ganado.
 */

type PaywallPanelProps = {
  preview: SingleAnalysisPreview;
  amountInCents: number;
  currency: string;
  truncado: boolean;
  reference: string;
};

function Cifra({
  valor,
  etiqueta,
  color,
}: {
  valor: number;
  etiqueta: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-surface p-4 text-center shadow-soft">
      <p className={`font-display text-3xl font-bold ${color}`}>{valor}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        {etiqueta}
      </p>
    </div>
  );
}

export function PaywallPanel({
  preview,
  amountInCents,
  currency,
  truncado,
  reference,
}: PaywallPanelProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { high, medium, low } = preview.riskCounts;
  const limpio = high + medium + low === 0;

  async function pagar() {
    setCargando(true);
    setError(null);
    try {
      const checkout = await iniciarCobroSuelto(reference);

      if (checkout.provider === 'paypal') {
        window.location.assign(checkout.approveUrl);
        return;
      }

      submitWompiCheckoutForm(checkout);
    } catch (err) {
      setError(getUserFacingErrorMessage(err));
      setCargando(false);
    }
  }

  return (
    <div className="space-y-8">
      <AnalysisVerdictBanner favorability={preview.favorability} />

      {truncado && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="font-semibold">Tu contrato es muy largo.</span> El análisis
          cubre la primera parte del texto, no el documento completo. Lo decimos antes de
          que pagues para que decidas con esto a la vista.
        </div>
      )}

      {preview.summary && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold text-on-surface">
            Qué dice tu contrato
          </h2>
          <p className="text-sm leading-relaxed text-on-surface-variant sm:text-base">
            {preview.summary}
          </p>
        </section>
      )}

      <section className="grid grid-cols-3 gap-3">
        <Cifra valor={high} etiqueta="Riesgos altos" color="text-red-600" />
        <Cifra valor={medium} etiqueta="Riesgos medios" color="text-amber-600" />
        <Cifra
          valor={preview.totalClauses}
          etiqueta="Cláusulas revisadas"
          color="text-on-surface"
        />
      </section>

      {limpio ? (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6">
          <h2 className="font-display text-xl font-bold text-emerald-900">
            No encontramos riesgos relevantes
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900">
            El informe completo incluye el detalle de las {preview.totalClauses} cláusulas
            y el análisis de cada una. Si lo que querías era saber si hay trampas, ya lo
            sabes: no las hay. Decirte eso es gratis.
          </p>
        </section>
      ) : (
        <section>
          <h2 className="mb-2 font-display text-xl font-bold text-on-surface">
            Lo que encontramos en tu contrato
          </h2>
          <p className="mb-5 text-sm text-on-surface-variant">
            Las citas son texto de tu documento. Lo que está bajo candado no se ha
            descargado a tu navegador: no hay nada que revelar ahí abajo.
          </p>
          <div className="space-y-5">
            {preview.risks.map((risk, i) => (
              <PreviewRiskCard key={`${risk.title}-${i}`} risk={risk} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-outline-variant bg-surface p-6 shadow-soft sm:p-8">
        <h2 className="font-display text-2xl font-bold text-on-surface">
          Desbloquea el informe completo
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
          {limpio
            ? 'El detalle cláusula por cláusula, con qué significa cada una en lenguaje claro.'
            : `De cada uno de los ${high + medium + low} riesgos: en qué consiste, qué te pasa si se aplica, qué pedir y la redacción exacta para pedirlo.`}
        </p>

        <p className="mt-6 font-display text-4xl font-bold text-on-surface">
          {formatAmount(amountInCents, currency)}
        </p>
        <p className="text-sm text-on-surface-variant">
          Pago único. Sin cuenta, sin suscripción, sin renovaciones.
        </p>

        <button
          type="button"
          onClick={() => void pagar()}
          disabled={cargando}
          className="mt-6 w-full rounded-full bg-primary px-6 py-3.5 font-semibold text-on-primary transition hover:brightness-110 disabled:opacity-60"
        >
          {cargando ? 'Abriendo el pago…' : 'Pagar y ver el informe'}
        </button>

        {error && (
          <p className="mt-3 text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <AvisoAntesDePagar />
      </section>
    </div>
  );
}
