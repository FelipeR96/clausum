import { Link } from 'react-router-dom';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { useFeatureCtaDestination } from '@/hooks/useMarketingDestination';

export function RisksHero() {
  const ref = useRevealOnScroll<HTMLDivElement>();
  const risksCta = useFeatureCtaDestination('risks');

  return (
    <section className="relative overflow-hidden bg-surface-container py-16 sm:py-24">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-red-500/5 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:py-8">
        <div ref={ref} className="reveal z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            Análisis con IA
          </span>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight text-on-surface sm:text-5xl lg:text-[3.25rem]">
            Detectar riesgos legales en contratos{' '}
            <span className="text-red-700">antes de firmar</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-on-surface-variant">
            Clausum escanea cláusulas críticas, señala términos desfavorables y
            fundamenta cada alerta con artículos del marco normativo colombiano.
            Incluido en cada análisis (cuenta en tu cuota mensual).
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to={risksCta}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
            >
              Analizar mi primer contrato
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </Link>
            <Link
              to="/analizar-contratos"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface px-7 py-3.5 text-base font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
            >
              Cómo funciona el análisis
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="risk-glow-red relative overflow-hidden rounded-3xl border border-red-200/60 bg-surface p-6 shadow-card">
            <div className="mb-6 flex items-center justify-between border-b border-outline-variant pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                <span className="font-display font-semibold">Acuerdo_de_Servicio_v4.pdf</span>
              </div>
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
              </div>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-on-surface-variant sm:text-base">
              <p>
                8.1.{' '}
                <span className="border-b-2 border-red-500 bg-red-50 px-1 text-on-surface">
                  El Contratista indemnizará al Cliente de cualquier reclamo,
                  incluso si el Cliente contribuyó por negligencia propia.
                </span>
              </p>

              <div className="ml-2 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <span
                  className="material-symbols-outlined text-red-600"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
                <div>
                  <p className="font-bold text-red-800">
                    Riesgo crítico: indemnización unilateral
                  </p>
                  <p className="mt-1 text-sm text-red-700/90">
                    Obliga a cubrir errores del cliente. Revisar reciprocidad
                    (Código Civil, art. 1602).
                  </p>
                </div>
              </div>

              <p>
                9.2.{' '}
                <span className="border-b-2 border-amber-500 bg-amber-50 px-1 text-on-surface">
                  Terminación por conveniencia con 30 días de aviso, sin
                  obligación de pago por servicios no prestados.
                </span>
              </p>
            </div>
          </div>

          <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-outline-variant bg-surface-container-high p-5 shadow-soft md:block">
            <p className="font-display text-2xl font-bold text-primary">3</p>
            <p className="max-w-[140px] text-xs text-on-surface-variant">
              análisis gratis al mes para detectar riesgos
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
