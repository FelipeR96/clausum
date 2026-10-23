import type { AnalysisResultData } from '@/types/analysis-view.types';

/**
 * Veredicto global del contrato.
 *
 * Existe porque la cifra de portada del informe era el "indice de claridad",
 * que mide como esta redactado el contrato. La gente no abre un analisis para
 * saber si esta bien redactado: lo abre para saber si le conviene firmarlo.
 * Son dos preguntas y ahora se contestan por separado.
 *
 * Los analisis hechos antes de este cambio no traen veredicto. En ese caso el
 * componente no pinta nada, en vez de inventar un "equilibrado" por defecto.
 */
const ESTILO = {
  favorable: {
    etiqueta: 'Favorable para ti',
    marco: 'border-emerald-300 bg-emerald-50',
    texto: 'text-emerald-900',
    acento: 'text-emerald-700',
    icono: 'verified',
  },
  equilibrado: {
    etiqueta: 'Equilibrado',
    marco: 'border-outline-variant bg-primary-container/30',
    texto: 'text-on-primary-container',
    acento: 'text-primary',
    icono: 'balance',
  },
  desfavorable: {
    etiqueta: 'Desfavorable para ti',
    marco: 'border-amber-300 bg-amber-50',
    texto: 'text-amber-900',
    acento: 'text-amber-700',
    icono: 'warning',
  },
  muy_desfavorable: {
    etiqueta: 'Muy desfavorable para ti',
    marco: 'border-red-300 bg-red-50',
    texto: 'text-red-900',
    acento: 'text-red-700',
    icono: 'gpp_maybe',
  },
} as const;

export function AnalysisVerdictBanner({ data }: { data: AnalysisResultData }) {
  const fav = data.favorability;
  if (!fav || (!fav.rationale && !fav.forWhom)) return null;

  const estilo = ESTILO[fav.verdict] ?? ESTILO.equilibrado;

  return (
    <section
      className={`mb-8 rounded-2xl border p-6 shadow-soft sm:p-7 ${estilo.marco}`}
      aria-label="Veredicto del contrato"
    >
      <div className="flex items-start gap-4">
        <span
          className={`material-symbols-outlined text-3xl ${estilo.acento}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          {estilo.icono}
        </span>
        <div className="min-w-0">
          <p className={`text-xs font-bold uppercase tracking-wide ${estilo.acento}`}>
            Veredicto
          </p>
          <h2 className={`font-display text-2xl font-bold ${estilo.texto}`}>
            {estilo.etiqueta}
          </h2>

          {fav.forWhom && (
            <p className={`mt-2 text-sm ${estilo.texto}`}>
              Beneficia a <span className="font-semibold">{fav.forWhom}</span>.
            </p>
          )}

          {fav.rationale && (
            <p className={`mt-2 text-sm leading-relaxed ${estilo.texto}`}>
              {fav.rationale}
            </p>
          )}

          <p className="mt-4 text-xs text-on-surface-variant">
            Esto no es asesoría legal. El índice de claridad mide cómo está redactado el
            contrato; el veredicto mide a quién favorece.
          </p>
        </div>
      </div>
    </section>
  );
}
