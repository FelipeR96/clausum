import type { AnalysisRisk } from '@clausum/shared';
import { BotonCopiar } from '@/components/ui/BotonCopiar';
import { formatLawReference } from '@/utils/law-reference';

/**
 * Un riesgo con todo lo que se pago.
 *
 * Es la contraparte de PreviewRiskCard: alli estan el nivel, el titulo y la
 * cita; aqui se anade el juicio --en que consiste, que pasa si se aplica,
 * que pedir y con que redaccion-- que es lo que se cobra.
 *
 * Cada bloque se pinta solo si trae texto. Antes de esto el informe
 * rellenaba los huecos con frases genericas del tipo "revisar con asesoria
 * legal", que es justo lo que la primera usuaria describio como inutil. Mas
 * vale no pintar la caja que pintarla con relleno.
 */

const ESTILO = {
  high: {
    tarjeta: 'risk-card-high',
    insignia: 'bg-red-600 text-white',
    etiqueta: 'Riesgo alto',
  },
  medium: {
    tarjeta: 'risk-card-medium',
    insignia: 'bg-amber-500 text-white',
    etiqueta: 'Riesgo medio',
  },
  low: {
    tarjeta: 'border border-outline-variant bg-surface',
    insignia: 'bg-on-surface/10 text-on-surface-variant',
    etiqueta: 'Riesgo bajo',
  },
} as const;

export function ReportRiskCard({ risk }: { risk: AnalysisRisk }) {
  const estilo = ESTILO[risk.level] ?? ESTILO.low;
  const tienePlaybook = Boolean(risk.recommendation || risk.suggestedWording);

  return (
    <article className={`${estilo.tarjeta} rounded-2xl p-6 shadow-soft sm:p-8`}>
      <div className="flex flex-col gap-8 md:flex-row">
        <div className={tienePlaybook ? 'md:w-2/3' : 'md:w-full'}>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${estilo.insignia}`}
            >
              {estilo.etiqueta}
            </span>
            {risk.clauseRef && (
              <span className="text-sm font-medium text-on-surface-variant">
                {risk.clauseRef}
              </span>
            )}
          </div>

          <h3 className="mb-4 font-display text-xl font-bold text-on-surface">
            {risk.title}
          </h3>

          {risk.description && (
            <p className="text-sm leading-relaxed text-on-surface-variant sm:text-base">
              {risk.description}
            </p>
          )}

          {risk.excerpt && (
            <p className="mt-4 border-l-2 border-outline-variant pl-4 text-sm italic leading-relaxed text-on-surface-variant">
              &ldquo;{risk.excerpt}&rdquo;
            </p>
          )}

          {/* El impacto contesta "y eso a mí qué me hace", que es la razón por
              la que alguien sigue leyendo. Va destacado. */}
          {risk.impact && (
            <div className="mt-5 rounded-xl bg-surface-container/70 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Si esto se aplica
              </span>
              <p className="mt-1 text-sm leading-relaxed text-on-surface">{risk.impact}</p>
            </div>
          )}

          {risk.lawReferences && risk.lawReferences.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
              {risk.lawReferences.map((ley, i) => (
                <span
                  key={`${ley.lawId}-${ley.article}-${i}`}
                  className="flex items-center gap-1 text-sm text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    gavel
                  </span>
                  {formatLawReference(ley)}
                </span>
              ))}
            </div>
          )}
        </div>

        {tienePlaybook && (
          <div className="flex flex-col gap-5 rounded-xl border border-outline-variant/60 bg-surface p-6 md:w-1/3">
            {risk.recommendation && (
              <div>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Qué pedir
                </span>
                <p className="text-sm leading-relaxed text-on-surface">
                  {risk.recommendation}
                </p>
              </div>
            )}

            {risk.suggestedWording && (
              <div className="border-t border-outline-variant/60 pt-5">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Redacción sugerida
                </span>
                <p className="text-sm italic leading-relaxed text-on-surface-variant">
                  {risk.suggestedWording}
                </p>
                <BotonCopiar texto={risk.suggestedWording} />
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
