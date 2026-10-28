import { Link } from 'react-router-dom';
import type { RiskVectorItem } from '@/types/risk-alerts.types';
import { BotonCopiar } from '@/components/ui/BotonCopiar';

type RiskVectorCardProps = {
  risk: RiskVectorItem;
  contractId?: string;
};

export function RiskVectorCard({ risk, contractId }: RiskVectorCardProps) {
  const isHigh = risk.severity === 'high';
  const cardClass = isHigh ? 'risk-card-high risk-glow-red' : 'risk-card-medium risk-glow-amber';
  const badgeClass = isHigh ? 'bg-red-600 text-white' : 'bg-amber-500 text-white';
  const recBorder = isHigh ? 'border-red-100' : 'border-amber-100';
  const tienePlaybook = Boolean(risk.recommendation || risk.suggestedWording);

  return (
    <article
      className={`${cardClass} group rounded-2xl p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-card sm:p-8`}
    >
      <div className="flex flex-col gap-8 md:flex-row">
        <div className={tienePlaybook ? 'md:w-2/3' : 'md:w-full'}>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${badgeClass}`}
            >
              {isHigh ? 'Riesgo alto' : 'Riesgo medio'}
            </span>
            <span className="text-sm font-medium text-on-surface-variant">{risk.section}</span>
          </div>

          <h3 className="mb-4 font-display text-xl font-bold text-on-surface">{risk.title}</h3>
          <p className="text-sm leading-relaxed text-on-surface-variant sm:text-base">
            {risk.description}
          </p>

          {risk.excerpt && (
            <p className="mt-4 border-l-2 border-outline-variant pl-4 text-sm italic leading-relaxed text-on-surface-variant">
              &ldquo;{risk.excerpt}&rdquo;
            </p>
          )}

          {/* El impacto es la parte que contesta "y eso a mí qué me hace".
              Va destacado porque es la razon por la que alguien sigue leyendo. */}
          {risk.impact && (
            <div className="mt-5 rounded-xl bg-surface-container/70 p-4">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Si esto se aplica
              </span>
              <p className="mt-1 text-sm leading-relaxed text-on-surface">{risk.impact}</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-4">
            {contractId && (
              <Link
                to={`/panel/contratos/${contractId}/resultado`}
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-base">visibility</span>
                Ver en documento
              </Link>
            )}
            {risk.showComparisonHistory && (
              <Link
                to="/comparar-contratos"
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-base">history</span>
                Historial de comparación
              </Link>
            )}
            {risk.lawRef && (
              <span className="flex items-center gap-1 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-base">gavel</span>
                {risk.lawRef}
              </span>
            )}
          </div>
        </div>

        {/* Si no hay nada que pedir ni redaccion que proponer, la caja no se
            pinta. Antes siempre se pintaba y se rellenaba con una frase
            generica, que es lo que hacia que el playbook pareciera inutil. */}
        {tienePlaybook && (
          <div
            className={`flex flex-col gap-5 rounded-xl border bg-surface p-6 md:w-1/3 ${recBorder}`}
          >
            {risk.recommendation && (
              <div>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Qué pedir
                </span>
                <p className="text-sm leading-relaxed text-on-surface">{risk.recommendation}</p>
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
