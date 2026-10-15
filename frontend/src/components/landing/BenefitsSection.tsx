import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';

type BenefitCardProps = {
  icon: string;
  title: string;
  description: string;
  delayMs: number;
};

function BenefitCard({ icon, title, description, delayMs }: BenefitCardProps) {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="reveal rounded-3xl border border-outline-variant bg-surface-container p-7 transition hover:shadow-soft"
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary">
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </span>
      <h3 className="mt-5 font-display text-xl font-bold text-on-surface">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
        {description}
      </p>
    </div>
  );
}

const BENEFITS = [
  {
    icon: 'psychology',
    title: 'IA con contexto jurídico',
    description:
      'No es solo un resumen genérico: Clausum cruza tu contrato con artículos relevantes del corpus legal para fundamentar cada alerta.',
  },
  {
    icon: 'shield',
    title: 'Detección de riesgos',
    description:
      'Identifica cláusulas abusivas, penalidades desproporcionadas, plazos críticos y obligaciones ocultas antes de firmar.',
  },
  {
    icon: 'compare_arrows',
    title: 'Comparación de versiones',
    description:
      'Sube dos versiones del mismo contrato y visualiza qué cambió entre la propuesta inicial y la versión final.',
  },
] as const;

export function BenefitsSection() {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <section id="beneficios" className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div ref={ref} className="reveal mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Beneficios
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            Menos sorpresas legales, más claridad
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant">
            Diseñado para freelancers, pymes y equipos legales que necesitan
            revisar contratos sin dedicar horas a cada documento.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {BENEFITS.map((benefit, index) => (
            <BenefitCard
              key={benefit.title}
              icon={benefit.icon}
              title={benefit.title}
              description={benefit.description}
              delayMs={index * 80}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
