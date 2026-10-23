import type { AnalysisClauseItem } from '@/types/analysis-view.types';

/**
 * El rotulo sale del VEREDICTO de la clausula, no de su importancia.
 * Antes decia siempre "Estándar" por estar en la lista de poco peso, lo que
 * afirmaba que la clausula es normal sin haberlo evaluado nunca.
 */
const VEREDICTO = {
  estandar: {
    border: 'border-emerald-400',
    badge: 'bg-emerald-50 text-emerald-800',
    label: 'Habitual',
  },
  desfavorable: {
    border: 'border-amber-400',
    badge: 'bg-amber-50 text-amber-800',
    label: 'En tu contra',
  },
  abusiva: {
    border: 'border-red-400',
    badge: 'bg-red-50 text-red-800',
    label: 'Posiblemente abusiva',
  },
} as const;

// Sin veredicto (analisis viejos) el rotulo es neutro: no afirma nada.
const SIN_VEREDICTO = {
  border: 'border-outline-variant',
  badge: 'bg-surface-container text-on-surface-variant',
  label: 'Cláusula',
} as const;

export function AnalysisStandardClauseCard({ clause }: { clause: AnalysisClauseItem }) {
  const estilo = clause.assessment ? VEREDICTO[clause.assessment] : SIN_VEREDICTO;

  return (
    <article
      className={`overflow-hidden rounded-2xl border-l-4 bg-surface shadow-soft transition hover:shadow-card ${estilo.border}`}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4">
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${estilo.badge}`}>
            {estilo.label}
          </span>
          <h3 className="mt-2 font-display text-lg font-bold">
            {clause.section}: {clause.title}
          </h3>
        </div>

        {clause.explanation && (
          <p className="text-sm leading-relaxed text-on-surface">{clause.explanation}</p>
        )}

        {clause.meaning && (
          <div className="mt-4 border-l-2 border-primary/40 pl-4">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Qué implica para ti
            </p>
            <p className="mt-1 text-sm leading-relaxed text-on-surface">{clause.meaning}</p>
          </div>
        )}

        <p className="mt-4 text-sm italic leading-relaxed text-on-surface-variant">
          &ldquo;{clause.excerpt}&rdquo;
        </p>

        {clause.lawRef && (
          <p className="mt-4 text-xs font-semibold text-primary">Ref: {clause.lawRef}</p>
        )}
      </div>
    </article>
  );
}
