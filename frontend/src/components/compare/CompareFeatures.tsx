import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';

const FEATURES = [
  {
    icon: 'psychology',
    title: 'Diff semántico',
    description:
      'La IA detecta cambios de significado aunque la redacción se parafrasee, no solo diferencias literales de texto.',
  },
  {
    icon: 'history',
    title: 'Iteraciones de negociación',
    description:
      'Compara la versión que enviaste con la que devolvió la contraparte y prioriza qué revisar primero.',
  },
  {
    icon: 'report_problem',
    title: 'Impacto en riesgo',
    description:
      'Cada cambio se evalúa con el mismo motor de riesgos del análisis individual y contexto legal RAG.',
  },
] as const;

function FeatureCard({
  icon,
  title,
  description,
  delayMs,
}: {
  icon: string;
  title: string;
  description: string;
  delayMs: number;
}) {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="reveal rounded-3xl border border-outline-variant bg-surface p-8 transition hover:border-primary/30 hover:shadow-soft"
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <span className="material-symbols-outlined mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-2xl text-primary">
        {icon}
      </span>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
        {description}
      </p>
    </div>
  );
}

export function CompareFeatures() {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <section className="bg-surface-container py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div ref={ref} className="reveal mx-auto mb-14 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Capacidades
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            Más que un diff de texto
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant">
            Clausum entiende el contexto legal de cada cambio para que tu equipo
            se enfoque en lo que realmente importa negociar.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delayMs={index * 80}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
