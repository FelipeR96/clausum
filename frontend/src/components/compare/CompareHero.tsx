import { Link } from 'react-router-dom';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { useFeatureCtaDestination } from '@/hooks/useMarketingDestination';

export function CompareHero() {
  const ref = useRevealOnScroll<HTMLDivElement>();
  const compareCta = useFeatureCtaDestination('compare');

  return (
    <section className="relative overflow-hidden bg-surface-container py-16 sm:py-24">
      <div className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

      <div ref={ref} className="reveal relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Comparación con IA
          </span>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight text-on-surface sm:text-5xl lg:text-[3.25rem]">
            Comparar contratos con IA:
            <br />
            controla cada versión
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-on-surface-variant">
            Sube dos versiones del mismo contrato y Clausum resalta adiciones,
            eliminaciones y modificaciones con evaluación de riesgo. Usa{' '}
            <strong>PDF con texto seleccionable</strong> o <strong>Word (.docx)</strong> sin límite
            de páginas. En Free no admitimos PDF escaneados (Pro: OCR en las primeras 15 páginas).
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={compareCta}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-on-primary shadow-soft transition hover:bg-primary/90"
            >
              Comparar documentos
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </Link>
            <a
              href="#vista-previa"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-7 py-3.5 text-base font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
            >
              Ver vista previa
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
