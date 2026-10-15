import type { ReactNode } from 'react';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { ENTITY_IMAGE } from '@/components/analyze/AnalyzeHero';

type BentoCardProps = {
  className: string;
  delayMs?: number;
  children: ReactNode;
};

function BentoCard({ className, delayMs = 0, children }: BentoCardProps) {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

export function BentoFeatures() {
  const headerRef = useRevealOnScroll<HTMLDivElement>();

  return (
    <section id="capacidades" className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div ref={headerRef} className="reveal mx-auto mb-16 max-w-2xl space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Capacidades
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            Análisis con contexto jurídico real
          </h2>
          <p className="text-lg text-on-surface-variant">
            Clausum combina modelos de lenguaje con recuperación de artículos
            legales (RAG) para fundamentar cada alerta con el corpus normativo
            disponible.
          </p>
        </div>

        <div className="marketing-bento-grid">
          <BentoCard
            className="col-span-12 flex flex-col justify-between rounded-3xl border border-outline-variant bg-surface-container p-10 transition hover:shadow-soft lg:col-span-8"
            delayMs={0}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="max-w-md">
                <span className="material-symbols-outlined mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl text-on-primary">
                  psychology
                </span>
                <h3 className="mb-4 font-display text-xl font-bold">
                  Clasificación y entidades clave
                </h3>
                <p className="text-on-surface-variant">
                  Identifica partes, fechas de vigencia, tipo de contrato y
                  cláusulas de terminación. El clasificador usa el catálogo legal
                  de Clausum (10 tipos de contrato, 12 temas).
                </p>
              </div>
              <div className="hidden aspect-video w-1/3 overflow-hidden rounded-2xl border border-outline-variant md:block">
                <img
                  src={ENTITY_IMAGE}
                  alt="Nodos de datos legales interconectados"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-primary-container/40 px-3 py-1 text-xs font-semibold text-on-primary-container">
                Extracción PDF
              </span>
              <span className="rounded-full bg-primary-container/40 px-3 py-1 text-xs font-semibold text-on-primary-container">
                Español (CO)
              </span>
            </div>
          </BentoCard>

          <BentoCard
            className="col-span-12 flex h-full flex-col rounded-3xl bg-primary p-10 text-on-primary transition hover:shadow-card md:col-span-6 lg:col-span-4"
            delayMs={80}
          >
            <span className="material-symbols-outlined mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl">
              verified_user
            </span>
            <h3 className="mb-4 font-display text-xl font-bold">
              Referencias normativas
            </h3>
            <p className="text-on-primary/85">
              Cada análisis recupera hasta 25 artículos relevantes del corpus
              legal y los cita en el informe. Enfoque inicial: legislación
              colombiana.
            </p>
            <div className="mt-auto pt-8">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-3/4 rounded-full bg-primary-container" />
              </div>
              <p className="mt-2 text-xs text-on-primary/70">
                RAG con Firestore · búsqueda vectorial en roadmap
              </p>
            </div>
          </BentoCard>

          <BentoCard
            className="group col-span-12 rounded-3xl border border-outline-variant bg-surface p-8 transition hover:border-primary/30 hover:shadow-soft md:col-span-6 lg:col-span-4"
            delayMs={120}
          >
            <span className="material-symbols-outlined mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-primary transition-transform group-hover:rotate-12">
              file_present
            </span>
            <h4 className="mb-2 font-display text-lg font-bold">Formatos soportados</h4>
            <p className="text-sm text-on-surface-variant">
              PDF como formato principal. Free: hasta 5 MB por archivo. Pro: hasta
              10 MB. PDFs escaneados sin texto pueden requerir OCR.
            </p>
          </BentoCard>

          <BentoCard
            className="col-span-12 rounded-3xl border border-outline-variant bg-surface p-8 transition hover:border-primary/30 hover:shadow-soft md:col-span-6 lg:col-span-4"
            delayMs={160}
          >
            <div className="mb-4 flex items-center gap-4">
              <span className="rounded-full bg-primary-container px-3 py-1 font-mono text-sm font-semibold text-on-primary-container">
                ~30s
              </span>
              <h4 className="font-display text-lg font-bold">Análisis en la nube</h4>
            </div>
            <p className="text-sm text-on-surface-variant">
              Procesamiento vía Cloud Functions con DeepSeek. El tiempo depende
              del tamaño del documento y la carga del servicio.
            </p>
          </BentoCard>

          <BentoCard
            className="group col-span-12 rounded-3xl border border-outline-variant bg-surface p-8 transition hover:border-primary/30 hover:shadow-soft md:col-span-6 lg:col-span-4"
            delayMs={200}
          >
            <span className="material-symbols-outlined mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-transform group-hover:scale-110">
              warning
            </span>
            <h4 className="mb-2 font-display text-lg font-bold">Detección de alertas</h4>
            <p className="text-sm text-on-surface-variant">
              Riesgos priorizados, cláusulas no estándar, penalidades y renovaciones
              automáticas. Free incluye alertas básicas; Pro añade alertas avanzadas.
            </p>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
