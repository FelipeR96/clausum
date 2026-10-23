import { Link } from 'react-router-dom';
import type { AnalysisClauseItem } from '@/types/analysis-view.types';
import { contractRiskProfilePath } from '@/utils/risk-routes';

const TEASER_STYLES = {
  critical: {
    border: 'border-red-300',
    badge: 'bg-red-100 text-red-800',
    label: 'Riesgo crítico',
    icon: 'error',
  },
  moderate: {
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800',
    label: 'Riesgo moderado',
    icon: 'warning',
  },
  standard: {
    border: 'border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800',
    label: 'Estándar',
    icon: 'check_circle',
  },
} as const;

const VEREDICTO_STYLES = {
  estandar: {
    border: 'border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800',
    label: 'Habitual',
    icon: 'check_circle',
  },
  desfavorable: {
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800',
    label: 'En tu contra',
    icon: 'warning',
  },
  abusiva: {
    border: 'border-red-300',
    badge: 'bg-red-100 text-red-800',
    label: 'Posiblemente abusiva',
    icon: 'gpp_maybe',
  },
} as const;

type AnalysisRiskTeaserCardProps = {
  clause: AnalysisClauseItem;
  contractId: string;
  locked: boolean;
};

export function AnalysisRiskTeaserCard({
  clause,
  contractId,
  locked,
}: AnalysisRiskTeaserCardProps) {
  // El rotulo usa el veredicto cuando existe. Antes decia "Riesgo crítico"
  // por el solo hecho de ser una clausula importante: una clausula de precio
  // perfectamente normal salia marcada en rojo.
  const style = clause.assessment
    ? VEREDICTO_STYLES[clause.assessment]
    : TEASER_STYLES[clause.severity];
  const riskPath = contractRiskProfilePath(contractId);
  const ctaPath = locked ? '/pricing' : riskPath;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-surface/80 shadow-soft ${style.border}`}
    >
      {locked && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-surface/60 to-surface" />
      )}
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}
            >
              <span className="material-symbols-outlined text-sm">{style.icon}</span>
              {style.label}
            </span>
            <h3 className="mt-2 font-display text-lg font-bold text-on-surface">
              {clause.section}: {clause.title}
            </h3>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant">
            {locked ? 'lock' : 'verified_user'}
          </span>
        </div>

        {clause.explanation && (
          <p className="mt-3 text-sm leading-relaxed text-on-surface">{clause.explanation}</p>
        )}

        {/* "meaning" sale del analisis general, que tambien tiene el plan
            gratuito: no se difumina. Lo reservado a Pro es el perfil de
            riesgo (exposicion, recomendacion, redaccion sugerida). */}
        {clause.meaning && (
          <div className="mt-4 border-l-2 border-primary/40 pl-4">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Qué implica para ti
            </p>
            <p className="mt-1 text-sm leading-relaxed text-on-surface">{clause.meaning}</p>
          </div>
        )}

        <p
          className={`mt-4 text-sm italic leading-relaxed text-on-surface-variant ${
            locked ? 'select-none blur-[3px]' : ''
          }`}
        >
          &ldquo;{clause.excerpt}&rdquo;
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/60 pt-4">
          <p className="text-xs text-on-surface-variant">
            {locked
              ? 'Actualiza a Pro para ver exposición y recomendación'
              : 'Detalle, exposición y recomendación disponibles en el perfil de riesgo'}
          </p>
          <Link
            to={ctaPath}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {locked ? 'Actualizar a Pro' : 'Ver perfil completo'}
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
