import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';

const DASHBOARD_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuATstGi2MmKOTEch9L5wZ97p1LzKetw2gn8U4HBcxlYfhtZCWDTn-gkI3NgT82mbfUK5vDYqm_fmwlxIZ4u8xfQVtoYJ6EBnigNLXj6-Nz9AwzAyuBSxZsCb17JkoE6Okg5VnIfIE0lNw8GRgJQVUC25CkTQdRP6Hfwi1a0x3raWS93yhp0qA8dt7XUrPBI7rUL1-TbPciGeFK5OYuz4eHuxHD3a-P6dUHz9YY08zFCL_InGxotqLZ88ukQcCR2RfQdsx2Nwh0XsJD0';

const STEPS = [
  {
    title: 'Informe priorizado',
    description:
      'Obtén riesgos ordenados por severidad con descripción clara y cláusula afectada en cada hallazgo.',
  },
  {
    title: 'Referencias legales',
    description:
      'Cada alerta puede citar artículos del corpus normativo colombiano para fundamentar la revisión.',
  },
  {
    title: 'Alertas en la app',
    description:
      'Free recibe alertas básicas (riesgos altos y medios). Pro desbloquea alertas avanzadas y detalle completo.',
  },
] as const;

export function RisksPortfolioSection() {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <section className="bg-surface-container py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-3xl border border-outline-variant bg-surface p-2 shadow-card">
              <div className="group relative aspect-video overflow-hidden rounded-2xl">
                <div
                  className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${DASHBOARD_IMAGE}')` }}
                  role="img"
                  aria-label="Tablero de riesgos legales con visualizaciones de datos"
                />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-primary/70 to-transparent p-6 sm:p-8">
                  <p className="text-sm font-medium italic text-on-primary sm:text-base">
                    Prioriza cláusulas críticas antes de la firma, no después de un
                    litigio.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div ref={ref} className="reveal order-1 space-y-8 lg:order-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Flujo de trabajo
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-on-surface sm:text-4xl">
                Del PDF al informe de riesgos
              </h2>
            </div>

            <div className="space-y-6">
              {STEPS.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-on-surface">
                      {step.title}
                    </h4>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
