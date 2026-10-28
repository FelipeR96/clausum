import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';

type StepCardProps = {
  step: string;
  icon: string;
  title: string;
  description: string;
  delayMs: number;
};

function StepCard({ step, icon, title, description, delayMs }: StepCardProps) {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="reveal relative text-center"
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <div className="relative z-10 mx-auto flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-surface bg-primary text-on-primary shadow-soft">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-widest opacity-80">
          Paso {step}
        </span>
      </div>
      <h3 className="mt-6 font-display text-xl font-bold text-on-surface">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
        {description}
      </p>
    </div>
  );
}

const STEPS = [
  {
    step: '01',
    icon: 'upload_file',
    title: 'Sube tu contrato',
    description:
      'Sube un PDF con texto seleccionable o Word (.docx) — sin límite de páginas. Los PDF escaneados necesitan plan Pro, que usa OCR en las primeras 15 páginas.',
  },
  {
    step: '02',
    icon: 'manage_search',
    title: 'Análisis con RAG',
    description:
      'La IA analiza el contenido y recupera los artículos legales más relevantes para tu caso y país.',
  },
  {
    step: '03',
    icon: 'assignment_turned_in',
    title: 'Recibe el informe',
    description:
      'Obtén resumen, riesgos priorizados, cláusulas clave y referencias normativas listas para compartir.',
  },
] as const;

export function HowItWorksSection() {
  const ref = useRevealOnScroll<HTMLDivElement>();

  return (
    <section id="como-funciona" className="bg-surface-container py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div ref={ref} className="reveal mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Cómo funciona
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">
            De PDF a informe en minutos
          </h2>
          <p className="mt-4 text-lg text-on-surface-variant">
            Sin configuración compleja. Crea tu cuenta, sube el documento y deja
            que Clausum haga el trabajo pesado.
          </p>
        </div>

        <div className="relative mt-14">
          <div className="absolute left-0 right-0 top-12 hidden h-0.5 bg-outline-variant md:block" />
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((item, index) => (
              <StepCard
                key={item.step}
                step={item.step}
                icon={item.icon}
                title={item.title}
                description={item.description}
                delayMs={index * 100}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
