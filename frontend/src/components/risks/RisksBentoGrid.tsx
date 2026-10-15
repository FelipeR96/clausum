import type { ReactNode } from 'react';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';

type RiskCardProps = {
  className: string;
  delayMs: number;
  children: ReactNode;
};

function RiskCard({ className, delayMs, children }: RiskCardProps) {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal flex flex-col gap-4 rounded-3xl p-8 transition hover:-translate-y-1 hover:shadow-soft ${className}`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

export function RisksBentoGrid() {
  const headerRef = useRevealOnScroll<HTMLDivElement>();

  return (
    <section className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div ref={headerRef} className="reveal mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Niveles de riesgo
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            Inteligencia de riesgo multicapa
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant">
            Cada hallazgo se clasifica por severidad y se cruza con el corpus
            legal disponible para que priorices la negociación.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <RiskCard
            className="risk-glow-red border border-red-200/50 bg-surface"
            delayMs={0}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <span
                className="material-symbols-outlined text-red-600"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                report
              </span>
            </span>
            <h3 className="font-display text-xl font-bold">Alertas rojas</h3>
            <p className="text-sm text-on-surface-variant">
              Amenazas inmediatas: indemnización unilateral, responsabilidad
              ilimitada, terminación unilateral sin contraprestación.
            </p>
            <ul className="mt-auto space-y-2 pt-4">
              {['Límites de responsabilidad', 'Ley aplicable'].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm font-medium text-red-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {item}
                </li>
              ))}
            </ul>
          </RiskCard>

          <RiskCard
            className="risk-glow-amber border border-amber-200/50 bg-surface"
            delayMs={80}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
              <span
                className="material-symbols-outlined text-amber-600"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                priority_high
              </span>
            </span>
            <h3 className="font-display text-xl font-bold">Advertencias ámbar</h3>
            <p className="text-sm text-on-surface-variant">
              Lenguaje ambiguo, plazos poco claros o renovaciones automáticas que
              conviene negociar antes de firmar.
            </p>
            <ul className="mt-auto space-y-2 pt-4">
              {['Plazos ambiguos', 'Renovaciones automáticas'].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm font-medium text-amber-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          </RiskCard>

          <RiskCard className="bg-primary text-on-primary shadow-card" delayMs={160}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <span className="material-symbols-outlined">gavel</span>
            </span>
            <h3 className="font-display text-xl font-bold">Contexto normativo</h3>
            <p className="text-sm text-on-primary/85">
              Cada riesgo puede incluir referencias a leyes y artículos del corpus
              colombiano recuperados por RAG (hasta 25 por análisis).
            </p>
            <div className="mt-auto pt-4">
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-3/4 rounded-full bg-primary-container" />
              </div>
              <p className="mt-2 text-xs uppercase tracking-wide text-on-primary/70">
                Free: alertas básicas · Pro: alertas avanzadas
              </p>
            </div>
          </RiskCard>
        </div>
      </div>
    </section>
  );
}
